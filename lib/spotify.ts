// Spotify API fetch helpers

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    release_date: string;
    images: { url: string; width: number; height: number }[];
  };
  popularity: number;
  duration_ms: number;
  explicit: boolean;
  preview_url: string | null;
  external_urls: { spotify: string };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

// AudioFeatures now derived from artist genres + track metadata
// (Spotify locked /audio-features for new apps)
export interface AudioFeatures {
  id: string;
  // Genre-based dimensions
  energy: number;       // electronic/dance/rock → high; acoustic/classical → low
  valence: number;      // pop/happy → high; metal/sad → low
  danceability: number; // dance/hip-hop/funk → high
  acousticness: number; // acoustic/folk/classical → high
  instrumentalness: number; // classical/ambient/jazz → high
  speechiness: number;  // hip-hop/rap/spoken-word → high
  // Track metadata dimensions
  tempo: number;        // normalized from duration (proxy)
  loudness: number;     // popularity as loudness proxy
}

export type TimeRange = "short_term" | "medium_term" | "long_term";

async function spotifyFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    throw new Error(`Spotify API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchTopTracks(
  token: string,
  timeRange: TimeRange,
  limit = 50,
  offset = 0
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}&offset=${offset}`,
    token
  );
  return data.items;
}

export async function fetchTopArtists(
  token: string,
  timeRange: TimeRange,
  limit = 50,
  offset = 0
): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<{ items: SpotifyArtist[] }>(
    `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}&offset=${offset}`,
    token
  );
  return data.items;
}

export async function fetchRecentlyPlayed(
  token: string,
  limit = 50
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: { track: SpotifyTrack }[] }>(
    `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`,
    token
  );
  return data.items.map((i) => i.track);
}

export async function fetchSavedTracks(
  token: string,
  pages = 4
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  for (let page = 0; page < pages; page++) {
    const data = await spotifyFetch<{ items: { track: SpotifyTrack }[]; next: string | null }>(
      `https://api.spotify.com/v1/me/tracks?limit=50&offset=${page * 50}`,
      token
    );
    tracks.push(...data.items.map((i) => i.track));
    if (!data.next) break; // fewer saved tracks than requested pages
  }
  return tracks;
}

// Derive AudioFeatures from artist genres + track metadata
function deriveFeatures(
  track: SpotifyTrack,
  artistGenres: string[]
): AudioFeatures {
  const genres = artistGenres.join(" ").toLowerCase();

  const has = (...terms: string[]) =>
    terms.some((t) => genres.includes(t)) ? 1 : 0;

  const isElectronic = has("electronic", "edm", "house", "techno", "trance", "dubstep", "drum and bass", "dnb");
  const isDance = has("dance", "disco", "funk", "dancehall");
  const isRock = has("rock", "punk", "grunge", "alternative rock", "indie rock");
  const isMetal = has("metal", "hardcore", "heavy");
  const isHipHop = has("hip hop", "rap", "trap", "drill", "grime");
  const isPop = has("pop");
  const isAcoustic = has("acoustic", "folk", "singer-songwriter", "country");
  const isClassical = has("classical", "orchestra", "chamber", "opera");
  const isJazz = has("jazz", "blues", "soul", "r&b", "neo soul");
  const isIndieAlt = has("indie", "alternative", "shoegaze", "dream pop");
  const isAmbient = has("ambient", "experimental", "noise", "drone");

  // Energy: high for electronic/rock/metal, low for acoustic/classical/ambient
  const energy = clamp(
    0.5 +
      isElectronic * 0.3 +
      isRock * 0.25 +
      isMetal * 0.35 +
      isDance * 0.2 +
      isHipHop * 0.15 -
      isAcoustic * 0.3 -
      isClassical * 0.35 -
      isAmbient * 0.3 +
      (track.popularity / 100) * 0.1
  );

  // Valence: high for pop/dance/funk, low for metal/ambient/classical
  const valence = clamp(
    0.5 +
      isPop * 0.25 +
      isDance * 0.2 +
      isJazz * 0.1 -
      isMetal * 0.3 -
      isAmbient * 0.2 -
      isHipHop * 0.05
  );

  // Danceability: high for dance/hip-hop/pop/funk
  const danceability = clamp(
    0.3 +
      isDance * 0.35 +
      isHipHop * 0.3 +
      isPop * 0.2 +
      isElectronic * 0.15 -
      isClassical * 0.2 -
      isRock * 0.1
  );

  // Acousticness: high for acoustic/folk/classical/jazz
  const acousticness = clamp(
    0.2 +
      isAcoustic * 0.5 +
      isClassical * 0.45 +
      isJazz * 0.2 -
      isElectronic * 0.2 -
      isMetal * 0.1
  );

  // Instrumentalness: high for classical/ambient/jazz/electronic without vocals
  const instrumentalness = clamp(
    0.1 +
      isClassical * 0.5 +
      isAmbient * 0.45 +
      isJazz * 0.2 +
      isElectronic * 0.15 -
      isPop * 0.1 -
      isHipHop * 0.1
  );

  // Speechiness: high for hip-hop/rap/spoken word
  const speechiness = clamp(
    0.05 +
      isHipHop * 0.5 +
      isPop * 0.05
  );

  // Tempo proxy: use duration (shorter tracks tend to be faster pop/punk)
  const tempo = clamp(1 - (track.duration_ms ?? 210000) / 400000);

  // Loudness proxy: popularity
  const loudness = (track.popularity ?? 50) / 100;

  return {
    id: track.id,
    energy,
    valence,
    danceability,
    acousticness,
    instrumentalness,
    speechiness,
    tempo,
    loudness,
  };
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

export interface EnrichedTrack {
  track: SpotifyTrack;
  features: AudioFeatures;
  timeRanges: TimeRange[];
}

export async function fetchAllTopTracksWithFeatures(
  token: string,
  onProgress?: (step: string, pct: number) => void
): Promise<EnrichedTrack[]> {
  const ranges: TimeRange[] = ["short_term", "medium_term", "long_term"];
  const trackMap = new Map<string, { track: SpotifyTrack; ranges: Set<TimeRange> }>();

  const addTrack = (track: SpotifyTrack, range?: TimeRange) => {
    const existing = trackMap.get(track.id);
    if (existing) {
      if (range) existing.ranges.add(range);
    } else {
      trackMap.set(track.id, { track, ranges: new Set(range ? [range] : []) });
    }
  };

  // Top tracks — 2 pages per time range (up to 100 per range)
  let step = 0;
  const totalTrackFetches = ranges.length * 2;
  for (const range of ranges) {
    for (const offset of [0, 50]) {
      onProgress?.(`Fetching top tracks (${range.replace(/_/g, " ")})…`, (step / totalTrackFetches) * 20);
      const tracks = await fetchTopTracks(token, range, 50, offset);
      tracks.forEach((t) => addTrack(t, range));
      step++;
    }
  }

  // Recently played
  onProgress?.("Fetching recently played…", 22);
  try {
    const recent = await fetchRecentlyPlayed(token, 50);
    recent.forEach((t) => addTrack(t));
  } catch {
    console.warn("[spotify] recently played unavailable, skipping");
  }

  // Liked songs — 4 pages (up to 200 tracks)
  onProgress?.("Fetching liked songs…", 28);
  try {
    const saved = await fetchSavedTracks(token, 4);
    saved.forEach((t) => addTrack(t));
  } catch {
    console.warn("[spotify] liked songs unavailable, skipping");
  }

  // Fetch top artists from all 3 ranges × 2 pages to build genre map
  onProgress?.("Fetching artist genres…", 38);
  const artistMap = new Map<string, SpotifyArtist>();
  for (const range of ranges) {
    for (const offset of [0, 50]) {
      const artists = await fetchTopArtists(token, range, 50, offset);
      for (const artist of artists) {
        if (!artistMap.has(artist.id)) artistMap.set(artist.id, artist);
      }
    }
  }

  console.log(`[spotify] deriving features for ${trackMap.size} tracks`);
  onProgress?.("Deriving audio features from genres…", 58);

  const enriched: EnrichedTrack[] = [];
  let loopCount = 0;
  for (const [trackId, { track, ranges: trackRanges }] of trackMap) {
    try {
      const genres: string[] = [];
      for (const artist of track.artists) {
        const a = artistMap.get(artist.id);
        if (a?.genres?.length) genres.push(...a.genres);
      }
      const features = deriveFeatures(track, genres);
      enriched.push({ track, features, timeRanges: Array.from(trackRanges) });
      loopCount++;
    } catch (err) {
      console.error(`[spotify] error on track ${trackId}:`, err);
      throw err;
    }
  }

  console.log(`[spotify] loop completed ${loopCount} iterations`);
  console.log(`[spotify] enriched ${enriched.length} tracks, returning`);
  onProgress?.("Processing data…", 70);
  return enriched;
}
