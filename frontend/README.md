
# Wubble QuickTune Mini

AI-powered music preview generator with separate frontend and backend architecture.

## Project Structure

```
wubble-quicktune-mini/
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── store/
│   │   ├── services/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.ts
├── backend/           # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── data/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend will run on http://localhost:3001

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on http://localhost:5173

## API Endpoints

- `GET /api/moods` - Get available moods
- `GET /api/genres` - Get available genres
- `GET /api/tracks?mood={mood}&genre={genre}` - Get random track
- `GET /api/tracks/all` - Get all tracks
- `GET /health` - Health check

## Features

- 🎛️ Mood & Genre Selection
- 🎶 AI-Simulated Track Generation
- 🔊 Audio Preview Player
- ❤️ Like/Favorite Tracks
- 📱 Responsive Design
- 🌙 Dark Theme
- 💾 LocalStorage Persistence
- 🕘 Recent Tracks History

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (State Management)
- React Query (API Calls)

**Backend:**
- Node.js + Express
- TypeScript
- CORS enabled
- RESTful API design

## Development

Both frontend and backend support hot reloading during development.

To add real audio files, place them in `backend/public/audio/` and update the URLs in `backend/src/data/mockTracks.ts`.
