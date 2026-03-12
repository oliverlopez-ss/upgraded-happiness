"""
Season service — game loop orchestration.

Phase transitions
-----------------
  pre_season       → matchday_pending   (user triggers start_season)
  matchday_pending → mid_season         (simulate_matchday)
  mid_season       → winter_window      (after matchday 19 complete)
  mid_season       → matchday_pending   (advance_matchday, if < 38)
  mid_season       → season_end         (after matchday 38 complete)
  winter_window    → matchday_pending   (close_window)
  season_end       → pre_season         (start_new_season — new season year)
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from ..database import (
    GameStateORM, FixtureORM, StandingsORM, ClubORM, PlayerORM, UserTacticsORM
)
from ..models.season import MatchResult
from ..models.gamestate import GameState, SeasonAward, PHASE_ACTIONS
from ..services import data_service as ds
from ..services.match_engine import simulate_match, select_starting_xi
from ..services.fixture_service import generate_season_fixtures
from ..services.transfer_service import open_window, close_window, run_cpu_transfers


WINTER_MATCHDAY = 19
FINAL_MATCHDAY  = 38
RETIREMENT_AGE  = 36
YOUTH_AGE_MIN   = 17
YOUTH_AGE_MAX   = 19


# ---------------------------------------------------------------------------
# Simulate a single matchday
# ---------------------------------------------------------------------------

def simulate_matchday(db: Session) -> List[MatchResult]:
    """
    Simulate all fixtures for the current matchday.
    Updates standings and advances game state.
    """
    gs_orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs_orm or gs_orm.phase != "matchday_pending":
        return []

    matchday = gs_orm.current_matchday + 1
    fixtures_orm = (
        db.query(FixtureORM)
        .filter(
            FixtureORM.season_year == gs_orm.season_year,
            FixtureORM.matchday == matchday,
            FixtureORM.played == False,
        )
        .all()
    )

    results: List[MatchResult] = []

    for fix_orm in fixtures_orm:
        home_club  = ds.get_club(db, fix_orm.home_club_id)
        away_club  = ds.get_club(db, fix_orm.away_club_id)
        home_squad = ds.get_players_by_club(db, fix_orm.home_club_id)
        away_squad = ds.get_players_by_club(db, fix_orm.away_club_id)

        if not home_club or not away_club:
            continue

        # Use user tactics for user's club
        if fix_orm.home_club_id == gs_orm.user_club_id:
            home_xi_ids = _user_xi(db, gs_orm.user_club_id)
            if home_xi_ids:
                home_squad = [p for p in home_squad if p.id in home_xi_ids] + \
                             [p for p in home_squad if p.id not in home_xi_ids]
        if fix_orm.away_club_id == gs_orm.user_club_id:
            away_xi_ids = _user_xi(db, gs_orm.user_club_id)
            if away_xi_ids:
                away_squad = [p for p in away_squad if p.id in away_xi_ids] + \
                             [p for p in away_squad if p.id not in away_xi_ids]

        from ..models.season import Fixture
        fixture = Fixture(
            id=fix_orm.id,
            season_year=fix_orm.season_year,
            matchday=fix_orm.matchday,
            home_club_id=fix_orm.home_club_id,
            away_club_id=fix_orm.away_club_id,
        )
        result = simulate_match(fixture, home_club, away_club, home_squad, away_squad)
        ds.save_match_result(db, result)
        ds.update_standings_for_result(db, result, gs_orm.season_year)
        results.append(result)

    # Advance state
    gs_orm.current_matchday = matchday
    gs_orm.last_matchday_results = [r.fixture_id for r in results]

    if matchday >= FINAL_MATCHDAY:
        gs_orm.phase = "season_end"
        gs_orm.transfer_window_open = False
    elif matchday == WINTER_MATCHDAY:
        gs_orm.phase = "winter_window"
        gs_orm.transfer_window_open = True
        run_cpu_transfers(db, max_per_club=1)
    else:
        gs_orm.phase = "mid_season"

    db.commit()
    return results


def advance_matchday(db: Session) -> GameState:
    """Move from mid_season → matchday_pending."""
    gs_orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if gs_orm and gs_orm.phase == "mid_season":
        gs_orm.phase = "matchday_pending"
        db.commit()
    return ds.get_game_state(db)


def start_season(db: Session) -> GameState:
    """pre_season → matchday_pending."""
    gs_orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if gs_orm and gs_orm.phase == "pre_season":
        gs_orm.phase = "matchday_pending"
        gs_orm.transfer_window_open = False
        db.commit()
    run_cpu_transfers(db, max_per_club=2)
    return ds.get_game_state(db)


def close_winter_window(db: Session) -> GameState:
    """winter_window → matchday_pending."""
    close_window(db)
    gs_orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if gs_orm and gs_orm.phase == "winter_window":
        gs_orm.phase = "matchday_pending"
        db.commit()
    return ds.get_game_state(db)


# ---------------------------------------------------------------------------
# Season end & new season
# ---------------------------------------------------------------------------

def compute_season_awards(db: Session) -> List[SeasonAward]:
    """Compute top scorer and champion at season end."""
    from collections import defaultdict

    gs_orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs_orm:
        return []

    # Top scorer
    goal_counts: dict[str, int] = defaultdict(int)
    goal_names:  dict[str, str] = {}
    fixtures_orm = (db.query(FixtureORM)
                    .filter(FixtureORM.season_year == gs_orm.season_year,
                            FixtureORM.played == True).all())
    for fix in fixtures_orm:
        for event in (fix.events or []):
            if event.get("event_type") == "goal":
                pid = event["player_id"]
                goal_counts[pid] += 1
                goal_names[pid] = event["player_name"]

    awards: List[SeasonAward] = []
    if goal_counts:
        top_pid = max(goal_counts, key=lambda p: goal_counts[p])
        awards.append(SeasonAward(
            award="Top Scorer",
            player_name=goal_names[top_pid],
            value=f"{goal_counts[top_pid]} goals",
        ))

    # Champion
    standings = ds.get_standings(db, gs_orm.season_year)
    if standings:
        champ = standings[0]
        awards.append(SeasonAward(
            award="La Liga Champion",
            club_name=champ.club_name,
            value=f"{champ.points} points",
        ))

    # Relegated (bottom 3)
    if len(standings) >= 3:
        for s in standings[-3:]:
            awards.append(SeasonAward(
                award="Relegated",
                club_name=s.club_name,
                value=f"{s.points} points",
            ))

    return awards


def start_new_season(db: Session) -> GameState:
    """
    End-of-season → pre_season for a new year.
    - Age all players by 1 year; retire those >= RETIREMENT_AGE.
    - Generate youth players to replace retirees.
    - Reset fixtures, standings, matchday.
    - Open summer transfer window.
    """
    gs_orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not gs_orm or gs_orm.phase != "season_end":
        return ds.get_game_state(db)

    new_year = gs_orm.season_year + 1

    # Age players
    all_players = db.query(PlayerORM).all()
    retired = []
    for p in all_players:
        p.age += 1
        if p.age >= RETIREMENT_AGE:
            retired.append(p)

    # Retire
    retired_by_club: dict[str, list] = {}
    for p in retired:
        if p.current_club:
            retired_by_club.setdefault(p.current_club, []).append(p)
        p.current_club = None
        p.is_free_agent = True
        p.is_transfer_listed = False

    db.commit()

    # Generate youth replacements
    import random, uuid
    for club_id, retirees in retired_by_club.items():
        for ret in retirees:
            youth = _generate_youth_player(club_id, ret.position)
            db.add(youth)

    # New fixtures
    club_ids = [c.id for c in db.query(ClubORM).all()]
    new_fixtures = generate_season_fixtures(club_ids, new_year)
    for f in new_fixtures:
        db.add(FixtureORM(
            id=f.id, season_year=f.season_year, matchday=f.matchday,
            home_club_id=f.home_club_id, away_club_id=f.away_club_id,
            played=False,
        ))

    # New standings rows
    for club_id in club_ids:
        db.add(StandingsORM(season_year=new_year, club_id=club_id))

    # Reset game state
    gs_orm.season_year = new_year
    gs_orm.current_matchday = 0
    gs_orm.phase = "pre_season"
    gs_orm.transfer_window_open = True
    gs_orm.last_matchday_results = []
    db.commit()

    return ds.get_game_state(db)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_xi(db: Session, club_id: str) -> List[str]:
    """Return the saved starting XI ids for the user's club."""
    tactics_orm = db.query(UserTacticsORM).filter(UserTacticsORM.club_id == club_id).first()
    return tactics_orm.starting_xi if tactics_orm else []


def _generate_youth_player(club_id: str, position: str) -> PlayerORM:
    import random, uuid as _uuid
    _FIRST = ["Alejandro", "Carlos", "David", "Diego", "Marcos", "Pablo",
              "Miguel", "Ivan", "Raul", "Nico", "Jon", "Aitor"]
    _LAST  = ["García", "Rodríguez", "Martínez", "López", "Sánchez",
              "Fernández", "Torres", "Ramos", "Vega", "Cruz"]
    base = random.randint(45, 62)

    def _attr(lo, hi):
        return max(1, min(100, base + random.randint(lo, hi)))

    pos_ranges = {
        "GK":  dict(pace=_attr(-20,5), shooting=_attr(-30,-10), passing=_attr(-15,5),
                    defending=_attr(-10,10), physicality=_attr(-5,10), goalkeeper=_attr(10,25)),
        "CB":  dict(pace=_attr(-10,5), shooting=_attr(-20,0), passing=_attr(-10,5),
                    defending=_attr(10,25), physicality=_attr(5,20), goalkeeper=_attr(-40,-20)),
        "LB":  dict(pace=_attr(5,20), shooting=_attr(-15,0), passing=_attr(0,15),
                    defending=_attr(5,15), physicality=_attr(0,10), goalkeeper=_attr(-40,-20)),
        "RB":  dict(pace=_attr(5,20), shooting=_attr(-15,0), passing=_attr(0,15),
                    defending=_attr(5,15), physicality=_attr(0,10), goalkeeper=_attr(-40,-20)),
        "CDM": dict(pace=_attr(-5,10), shooting=_attr(-10,5), passing=_attr(5,15),
                    defending=_attr(10,20), physicality=_attr(5,15), goalkeeper=_attr(-40,-20)),
        "CM":  dict(pace=_attr(0,10), shooting=_attr(0,10), passing=_attr(5,20),
                    defending=_attr(0,10), physicality=_attr(0,10), goalkeeper=_attr(-40,-20)),
        "CAM": dict(pace=_attr(0,15), shooting=_attr(5,20), passing=_attr(10,25),
                    defending=_attr(-15,0), physicality=_attr(-5,10), goalkeeper=_attr(-40,-20)),
        "LW":  dict(pace=_attr(10,25), shooting=_attr(5,20), passing=_attr(0,15),
                    defending=_attr(-20,-5), physicality=_attr(-5,10), goalkeeper=_attr(-40,-20)),
        "RW":  dict(pace=_attr(10,25), shooting=_attr(5,20), passing=_attr(0,15),
                    defending=_attr(-20,-5), physicality=_attr(-5,10), goalkeeper=_attr(-40,-20)),
        "ST":  dict(pace=_attr(5,20), shooting=_attr(15,30), passing=_attr(-5,10),
                    defending=_attr(-25,-10), physicality=_attr(5,20), goalkeeper=_attr(-40,-20)),
    }
    attrs = pos_ranges.get(position, pos_ranges["CM"])

    return PlayerORM(
        id=str(_uuid.uuid4()),
        name=f"{random.choice(_FIRST)} {random.choice(_LAST)}",
        nationality="Spanish",
        age=random.randint(YOUTH_AGE_MIN, YOUTH_AGE_MAX),
        position=position,
        current_club=club_id,
        market_value=round(random.uniform(0.2, 1.5), 1),
        wage=round(random.uniform(2, 8), 1),
        contract_years_remaining=random.randint(2, 4),
        is_transfer_listed=False,
        is_free_agent=False,
        **attrs,
    )
