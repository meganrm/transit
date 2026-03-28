# Transit

React + TypeScript + Vite app for comparing transit commute times with driving.

## Local Development

```bash
npm install
npm run dev
```

## Real Data Bootstrap (Phase 1)

The app can now load route data from a runtime JSON endpoint.

1. Copy `.env.example` to `.env`.
2. Set `VITE_ROUTES_DATA_URL` to your route-data endpoint.
3. Start the app with `npm run dev`.

If `VITE_ROUTES_DATA_URL` is missing, or the request fails validation, the app automatically falls back to bundled demo data in `src/data/routes.ts`.

### Generate a Feed File Locally

The repo includes a feed generator that merges route seed data with optional overlays for traffic, transit, and ridership.

1. Initialize local override files (one-time):

```bash
npm run generate:routes:init
```

2. Edit any of these files as your real extracts become available:

- `data-input/traffic-overrides.json`
- `data-input/transit-overrides.json`
- `data-input/ridership-overrides.json`

3. Generate the feed payload consumed by the app:

```bash
npm run generate:routes
```

Output path (default): `public/data/routes.feed.json`

1. Point the app at the generated feed in `.env`:

```bash
VITE_ROUTES_DATA_URL=/data/routes.feed.json
```

Advanced options:

```bash
npm run generate:routes -- --out public/data/my-feed.json --source-label "Metro GTFS + traffic API"
```

### Build Transit Overrides From GTFS

Use this when you have a GTFS export and want to auto-populate `transit-overrides.json`.

Expected GTFS files in a directory:

- `routes.txt`
- `trips.txt`
- `stop_times.txt`

1. Define route matching in `data-input/gtfs-route-map.json`.
  You can start from `data-input/gtfs-route-map.example.json`.

2. Run the GTFS adapter:

```bash
npm run generate:transit:gtfs -- --gtfs-dir data-input/gtfs
```

This writes `data-input/transit-overrides.json`.

3. Regenerate the app feed:

```bash
npm run generate:routes
```

Route map fields:

- `id`: app route id from `src/data/routes.ts`
- `gtfsRouteIds`: optional explicit GTFS `route_id` matches
- `gtfsRouteShortNames`: optional GTFS `route_short_name` matches
- `gtfsRouteLongNames`: optional GTFS `route_long_name` matches
- `percentile`: optional percentile over trip durations (default `50`)
- `multiplier`: optional scalar applied to computed minutes
- `addMinutes`: optional fixed minute offset after scaling
- `transitModes`: optional replacement labels for route panel display

### Build Traffic Overrides From Matrix Outputs

Use this when you have no-traffic and peak-traffic travel-time matrices from a routing API.

1. Define route index mapping in `data-input/traffic-matrix-map.json`.
  You can start from `data-input/traffic-matrix-map.example.json`.

2. Provide two matrix files (examples in `data-input/no-traffic-matrix.example.json` and `data-input/peak-traffic-matrix.example.json`).

Supported matrix payloads:

- `{ "unit": "seconds" | "minutes", "matrix": [[...]] }`
- bare `[[...]]` 2D array (treated as seconds)
- Google Distance Matrix rows/elements shape

3. Run adapter:

```bash
npm run generate:traffic:matrix -- --no-traffic data-input/no-traffic-matrix.json --peak-traffic data-input/peak-traffic-matrix.json
```

This writes `data-input/traffic-overrides.json`.

4. Regenerate final feed:

```bash
npm run generate:routes
```

Traffic map fields:

- `id`: app route id from `src/data/routes.ts`
- `originIndex`: matrix row index
- `destinationIndex`: matrix column index
- `noTrafficMultiplier` / `peakTrafficMultiplier`: optional scaling factors
- `noTrafficAddMinutes` / `peakTrafficAddMinutes`: optional minute offsets

### Supported Payload Shapes

Shape A:

```json
[
  {
    "id": 1,
    "name": "Ballard → South Lake Union",
    "description": "Neighborhood to tech hub",
    "coordinates": [[47.6677, -122.3849], [47.6276, -122.3387]],
    "carMinutes": 14,
    "carMinutesPeak": 22,
    "transitMinutes": 25,
    "transitModes": ["RapidRide D Line"],
    "dailyCommuters": 18500,
    "peakHours": "7–9 AM & 4–6 PM"
  }
]
```

Shape B:

```json
{
  "sourceLabel": "GTFS + traffic model",
  "generatedAt": "2026-03-27T16:30:00Z",
  "routes": [
    {
      "id": 1,
      "name": "Ballard → South Lake Union",
      "description": "Neighborhood to tech hub",
      "coordinates": [[47.6677, -122.3849], [47.6276, -122.3387]],
      "carMinutes": 14,
      "carMinutesPeak": 22,
      "transitMinutes": 25,
      "transitModes": ["RapidRide D Line"],
      "dailyCommuters": 18500,
      "peakHours": "7–9 AM & 4–6 PM"
    }
  ]
}
```

## Build

```bash
npm run build
```
