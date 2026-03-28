from fastapi import APIRouter, Query, HTTPException, Path
from typing import Optional, List

from app.data import GATES
from app.models import Gate

router = APIRouter(prefix="/gates", tags=["gates"])


@router.get("", response_model=List[Gate])
def list_gates(
    terminal: Optional[str] = Query(None, description="Filter by terminal"),
):
    results = list(GATES)
    
    if terminal:
        results = [g for g in results if g["terminal"] == terminal]
    
    return [Gate(**g) for g in results]


@router.get("/{gate_id}", response_model=Gate)
def get_gate(gate_id: str = Path(..., description="Gate ID, e.g. G01")):
    gate = next((g for g in GATES if g["id"] == gate_id), None)
    if not gate:
        raise HTTPException(
            status_code=404,
            detail={"error": "Gate not found", "gate_id": gate_id},
        )
    return Gate(**gate)