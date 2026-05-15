import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
  /** Tile-style auto silent loop preview (used in grids). */
  autoPreview?: boolean;
  /** When true (lightbox/full view), constrain to viewport via max-h. */
  contain?: boolean;
};

/**
 * Always renders the video at its NATURAL aspect ratio (portrait stays portrait,
 * landscape stays landscape). No cropping, no forced aspect, no distortion.
 * The wrapper is width-driven; height comes from the video's intrinsic ratio.
 */
export function MediaVideo({ src, poster, className, autoPreview = false, contain = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPreview);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.play().catch(() => {});
  }, [src]);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className={`relative group inline-block w-full ${className ?? ""}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        loop
        muted={muted}
        preload="metadata"
        // h-auto = video keeps its real aspect ratio. object-contain is a safety net
        // in case a parent ever forces a height — it will letterbox, never crop.
        className={`w-full h-auto block bg-black object-contain ${contain ? "max-h-[78vh] mx-auto" : ""}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          playing ? "opacity-0 group-hover:opacity-100 focus:opacity-100" : "opacity-100"
        }`}
      >
        <span className="w-14 h-14 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white border border-white/40 shadow-lg">
          {playing ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
        </span>
      </button>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-black/65 backdrop-blur flex items-center justify-center text-white border border-white/30 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 transition-opacity"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
