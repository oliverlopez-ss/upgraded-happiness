from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, GameStateORM
from ..models.league import StandingsEntry
from ..services import data_service as ds

router = APIRouter(prefix="/league", tags=["league"])


@router.get("/standings", response_model=List[StandingsEntry])
def standings(db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active season.")
    return ds.get_standings(db, gs.season_year)
