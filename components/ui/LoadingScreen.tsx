"use client";

interface LoadingScreenProps {
  step: string;
  pct: number;
}

export function LoadingScreen({ step, pct }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: ((i * 7) % 2) + 1 + "px",
              height: ((i * 7) % 2) + 1 + "px",
              left: ((i * 97) % 100) + "%",
              top: ((i * 53) % 100) + "%",
              opacity: ((i * 31) % 70) / 100 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-80">
        {/* Pulsing orb */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-[#1DB954] opacity-20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-[#1DB954] opacity-40 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-[#1ed760]" />
        </div>

        <div className="text-center">
          <h2 className="text-white text-xl font-semibold mb-1">
            Building Your Galaxy
          </h2>
          <p className="text-gray-400 text-sm">{step}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-[#1DB954] to-[#44ffcc] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-gray-600 text-xs">{Math.round(pct)}%</p>
      </div>
    </div>
  );
}
