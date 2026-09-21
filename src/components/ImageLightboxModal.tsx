import { X, Download, Play } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  senderName?: string;
  time?: string;
  caption?: string;
  fileType?: string;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  imageUrl,
  senderName,
  time,
  caption,
  fileType,
}: ImageLightboxModalProps) {
  if (!isOpen) return null;

  const isVideo = fileType?.includes('video') || imageUrl.includes('video') || imageUrl.startsWith('data:video');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `homework-file-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl flex items-center justify-between py-3 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {senderName && (
            <span className="text-sm font-semibold text-white">
              Student: <strong className="text-amber-400">{senderName}</strong>
            </span>
          )}
          {time && <span className="text-xs text-[#8b949e]">({time})</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Download File"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#21262d] hover:bg-rose-950/80 text-[#8b949e] hover:text-rose-400 transition-colors cursor-pointer"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="relative max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl border border-[#30363d] bg-[#0d1117] p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={imageUrl}
            controls
            autoPlay
            className="max-w-full max-h-[75vh] rounded-xl outline-none"
          />
        ) : (
          <img
            src={imageUrl}
            alt={caption || 'Homework file'}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[75vh] object-contain rounded-2xl"
          />
        )}
      </div>

      {caption && (
        <div
          className="mt-3 max-w-xl text-center text-xs text-white bg-[#161b22]/90 border border-[#30363d] px-4 py-2 rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
