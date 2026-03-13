"""SQLAlchemy engine + session + ORM table definitions."""
import os
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, JSON, ForeignKey, Text
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'game.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM models
# ---------------------------------------------------------------------------

class PlayerORM(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    nationality = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    position = Column(String, nullable=False)
    pace = Column(Integer, nullable=False)
    shooting = Column(Integer, nullable=False)
    passing = Column(Integer, nullable=False)
    defending = Column(Integer, nullable=False)
    physicality = Column(Integer, nullable=False)
    goalkeeper = Column(Integer, nullable=False)
    current_club = Column(String, ForeignKey("clubs.id"), nullable=True)
    market_value = Column(Float, nullable=False, default=0.0)
    wage = Column(Float, nullable=False, default=0.0)
    contract_years_remaining = Column(Integer, nullable=False, default=1)
    is_transfer_listed = Column(Boolean, default=False)
    is_free_agent = Column(Boolean, default=False)

    club = relationship("ClubORM", back_populates="players", foreign_keys=[current_club])


class ClubORM(Base):
    __tablename__ = "clubs"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    stadium = Column(String, nullable=False)
    budget = Column(Float, nullable=False, default=20.0)
    wage_budget = Column(Float, nullable=False, default=500.0)
    current_formation = Column(String, default="4-3-3")
    tier = Column(Integer, default=3)
    primary_color = Column(String, default="#c0392b")
    secondary_color = Column(String, default="#ffffff")

    players = relationship("PlayerORM", back_populates="club",
                           foreign_keys=[PlayerORM.current_club])


class FixtureORM(Base):
    __tablename__ = "fixtures"

    id = Column(String, primary_key=True)
    season_year = Column(Integer, nullable=False)
    matchday = Column(Integer, nullable=False)
    home_club_id = Column(String, ForeignKey("clubs.id"), nullable=False)
    away_club_id = Column(String, ForeignKey("clubs.id"), nullable=False)
    played = Column(Boolean, default=False)
    home_goals = Column(Integer, nullable=True)
    away_goals = Column(Integer, nullable=True)
    events = Column(JSON, default=list)   # list of MatchEvent dicts

    home_club = relationship("ClubORM", foreign_keys=[home_club_id])
    away_club = relationship("ClubORM", foreign_keys=[away_club_id])


class StandingsORM(Base):
    __tablename__ = "standings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    season_year = Column(Integer, nullable=False)
    club_id = Column(String, ForeignKey("clubs.id"), nullable=False)
    points = Column(Integer, default=0)
    played = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    draws = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    goals_for = Column(Integer, default=0)
    goals_against = Column(Integer, default=0)

    club = relationship("ClubORM")


class GameStateORM(Base):
    __tablename__ = "game_state"

    id = Column(Integer, primary_key=True, default=1)
    season_year = Column(Integer, nullable=False)
    current_matchday = Column(Integer, default=0)
    phase = Column(String, default="pre_season")
    user_club_id = Column(String, ForeignKey("clubs.id"), nullable=False)
    transfer_window_open = Column(Boolean, default=True)
    last_matchday_results = Column(JSON, default=list)   # list of fixture ids


class UserTacticsORM(Base):
    __tablename__ = "user_tactics"

    id = Column(Integer, primary_key=True, default=1)
    club_id = Column(String, ForeignKey("clubs.id"), nullable=False)
    formation = Column(String, default="4-3-3")
    starting_xi = Column(JSON, default=list)   # list of player ids (11)
    bench = Column(JSON, default=list)         # up to 12 player ids


class TransferRecordORM(Base):
    __tablename__ = "transfers"

    id = Column(String, primary_key=True)
    player_id = Column(String, ForeignKey("players.id"), nullable=False)
    player_name = Column(String, nullable=False)
    from_club_id = Column(String, nullable=True)
    to_club_id = Column(String, nullable=True)
    fee = Column(Float, nullable=False, default=0.0)
    season_year = Column(Integer, nullable=False)
    matchday = Column(Integer, nullable=False, default=0)
    transfer_type = Column(String, nullable=False, default="transfer")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
