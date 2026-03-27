# Aleph Airport — Take-Home Exercise

This repository contains a small full-stack project used for the Aleph "Full Stack Intern" take-home exercise. It includes a FastAPI backend (Task 1) and a React + Tailwind frontend (Tasks 2 & 3). Use the instructions below to run the app, run tests, and learn about design decisions.

## Structure
- `backend/` — FastAPI application, mock data, routes, and tests
- `frontend/` — React app (Vite + Tailwind)

## Quick start

Prerequisites: Python 3.11+, Node.js 18+ (or compatible), npm

1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: http://127.0.0.1:8000/health

2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is configured with a Vite proxy so requests from the browser to `/api/*` are forwarded to the backend on `127.0.0.1:8000`.

3. Tests (backend)

```bash
cd backend
pytest -q
```

## What I implemented

- Task 1: Flight Schedule API (backend)
  - Endpoints implemented in `backend/app/routes/*.py` (flights, stands)
  - Pydantic models and validation in `backend/app/models.py`
  - Mock data in `backend/app/data.py`
  - Tests covering happy paths and error cases in `backend/tests/test_api.py`

- Task 2: Stand Assignment Timeline (frontend)
  - Timeline visualization in `frontend/src/components/Timeline/index.jsx`
  - Uses an SVG timeline, hour grid, stand rows, and flight bars
  - Click and hover scaffolding provided

- Task 3: Operations Chat Interface (frontend)
  - Chat UI in `frontend/src/components/Chat/index.jsx`
  - Switched to a local simulated assistant (no external API key required)
  - Streaming / typing simulation and UI states (sending, disabled input)

## Design decisions & tradeoffs

- The backend keeps a simple in-memory dataset for the exercise. This keeps the project self-contained and easy to run.
- API responses use consistent shapes (`PaginatedFlights`, `Flight`, `StandWithOccupancy`) and proper HTTP status codes.
- Frontend uses an SVG-based timeline for pixel-accurate positioning of flight blocks across a 24-hour axis.
- Chat uses a local simulator to avoid external API keys in the repo; this can be swapped to a real LLM endpoint by replacing the fetch implementation in the chat component.

## Next steps / optional improvements

- Add persistent storage (SQLite/Postgres) and migrations
- Add authentication and role-based actions
- Add drag-and-drop reassign on the timeline with conflict detection
- Add more tests for frontend components (Jest/React Testing Library)

If you want me to run tests or start the frontend dev server in this environment, tell me and I'll run them and share the output.
# Aleph · Airport Operations Platform

A full-stack airport stand management system with a FastAPI backend and React + Vite frontend.

---

## Project Structure

```
aleph-airport/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app, CORS, router registration
│   │   ├── models.py        # Pydantic schemas
│   │   ├── data.py          # In-memory mock data (FLIGHTS, STANDS)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── flights.py   # GET /flights, GET /flights/{id}, POST /flights/{id}/reassign
│   │       └── stands.py    # GET /stands, GET /stands/{id}/schedule
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py      # 24 pytest tests
│   └── requirements.txt
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Chat/
    │   │   │   └── index.jsx    # AI chat panel (Claude-powered)
    │   │   ├── Stands/
    │   │   │   └── index.jsx    # Stand list + schedule + reassign modal
    │   │   ├── Timeline/
    │   │   │   └── index.jsx    # SVG Gantt chart (24h block-time view)
    │   │   ├── ui/
    │   │   │   └── index.jsx    # Shared primitives: Badge, Spinner, etc.
    │   │   ├── Dashboard.jsx    # Flight table with filters + detail panel
    │   │   ├── Header.jsx       # Top bar with UTC clock + live indicator
    │   │   └── Sidebar.jsx      # Icon navigation
    │   ├── hooks/
    │   │   └── useFetch.js      # Generic async data-fetching hook
    │   ├── api.js               # API client (proxied via Vite → FastAPI)
    │   ├── utils.js             # Formatters, constants
    │   ├── App.jsx              # BrowserRouter + layout
    │   ├── main.jsx             # React entry point
    │   └── index.css            # Design tokens + global styles
    ├── index.html
    ├── vite.config.js           # Vite + /api proxy to :8000
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## Prerequisites

| Tool    | Version     |
|---------|-------------|
| Python  | 3.11+       |
| Node.js | 18+         |
| npm     | 9+          |

---

## Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn app.main:app --reload --port 8000
```

API will be live at: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

### Run Tests

```bash
cd backend
python -m pytest tests/ -v
```

All 24 tests should pass.

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (proxies /api → localhost:8000)
npm run dev
```

Frontend will be live at: http://localhost:5173

> **Note:** The backend must be running for API calls to work.

### Build for Production

```bash
npm run build
npm run preview
```

---

## API Reference

### Flights

| Method | Endpoint                           | Description                        |
|--------|------------------------------------|------------------------------------|
| GET    | `/flights`                         | List flights (filter, sort, page)  |
| GET    | `/flights/{flight_id}`             | Get single flight by ID            |
| POST   | `/flights/{flight_id}/reassign`    | Reassign flight to a new stand     |

#### GET `/flights` query parameters

| Param      | Type   | Description                              |
|------------|--------|------------------------------------------|
| `terminal` | string | Filter by terminal: T1, T2              |
| `status`   | string | Filter: on_time, delayed, early          |
| `from`     | ISO 8601 | Minimum scheduled_time               |
| `to`       | ISO 8601 | Maximum scheduled_time               |
| `sort`     | string | Sort field: scheduled_time, flight_number, airline |
| `order`    | string | asc (default) or desc                   |
| `page`     | int    | Page number (default: 1)                 |
| `per_page` | int    | Results per page (default: 10, max: 100) |

#### POST `/flights/{flight_id}/reassign` body

```json
{ "target_stand_id": "A1-03" }
```

**Validation rules:**
- Flight must exist (404 if not)
- Target stand must exist (404 if not)
- Aircraft size must be ≤ stand's max aircraft size (409)
- No block-time overlap with existing assignments on target stand (409)

### Stands

| Method | Endpoint                         | Description                     |
|--------|----------------------------------|---------------------------------|
| GET    | `/stands`                        | List all stands with occupancy  |
| GET    | `/stands/{stand_id}/schedule`    | Get all flights for a stand     |

#### GET `/stands` query parameters

| Param      | Type   | Description                   |
|------------|--------|-------------------------------|
| `terminal` | string | Filter by terminal            |
| `type`     | string | Filter: contact or remote     |

---

## Features

- **Dashboard** — Paginated flight table with terminal/status filters, text search, and a slide-out detail panel
- **Timeline** — SVG-based Gantt chart showing all flights across stands over a 24h UTC window with a live NOW marker
- **Stands** — Stand browser with live occupancy indicators, per-stand flight schedules, and a drag-and-validate reassign modal
- **AI Chat** — Floating chat panel powered by Claude (claude-sonnet-4) for ops queries
- **Design** — Dark aviation ops aesthetic with Syne display font, JetBrains Mono for data, and CSS design tokens throughout
