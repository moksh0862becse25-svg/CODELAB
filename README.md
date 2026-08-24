# Coding Practice Lab — Desktop App

React + Vite frontend wrapped in Electron, with an Express backend and Judge0 execution.

## What changed
- Windows desktop app via Electron.
- React UI with collapsible sidebar.
- Function signature is displayed above the editor.
- The editor accepts **logic only**; the backend wraps it inside the displayed function.
- Three result tabs: Hidden Tests, Output Console, and 2 Sample Tests.
- Hidden/sample execution is parallelized to reduce waiting time.
- API key stays out of the React frontend.
- Code and solved progress are saved locally.

## Setup
1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Put your Judge0 RapidAPI key in `.env`:

```env
JUDGE0_API_KEY=YOUR_REAL_KEY
```

## Development

```bash
npm run dev
```

Open `http://localhost:5173`.

## Desktop app

For a Windows installer/portable `.exe`:

```bash
npm run dist:win
```

Artifacts are written to `release/`.

For the installed/portable app, keep a `.env` file beside the executable containing your Judge0 key. Do not commit or share the `.env` file.
