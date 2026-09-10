# jobs-monitor-web

Frontend for monitoring job offers on Israeli recruitment sites.
React + TypeScript + Vite.

Backend lives in a separate repo: **jobs-monitor-api** (FastAPI).

## Features

- One **Rafraîchir** button per source (Ness, Malam Team, ...).
- Job cards: job number, title, location, excerpt, apply link.
- **Nouveau** badge on offers never seen before (tracked by the backend).
- **Hot** badge for offers the site flags as hot.
- Hebrew content rendered right-to-left automatically (`dir="auto"`).
- Light / dark theme via `prefers-color-scheme`.

## Setup

```bash
pnpm install
cp .env.example .env   # adjust VITE_API_URL if the API is not on :8000
```

## Run

Start the backend first (see the jobs-monitor-api repo), then:

```bash
pnpm dev
```

App: http://localhost:5173

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the backend API |

## Build

```bash
pnpm build
```
