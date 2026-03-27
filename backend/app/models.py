from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class Position(BaseModel):
    x: float
    y: float


class Flight(BaseModel):
    id: str
    flight_number: str
    airline: str
    aircraft_type: str
    aircraft_size: str
    origin: str
    destination: str
    terminal: str
    assigned_stand: str
    operation: Literal["arrival", "departure"]
    scheduled_time: datetime
    estimated_time: datetime
    block_time_start: datetime
    block_time_end: datetime
    status: Literal["on_time", "delayed", "early"]
    pax_count: int


class Stand(BaseModel):
    id: str
    terminal: str
    type: Literal["contact", "remote"]
    has_plb: bool
    max_aircraft_size: str
    associated_gate: Optional[str] = None
    position: Position


class StandWithOccupancy(Stand):
    is_occupied: bool
    current_flight: Optional[str] = None  # flight_number if occupied


class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int


class PaginatedFlights(BaseModel):
    data: List[Flight]
    pagination: PaginationMeta


class ReassignRequest(BaseModel):
    target_stand_id: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
