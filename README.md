# Spotify Flight Visuals

> Fly through your music taste as a living 3D galaxy. Every song you've ever loved becomes a star.

![Spotify Flight Visuals Banner](https://i.imgur.com/placeholder.png)

---

## What is this?

**Spotify Flight Visuals** is an interactive 3D music visualization web app. It pulls your top tracks from Spotify, analyzes the sonic and genre characteristics of each one, and renders your entire listening history as a navigable galaxy — clusters of songs glowing in the dark, grouped by sound, ready to be explored.

You don't just *see* your music taste. You *fly through it*.

---

## Features

- **Spotify OAuth (PKCE)** — Secure login with no backend server and no client secret ever exposed
- **3D galaxy rendering** — All your tracks rendered as colored, glowing spheres in Three.js
- **Genre-based clustering** — Songs grouped by sonic similarity using k-means on derived audio features
- **PCA dimensionality reduction** — 8-dimensional feature vectors projected to 3D positions via Principal Component Analysis
- **Nebula layout** — Each cluster is a cloud of stars you can fly into and explore
- **Free-flight camera** — WASD + mouse look for full 6DoF movement through the galaxy
- **Crosshair hover** — Aim at any star while flying to see track metadata
- **Click to inspect** — Click any node to open a detail panel with audio profile radar chart and Spotify link
- **Similar tracks** — Each track panel shows the 3 nearest sonic neighbors
- **Warp-speed intro** — Cinematic GSAP camera animation flies you into the galaxy on first load
- **Bloom glow effect** — Postprocessing bloom makes clusters feel like real nebulae
- **No backend required** — Entirely client-side: auth, data fetching, analysis, and rendering all happen in the browser

---

## Demo

> Live demo coming soon. Run locally in under 2 minutes with the setup below.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | Handles OAuth callback route + client-side React |
| 3D Rendering | React Three Fiber + Three.js | Declarative Three.js with hooks |
| Postprocessing | @react-three/postprocessing | Bloom glow effect on track nodes |
| Animation | GSAP | Precise timeline control for warp intro camera sequence |
| Styling | Tailwind CSS | Fast utility-first styling for UI overlays |
| Dimensionality Reduction | Custom PCA (browser) | Projects 8D feature vectors → 3D positions instantly |
| Clustering | Custom k-means++ (browser) | Groups similar tracks into 6 clusters |
| Charts | Recharts | Radar chart for audio feature breakdown |
| Auth | Spotify PKCE OAuth | Secure OAuth2 flow with no client secret |

---

## How It Works

### 1. Authentication (PKCE OAuth2)

The app uses Spotify's PKCE (Proof Key for Code Exchange) flow — designed for public clients that can't safely store a client secret:

1. App generates a random 128-character `code_verifier`
2. SHA-256 hashes it → base64url encodes → `code_challenge`
3. Redirects to `accounts.spotify.com/authorize` with the challenge
4. Spotify redirects back to `/callback?code=...`
5. App POSTs to `/api/token` with the original `code_verifier` to exchange for an access token
6. Token stored in `sessionStorage` (never localStorage — cleared when tab closes)

No client secret is needed. The app is entirely public and safe to deploy.

### 2. Data Fetching

Three parallel Spotify API calls fetch up to 150 unique tracks:

```
GET /me/top/tracks?time_range=short_term&limit=50   → recent favourites
GET /me/top/tracks?time_range=medium_term&limit=50  → last 6 months
GET /me/top/tracks?time_range=long_term&limit=50    → all-time
```

Tracks appearing in multiple ranges are deduplicated and tagged with which ranges they appeared in (used as a recency signal in the tooltip).

Three more calls fetch artist genre data:

```
GET /me/top/artists?time_range=short_term&limit=50
GET /me/top/artists?time_range=medium_term&limit=50
GET /me/top/artists?time_range=long_term&limit=50
```

### 3. Feature Derivation

Since Spotify locked their `/audio-features` endpoint for new developer apps in late 2024, audio features are **derived from artist genre tags** instead. Each track's artists are looked up in the fetched artist map, their genre strings are concatenated, and 8 numeric features are computed:

| Feature | How it's derived |
|---------|-----------------|
| **Energy** | High for electronic/rock/metal, low for acoustic/classical/ambient |
| **Valence** | High for pop/dance/funk, low for metal/ambient |
| **Danceability** | High for dance/hip-hop/EDM/funk |
| **Acousticness** | High for acoustic/folk/classical/jazz |
| **Instrumentalness** | High for classical/ambient/jazz/electronic |
| **Speechiness** | High for hip-hop/rap/spoken word |
| **Tempo** | Derived from track duration (shorter ≈ faster) |
| **Loudness** | Derived from track popularity |

This gives each track an 8-dimensional feature vector in [0, 1].

### 4. Principal Component Analysis (PCA)

PCA reduces the 8D feature vectors to 3D coordinates for rendering:

1. Compute the mean feature vector across all tracks
2. Center the data (subtract mean)
3. Compute the 8×8 covariance matrix
4. Extract the top 3 eigenvectors via power iteration + deflation
5. Project each track onto these 3 eigenvectors → (x, y, z)

This runs entirely in the browser in milliseconds. Tracks with similar sonic profiles end up close together in 3D space.

### 5. K-Means Clustering

K-means (k=6) runs on the original 8D feature vectors to assign cluster membership:

- Initialised with **k-means++** (spread-out seed selection for better convergence)
- Each cluster gets a distinct color and an auto-generated label based on its feature centroid:
  - High energy + high valence → **Euphoric**
  - High energy + low valence → **Dark & Intense**
  - Low energy + high valence → **Chill & Happy**
  - Low energy + low valence → **Melancholic**
  - High danceability → **Groove**
  - High instrumentalness + acousticness → **Ambient / Acoustic**

### 6. Galaxy Layout

Each cluster is placed at a pre-defined anchor point spread across 3D space:

```
Cluster 0:  (   0,    0,    0 )   — center of galaxy
Cluster 1:  ( 160,  130,  -80 )   — upper right
Cluster 2:  (-140, -120,   70 )   — lower left
Cluster 3:  (  40, -160,  150 )   — lower far
Cluster 4:  ( -80,  170, -150 )   — upper far left
Cluster 5:  ( 130, -140,  100 )   — lower right far
```

Within each cluster, tracks are scattered using:
- The PCA output as a local positional offset (±55 units)
- A deterministic per-track jitter in a spherical shell (radius 50–104 units), seeded from the track's Spotify ID

This creates wide nebula-like clouds of individual stars — dense enough to look like a cluster from a distance, sparse enough to fly through.

### 7. Rendering

The scene is rendered with React Three Fiber:

- **Star field**: 2000 background points for the space atmosphere
- **Track nodes**: Individual `meshBasicMaterial` spheres (radius 0.7) colored by cluster
- **Bloom**: `@react-three/postprocessing` bloom effect makes nodes glow
- **Cluster labels**: Floating `<Text>` from drei at each cluster centroid, always facing camera
- **Point lights**: One per cluster at its centroid, colored to match cluster hue

### 8. Camera & Controls

**Warp intro (GSAP)**:
- Camera starts at z=300, far behind the galaxy
- GSAP timeline: 1.2s rush forward with FOV kick (+30°), then 1.5s decelerate to resting position
- After arrival: cluster labels fade in

**Free flight (F key)**:
- Press F to lock cursor and enter fly mode
- WASD / Arrow keys: forward/back/strafe
- Space: fly up · Shift: fly down · Ctrl: 3× speed boost
- Mouse: look around (pointer lock API)
- Press F or Esc: exit fly mode, cursor returns

**Crosshair hover**:
- While flying, a crosshair appears at screen center
- Raycasts from camera center every frame against all track spheres
- Hits show the hover tooltip above the crosshair

---

## Project Structure

```
app/
  page.tsx                   # Landing page with login CTA
  callback/page.tsx          # OAuth PKCE token exchange
  visualizer/page.tsx        # Main visualizer UI + state
  layout.tsx
  globals.css

components/
  three/
    Scene.tsx                # R3F Canvas + postprocessing setup
    NodeCloud.tsx            # Per-track sphere meshes with hover/click
    ClusterLabels.tsx        # Floating 3D text labels per cluster
    WarpIntro.tsx            # GSAP cinematic camera intro
    FlyControls.tsx          # Free-flight keyboard + mouse look
    StarField.tsx            # Background star field (2000 points)
    CrosshairRaycaster.tsx   # Center-screen raycast for fly-mode hover

  ui/
    LoginButton.tsx          # Spotify green login button
    LoadingScreen.tsx        # Progress bar during data fetch + PCA
    HoverTooltip.tsx         # Track metadata overlay on hover
    TrackPanel.tsx           # Slide-in detail panel with radar chart

lib/
  auth.ts                    # PKCE helpers: verifier, challenge, token exchange
  spotify.ts                 # Spotify API fetching + genre-based feature derivation
  tsne.ts                    # PCA, k-means++, galaxy layout
  features.ts                # Feature normalization + cluster label generation

hooks/
  useSpotifyAuth.ts          # Token state management
  useTrackData.ts            # Full data pipeline orchestration
```

---

## Setup

### Prerequisites

- Node.js 18+
- A [Spotify Developer account](https://developer.spotify.com/dashboard)

### 1. Create a Spotify App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Fill in any name and description
4. Under **Redirect URIs**, add:
   - `http://127.0.0.1:3000/callback` (local development)
   - Your production URL + `/callback` (for deployment)
5. Under **APIs used**, select **Web API**
6. Save and copy your **Client ID**

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_REDIRECT_URI=http://127.0.0.1:3000/callback
```

> ⚠️ Use `127.0.0.1` not `localhost` — Spotify's dashboard accepts it without HTTPS warnings.

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

---

## Usage

1. **Login** with your Spotify account
2. Wait ~5 seconds while your tracks are fetched and the galaxy is built
3. The **warp intro** flies you in — press **Skip** to jump straight to the galaxy
4. **Hover** over any star to see the track name, artist, and audio profile
5. **Click** any star to open the detail panel (radar chart + Spotify link + similar tracks)
6. Press **F** to enter fly mode — use WASD + mouse to navigate between nebulae
7. Press **F** or **Esc** to exit fly mode and interact with nodes again

---

## Deployment

The app is a standard Next.js app with no server-side secrets — deploy to Vercel in one command:

```bash
npx vercel
```

Set the following environment variables in your Vercel project:

```
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
NEXT_PUBLIC_REDIRECT_URI=https://your-app.vercel.app/callback
```

Add `https://your-app.vercel.app/callback` to your Spotify app's Redirect URIs.

---

## Known Limitations

- **Audio features endpoint (403)**: Spotify locked `/v1/audio-features` for new developer apps in late 2024. Features are derived from artist genres instead. Results are musically meaningful but less precise than raw audio analysis.
- **~150 track limit**: Spotify's top tracks API caps at 50 per time range × 3 ranges. Heavy listeners with diverse taste will get the most visually interesting galaxies.
- **Mobile**: Free-flight controls require a keyboard. The galaxy renders and node inspection works, but flying is desktop-only.

---

## License

MIT — do whatever you want with it.

---

## Acknowledgements

- [Three.js](https://threejs.org/) — 3D rendering engine
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) — React renderer for Three.js
- [GSAP](https://gsap.com/) — Animation platform
- [Spotify Web API](https://developer.spotify.com/documentation/web-api) — Music data
- [Recharts](https://recharts.org/) — Radar chart component

---

*Built with Next.js · Deployed on Vercel · Powered by Spotify*
