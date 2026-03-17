"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForToken, storeToken } from "@/lib/auth";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const errParam = params.get("error");

    if (errParam) {
      setError(`Spotify denied access: ${errParam}`);
      return;
    }

    if (!code) {
      setError("No authorization code received.");
      return;
    }

    exchangeCodeForToken(code)
      .then((token) => {
        storeToken(token);
        router.replace("/visualizer");
      })
      .catch((err) => {
        setError(err.message || "Token exchange failed.");
      });
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-[#1DB954] hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin" />
        <p className="text-gray-400">Connecting to Spotify…</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#1DB954] border-t-transparent animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
