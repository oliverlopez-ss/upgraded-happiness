"""
Tactics service — validate and persist the user's formation and starting XI.
"""
from __future__ import annotations

from typing import List, Tuple

from sqlalchemy.orm import Session

from ..database import PlayerORM
from ..models.club import FORMATION_POSITIONS, POSITION_GROUPS, VALID_FORMATIONS
from ..models.gamestate import Tactics
from . import data_service as ds


class TacticsValidationError(Exception):
    pass


def validate_tactics(
    db: Session,
    club_id: str,
    formation: str,
    starting_xi_ids: List[str],
) -> Tuple[bool, str]:
    """
    Returns (valid, error_message).
    Rules:
      - formation must be in VALID_FORMATIONS
      - exactly 11 player ids in starting_xi_ids
      - all players must belong to the club
      - each formation slot must be filled by a player in the right position group
    """
    if formation not in VALID_FORMATIONS:
        return False, f"Invalid formation '{formation}'. Valid: {', '.join(VALID_FORMATIONS)}"

    if len(starting_xi_ids) != 11:
        return False, f"Starting XI must have exactly 11 players (got {len(starting_xi_ids)})."

    if len(set(starting_xi_ids)) != 11:
        return False, "Duplicate players in starting XI."

    players = {
        p.id: p
        for p in db.query(PlayerORM).filter(
            PlayerORM.id.in_(starting_xi_ids),
            PlayerORM.current_club == club_id,
        ).all()
    }

    missing = [pid for pid in starting_xi_ids if pid not in players]
    if missing:
        return False, f"{len(missing)} player(s) not found in your squad."

    required_slots = FORMATION_POSITIONS[formation]
    used: set[str] = set()
    errors: List[str] = []

    for slot_pos, player_id in zip(required_slots, starting_xi_ids):
        player = players[player_id]
        allowed = POSITION_GROUPS.get(slot_pos, [slot_pos])
        if player.position not in allowed:
            errors.append(
                f"Slot {slot_pos}: {player.name} plays {player.position} "
                f"(allowed: {', '.join(allowed)})"
            )
        used.add(player_id)

    if errors:
        return False, "Position mismatch:\n" + "\n".join(errors)

    return True, ""


def auto_pick_xi(db: Session, club_id: str, formation: str) -> List[str]:
    """
    Automatically select the best XI for a given formation.
    Uses the same greedy algorithm as the match engine's select_starting_xi.
    """
    from ..services.match_engine import select_starting_xi
    from ..services import data_service as ds

    players = ds.get_players_by_club(db, club_id)
    xi = select_starting_xi(players, formation)
    return [p.id for p in xi]


def get_or_create_tactics(db: Session, club_id: str) -> Tactics:
    """Return saved tactics or generate defaults."""
    tactics = ds.get_tactics(db, club_id)
    if tactics and len(tactics.starting_xi) == 11:
        return tactics

    formation = "4-3-3"
    xi_ids = auto_pick_xi(db, club_id, formation)
    all_players = ds.get_players_by_club(db, club_id)
    bench = [p.id for p in all_players if p.id not in xi_ids][:12]

    tactics = Tactics(club_id=club_id, formation=formation,
                      starting_xi=xi_ids, bench=bench)
    return ds.save_tactics(db, tactics)
