from pydantic import BaseModel, Field
from typing import List, Optional


PHASES = [
    "pre_season",       # Before matchday 1; summer window open
    "matchday_pending", # Ready to simulate the next matchday
    "mid_season",       # Between matchdays
    "winter_window",    # After matchday 19; winter transfers open
    "season_end",       # After matchday 38
]

PHASE_ACTIONS: dict[str, List[str]] = {
    "pre_season":       ["set_tactics", "view_squad", "make_transfer", "start_season"],
    "matchday_pending": ["set_tactics", "view_squad", "simulate_matchday"],
    "mid_season":       ["set_tactics", "view_squad", "view_standings", "view_results", "advance_matchday"],
    "winter_window":    ["set_tactics", "view_squad", "view_standings", "make_transfer", "close_window"],
    "season_end":       ["view_standings", "view_season_summary", "start_new_season"],
}


class SeasonAward(BaseModel):
    award: str
    player_name: Optional[str] = None
    club_name: Optional[str] = None
    value: str = ""


class GameState(BaseModel):
    season_year: int
    current_matchday: int = Field(ge=0, le=38, default=0)
    phase: str = "pre_season"
    user_club_id: str = "sevilla-fc"
    transfer_window_open: bool = True   # True at season start
    available_actions: List[str] = []
    last_matchday_results: List[str] = []   # fixture ids of last simulated day
    season_awards: List[SeasonAward] = []

    def model_post_init(self, __context) -> None:
        self.available_actions = PHASE_ACTIONS.get(self.phase, [])


class Tactics(BaseModel):
    club_id: str
    formation: str = "4-3-3"
    starting_xi: List[str] = []   # ordered list of player ids (11)
    bench: List[str] = []         # up to 12 bench players


class TransferRecord(BaseModel):
    id: str
    player_id: str
    player_name: str
    from_club_id: Optional[str]   # None = free agent
    to_club_id: Optional[str]     # None = released
    fee: float                    # in millions €
    season_year: int
    matchday: int
    transfer_type: str            # "transfer", "release", "free_agent_signing"
