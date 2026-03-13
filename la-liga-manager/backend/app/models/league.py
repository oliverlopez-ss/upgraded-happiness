from pydantic import BaseModel, Field
from typing import List


class StandingsEntry(BaseModel):
    club_id: str
    club_name: str
    played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0
    points: int = 0

    @property
    def goal_difference(self) -> int:
        return self.goals_for - self.goals_against

    def apply_result(self, scored: int, conceded: int) -> None:
        self.played += 1
        self.goals_for += scored
        self.goals_against += conceded
        if scored > conceded:
            self.wins += 1
            self.points += 3
        elif scored == conceded:
            self.draws += 1
            self.points += 1
        else:
            self.losses += 1


class League(BaseModel):
    id: str = "la-liga"
    name: str = "La Liga"
    country: str = "Spain"
    season_year: int
    clubs: List[str] = []              # list of club ids
    current_matchday: int = Field(ge=0, le=38, default=0)
    standings: List[StandingsEntry] = []

    def sorted_standings(self) -> List[StandingsEntry]:
        return sorted(
            self.standings,
            key=lambda e: (
                -e.points,
                -(e.goals_for - e.goals_against),
                -e.goals_for,
                e.club_name,
            ),
        )
