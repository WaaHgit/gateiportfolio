import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  autoPreview?: boolean; // tile-style auto silent loop preview
};

export function MediaVideo({ src, poster, className, autoPreview = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPreview);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (autoPreview) {
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [autoPreview]);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className={`relative group ${className ?? ""}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        loop={autoPreview}
        muted={muted}
        className="w-full h-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* Center play/pause */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        <span className="w-14 h-14 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white border border-white/40">
          {playing ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
        </span>
      </button>
      {/* Mute toggle */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
}
