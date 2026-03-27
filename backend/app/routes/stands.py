from fastapi import APIRouter, Query, HTTPException, Path
from typing import Optional, List
from datetime import datetime, timezone

from app.data import FLIGHTS, STANDS
from app.models import Stand, StandWithOccupancy, Flight

router = APIRouter(prefix="/stands", tags=["stands"])


def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def get_current_occupancy(stand_id: str) -> tuple[bool, Optional[str]]:
    """Returns (is_occupied, flight_number_or_None) for the current moment."""
    now = datetime.now(timezone.utc)
    for flight in FLIGHTS:
        if flight["assigned_stand"] == stand_id:
            start = parse_dt(flight["block_time_start"])
            end = parse_dt(flight["block_time_end"])
            if start <= now <= end:
                return True, flight["flight_number"]
    return False, None


@router.get("", response_model=List[StandWithOccupancy])
def list_stands(
    terminal: Optional[str] = Query(None, description="Filter by terminal"),
    type: Optional[str] = Query(None, description="Filter by type: contact or remote"),
):
    results = list(STANDS)

    if terminal:
        results = [s for s in results if s["terminal"] == terminal]

    if type:
        valid_types = {"contact", "remote"}
        if type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid type '{type}'. Must be: contact or remote")
        results = [s for s in results if s["type"] == type]

    output = []
    for s in results:
        is_occupied, current_flight = get_current_occupancy(s["id"])
        output.append(StandWithOccupancy(**s, is_occupied=is_occupied, current_flight=current_flight))

    return output


@router.get("/{stand_id}/schedule", response_model=List[Flight])
def get_stand_schedule(stand_id: str = Path(..., description="Stand ID, e.g. A1-01")):
    # Verify stand exists
    stand = next((s for s in STANDS if s["id"] == stand_id), None)
    if not stand:
        raise HTTPException(
            status_code=404,
            detail={"error": "Stand not found", "stand_id": stand_id},
        )

    # Get all flights for this stand, ordered by block_time_start
    stand_flights = [
        f for f in FLIGHTS if f["assigned_stand"] == stand_id
    ]
    stand_flights.sort(key=lambda f: f["block_time_start"])

    return [Flight(**f) for f in stand_flights]
