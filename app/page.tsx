"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginButton } from "@/components/ui/LoginButton";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";

export default function LandingPage() {
  const { token, loading, login } = useSpotifyAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) {
      router.replace("/visualizer");
    }
  }, [token, loading, router]);

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(29,185,84,0.08)_0%,transparent_70%)]" />
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: (((i * 7) % 3) + 0.5) + "px",
              height: (((i * 7) % 3) + 0.5) + "px",
              left: ((i * 97) % 100) + "%",
              top: ((i * 53) % 100) + "%",
              opacity: ((i * 31) % 70) / 100 + 0.1,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[#1DB954] text-sm font-semibold uppercase tracking-[0.3em] mb-2">
            Spotify
          </div>
          <h1 className="text-6xl font-black text-white leading-none tracking-tight">
            Flight
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1DB954] to-[#44ffcc]">
              Visuals
            </span>
          </h1>
        </div>

        <p className="text-gray-400 text-lg max-w-md leading-relaxed">
          Fly through your music taste as a{" "}
          <span className="text-white">3D galaxy</span> — every song a star,
          clustered by sonic similarity.
        </p>

        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin" />
          ) : (
            <LoginButton onClick={login} />
          )}
          <p className="text-gray-600 text-xs">
            Uses your top ~150 tracks • No data stored
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-4 max-w-sm">
          {[
            { icon: "✦", label: "Warp-speed cinematic intro" },
            { icon: "◎", label: "Free-flight exploration" },
            { icon: "◈", label: "Audio feature breakdown" },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1">
              <span className="text-[#1DB954] text-xl">{f.icon}</span>
              <span className="text-gray-500 text-xs text-center leading-tight">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
