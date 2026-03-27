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
