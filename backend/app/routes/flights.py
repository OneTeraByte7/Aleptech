from fastapi import APIRouter, Query, HTTPException, Path
from typing import Optional
from datetime import datetime
import math

from app.data import FLIGHTS, STANDS, AIRCRAFT_SIZE_ORDER
from app.models import Flight, PaginatedFlights, PaginationMeta, ReassignRequest

router = APIRouter(prefix="/flights", tags=["flights"])


def parse_flight(f: dict) -> Flight:
    return Flight(**f)


def get_flight_by_id(flight_id: str) -> dict:
    return next((f for f in FLIGHTS if f["id"] == flight_id), None)


def get_stand_by_id(stand_id: str) -> dict:
    return next((s for s in STANDS if s["id"] == stand_id), None)


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def flights_overlap(f1: dict, f2: dict) -> bool:
    """Check if two flights overlap on the same stand."""
    start1 = parse_dt(f1["block_time_start"])
    end1 = parse_dt(f1["block_time_end"])
    start2 = parse_dt(f2["block_time_start"])
    end2 = parse_dt(f2["block_time_end"])
    return start1 < end2 and start2 < end1


def is_aircraft_compatible(aircraft_size: str, max_stand_size: str) -> bool:
    """Check if aircraft size fits within stand's max aircraft size."""
    if aircraft_size not in AIRCRAFT_SIZE_ORDER or max_stand_size not in AIRCRAFT_SIZE_ORDER:
        return False
    return AIRCRAFT_SIZE_ORDER.index(aircraft_size) <= AIRCRAFT_SIZE_ORDER.index(max_stand_size)


@router.get("", response_model=PaginatedFlights)
def list_flights(
    terminal: Optional[str] = Query(None, description="Filter by terminal (T1, T2, T3)"),
    status: Optional[str] = Query(None, description="Filter by status: on_time, delayed, early"),
    from_time: Optional[str] = Query(None, alias="from", description="ISO datetime lower bound for scheduled_time"),
    to_time: Optional[str] = Query(None, alias="to", description="ISO datetime upper bound for scheduled_time"),
    sort: Optional[str] = Query(None, description="Sort field: scheduled_time, flight_number, airline"),
    order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Results per page"),
):
    results = list(FLIGHTS)

    # Filters
    if terminal:
        results = [f for f in results if f["terminal"] == terminal]

    if status:
        valid_statuses = {"on_time", "delayed", "early"}
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status '{status}'. Must be one of: {', '.join(valid_statuses)}")
        results = [f for f in results if f["status"] == status]

    if from_time:
        try:
            from_dt = datetime.fromisoformat(from_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'from' datetime format. Use ISO 8601.")
        results = [f for f in results if parse_dt(f["scheduled_time"]) >= from_dt]

    if to_time:
        try:
            to_dt = datetime.fromisoformat(to_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid 'to' datetime format. Use ISO 8601.")
        results = [f for f in results if parse_dt(f["scheduled_time"]) <= to_dt]

    # Sorting
    valid_sort_fields = {"scheduled_time", "flight_number", "airline"}
    if sort:
        if sort not in valid_sort_fields:
            raise HTTPException(status_code=400, detail=f"Invalid sort field '{sort}'. Must be one of: {', '.join(valid_sort_fields)}")
        reverse = order == "desc"
        results = sorted(results, key=lambda f: f[sort], reverse=reverse)

    # Pagination
    total = len(results)
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    if page > total_pages and total > 0:
        raise HTTPException(status_code=400, detail=f"Page {page} exceeds total pages {total_pages}")

    start = (page - 1) * per_page
    end = start + per_page
    page_data = results[start:end]

    return PaginatedFlights(
        data=[parse_flight(f) for f in page_data],
        pagination=PaginationMeta(total=total, page=page, per_page=per_page, total_pages=total_pages),
    )


@router.get("/{flight_id}", response_model=Flight)
def get_flight(flight_id: str = Path(..., description="Flight ID, e.g. FL001")):
    flight = get_flight_by_id(flight_id)
    if not flight:
        raise HTTPException(
            status_code=404,
            detail={"error": "Flight not found", "flight_id": flight_id},
        )
    return parse_flight(flight)


@router.post("/{flight_id}/reassign", response_model=Flight)
def reassign_flight(
    flight_id: str = Path(..., description="Flight ID to reassign"),
    body: ReassignRequest = ...,
):
    # 1. Flight must exist
    flight = get_flight_by_id(flight_id)
    if not flight:
        raise HTTPException(
            status_code=404,
            detail={"error": "Flight not found", "flight_id": flight_id},
        )

    # 2. Target stand must exist
    target_stand = get_stand_by_id(body.target_stand_id)
    if not target_stand:
        raise HTTPException(
            status_code=404,
            detail={"error": "Target stand not found", "stand_id": body.target_stand_id},
        )

    # 3. Aircraft type compatibility
    if not is_aircraft_compatible(flight["aircraft_size"], target_stand["max_aircraft_size"]):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "Aircraft incompatible with stand",
                "aircraft_size": flight["aircraft_size"],
                "stand_max_size": target_stand["max_aircraft_size"],
                "message": f"Aircraft size {flight['aircraft_size']} exceeds stand max {target_stand['max_aircraft_size']}",
            },
        )

    # 4. No time overlap with existing assignments on target stand
    conflicting = [
        f for f in FLIGHTS
        if f["assigned_stand"] == body.target_stand_id
        and f["id"] != flight_id
        and flights_overlap(flight, f)
    ]
    if conflicting:
        conflict_info = [
            {"flight": c["flight_number"], "block_start": c["block_time_start"], "block_end": c["block_time_end"]}
            for c in conflicting
        ]
        raise HTTPException(
            status_code=409,
            detail={
                "error": "Stand occupied during flight time window",
                "conflicts": conflict_info,
            },
        )

    # All validations passed — update in-place
    flight["assigned_stand"] = body.target_stand_id
    return parse_flight(flight)


@router.post("", response_model=Flight)
def create_flight(flight: Flight):
    """Create a single flight entry with validations.

    Validations:
    - `id` must be unique
    - assigned stand must exist
    - aircraft must be compatible with stand
    - no time overlap on the same stand
    """
    # 1. Unique ID
    if get_flight_by_id(flight.id):
        raise HTTPException(status_code=409, detail={"error": "Flight ID already exists", "flight_id": flight.id})

    # 2. Assigned stand exists
    target_stand = get_stand_by_id(flight.assigned_stand)
    if not target_stand:
        raise HTTPException(status_code=404, detail={"error": "Assigned stand not found", "stand_id": flight.assigned_stand})

    # 3. Aircraft compatibility
    if not is_aircraft_compatible(flight.aircraft_size, target_stand["max_aircraft_size"]):
        raise HTTPException(
            status_code=409,
            detail={
                "error": "Aircraft incompatible with stand",
                "aircraft_size": flight.aircraft_size,
                "stand_max_size": target_stand["max_aircraft_size"],
            },
        )

    # 4. No time overlap with existing assignments on the same stand
    new_start = flight.block_time_start
    new_end = flight.block_time_end
    conflicts = []
    for f in FLIGHTS:
        if f["assigned_stand"] == flight.assigned_stand:
            existing_start = parse_dt(f["block_time_start"])
            existing_end = parse_dt(f["block_time_end"])
            if new_start < existing_end and existing_start < new_end:
                conflicts.append({"flight": f["flight_number"], "block_start": f["block_time_start"], "block_end": f["block_time_end"]})

    if conflicts:
        raise HTTPException(status_code=409, detail={"error": "Stand occupied during flight time window", "conflicts": conflicts})

    # Passed validation: append to in-memory store
    entry = flight.dict()
    # Convert datetimes to ISO strings for consistency with existing store
    for k in ("scheduled_time", "estimated_time", "block_time_start", "block_time_end"):
        v = entry.get(k)
        if isinstance(v, datetime):
            entry[k] = v.isoformat()

    FLIGHTS.append(entry)
    return parse_flight(entry)
