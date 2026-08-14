"""OSINTboard maigret scan worker.

Demand-started by the Vite dev/preview server (vite.config.js
maigretLauncher): nothing listens on :8000 until the first /api request,
and the process exits itself after IDLE_TIMEOUT seconds without API
activity (the frontend's 2s poll keeps it alive during a scan). Results
persist to backend/results/<scan_id>/ on disk, so a later demand-start can
still serve results and PDFs of finished scans.
"""

import glob
import json
import os
import shutil
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
MAIGRET_BIN = BASE_DIR / ".venv" / "bin" / "maigret"

# Seconds without API activity before self-exit; 0 disables (prod systemd
# service keeps the worker up since nginx can't spawn processes).
IDLE_TIMEOUT = int(os.environ.get("OSINTBOARD_IDLE_TIMEOUT", "60"))
IDLE_POLL = 5

app = FastAPI(title="OSINTboard maigret backend")

scans = {}      # scan_id -> public API record (mirrors scan.json)
processes = {}  # scan_id -> running Popen handle (not serializable)
last_activity = [time.monotonic()]


@app.middleware("http")
async def touch_last_activity(request, call_next):
    last_activity[0] = time.monotonic()
    return await call_next(request)


def _idle_watch():
    """Exit the process after IDLE_TIMEOUT without API activity."""
    while True:
        time.sleep(IDLE_POLL)
        if time.monotonic() - last_activity[0] > IDLE_TIMEOUT:
            # Don't leave an orphaned scan running after we exit.
            for proc in processes.values():
                proc.terminate()
            os._exit(0)


if IDLE_TIMEOUT > 0:
    threading.Thread(target=_idle_watch, daemon=True).start()


class ScanRequest(BaseModel):
    username: str


def _record(scan_id):
    """Read the persisted record for a scan_id, or None."""
    f = RESULTS_DIR / scan_id / "scan.json"
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _persist(record):
    scan_dir = RESULTS_DIR / record["id"]
    scan_dir.mkdir(parents=True, exist_ok=True)
    (scan_dir / "scan.json").write_text(json.dumps(record, indent=2))


def _public_record(record):
    """Shape a stored record into the API response."""
    if record is None:
        return None
    status = record.get("status")
    if status == "done":
        report_url = f"/api/maigret/report/{record['id']}"
        results_url = f"/api/maigret/results/{record['id']}"
    else:
        report_url = None
        results_url = None
    return {
        "id": record["id"],
        "username": record["username"],
        "status": status,
        "error": record.get("error"),
        "createdAt": record.get("createdAt"),
        "completedAt": record.get("completedAt"),
        "reportUrl": report_url,
        "resultsUrl": results_url,
    }


def finish_scan(scan_id):
    """Daemon thread: wait for the maigret process, finalize outputs."""
    process = processes.pop(scan_id, None)
    record = _record(scan_id)
    if process is None or record is None:
        return
    code = process.wait()

    scan_dir = RESULTS_DIR / scan_id
    now = datetime.now(timezone.utc).isoformat()

    if code == 0:
        # Rename outputs. Prefer the exact per-username files — a scan can
        # produce extra reports for similar usernames (sox0j, Soxoj1...).
        # Usernames can contain path-hostile chars, so find via glob rather
        # than constructing the filename directly.
        username = record.get("username", "")
        pdf_glob = f"{scan_dir}/reports/*.pdf"
        json_glob = f"{scan_dir}/reports/*_simple.json"
        exact_json = f"{scan_dir}/reports/report_{username}_simple.json"
        for pdf in glob.glob(pdf_glob):
            shutil.move(pdf, str(scan_dir / "report.pdf"))
            break
        for js in (
            glob.glob(exact_json) if username else []
        ) or glob.glob(json_glob):
            shutil.move(js, str(scan_dir / "results.json"))
            break
        record.update({"status": "done", "error": None, "completedAt": now})
    else:
        log_path = scan_dir / "scan.log"
        error = ""
        if log_path.exists():
            lines = log_path.read_text(errors="replace").strip().splitlines()
            error = "\n".join(lines[-5:])
        if not error:
            error = f"maigret exited with code {code}"
        record.update({"status": "error", "error": error, "completedAt": now})

    _persist(record)
    scans[scan_id] = _public_record(record)


@app.post("/api/maigret/scan")
def start_scan(req: ScanRequest):
    # Cap concurrent scans — maigret is CPU/network heavy and this API is public.
    if sum(1 for p in processes.values() if p.poll() is None) >= 3:
        raise HTTPException(status_code=429, detail="Too many scans in progress — try again shortly")
    username = req.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username must not be empty")
    if len(username) > 64:
        raise HTTPException(status_code=400, detail="Username must be at most 64 characters")

    scan_id = uuid.uuid4().hex
    scan_dir = RESULTS_DIR / scan_id
    scan_dir.mkdir(parents=True, exist_ok=True)

    record = {
        "id": scan_id,
        "username": username,
        "status": "running",
        "error": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "completedAt": None,
    }
    _persist(record)

    log_file = open(scan_dir / "scan.log", "wb")
    process = subprocess.Popen(
        [
            str(MAIGRET_BIN),
            "--no-autoupdate",
            "--no-color",
            "--no-progressbar",
            "-P",
            "-J",
            "simple",
            "--",
            username,
        ],
        cwd=str(scan_dir),
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )
    processes[scan_id] = process

    scans[scan_id] = _public_record(record)

    threading.Thread(target=finish_scan, args=(scan_id,), daemon=True).start()

    return {"scanId": scan_id}


@app.get("/api/maigret/scan/{scan_id}")
def get_scan(scan_id: str):
    record = scans.get(scan_id)
    if record is None:
        persisted = _record(scan_id)
        if persisted is None:
            raise HTTPException(status_code=404, detail="Scan not found")
        if persisted.get("status") == "running":
            # Backend restarted mid-scan: the child process is gone.
            persisted.update(
                {
                    "status": "error",
                    "error": "Scan interrupted by server restart",
                    "completedAt": datetime.now(timezone.utc).isoformat(),
                }
            )
            _persist(persisted)
            record = _public_record(persisted)
        else:
            record = _public_record(persisted)
        scans[scan_id] = record
    return record


@app.get("/api/maigret/results/{scan_id}")
def get_results(scan_id: str):
    results_file = RESULTS_DIR / scan_id / "results.json"
    if not results_file.exists():
        raise HTTPException(status_code=404, detail="Results not found")
    return FileResponse(results_file, media_type="application/json")


@app.get("/api/maigret/report/{scan_id}")
def get_report(scan_id: str):
    report_file = RESULTS_DIR / scan_id / "report.pdf"
    if not report_file.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(report_file, media_type="application/pdf")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
