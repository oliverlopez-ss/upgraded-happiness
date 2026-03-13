"""
Transfer market service.

Business rules
--------------
• Two windows: summer (matchday 0 / pre_season) and winter (after matchday 19).
• Available players = free agents + transfer-listed players from other clubs.
• Bid accepted when fee >= market_value * acceptance_threshold.
• acceptance_threshold varies by selling club tier (richer clubs demand more).
• CPU clubs run simple AI transfers at window open/close.
• Wage budget is tracked separately from transfer budget.
"""
from __future__ import annotations

import random
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from ..database import PlayerORM, ClubORM, GameStateORM, TransferRecordORM
from ..models.player import Player
from ..models.gamestate import TransferRecord
from . import data_service as ds

# Acceptance threshold per tier (fraction of market_value required)
_ACCEPTANCE: dict[int, float] = {
    1: 1.10,   # elite clubs hold out
    2: 1.00,
    3: 0.90,
    4: 0.80,
}

# Wage margin clubs accept over their weekly budget
_WAGE_TOLERANCE = 0.10  # 10 %


# ---------------------------------------------------------------------------
# Window helpers
# ---------------------------------------------------------------------------

def is_window_open(db: Session) -> bool:
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    return bool(gs and gs.transfer_window_open)


def open_window(db: Session) -> None:
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if gs:
        gs.transfer_window_open = True
        db.commit()


def close_window(db: Session) -> None:
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if gs:
        gs.transfer_window_open = False
        db.commit()


# ---------------------------------------------------------------------------
# Available players
# ---------------------------------------------------------------------------

def get_available_players(
    db: Session,
    user_club_id: str,
    position: Optional[str] = None,
    max_price: Optional[float] = None,
) -> List[Player]:
    """Free agents + players listed by clubs other than the user's."""
    q = db.query(PlayerORM).filter(
        (PlayerORM.is_free_agent == True) |
        (
            (PlayerORM.is_transfer_listed == True) &
            (PlayerORM.current_club != user_club_id)
        )
    )
    if position:
        q = q.filter(PlayerORM.position == position)
    players = [ds._orm_to_player(o) for o in q.all()]
    if max_price is not None:
        players = [p for p in players if p.market_value <= max_price]
    return sorted(players, key=lambda p: -p.market_value)


# ---------------------------------------------------------------------------
# User transfers
# ---------------------------------------------------------------------------

def submit_bid(
    db: Session,
    user_club_id: str,
    player_id: str,
    bid_fee: float,
) -> dict:
    """
    Attempt to buy a player.  Returns {"success": bool, "message": str}.
    """
    if not is_window_open(db):
        return {"success": False, "message": "Transfer window is closed."}

    player_orm = db.query(PlayerORM).filter(PlayerORM.id == player_id).first()
    if not player_orm:
        return {"success": False, "message": "Player not found."}

    if player_orm.current_club == user_club_id:
        return {"success": False, "message": "Player already in your squad."}

    selling_club_orm = None
    if player_orm.current_club:
        selling_club_orm = db.query(ClubORM).filter(
            ClubORM.id == player_orm.current_club).first()

    user_club_orm = db.query(ClubORM).filter(ClubORM.id == user_club_id).first()
    if not user_club_orm:
        return {"success": False, "message": "Your club not found."}

    # Budget check
    if bid_fee > user_club_orm.budget:
        return {"success": False, "message": f"Insufficient transfer budget (have €{user_club_orm.budget:.1f}M)."}

    # Wage budget check (weekly wage in k€)
    current_wage_spend = sum(
        p.wage for p in db.query(PlayerORM).filter(PlayerORM.current_club == user_club_id).all()
    )
    if current_wage_spend + player_orm.wage > user_club_orm.wage_budget * (1 + _WAGE_TOLERANCE):
        return {"success": False,
                "message": f"Wage budget exceeded (weekly spend would be €{current_wage_spend + player_orm.wage:.0f}k)."}

    # Acceptance threshold
    tier = selling_club_orm.tier if selling_club_orm else 4
    threshold = _ACCEPTANCE.get(tier, 1.0)
    if bid_fee < player_orm.market_value * threshold:
        return {
            "success": False,
            "message": (
                f"Bid rejected. {selling_club_orm.name if selling_club_orm else 'Club'} "
                f"wants at least €{player_orm.market_value * threshold:.1f}M."
            ),
        }

    # Execute transfer
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    _execute_transfer(
        db,
        player_orm=player_orm,
        from_club_orm=selling_club_orm,
        to_club_orm=user_club_orm,
        fee=bid_fee,
        season_year=gs.season_year if gs else 2024,
        matchday=gs.current_matchday if gs else 0,
    )

    return {
        "success": True,
        "message": f"{player_orm.name} signed for €{bid_fee:.1f}M.",
        "player_id": player_id,
    }


def sell_player(
    db: Session,
    user_club_id: str,
    player_id: str,
    list_only: bool = True,
) -> dict:
    """
    If list_only=True, marks player as transfer-listed (AI clubs may buy them).
    If list_only=False, release player immediately (free agent).
    """
    player_orm = db.query(PlayerORM).filter(PlayerORM.id == player_id).first()
    if not player_orm or player_orm.current_club != user_club_id:
        return {"success": False, "message": "Player not found in your squad."}

    if list_only:
        player_orm.is_transfer_listed = True
        db.commit()
        return {"success": True, "message": f"{player_orm.name} listed for transfer."}

    # Release
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    user_club_orm = db.query(ClubORM).filter(ClubORM.id == user_club_id).first()
    _execute_transfer(
        db,
        player_orm=player_orm,
        from_club_orm=user_club_orm,
        to_club_orm=None,
        fee=0.0,
        season_year=gs.season_year if gs else 2024,
        matchday=gs.current_matchday if gs else 0,
        transfer_type="release",
    )
    return {"success": True, "message": f"{player_orm.name} released."}


# ---------------------------------------------------------------------------
# CPU transfers
# ---------------------------------------------------------------------------

_POSITION_ORDER = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"]


def _squad_weakness(club_orm: ClubORM) -> Optional[str]:
    """Return the position the club is weakest in (needs buying), or None."""
    from collections import Counter
    counts = Counter(p.position for p in club_orm.players)
    target = {"GK": 2, "CB": 3, "LB": 1, "RB": 1, "CDM": 1, "CM": 2,
              "CAM": 1, "LW": 1, "RW": 1, "ST": 2}
    for pos in _POSITION_ORDER:
        if counts.get(pos, 0) < target.get(pos, 1):
            return pos
    return None


def run_cpu_transfers(db: Session, max_per_club: int = 2) -> List[str]:
    """
    Simple CPU transfer logic executed when the window opens.
    Returns list of activity messages.
    """
    gs = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs:
        return []

    messages: List[str] = []
    clubs = db.query(ClubORM).filter(ClubORM.id != gs.user_club_id).all()

    for club_orm in clubs:
        done = 0
        # --- Buy if weakness and budget available ---
        while done < max_per_club:
            needed_pos = _squad_weakness(club_orm)
            if not needed_pos or club_orm.budget < 1.0:
                break

            candidates = (
                db.query(PlayerORM)
                .filter(
                    (PlayerORM.is_free_agent == True) |
                    (PlayerORM.is_transfer_listed == True),
                    PlayerORM.position == needed_pos,
                    PlayerORM.market_value <= club_orm.budget,
                    PlayerORM.current_club != club_orm.id,
                )
                .order_by(PlayerORM.market_value.desc())
                .first()
            )

            if not candidates:
                break

            # CPU always pays market_value
            fee = candidates.market_value
            selling_orm = (
                db.query(ClubORM).filter(ClubORM.id == candidates.current_club).first()
                if candidates.current_club else None
            )

            _execute_transfer(
                db,
                player_orm=candidates,
                from_club_orm=selling_orm,
                to_club_orm=club_orm,
                fee=fee,
                season_year=gs.season_year,
                matchday=gs.current_matchday,
            )
            messages.append(f"{club_orm.name} sign {candidates.name} for €{fee:.1f}M.")
            done += 1

        # --- Sell surplus (squad > 25) ---
        if len(club_orm.players) > 25:
            surplus = sorted(club_orm.players,
                             key=lambda p: ds._orm_to_player(p).position_overall())[:2]
            for player_orm in surplus:
                player_orm.is_transfer_listed = True
                messages.append(f"{club_orm.name} list {player_orm.name} for transfer.")
            db.commit()

    return messages


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

def _execute_transfer(
    db: Session,
    player_orm: PlayerORM,
    from_club_orm: Optional[ClubORM],
    to_club_orm: Optional[ClubORM],
    fee: float,
    season_year: int,
    matchday: int,
    transfer_type: str = "transfer",
) -> None:
    if from_club_orm:
        from_club_orm.budget += fee
    if to_club_orm:
        to_club_orm.budget -= fee

    player_orm.current_club = to_club_orm.id if to_club_orm else None
    player_orm.is_transfer_listed = False
    player_orm.is_free_agent = (to_club_orm is None)

    db.add(TransferRecordORM(
        id=str(uuid.uuid4()),
        player_id=player_orm.id,
        player_name=player_orm.name,
        from_club_id=from_club_orm.id if from_club_orm else None,
        to_club_id=to_club_orm.id if to_club_orm else None,
        fee=fee,
        season_year=season_year,
        matchday=matchday,
        transfer_type=transfer_type,
    ))
    db.commit()
