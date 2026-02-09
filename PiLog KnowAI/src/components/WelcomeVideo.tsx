import { useState } from "react";

export default function WelcomeVideo({
  videoId,
}: {
  videoId: string;
}) {
  const [play, setPlay] = useState(false);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden border bg-black">
      {!play ? (
        <button
          onClick={() => setPlay(true)}
          className="absolute inset-0 flex items-center justify-center group"
        >
          {/* Thumbnail */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Video preview"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />

          {/* Play button */}
          <div className="relative z-10 flex items-center justify-center h-16 w-16 rounded-full bg-white/90 shadow-lg group-hover:scale-105 transition">
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8 text-black ml-1"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      ) : (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      )}
    </div>
  );
}
