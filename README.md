# 🕵️ OSINTboard

**Intelligence Graph Canvas** — a drag-and-drop OSINT investigation board for building visual link-analysis graphs. Drop nodes, draw connections, and map out relationships between people, phone numbers, emails, URLs, and more — all on a clean CAD-style black canvas.

![screenshot](https://img.shields.io/badge/status-active-brightgreen)

---

## Features

- 🎨 **CAD-style black canvas** — white-on-dark theme, grid snapping, minimap
- 🧩 **13 node types** — Person, Phone, Email, Address, Social Media, URL, Company, Username, IP, External Link, Note, Date, Document
- 🖱️ **Drag & drop** — grab nodes from the sidebar, drop them anywhere on the canvas
- 🔗 **Link analysis** — click + drag between nodes to draw connection lines with arrow markers
- ✏️ **Inline editing** — double-click any node to edit its label
- 🎬 **YouTube embedding** — paste a YouTube URL into an External Link node to render a live video player
- 💾 **Save/Load** — persist investigations to browser localStorage, switch between multiple graphs
- 🗑️ **Delete support** — select nodes/edges and press Delete or Backspace
- 🧭 **Navigation** — scroll to zoom, drag to pan, minimap, zoom controls

---

## Quick Start

```bash
git clone https://github.com/PixlPixlPixl/OSINTboard.git
cd OSINTboard
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite prints).

---

## Usage

### Building a Graph

1. **Add nodes** — drag a node type from the sidebar onto the canvas
2. **Connect nodes** — click the small circle (handle) at the bottom of a node and drag to the handle at the top of another
3. **Label nodes** — double-click a node to type your intelligence data
4. **Arrange** — drag nodes to reposition; they snap to a 20px grid
5. **Zoom & pan** — scroll to zoom, drag the canvas background to pan

### Saving Your Work

Click **Save** in the sidebar, give your graph a name, and it's persisted in your browser's localStorage. **Load** to pick from saved investigations. **New** clears the canvas for a fresh board.

### YouTube Links

Drop an **External Link** node, double-click it, and paste a YouTube URL. The node expands and renders a playable embedded video — useful for keeping video evidence or interviews inline with your investigation graph.

### Node Types

| Node | Color | Purpose |
|------|-------|---------|
| 👤 Person / Contact | Blue | Person of interest |
| 📞 Phone Number | Green | Phone intelligence |
| ✉️ Email Address | Orange | Email intelligence |
| 📍 Address | Red | Physical address |
| 📱 Social Media | Purple | Social profile |
| 🔗 URL / Website | Cyan | Website or link |
| 🏢 Company | Yellow | Organization |
| 👤 Username | Lime | Online handle |
| 🖥️ IP Address | Gray | IP intelligence |
| 🔗 External Link | Coral | URL — YouTube embeds a player |
| 📝 Note | White | Investigator note |
| 📅 Date / Event | Pink | Date or event marker |
| 📄 Document | Silver | Document reference |

---

## Project Structure

```
src/
├── components/
│   ├── Canvas.jsx        # React Flow canvas, drag/drop, connections
│   ├── GraphModal.jsx    # Save/Load/Delete modal dialogs
│   ├── OSINTNode.jsx     # Custom node with YouTube embed support
│   └── Sidebar.jsx       # Node palette + graph management buttons
├── data/
│   ├── graphStore.js     # localStorage CRUD (save/load/list/delete)
│   └── nodeTypes.js      # Node type definitions (icon, color, label)
├── App.jsx               # Root layout, modal state
├── App.css               # All dark-theme CAD styles
└── main.jsx              # Entry point
```

---

## Tech Stack

- **[React 19](https://react.dev)** — UI framework
- **[Vite](https://vite.dev)** — Dev server & build tool
- **[React Flow](https://reactflow.dev)** — Node graph engine (drag, zoom, edges, minimap)
- **localStorage** — Client-side persistence (no server needed)

---

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
```

All data stays in your browser — there's no backend, no accounts, no external dependencies beyond the CDN-free npm packages.

---

## License

MIT
