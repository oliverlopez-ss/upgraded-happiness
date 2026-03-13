from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import clubs, squad, tactics, transfer, league, season, gamestate

app = FastAPI(
    title="La Liga Manager API",
    version="1.0.0",
    description="Football Manager-style game set in La Liga",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(gamestate.router)
app.include_router(season.router)
app.include_router(league.router)
app.include_router(clubs.router)
app.include_router(squad.router)
app.include_router(tactics.router)
app.include_router(transfer.router)


@app.get("/")
def root():
    return {
        "game": "La Liga Manager",
        "version": "1.0.0",
        "docs": "/docs",
    }
