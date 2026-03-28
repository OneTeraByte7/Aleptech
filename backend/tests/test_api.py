"""
Test suite for the Aleph Airport Operations API.
Covers happy paths and key error cases.
"""
import pytest
from fastapi.testclient import TestClient

# Reset FLIGHTS data before each test so reassign mutations don't bleed between tests
import app.data as mock_data
import copy

from app.main import app

client = TestClient(app)

ORIGINAL_FLIGHTS = copy.deepcopy(mock_data.FLIGHTS)


@pytest.fixture(autouse=True)
def reset_flights():
    """Restore original FLIGHTS list before every test."""
    mock_data.FLIGHTS.clear()
    mock_data.FLIGHTS.extend(copy.deepcopy(ORIGINAL_FLIGHTS))
    yield
    mock_data.FLIGHTS.clear()
    mock_data.FLIGHTS.extend(copy.deepcopy(ORIGINAL_FLIGHTS))


# ─── Health ──────────────────────────────────────────────────────────────────

def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


# ─── GET /flights ─────────────────────────────────────────────────────────────

def test_list_flights_default_pagination():
    resp = client.get("/flights")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "pagination" in body
    pagination = body["pagination"]
    assert pagination["per_page"] == 10
    assert pagination["page"] == 1
    assert pagination["total"] == 10  # We have exactly 10 flights


def test_list_flights_filter_by_terminal():
    resp = client.get("/flights?terminal=T1")
    assert resp.status_code == 200
    body = resp.json()
    # All returned flights should be in T1
    for flight in body["data"]:
        assert flight["terminal"] == "T1"


def test_list_flights_filter_by_status():
    resp = client.get("/flights?status=delayed")
    assert resp.status_code == 200
    body = resp.json()
    for flight in body["data"]:
        assert flight["status"] == "delayed"


def test_list_flights_invalid_status():
    resp = client.get("/flights?status=invalid_status")
    assert resp.status_code == 400
    assert "Invalid status" in resp.json()["detail"]


def test_list_flights_sort_by_flight_number():
    resp = client.get("/flights?sort=flight_number&order=asc")
    assert resp.status_code == 200
    body = resp.json()
    flight_numbers = [f["flight_number"] for f in body["data"]]
    assert flight_numbers == sorted(flight_numbers)


def test_list_flights_pagination():
    resp = client.get("/flights?page=1&per_page=3")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 3
    assert body["pagination"]["page"] == 1
    assert body["pagination"]["per_page"] == 3


# ─── GET /flights/{flight_id} ────────────────────────────────────────────────

def test_get_flight_found():
    resp = client.get("/flights/FL001")
    assert resp.status_code == 200
    flight = resp.json()
    assert flight["id"] == "FL001"
    assert flight["flight_number"] == "EK203"


def test_get_flight_not_found():
    resp = client.get("/flights/NONEXISTENT")
    assert resp.status_code == 404
    assert "Flight not found" in resp.json()["detail"]["error"]


# ─── POST /flights/{flight_id}/reassign ─────────────────────────────────────

def test_reassign_flight_success():
    resp = client.post("/flights/FL001/reassign", json={"target_stand_id": "A1-04"})
    assert resp.status_code == 200
    flight = resp.json()
    assert flight["assigned_stand"] == "A1-04"


def test_reassign_flight_not_found():
    resp = client.post("/flights/NONEXISTENT/reassign", json={"target_stand_id": "A1-04"})
    assert resp.status_code == 404


def test_reassign_flight_stand_not_found():
    resp = client.post("/flights/FL001/reassign", json={"target_stand_id": "NONEXISTENT"})
    assert resp.status_code == 404


def test_reassign_flight_aircraft_incompatible():
    # FL001 is A380 (size F), trying to assign to A1-04 (max size D)
    resp = client.post("/flights/FL001/reassign", json={"target_stand_id": "A1-04"})
    assert resp.status_code == 409
    assert "Aircraft incompatible" in resp.json()["detail"]["error"]


def test_reassign_flight_time_conflict():
    # Try to assign FL003 (07:00-09:15) to A1-01 where FL001 (06:30-08:45) is already assigned
    resp = client.post("/flights/FL003/reassign", json={"target_stand_id": "A1-01"})
    assert resp.status_code == 409
    assert "Stand occupied" in resp.json()["detail"]["error"]


# ─── GET /stands ─────────────────────────────────────────────────────────────

def test_list_stands():
    resp = client.get("/stands")
    assert resp.status_code == 200
    stands = resp.json()
    assert len(stands) == 10  # We have 10 stands
    # Each stand should have occupancy info
    for stand in stands:
        assert "is_occupied" in stand
        assert "current_flight" in stand


def test_list_stands_filter_by_terminal():
    resp = client.get("/stands?terminal=T1")
    assert resp.status_code == 200
    stands = resp.json()
    for stand in stands:
        assert stand["terminal"] == "T1"


def test_list_stands_filter_by_type():
    resp = client.get("/stands?type=contact")
    assert resp.status_code == 200
    stands = resp.json()
    for stand in stands:
        assert stand["type"] == "contact"


def test_list_stands_invalid_type():
    resp = client.get("/stands?type=invalid_type")
    assert resp.status_code == 400
    assert "Invalid type" in resp.json()["detail"]


# ─── GET /stands/{stand_id}/schedule ────────────────────────────────────────

def test_get_stand_schedule():
    resp = client.get("/stands/A1-01/schedule")
    assert resp.status_code == 200
    flights = resp.json()
    # All flights should be assigned to this stand
    for flight in flights:
        assert flight["assigned_stand"] == "A1-01"
    # Should be sorted by block_time_start
    if len(flights) > 1:
        for i in range(len(flights) - 1):
            assert flights[i]["block_time_start"] <= flights[i+1]["block_time_start"]


def test_get_stand_schedule_not_found():
    resp = client.get("/stands/NONEXISTENT/schedule")
    assert resp.status_code == 404
    assert "Stand not found" in resp.json()["detail"]["error"]


# ─── GET /gates ──────────────────────────────────────────────────────────────

def test_list_gates():
    resp = client.get("/gates")
    assert resp.status_code == 200
    gates = resp.json()
    assert len(gates) > 0
    for gate in gates:
        assert "id" in gate
        assert "terminal" in gate
        assert "connected_stands" in gate


def test_get_gate():
    resp = client.get("/gates/G01")
    assert resp.status_code == 200
    gate = resp.json()
    assert gate["id"] == "G01"


def test_get_gate_not_found():
    resp = client.get("/gates/NONEXISTENT")
    assert resp.status_code == 404


# ─── Misc endpoints ──────────────────────────────────────────────────────────

def test_get_graph_data():
    resp = client.get("/graph")
    assert resp.status_code == 200
    data = resp.json()
    assert "plb_connections" in data
    assert "walking_connections" in data
    assert "adjacency_constraints" in data


def test_get_dashboard_metrics():
    resp = client.get("/metrics")
    assert resp.status_code == 200
    metrics = resp.json()
    assert "on_time_performance" in metrics
    assert "stand_utilization" in metrics
    assert "upcoming_arrivals_2h" in metrics
    assert "plb_usage" in metrics


def test_get_chat_history():
    resp = client.get("/chat/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "messages" in data
    assert "suggested_prompts" in data


# ─── Input validation ────────────────────────────────────────────────────────

def test_flights_per_page_limits():
    resp = client.get("/flights?per_page=0")
    assert resp.status_code == 422  # Pydantic validation error

    resp = client.get("/flights?per_page=101")
    assert resp.status_code == 422  # Exceeds max


def test_flights_invalid_date_format():
    resp = client.get("/flights?from=invalid-date")
    assert resp.status_code == 400
    assert "Invalid" in resp.json()["detail"]


def test_list_flights_filter_by_terminal():
    resp = client.get("/flights?terminal=T1")
    assert resp.status_code == 200
    body = resp.json()
    for flight in body["data"]:
        assert flight["terminal"] == "T1"


def test_list_flights_filter_by_status_delayed():
    resp = client.get("/flights?status=delayed")
    assert resp.status_code == 200
    body = resp.json()
    for flight in body["data"]:
        assert flight["status"] == "delayed"
    assert body["pagination"]["total"] == 2  # QR501 and AF218


def test_list_flights_filter_invalid_status():
    resp = client.get("/flights?status=unknown")
    assert resp.status_code == 400


def test_list_flights_sort_by_scheduled_time_asc():
    resp = client.get("/flights?sort=scheduled_time&order=asc&per_page=10")
    assert resp.status_code == 200
    times = [f["scheduled_time"] for f in resp.json()["data"]]
    assert times == sorted(times)


def test_list_flights_sort_by_scheduled_time_desc():
    resp = client.get("/flights?sort=scheduled_time&order=desc&per_page=10")
    assert resp.status_code == 200
    times = [f["scheduled_time"] for f in resp.json()["data"]]
    assert times == sorted(times, reverse=True)


def test_list_flights_pagination():
    resp = client.get("/flights?page=1&per_page=3")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 3
    assert body["pagination"]["total_pages"] == 4  # ceil(10/3)
    assert body["pagination"]["page"] == 1


def test_list_flights_page_out_of_range():
    resp = client.get("/flights?page=999&per_page=10")
    assert resp.status_code == 400


def test_list_flights_filter_by_time_range():
    resp = client.get("/flights?from=2025-01-15T06:00:00Z&to=2025-01-15T09:00:00Z")
    assert resp.status_code == 200
    body = resp.json()
    # Only flights scheduled between 06:00 and 09:00
    for flight in body["data"]:
        assert flight["scheduled_time"] >= "2025-01-15T06:00:00"
        assert flight["scheduled_time"] <= "2025-01-15T09:00:01"


def test_list_flights_invalid_from_date():
    resp = client.get("/flights?from=not-a-date")
    assert resp.status_code == 400


# ─── GET /flights/{flight_id} ─────────────────────────────────────────────────

def test_get_flight_by_id_success():
    resp = client.get("/flights/FL001")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "FL001"
    assert body["flight_number"] == "EK203"
    assert body["airline"] == "Emirates"


def test_get_flight_by_id_not_found():
    resp = client.get("/flights/FL999")
    assert resp.status_code == 404
    body = resp.json()
    assert "error" in str(body).lower() or "detail" in body


# ─── GET /stands ──────────────────────────────────────────────────────────────

def test_list_stands():
    resp = client.get("/stands")
    assert resp.status_code == 200
    stands = resp.json()
    assert len(stands) == 10
    for s in stands:
        assert "id" in s
        assert "is_occupied" in s


def test_list_stands_filter_terminal():
    resp = client.get("/stands?terminal=T2")
    assert resp.status_code == 200
    stands = resp.json()
    for s in stands:
        assert s["terminal"] == "T2"


def test_list_stands_filter_type():
    resp = client.get("/stands?type=remote")
    assert resp.status_code == 200
    stands = resp.json()
    for s in stands:
        assert s["type"] == "remote"


def test_list_stands_invalid_type():
    resp = client.get("/stands?type=floating")
    assert resp.status_code == 400


# ─── GET /stands/{stand_id}/schedule ─────────────────────────────────────────

def test_stand_schedule_ordered_chronologically():
    resp = client.get("/stands/A1-01/schedule")
    assert resp.status_code == 200
    flights = resp.json()
    assert len(flights) == 2  # FL001 and FL002 both on A1-01
    times = [f["block_time_start"] for f in flights]
    assert times == sorted(times)


def test_stand_schedule_not_found():
    resp = client.get("/stands/Z9-99/schedule")
    assert resp.status_code == 404


# ─── POST /flights/{flight_id}/reassign ──────────────────────────────────────

def test_reassign_flight_success():
    # FL009 (B787-9, size E) → A1-05 (max E, no conflicts at its time window)
    resp = client.post("/flights/FL009/reassign", json={"target_stand_id": "A1-05"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["assigned_stand"] == "A1-05"


def test_reassign_flight_not_found():
    resp = client.post("/flights/FL999/reassign", json={"target_stand_id": "A1-01"})
    assert resp.status_code == 404


def test_reassign_stand_not_found():
    resp = client.post("/flights/FL001/reassign", json={"target_stand_id": "Z9-99"})
    assert resp.status_code == 404


def test_reassign_aircraft_incompatible_with_stand():
    # FL001 is an A380 (size F). A1-04 max_aircraft_size is D.
    resp = client.post("/flights/FL001/reassign", json={"target_stand_id": "A1-04"})
    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert "incompatible" in str(detail).lower() or "size" in str(detail).lower()


def test_reassign_time_conflict():
    # FL001 occupies A1-01 from 06:30–08:45.
    # FL003 (07:00–09:15) trying to move to A1-01 should conflict.
    resp = client.post("/flights/FL003/reassign", json={"target_stand_id": "A1-01"})
    assert resp.status_code == 409
    detail = resp.json()["detail"]
    assert "conflict" in str(detail).lower() or "occupied" in str(detail).lower()
