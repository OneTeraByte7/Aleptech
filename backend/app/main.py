from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.flights import router as flights_router
from app.routes.stands import router as stands_router
from app.routes.gates import router as gates_router
from app.routes.misc import router as misc_router

app = FastAPI(
    title="Aleph Airport Operations API",
    description="REST API for managing flight schedules and stand assignments at an airport.",
    version="1.0.0",
)

# Allow all origins for development / local frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flights_router)
app.include_router(stands_router)
app.include_router(gates_router)
app.include_router(misc_router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "Aleph Airport Operations API", "version": "1.0.0"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
