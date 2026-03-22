from pydantic import BaseModel, Field
from typing import Optional


class PlayerAttributes(BaseModel):
    pace: int = Field(ge=1, le=100)
    shooting: int = Field(ge=1, le=100)
    passing: int = Field(ge=1, le=100)
    defending: int = Field(ge=1, le=100)
    physicality: int = Field(ge=1, le=100)
    goalkeeper: int = Field(ge=1, le=100)

    @property
    def overall(self) -> int:
        """Position-agnostic average — callers should use position-aware overall."""
        return int((self.pace + self.shooting + self.passing +
                    self.defending + self.physicality + self.goalkeeper) / 6)


class Player(BaseModel):
    id: str
    name: str
    nationality: str
    age: int = Field(ge=15, le=45)
    position: str  # GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST
    attributes: PlayerAttributes
    current_club: Optional[str] = None   # club id, None = free agent
    market_value: float = Field(ge=0)    # in millions €
    wage: float = Field(ge=0)            # weekly wage in thousands €
    contract_years_remaining: int = Field(ge=0)
    is_transfer_listed: bool = False
    is_free_agent: bool = False

    def position_overall(self) -> int:
        """Overall rating weighted by position demands."""
        a = self.attributes
        weights: dict[str, list[tuple[int, float]]] = {
            "GK":  [(a.goalkeeper, 0.6), (a.defending, 0.2), (a.physicality, 0.1), (a.passing, 0.1)],
            "CB":  [(a.defending, 0.45), (a.physicality, 0.25), (a.passing, 0.15), (a.pace, 0.15)],
            "LB":  [(a.defending, 0.3), (a.pace, 0.3), (a.passing, 0.25), (a.physicality, 0.15)],
            "RB":  [(a.defending, 0.3), (a.pace, 0.3), (a.passing, 0.25), (a.physicality, 0.15)],
            "CDM": [(a.defending, 0.4), (a.physicality, 0.25), (a.passing, 0.25), (a.pace, 0.1)],
            "CM":  [(a.passing, 0.35), (a.physicality, 0.2), (a.defending, 0.2), (a.pace, 0.15), (a.shooting, 0.1)],
            "CAM": [(a.passing, 0.35), (a.shooting, 0.3), (a.pace, 0.2), (a.physicality, 0.15)],
            "LW":  [(a.pace, 0.35), (a.shooting, 0.3), (a.passing, 0.2), (a.physicality, 0.15)],
            "RW":  [(a.pace, 0.35), (a.shooting, 0.3), (a.passing, 0.2), (a.physicality, 0.15)],
            "ST":  [(a.shooting, 0.45), (a.physicality, 0.25), (a.pace, 0.2), (a.passing, 0.1)],
        }
        parts = weights.get(self.position, [(a.pace, 1/6), (a.shooting, 1/6),
                                            (a.passing, 1/6), (a.defending, 1/6),
                                            (a.physicality, 1/6), (a.goalkeeper, 1/6)])
        return int(sum(v * w for v, w in parts))


class PlayerCreate(BaseModel):
    name: str
    nationality: str
    age: int
    position: str
    attributes: PlayerAttributes
    market_value: float
    wage: float
    contract_years_remaining: int
