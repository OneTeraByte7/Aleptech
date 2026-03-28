# Aleph Airport

Comprehensive full-stack airport operations demo with a FastAPI backend and a React + Vite frontend. This repository demonstrates flight scheduling, stand/stand assignment timeline, an operations chat interface, and an airport resource graph — including several bonus features.

## Introduction

Aleph Airport is a focused take-home project that simulates critical airport operations: flight listing and reassignment, visual stand timelines, an operations chat interface, and an interactive resource graph. It is intended as a production-capable prototype that is easy to extend and deploy.

## Features

- **Flight Schedule API (Backend)**: Full REST API implemented with FastAPI, including filtering, sorting, pagination, validation, and reassignment endpoints.
- **Stand Assignment Timeline (Frontend)**: Gantt-style timeline with precise time positioning, drag-and-drop reassignment, conflict detection, zoom controls, and a live "NOW" marker.
- **Operations Chat Interface**: User/assistant/tool messages, streaming responses, suggested prompts, and tool/system messages that show backend operations.
- **Airport Resource Graph**: D3-based interactive graph visualizing stands, gates, and connections with layer toggles, zoom/pan, and occupancy indicators.
- **Extras**: Dark/light theme, responsive UI, professional landing page, real-time updates via optimistic UI updates, and thorough error handling.

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm 9+

### Backend (Windows - PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or macOS / Linux (bash):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open the API docs at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the app at: http://localhost:5173 (app at `/app`). The frontend is configured to proxy API requests to the backend during development.

### Tests

Run backend tests:

```bash
cd backend
python -m pytest tests/ -v
```

## Project Layout

- `backend/` — FastAPI application
    - `app/main.py` — Application entry and CORS
    - `app/models.py` — Pydantic models
    - `app/data.py` — In-memory data and helpers
    - `app/routes/` — `flights.py`, `stands.py`, `gates.py`, `misc.py`
    - `tests/` — Backend tests
- `frontend/` — React + Vite app
    - `src/components/` — UI components (Timeline, Chat, Graph, Dashboard)
    - `src/api.js` — API client

## API Overview

Common endpoints:

- `GET /flights` — list flights (supports `terminal`, `status`, `from`, `to`, `sort`, `order`, `page`, `per_page`)
- `GET /flights/{id}` — single flight
- `POST /flights/{id}/reassign` — reassign stand for a flight
- `GET /stands` — list stands and occupancy
- `GET /stands/{id}/schedule` — stand schedule
- `GET /graph` — resource graph (nodes + edges)

Refer to the OpenAPI docs at `/docs` for full details.

## Design Notes

- The backend uses Pydantic models for strict validation and clear error responses.
- Data currently uses an in-memory store to simplify the exercise; the code is structured for an easy migration to a relational DB (e.g., PostgreSQL).
- The timeline uses SVG for accessibility and precise rendering; the graph uses D3 for layout and interaction.
- Drag-and-drop operations are implemented with optimistic UI updates and server-side validation to prevent conflicts.

## Deployment & Production Considerations

- Replace the in-memory store with a persistent database and add migrations.
- Add authentication and authorization (e.g., JWT + RBAC) for production safety.
- Integrate error monitoring (Sentry) and observability (Prometheus/Grafana).
- Add caching (Redis) and background workers for heavy tasks.

### Example Dockerfile (backend)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ ./
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Testing Strategy

- Backend tests cover endpoints, validation, pagination, reassignment logic, conflict detection, and graph endpoints.
- Frontend is manually tested across flows; component tests can be added with a test runner (Jest + React Testing Library).

## Next Steps

1. Migrate to a persistent DB with proper seed data and migrations.
2. Add WebSocket-based real-time updates for multi-user sync.
3. Optional: integrate an LLM-backed assistant for advanced operations guidance.

---

If you'd like, I can run the test suite or add a short README section describing the API schemas in detail.
