"use client";

import { NowPlaying } from "@/hooks/useNowPlaying";

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

interface PlayBarProps {
  nowPlaying: NowPlaying;
}

export function PlayBar({ nowPlaying }: PlayBarProps) {
  const pct = nowPlaying.durationMs > 0
    ? (nowPlaying.progressMs / nowPlaying.durationMs) * 100
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Progress bar — thin line at the very top of the bar */}
      <div className="h-0.5 bg-gray-800 w-full">
        <div
          className="h-full bg-[#1DB954] transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="bg-gray-950/90 backdrop-blur-md border-t border-gray-800/50 px-4 py-2 flex items-center gap-3">
        {/* Album art */}
        {nowPlaying.albumArt && (
          <img
            src={nowPlaying.albumArt}
            alt=""
            className="w-10 h-10 rounded shadow-lg flex-shrink-0"
          />
        )}

        {/* Track info */}
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium truncate">
            {nowPlaying.trackName}
          </p>
          <p className="text-gray-400 text-xs truncate">
            {nowPlaying.artistName}
          </p>
        </div>

        {/* Playback state + time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {nowPlaying.isPlaying ? (
            <div className="flex items-end gap-0.5 h-3" aria-label="Playing">
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-1" />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-2" />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-3" />
              <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-4" />
            </div>
          ) : (
            <span className="text-gray-500 text-xs">Paused</span>
          )}
          <span className="text-gray-500 text-xs tabular-nums">
            {formatTime(nowPlaying.progressMs)} / {formatTime(nowPlaying.durationMs)}
          </span>
        </div>

        {/* Spotify link */}
        <a
          href={nowPlaying.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-[#1DB954] transition-colors flex-shrink-0"
          aria-label="Open in Spotify"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
