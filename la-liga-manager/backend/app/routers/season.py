from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, GameStateORM
from ..models.season import MatchResult, Fixture
from ..services import data_service as ds
from ..services import season_service as ss

router = APIRouter(prefix="/season", tags=["season"])


@router.get("/fixtures", response_model=List[Fixture])
def all_fixtures(db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active season.")
    return ds.get_all_fixtures(db, gs.season_year)


@router.get("/fixtures/{matchday}", response_model=List[Fixture])
def matchday_fixtures(matchday: int, db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active season.")
    return ds.get_fixtures_for_matchday(db, gs.season_year, matchday)


@router.post("/simulate", response_model=List[MatchResult])
def simulate_matchday(db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs or gs.phase != "matchday_pending":
        raise HTTPException(400, "Not in matchday_pending phase.")
    results = ss.simulate_matchday(db)
    if not results:
        raise HTTPException(400, "No fixtures to simulate.")
    return results
