// PKCE OAuth helpers for Spotify

export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;

// Explicitly set NEXT_PUBLIC_REDIRECT_URI in .env.local for dev and production.
// Never rely on a hardcoded http:// fallback — that would send the auth code
// over plain HTTP and expose it to network observers.
export const REDIRECT_URI =
  process.env.NEXT_PUBLIC_REDIRECT_URI ??
  (typeof window !== "undefined" ? `${window.location.origin}/callback` : "");

export const SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-library-read",
  "user-read-private",
].join(" ");

function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((x) => chars[x % chars.length])
    .join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateRandomString(128);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64URLEncode(hashed);
  return { codeVerifier, codeChallenge };
}

export async function redirectToSpotifyAuth(): Promise<void> {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  sessionStorage.setItem("pkce_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export async function exchangeCodeForToken(
  code: string
): Promise<TokenResponse> {
  const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
  if (!codeVerifier) throw new Error("Missing PKCE code verifier");

  const redirectUri =
    process.env.NEXT_PUBLIC_REDIRECT_URI ??
    (typeof window !== "undefined" ? `${window.location.origin}/callback` : "");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

export function storeToken(token: TokenResponse): void {
  sessionStorage.setItem("spotify_access_token", token.access_token);
  sessionStorage.setItem(
    "spotify_token_expiry",
    String(Date.now() + token.expires_in * 1000)
  );
  if (token.refresh_token) {
    sessionStorage.setItem("spotify_refresh_token", token.refresh_token);
  }
}

export function getStoredToken(): string | null {
  const token = sessionStorage.getItem("spotify_access_token");
  const expiry = sessionStorage.getItem("spotify_token_expiry");
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry) - 60_000) return null; // expire 1min early
  return token;
}

export function clearToken(): void {
  sessionStorage.removeItem("spotify_access_token");
  sessionStorage.removeItem("spotify_token_expiry");
  sessionStorage.removeItem("spotify_refresh_token");
  sessionStorage.removeItem("pkce_code_verifier");
}
