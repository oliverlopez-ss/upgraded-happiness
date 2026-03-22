from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.gamestate import GameState
from ..services import data_service as ds
from ..services import season_service as ss

router = APIRouter(prefix="/gamestate", tags=["gamestate"])


@router.get("", response_model=GameState)
def get_gamestate(db: Session = Depends(get_db)):
    gs = ds.get_game_state(db)
    if not gs:
        raise HTTPException(404, "Game not initialised — run the seed script first.")
    return gs


@router.post("/start_season", response_model=GameState)
def start_season(db: Session = Depends(get_db)):
    return ss.start_season(db)


@router.post("/advance_matchday", response_model=GameState)
def advance_matchday(db: Session = Depends(get_db)):
    return ss.advance_matchday(db)


@router.post("/close_winter_window", response_model=GameState)
def close_winter_window(db: Session = Depends(get_db)):
    return ss.close_winter_window(db)


@router.post("/start_new_season", response_model=GameState)
def start_new_season(db: Session = Depends(get_db)):
    return ss.start_new_season(db)


@router.get("/awards")
def season_awards(db: Session = Depends(get_db)):
    return ss.compute_season_awards(db)
