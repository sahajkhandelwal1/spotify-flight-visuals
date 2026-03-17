"use client";

import { useEffect, useState } from "react";
import { getStoredToken, clearToken, redirectToSpotifyAuth } from "@/lib/auth";

export function useSpotifyAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    setToken(stored);
    setLoading(false);
  }, []);

  const login = () => redirectToSpotifyAuth();

  const logout = () => {
    clearToken();
    setToken(null);
  };

  return { token, loading, login, logout };
}
