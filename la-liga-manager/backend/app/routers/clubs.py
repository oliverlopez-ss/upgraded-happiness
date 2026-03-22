from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.club import Club, ClubSummary
from ..services import data_service as ds

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.get("", response_model=List[ClubSummary])
def list_clubs(db: Session = Depends(get_db)):
    clubs = ds.get_all_clubs(db)
    return [
        ClubSummary(
            id=c.id, name=c.name, short_name=c.short_name,
            city=c.city, stadium=c.stadium,
            budget=c.budget, wage_budget=c.wage_budget,
            current_formation=c.current_formation,
            squad_size=len(c.squad), tier=c.tier,
        )
        for c in clubs
    ]


@router.get("/{club_id}", response_model=Club)
def get_club(club_id: str, db: Session = Depends(get_db)):
    club = ds.get_club(db, club_id)
    if not club:
        raise HTTPException(404, f"Club '{club_id}' not found.")
    return club
