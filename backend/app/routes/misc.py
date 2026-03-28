from fastapi import APIRouter
from app.data import GRAPH_EDGES, DASHBOARD_METRICS, CHAT_HISTORY

router = APIRouter(tags=["misc"])


@router.get("/graph")
def get_graph():
    """Get graph data for Task 4 - Airport Resource Graph"""
    return GRAPH_EDGES


@router.get("/metrics")
def get_dashboard_metrics():
    """Get dashboard metrics for frontend display"""
    return DASHBOARD_METRICS


@router.get("/chat/history")
def get_chat_history():
    """Get chat history for Task 3 - Operations Chat Interface"""
    return CHAT_HISTORY