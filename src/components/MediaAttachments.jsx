import { memo, useRef, useState } from 'react';

let mediaIdCounter = 0;
const nextMediaId = () => `media_${++mediaIdCounter}`;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function classifyMime(mime) {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'other';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const MediaAttachments = memo(({ media = [], onAdd, onRemove }) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

  const handlePick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(
        `Files over 10 MB aren't supported (${oversized.map((f) => f.name).join(', ')})`
      );
      return;
    }

    const totalNew = files.reduce((s, f) => s + f.size, 0);
    const totalExisting = media.reduce((s, m) => {
      // approximate: base64 is ~1.37x binary size
      return s + Math.round(m.url.length * 0.73);
    }, 0);
    if (totalExisting + totalNew > 30 * 1024 * 1024) {
      setError('Total media storage exceeds ~30 MB. Remove some files first.');
      return;
    }

    for (const file of files) {
      try {
        const url = await readFileAsDataURL(file);
        onAdd({
          id: nextMediaId(),
          type: classifyMime(file.type),
          name: file.name,
          url,
          mime: file.type,
        });
      } catch {
        setError(`Failed to read ${file.name}`);
      }
    }

    // Reset so same file can be picked again
    e.target.value = '';
  };

  const handleRemove = (mediaId) => {
    onRemove(mediaId);
  };

  return (
    <div className="media-attachments">
      {media.length > 0 && (
        <div className="media-attachments-grid">
          {media.map((item) => (
            <div key={item.id} className="media-attachment-item">
              {item.type === 'image' && (
                <div className="media-attachment-preview">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="media-attachment-thumb"
                    onClick={() => window.open(item.url, '_blank')}
                  />
                </div>
              )}
              {item.type === 'video' && (
                <div className="media-attachment-preview">
                  <video
                    src={item.url}
                    className="media-attachment-thumb"
                    controls
                    preload="metadata"
                  />
                </div>
              )}
              {item.type === 'audio' && (
                <div className="media-attachment-audio">
                  <audio src={item.url} controls preload="none" />
                </div>
              )}
              <button
                className="media-attachment-remove"
                title="Remove"
                onClick={() => handleRemove(item.id)}
              >
                ✕
              </button>
              <span className="media-attachment-name">{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="media-attachments-error">{error}</div>}

      <button className="media-attachments-add-btn" onClick={handlePick}>
        + {media.length > 0 ? 'Add media' : 'Attach photo / video / audio'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="media-attachments-hidden-input"
        onChange={handleFiles}
      />
    </div>
  );
});

MediaAttachments.displayName = 'MediaAttachments';

export default MediaAttachments;
