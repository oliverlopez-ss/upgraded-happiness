from pydantic import BaseModel, Field
from typing import List, Optional


class MatchEvent(BaseModel):
    minute: int = Field(ge=1, le=120)
    event_type: str          # "goal", "yellow_card", "red_card", "own_goal"
    player_id: str
    player_name: str
    club_id: str


class MatchResult(BaseModel):
    fixture_id: str
    home_club_id: str
    home_club_name: str
    away_club_id: str
    away_club_name: str
    home_goals: int = Field(ge=0)
    away_goals: int = Field(ge=0)
    events: List[MatchEvent] = []
    match_summary: str = ""
    matchday: int

    @property
    def scorers(self) -> List[MatchEvent]:
        return [e for e in self.events if e.event_type in ("goal", "own_goal")]

    @property
    def yellow_cards(self) -> List[MatchEvent]:
        return [e for e in self.events if e.event_type == "yellow_card"]

    @property
    def red_cards(self) -> List[MatchEvent]:
        return [e for e in self.events if e.event_type == "red_card"]


class Fixture(BaseModel):
    id: str
    season_year: int
    matchday: int = Field(ge=1, le=38)
    home_club_id: str
    away_club_id: str
    played: bool = False
    result: Optional[MatchResult] = None


class Season(BaseModel):
    year: int
    current_matchday: int = Field(ge=0, le=38, default=0)
    fixtures: List[Fixture] = []

    def matchday_fixtures(self, matchday: int) -> List[Fixture]:
        return [f for f in self.fixtures if f.matchday == matchday]

    def unplayed_fixtures(self) -> List[Fixture]:
        return [f for f in self.fixtures if not f.played]
