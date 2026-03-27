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
