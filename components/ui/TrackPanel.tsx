"use client";

import { PositionedTrack } from "@/lib/tsne";
import { FEATURE_NAMES } from "@/lib/features";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PremiumPlayer {
  isReady: boolean;
  isPlaying: boolean;
  toggle: () => void;
}

interface TrackPanelProps {
  track: PositionedTrack | null;
  similar: PositionedTrack[];
  onClose: () => void;
  onSelect: (t: PositionedTrack) => void;
  player: PremiumPlayer | null;
}

export function TrackPanel({ track, similar, onClose, onSelect, player }: TrackPanelProps) {
  if (!track) return null;

  const albumArt =
    track.track.album.images[0]?.url || track.track.album.images[1]?.url;

  const radarData = FEATURE_NAMES.map((name, i) => ({
    feature: name.slice(0, 5),
    value: Math.round(track.normalizedFeatures[i] * 100),
  }));

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-950/95 border-l border-gray-800 z-40 flex flex-col overflow-y-auto backdrop-blur-md animate-slide-in-right">
      {/* Always-visible close button */}
      <button
        onClick={onClose}
        className="sticky top-0 z-50 self-end m-2 text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-800 transition-colors backdrop-blur-sm"
      >
        ✕
      </button>

      {/* Album art — negative margin pulls it up under the close button */}
      {albumArt && (
        <div className="relative">
          <img src={albumArt} alt="Album art" className="w-full aspect-square object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-950" />
        </div>
      )}

      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Track info */}
        <div>
          <h2 className="text-white font-bold text-lg leading-tight">{track.track.name}</h2>
          <p className="text-gray-400 text-sm">
            {track.track.artists.map((a) => a.name).join(", ")}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{track.track.album.name}</p>
        </div>

        {/* Playback — SDK controls (Premium) or embed iframe (free) */}
        {player ? (
          <div className="bg-black/60 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            {player.isReady ? (
              <>
                <button
                  onClick={player.toggle}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white flex-shrink-0"
                  aria-label={player.isPlaying ? "Pause" : "Play"}
                >
                  {player.isPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <rect x="2" y="1" width="3" height="10" rx="1" />
                      <rect x="7" y="1" width="3" height="10" rx="1" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 1.5l9 4.5-9 4.5V1.5z" />
                    </svg>
                  )}
                </button>
                <span className="text-gray-400 text-xs">
                  {player.isPlaying ? "Now playing" : "Paused"}
                </span>
              </>
            ) : (
              <span className="text-gray-500 text-xs">Connecting player…</span>
            )}
          </div>
        ) : (
          <iframe
            key={track.track.id}
            src={`https://open.spotify.com/embed/track/${track.track.id}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl border-0"
          />
        )}

        {/* Cluster badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium w-fit"
          style={{
            backgroundColor: track.clusterColor + "22",
            border: `1px solid ${track.clusterColor}55`,
            color: track.clusterColor,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: track.clusterColor }}
          />
          Cluster {track.clusterId}
        </div>

        {/* Radar chart */}
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Audio Profile</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis
                  dataKey="feature"
                  tick={{ fill: "#9CA3AF", fontSize: 10 }}
                />
                <Radar
                  name="Features"
                  dataKey="value"
                  stroke={track.clusterColor}
                  fill={track.clusterColor}
                  fillOpacity={0.2}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spotify link */}
        <a
          href={track.track.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-sm py-2.5 rounded-full transition-colors"
        >
          Open in Spotify
        </a>

        {/* Similar tracks */}
        {similar.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">
              Similar Tracks
            </p>
            <div className="flex flex-col gap-2">
              {similar.map((s) => {
                const art = s.track.album.images[2]?.url || s.track.album.images[0]?.url;
                return (
                  <button
                    key={s.track.id}
                    onClick={() => onSelect(s)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left w-full"
                  >
                    {art && (
                      <img src={art} alt="" className="w-8 h-8 rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate">
                        {s.track.name}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {s.track.artists[0]?.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
