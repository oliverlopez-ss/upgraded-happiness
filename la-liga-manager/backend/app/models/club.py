from pydantic import BaseModel, Field
from typing import List


VALID_FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2", "4-1-4-1"]

# Maps formation string → list of positions for starting XI (in order)
FORMATION_POSITIONS: dict[str, list[str]] = {
    "4-3-3":   ["GK", "RB", "CB", "CB", "LB", "CM", "CDM", "CM", "RW", "ST", "LW"],
    "4-4-2":   ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
    "3-5-2":   ["GK", "CB", "CB", "CB", "RB", "CM", "CDM", "CM", "LB", "ST", "ST"],
    "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "RW", "CAM", "LW", "ST"],
    "5-3-2":   ["GK", "RB", "CB", "CB", "CB", "LB", "CM", "CDM", "CM", "ST", "ST"],
    "4-1-4-1": ["GK", "RB", "CB", "CB", "LB", "CDM", "RM", "CM", "CM", "LM", "ST"],
}

# Broader position groups used for flexible XI matching
POSITION_GROUPS: dict[str, list[str]] = {
    "GK":  ["GK"],
    "CB":  ["CB"],
    "LB":  ["LB", "RB", "CB"],
    "RB":  ["RB", "LB", "CB"],
    "LM":  ["LB", "LW", "CM"],
    "RM":  ["RB", "RW", "CM"],
    "CDM": ["CDM", "CM"],
    "CM":  ["CM", "CDM", "CAM"],
    "CAM": ["CAM", "CM"],
    "LW":  ["LW", "CAM", "ST"],
    "RW":  ["RW", "CAM", "ST"],
    "ST":  ["ST", "CAM", "LW", "RW"],
}


class Club(BaseModel):
    id: str
    name: str
    short_name: str
    city: str
    stadium: str
    budget: float = Field(ge=0)        # transfer budget in millions €
    wage_budget: float = Field(ge=0)   # weekly wage budget in thousands €
    current_formation: str = "4-3-3"
    squad: List[str] = []              # list of player ids
    tier: int = Field(ge=1, le=4)      # 1=elite, 4=bottom
    primary_color: str = "#c0392b"
    secondary_color: str = "#ffffff"


class ClubSummary(BaseModel):
    """Lightweight version for list responses."""
    id: str
    name: str
    short_name: str
    city: str
    stadium: str
    budget: float
    wage_budget: float
    current_formation: str
    squad_size: int
    tier: int
