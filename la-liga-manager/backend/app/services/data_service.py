"""
Data service — thin layer between routers and the SQLite database.
All reads/writes go through here so routers stay clean.
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from ..database import (
    ClubORM, PlayerORM, FixtureORM, StandingsORM,
    GameStateORM, UserTacticsORM, TransferRecordORM,
)
from ..models.player import Player, PlayerAttributes
from ..models.club import Club
from ..models.season import Fixture, MatchResult, MatchEvent
from ..models.gamestate import GameState, Tactics, TransferRecord
from ..models.league import StandingsEntry


# ---------------------------------------------------------------------------
# ORM → Pydantic converters
# ---------------------------------------------------------------------------

def _orm_to_player(orm: PlayerORM) -> Player:
    return Player(
        id=orm.id,
        name=orm.name,
        nationality=orm.nationality,
        age=orm.age,
        position=orm.position,
        attributes=PlayerAttributes(
            pace=orm.pace, shooting=orm.shooting, passing=orm.passing,
            defending=orm.defending, physicality=orm.physicality,
            goalkeeper=orm.goalkeeper,
        ),
        current_club=orm.current_club,
        market_value=orm.market_value,
        wage=orm.wage,
        contract_years_remaining=orm.contract_years_remaining,
        is_transfer_listed=orm.is_transfer_listed,
        is_free_agent=orm.is_free_agent,
    )


def _orm_to_club(orm: ClubORM) -> Club:
    return Club(
        id=orm.id,
        name=orm.name,
        short_name=orm.short_name,
        city=orm.city,
        stadium=orm.stadium,
        budget=orm.budget,
        wage_budget=orm.wage_budget,
        current_formation=orm.current_formation,
        squad=[p.id for p in orm.players],
        tier=orm.tier,
        primary_color=orm.primary_color,
        secondary_color=orm.secondary_color,
    )


def _orm_to_fixture(orm: FixtureORM) -> Fixture:
    result = None
    if orm.played and orm.home_goals is not None:
        events = [MatchEvent(**e) for e in (orm.events or [])]
        result = MatchResult(
            fixture_id=orm.id,
            home_club_id=orm.home_club_id,
            home_club_name=orm.home_club.name if orm.home_club else "",
            away_club_id=orm.away_club_id,
            away_club_name=orm.away_club.name if orm.away_club else "",
            home_goals=orm.home_goals,
            away_goals=orm.away_goals,
            events=events,
            matchday=orm.matchday,
        )
    return Fixture(
        id=orm.id,
        season_year=orm.season_year,
        matchday=orm.matchday,
        home_club_id=orm.home_club_id,
        away_club_id=orm.away_club_id,
        played=orm.played,
        result=result,
    )


def _orm_to_standings(orm: StandingsORM) -> StandingsEntry:
    return StandingsEntry(
        club_id=orm.club_id,
        club_name=orm.club.name if orm.club else "",
        played=orm.played,
        wins=orm.wins,
        draws=orm.draws,
        losses=orm.losses,
        goals_for=orm.goals_for,
        goals_against=orm.goals_against,
        points=orm.points,
    )


def _orm_to_gamestate(orm: GameStateORM) -> GameState:
    from ..models.gamestate import PHASE_ACTIONS
    return GameState(
        season_year=orm.season_year,
        current_matchday=orm.current_matchday,
        phase=orm.phase,
        user_club_id=orm.user_club_id,
        transfer_window_open=orm.transfer_window_open,
        available_actions=PHASE_ACTIONS.get(orm.phase, []),
        last_matchday_results=orm.last_matchday_results or [],
    )


# ---------------------------------------------------------------------------
# Players
# ---------------------------------------------------------------------------

def get_player(db: Session, player_id: str) -> Optional[Player]:
    orm = db.query(PlayerORM).filter(PlayerORM.id == player_id).first()
    return _orm_to_player(orm) if orm else None


def get_players_by_club(db: Session, club_id: str) -> List[Player]:
    orms = db.query(PlayerORM).filter(PlayerORM.current_club == club_id).all()
    return [_orm_to_player(o) for o in orms]


def get_all_players(db: Session) -> List[Player]:
    return [_orm_to_player(o) for o in db.query(PlayerORM).all()]


def update_player(db: Session, player_id: str, **kwargs) -> Optional[Player]:
    orm = db.query(PlayerORM).filter(PlayerORM.id == player_id).first()
    if not orm:
        return None
    for k, v in kwargs.items():
        setattr(orm, k, v)
    db.commit()
    db.refresh(orm)
    return _orm_to_player(orm)


# ---------------------------------------------------------------------------
# Clubs
# ---------------------------------------------------------------------------

def get_club(db: Session, club_id: str) -> Optional[Club]:
    orm = db.query(ClubORM).filter(ClubORM.id == club_id).first()
    return _orm_to_club(orm) if orm else None


def get_all_clubs(db: Session) -> List[Club]:
    return [_orm_to_club(o) for o in db.query(ClubORM).all()]


def update_club(db: Session, club_id: str, **kwargs) -> Optional[Club]:
    orm = db.query(ClubORM).filter(ClubORM.id == club_id).first()
    if not orm:
        return None
    for k, v in kwargs.items():
        setattr(orm, k, v)
    db.commit()
    db.refresh(orm)
    return _orm_to_club(orm)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def get_fixtures_for_matchday(db: Session, season_year: int, matchday: int) -> List[Fixture]:
    orms = (db.query(FixtureORM)
              .filter(FixtureORM.season_year == season_year,
                      FixtureORM.matchday == matchday)
              .all())
    return [_orm_to_fixture(o) for o in orms]


def get_all_fixtures(db: Session, season_year: int) -> List[Fixture]:
    orms = (db.query(FixtureORM)
              .filter(FixtureORM.season_year == season_year)
              .order_by(FixtureORM.matchday)
              .all())
    return [_orm_to_fixture(o) for o in orms]


def save_match_result(db: Session, result: MatchResult) -> None:
    orm = db.query(FixtureORM).filter(FixtureORM.id == result.fixture_id).first()
    if not orm:
        return
    orm.played = True
    orm.home_goals = result.home_goals
    orm.away_goals = result.away_goals
    orm.events = [e.model_dump() for e in result.events]
    db.commit()


# ---------------------------------------------------------------------------
# Standings
# ---------------------------------------------------------------------------

def get_standings(db: Session, season_year: int) -> List[StandingsEntry]:
    orms = (db.query(StandingsORM)
              .filter(StandingsORM.season_year == season_year)
              .all())
    entries = [_orm_to_standings(o) for o in orms]
    return sorted(
        entries,
        key=lambda e: (-e.points, -(e.goals_for - e.goals_against), -e.goals_for),
    )


def update_standings_for_result(db: Session, result: MatchResult, season_year: int) -> None:
    for club_id, scored, conceded in [
        (result.home_club_id, result.home_goals, result.away_goals),
        (result.away_club_id, result.away_goals, result.home_goals),
    ]:
        row = (db.query(StandingsORM)
                 .filter(StandingsORM.season_year == season_year,
                         StandingsORM.club_id == club_id)
                 .first())
        if not row:
            continue
        row.played += 1
        row.goals_for += scored
        row.goals_against += conceded
        if scored > conceded:
            row.wins += 1
            row.points += 3
        elif scored == conceded:
            row.draws += 1
            row.points += 1
        else:
            row.losses += 1
    db.commit()


# ---------------------------------------------------------------------------
# Game state
# ---------------------------------------------------------------------------

def get_game_state(db: Session) -> Optional[GameState]:
    orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    return _orm_to_gamestate(orm) if orm else None


def update_game_state(db: Session, **kwargs) -> Optional[GameState]:
    orm = db.query(GameStateORM).filter(GameStateORM.id == 1).first()
    if not orm:
        return None
    for k, v in kwargs.items():
        setattr(orm, k, v)
    db.commit()
    db.refresh(orm)
    return _orm_to_gamestate(orm)


# ---------------------------------------------------------------------------
# Tactics
# ---------------------------------------------------------------------------

def get_tactics(db: Session, club_id: str) -> Optional[Tactics]:
    orm = db.query(UserTacticsORM).filter(UserTacticsORM.club_id == club_id).first()
    if not orm:
        return None
    return Tactics(
        club_id=orm.club_id,
        formation=orm.formation,
        starting_xi=orm.starting_xi or [],
        bench=orm.bench or [],
    )


def save_tactics(db: Session, tactics: Tactics) -> Tactics:
    orm = db.query(UserTacticsORM).filter(UserTacticsORM.club_id == tactics.club_id).first()
    if orm:
        orm.formation = tactics.formation
        orm.starting_xi = tactics.starting_xi
        orm.bench = tactics.bench
    else:
        orm = UserTacticsORM(
            club_id=tactics.club_id,
            formation=tactics.formation,
            starting_xi=tactics.starting_xi,
            bench=tactics.bench,
        )
        db.add(orm)
    db.commit()
    return tactics


# ---------------------------------------------------------------------------
# Transfers
# ---------------------------------------------------------------------------

def record_transfer(db: Session, record: TransferRecord) -> None:
    orm = TransferRecordORM(
        id=record.id,
        player_id=record.player_id,
        player_name=record.player_name,
        from_club_id=record.from_club_id,
        to_club_id=record.to_club_id,
        fee=record.fee,
        season_year=record.season_year,
        matchday=record.matchday,
        transfer_type=record.transfer_type,
    )
    db.add(orm)
    db.commit()


def get_transfer_history(db: Session, season_year: int) -> List[TransferRecord]:
    orms = (db.query(TransferRecordORM)
              .filter(TransferRecordORM.season_year == season_year)
              .all())
    return [TransferRecord(
        id=o.id, player_id=o.player_id, player_name=o.player_name,
        from_club_id=o.from_club_id, to_club_id=o.to_club_id,
        fee=o.fee, season_year=o.season_year, matchday=o.matchday,
        transfer_type=o.transfer_type,
    ) for o in orms]
