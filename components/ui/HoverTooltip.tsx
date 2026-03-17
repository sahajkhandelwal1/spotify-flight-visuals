"use client";

import { PositionedTrack } from "@/lib/tsne";
import { getDominantFeatures } from "@/lib/features";

interface HoverTooltipProps {
  track: PositionedTrack | null;
  x: number;
  y: number;
}

const RANGE_LABELS: Record<string, string> = {
  short_term: "🔥 Recent",
  medium_term: "📅 Last 6 months",
  long_term: "⭐ All-time",
};

export function HoverTooltip({ track, x, y }: HoverTooltipProps) {
  if (!track) return null;

  const dominant = getDominantFeatures(track.normalizedFeatures);
  const albumArt = track.track.album.images[1]?.url || track.track.album.images[0]?.url;

  return (
    <div
      className="fixed z-40 pointer-events-none"
      style={{
        left: x + 16,
        top: y - 10,
        transform: x > window.innerWidth - 280 ? "translateX(-120%)" : undefined,
      }}
    >
      <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-3 w-64 shadow-2xl backdrop-blur-sm">
        <div className="flex gap-3 mb-2">
          {albumArt && (
            <img
              src={albumArt}
              alt="Album art"
              className="w-12 h-12 rounded-md flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {track.track.name}
            </p>
            <p className="text-gray-400 text-xs truncate">
              {track.track.artists.map((a) => a.name).join(", ")}
            </p>
            <p className="text-gray-500 text-xs truncate">{track.track.album.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {dominant.map((f) => (
            <span
              key={f}
              className="text-xs bg-gray-800 text-gray-300 rounded px-1.5 py-0.5"
            >
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {track.timeRanges.map((r) => (
              <span key={r} className="text-xs text-gray-400">
                {RANGE_LABELS[r]}
              </span>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            ♫ {track.track.popularity}
          </span>
        </div>
      </div>
    </div>
  );
}
