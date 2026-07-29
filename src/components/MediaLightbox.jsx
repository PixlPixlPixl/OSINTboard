import { useEffect, useCallback } from 'react';

export default function MediaLightbox({ item, onClose }) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!item) return null;

  return (
    <div className="lightbox-overlay" onClick={handleOverlayClick}>
      <div className="lightbox-content">
        <button className="lightbox-close" onClick={onClose}>
          ✕
        </button>

        {item.type === 'image' && (
          <img
            src={item.url}
            alt={item.name}
            className="lightbox-img"
          />
        )}

        {item.type === 'video' && (
          <video
            src={item.url}
            className="lightbox-video"
            controls
            autoPlay
          />
        )}

        {item.type === 'audio' && (
          <div className="lightbox-audio">
            <div className="lightbox-audio-icon">🎵</div>
            <div className="lightbox-audio-name">{item.name}</div>
            <audio src={item.url} controls autoPlay />
          </div>
        )}

        <div className="lightbox-name">{item.name}</div>
      </div>
    </div>
  );
}
