from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, GameStateORM
from ..models.player import Player
from ..services import data_service as ds

router = APIRouter(prefix="/squad", tags=["squad"])


@router.get("", response_model=List[Player])
def get_user_squad(db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")
    players = ds.get_players_by_club(db, gs.user_club_id)
    return sorted(players, key=lambda p: p.position_overall(), reverse=True)


@router.get("/{club_id}", response_model=List[Player])
def get_club_squad(club_id: str, db: Session = Depends(get_db)):
    players = ds.get_players_by_club(db, club_id)
    if not players:
        raise HTTPException(404, f"No players found for club '{club_id}'.")
    return sorted(players, key=lambda p: p.position_overall(), reverse=True)
