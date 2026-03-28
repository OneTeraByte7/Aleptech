from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
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


class Gate(BaseModel):
    id: str
    terminal: str
    type: str
    is_plb: bool
    connected_stands: List[str]


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


# Graph models for Task 4
class GraphConnection(BaseModel):
    stand: str
    gate: str
    type: str
    distance_meters: Optional[float] = None


class GraphConstraint(BaseModel):
    stand_a: str
    stand_b: str
    type: str
    min_clearance_meters: float


class GraphData(BaseModel):
    plb_connections: List[GraphConnection]
    walking_connections: List[GraphConnection]  
    adjacency_constraints: List[GraphConstraint]


# Chat models for Task 3
class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant", "tool"]
    content: str
    timestamp: str
    tool_name: Optional[str] = None
    status: Optional[str] = None
    duration: Optional[str] = None


class ChatHistory(BaseModel):
    messages: List[ChatMessage]
    suggested_prompts: List[str]


# Metrics models
class MetricValue(BaseModel):
    current: int
    previous: Optional[int] = None
    target: Optional[int] = None
    unit: str


class DashboardMetrics(BaseModel):
    on_time_performance: MetricValue
    stand_utilization: MetricValue
    upcoming_arrivals_2h: MetricValue
    plb_usage: MetricValue
