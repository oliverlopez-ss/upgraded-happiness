from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db, GameStateORM
from ..models.gamestate import Tactics
from ..services import data_service as ds
from ..services import tactics_service as ts

router = APIRouter(prefix="/tactics", tags=["tactics"])


class TacticsUpdate(BaseModel):
    formation: str
    starting_xi: List[str]   # 11 player ids in formation slot order
    bench: List[str] = []


@router.get("", response_model=Tactics)
def get_tactics(db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")
    return ts.get_or_create_tactics(db, gs.user_club_id)


@router.post("", response_model=Tactics)
def set_tactics(body: TacticsUpdate, db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")

    valid, msg = ts.validate_tactics(db, gs.user_club_id, body.formation, body.starting_xi)
    if not valid:
        raise HTTPException(400, msg)

    tactics = Tactics(
        club_id=gs.user_club_id,
        formation=body.formation,
        starting_xi=body.starting_xi,
        bench=body.bench,
    )
    return ds.save_tactics(db, tactics)


@router.post("/auto", response_model=Tactics)
def auto_pick(formation: str = "4-3-3", db: Session = Depends(get_db)):
    """Let the engine automatically pick the best XI for a formation."""
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")

    from ..models.club import VALID_FORMATIONS
    if formation not in VALID_FORMATIONS:
        raise HTTPException(400, f"Invalid formation. Choose from: {', '.join(VALID_FORMATIONS)}")

    xi_ids = ts.auto_pick_xi(db, gs.user_club_id, formation)
    all_players = ds.get_players_by_club(db, gs.user_club_id)
    bench = [p.id for p in all_players if p.id not in xi_ids][:12]

    tactics = Tactics(club_id=gs.user_club_id, formation=formation,
                      starting_xi=xi_ids, bench=bench)
    return ds.save_tactics(db, tactics)
