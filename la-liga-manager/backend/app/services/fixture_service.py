"""
Fixture generator for a full La Liga season.

Generates a double round-robin schedule:
  - First half  (matchdays 1–19): each pair plays once
  - Second half (matchdays 20–38): reversed home/away

Returns 380 Fixture objects (20 teams × 19 rounds × 2 halves).
"""

import uuid
from typing import List, Tuple

from ..models.season import Fixture


def _round_robin_pairs(team_ids: List[str]) -> List[List[Tuple[str, str]]]:
    """
    Classic circle algorithm for n teams (n must be even).
    Returns n-1 rounds, each containing n/2 (home, away) tuples.
    """
    teams = list(team_ids)
    n = len(teams)
    if n % 2 != 0:
        teams.append("BYE")
        n += 1

    rounds: List[List[Tuple[str, str]]] = []
    for _ in range(n - 1):
        round_pairs: List[Tuple[str, str]] = []
        for i in range(n // 2):
            home = teams[i]
            away = teams[n - 1 - i]
            if home != "BYE" and away != "BYE":
                round_pairs.append((home, away))
        rounds.append(round_pairs)
        # Rotate keeping index-0 fixed
        teams = [teams[0]] + [teams[-1]] + teams[1:-1]
    return rounds


def generate_season_fixtures(
    club_ids: List[str],
    season_year: int,
) -> List[Fixture]:
    """
    Generate all 380 fixtures for a 20-team La Liga season.
    Matchdays 1-19 = first half; 20-38 = reversed home/away.
    """
    first_half = _round_robin_pairs(club_ids)   # 19 rounds
    fixtures: List[Fixture] = []

    for round_idx, pairs in enumerate(first_half):
        matchday = round_idx + 1
        for home_id, away_id in pairs:
            fixtures.append(Fixture(
                id=str(uuid.uuid4()),
                season_year=season_year,
                matchday=matchday,
                home_club_id=home_id,
                away_club_id=away_id,
            ))

    # Second half — same pairs, reversed home/away
    for round_idx, pairs in enumerate(first_half):
        matchday = round_idx + 20   # matchdays 20-38
        for home_id, away_id in pairs:
            fixtures.append(Fixture(
                id=str(uuid.uuid4()),
                season_year=season_year,
                matchday=matchday,
                home_club_id=away_id,   # reversed
                away_club_id=home_id,
            ))

    fixtures.sort(key=lambda f: (f.matchday, f.home_club_id))
    return fixtures
