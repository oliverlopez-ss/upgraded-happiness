from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db, GameStateORM
from ..models.player import Player
from ..models.gamestate import TransferRecord
from ..services import data_service as ds
from ..services import transfer_service as ts

router = APIRouter(prefix="/transfer", tags=["transfer"])


class BidRequest(BaseModel):
    player_id: str
    bid_fee: float   # millions €


class SellRequest(BaseModel):
    player_id: str
    list_only: bool = True   # True=list for sale, False=release immediately


@router.get("/available", response_model=List[Player])
def available_players(
    position: Optional[str] = Query(None),
    max_price: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")
    return ts.get_available_players(db, gs.user_club_id, position, max_price)


@router.post("/bid")
def submit_bid(body: BidRequest, db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")
    result = ts.submit_bid(db, gs.user_club_id, body.player_id, body.bid_fee)
    if not result["success"]:
        raise HTTPException(400, result["message"])
    return result


@router.post("/sell")
def sell_player(body: SellRequest, db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")
    result = ts.sell_player(db, gs.user_club_id, body.player_id, body.list_only)
    if not result["success"]:
        raise HTTPException(400, result["message"])
    return result


@router.get("/history", response_model=List[TransferRecord])
def transfer_history(db: Session = Depends(get_db)):
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        raise HTTPException(404, "No active game.")
    return ds.get_transfer_history(db, gs.season_year)


@router.get("/window")
def window_status(db: Session = Depends(get_db)):
    return {"open": ts.is_window_open(db)}
