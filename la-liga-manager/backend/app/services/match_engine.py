"""
Match simulation engine.

Takes two clubs + their squads and returns a MatchResult.
Algorithm
---------
1. Select starting XI for each side (best 11 by position-weighted overall).
2. Compute attack / defense / goalkeeper scores.
3. Apply home advantage (+10 % attack, +5 % defense).
4. Derive expected goals via a logistic-style formula, clipped to sane range.
5. Sample actual goals from a Poisson distribution (no numpy needed).
6. Generate match events: goals with scorer & minute, yellow/red cards.
7. Red cards reduce that team's scores for the remaining minutes.
8. Produce a short match summary string.
"""

import math
import random
import uuid
from typing import Dict, List, Optional, Tuple

from ..models.player import Player
from ..models.club import Club, FORMATION_POSITIONS, POSITION_GROUPS
from ..models.season import Fixture, MatchEvent, MatchResult


# ---------------------------------------------------------------------------
# Poisson sampler (Knuth algorithm — no external deps)
# ---------------------------------------------------------------------------

def _poisson(lam: float, rng: random.Random = random) -> int:
    if lam <= 0:
        return 0
    L = math.exp(-min(lam, 20))   # guard against underflow
    k, p = 0, 1.0
    while p > L:
        k += 1
        p *= rng.random()
    return k - 1


# ---------------------------------------------------------------------------
# XI selection
# ---------------------------------------------------------------------------

def _position_overall(player: Player) -> int:
    return player.position_overall()


def select_starting_xi(
    players: List[Player],
    formation: str,
) -> List[Player]:
    """
    Pick the best 11 players for the given formation.
    Fills each slot greedily: for each required position, pick the highest-rated
    available player that fits (using POSITION_GROUPS fallbacks).
    """
    required_slots = FORMATION_POSITIONS.get(formation, FORMATION_POSITIONS["4-3-3"])
    available = sorted(players, key=_position_overall, reverse=True)
    used: set[str] = set()
    xi: List[Optional[Player]] = [None] * 11

    for i, slot_pos in enumerate(required_slots):
        candidates = POSITION_GROUPS.get(slot_pos, [slot_pos])
        for p in available:
            if p.id not in used and p.position in candidates:
                xi[i] = p
                used.add(p.id)
                break

    # Fill any unfilled slots with the best remaining player
    for i, slot in enumerate(xi):
        if slot is None:
            for p in available:
                if p.id not in used:
                    xi[i] = p
                    used.add(p.id)
                    break

    return [p for p in xi if p is not None]


# ---------------------------------------------------------------------------
# Team score computation
# ---------------------------------------------------------------------------

_ATTACK_POSITIONS  = {"ST", "LW", "RW", "CAM", "CF"}
_MIDFIELD_POSITIONS = {"CM", "CDM", "LM", "RM", "CAM"}
_DEFENSE_POSITIONS  = {"CB", "LB", "RB", "LWB", "RWB"}
_GK_POSITIONS       = {"GK"}


def _player_attack_score(p: Player) -> float:
    a = p.attributes
    if p.position in _ATTACK_POSITIONS:
        return a.shooting * 0.5 + a.pace * 0.3 + a.passing * 0.2
    if p.position in _MIDFIELD_POSITIONS:
        return a.shooting * 0.3 + a.passing * 0.4 + a.pace * 0.3
    if p.position in _DEFENSE_POSITIONS:
        return a.shooting * 0.1 + a.passing * 0.2 + a.pace * 0.1
    return 10.0


def _player_defense_score(p: Player) -> float:
    a = p.attributes
    if p.position in _DEFENSE_POSITIONS:
        return a.defending * 0.6 + a.physicality * 0.3 + a.pace * 0.1
    if p.position in _MIDFIELD_POSITIONS:
        return a.defending * 0.5 + a.physicality * 0.3 + a.passing * 0.2
    if p.position in _ATTACK_POSITIONS:
        return a.defending * 0.2 + a.physicality * 0.2
    return 20.0


def calculate_team_scores(xi: List[Player]) -> Tuple[float, float, float]:
    """Return (attack_score, defense_score, gk_score) for a starting XI."""
    gk_score = 50.0
    attack_total = 0.0
    defense_total = 0.0
    count = len(xi)

    for p in xi:
        if p.position in _GK_POSITIONS:
            gk_score = p.attributes.goalkeeper * 0.7 + p.attributes.defending * 0.2 + p.attributes.physicality * 0.1
        else:
            attack_total  += _player_attack_score(p)
            defense_total += _player_defense_score(p)

    n = max(count - 1, 1)  # exclude GK from average
    return attack_total / n, defense_total / n, gk_score


# ---------------------------------------------------------------------------
# Expected goals
# ---------------------------------------------------------------------------

def _expected_goals(attack: float, opponent_defense: float, opponent_gk: float) -> float:
    """
    Logistic-style formula.
    Average La Liga game has ~2.5 total goals (1.3 home, 1.2 away).
    """
    # Baseline when both sides are equal (~65 rated)
    net = (attack - opponent_defense) / 100.0  # roughly [-1, 1]
    base = 1.25
    lam = base * (1.0 + net * 1.2) * (1.0 - (opponent_gk - 65) / 250.0)
    return max(0.15, min(3.8, lam))


# ---------------------------------------------------------------------------
# Event generation
# ---------------------------------------------------------------------------

def _pick_scorer(xi: List[Player], rng: random.Random) -> Player:
    """Weighted random scorer — attackers and midfielders more likely."""
    weights = []
    for p in xi:
        if p.position in _ATTACK_POSITIONS:
            weights.append(p.attributes.shooting * 3.0)
        elif p.position in _MIDFIELD_POSITIONS:
            weights.append(p.attributes.shooting * 1.2)
        else:
            weights.append(p.attributes.shooting * 0.3)
    return rng.choices(xi, weights=weights, k=1)[0]


def _generate_goal_minutes(n_goals: int, rng: random.Random) -> List[int]:
    return sorted(rng.randint(1, 90) for _ in range(n_goals))


def _generate_card_minutes(n_cards: int, rng: random.Random) -> List[int]:
    return sorted(rng.randint(1, 90) for _ in range(n_cards))


def _generate_events(
    home_xi: List[Player],
    away_xi: List[Player],
    home_club_id: str,
    away_club_id: str,
    home_goals: int,
    away_goals: int,
    rng: random.Random,
) -> Tuple[List[MatchEvent], int, int]:
    """
    Returns (events, effective_home_goals, effective_away_goals).
    Own goals and red cards can shift the scoreline slightly.
    """
    events: List[MatchEvent] = []
    effective_home = home_goals
    effective_away = away_goals

    # --- Cards first (they can reduce goals) ---
    home_physicality = sum(p.attributes.physicality for p in home_xi) / max(len(home_xi), 1)
    away_physicality = sum(p.attributes.physicality for p in away_xi) / max(len(away_xi), 1)

    # Yellows: avg ~3 per match total
    home_yellows = _poisson(1.4 + (home_physicality - 65) / 100, rng)
    away_yellows = _poisson(1.4 + (away_physicality - 65) / 100, rng)

    # Reds: ~0.25 per match total
    home_reds = 1 if rng.random() < 0.12 else 0
    away_reds = 1 if rng.random() < 0.12 else 0

    for minute in _generate_card_minutes(home_yellows, rng):
        if home_xi:
            p = rng.choice(home_xi)
            events.append(MatchEvent(minute=minute, event_type="yellow_card",
                                     player_id=p.id, player_name=p.name,
                                     club_id=home_club_id))

    for minute in _generate_card_minutes(away_yellows, rng):
        if away_xi:
            p = rng.choice(away_xi)
            events.append(MatchEvent(minute=minute, event_type="yellow_card",
                                     player_id=p.id, player_name=p.name,
                                     club_id=away_club_id))

    for minute in _generate_card_minutes(home_reds, rng):
        if home_xi:
            p = rng.choice(home_xi)
            events.append(MatchEvent(minute=minute, event_type="red_card",
                                     player_id=p.id, player_name=p.name,
                                     club_id=home_club_id))
            # Red card reduces attack slightly — may cost a goal
            if effective_home > 0 and rng.random() < 0.25:
                effective_home -= 1

    for minute in _generate_card_minutes(away_reds, rng):
        if away_xi:
            p = rng.choice(away_xi)
            events.append(MatchEvent(minute=minute, event_type="red_card",
                                     player_id=p.id, player_name=p.name,
                                     club_id=away_club_id))
            if effective_away > 0 and rng.random() < 0.25:
                effective_away -= 1

    # --- Goals ---
    home_goal_minutes = _generate_goal_minutes(effective_home, rng)
    away_goal_minutes = _generate_goal_minutes(effective_away, rng)

    for minute in home_goal_minutes:
        # ~5 % chance of own goal (away player scores into own net — goal credited to home)
        if rng.random() < 0.05 and away_xi:
            p = rng.choice(away_xi)
            events.append(MatchEvent(minute=minute, event_type="own_goal",
                                     player_id=p.id, player_name=p.name,
                                     club_id=home_club_id))   # goal benefits home
        elif home_xi:
            p = _pick_scorer(home_xi, rng)
            events.append(MatchEvent(minute=minute, event_type="goal",
                                     player_id=p.id, player_name=p.name,
                                     club_id=home_club_id))

    for minute in away_goal_minutes:
        # ~5 % own goal — home player scores into own net, goal credited to away
        if rng.random() < 0.05 and home_xi:
            p = rng.choice(home_xi)
            events.append(MatchEvent(minute=minute, event_type="own_goal",
                                     player_id=p.id, player_name=p.name,
                                     club_id=away_club_id))   # goal benefits away
        elif away_xi:
            p = _pick_scorer(away_xi, rng)
            events.append(MatchEvent(minute=minute, event_type="goal",
                                     player_id=p.id, player_name=p.name,
                                     club_id=away_club_id))

    events.sort(key=lambda e: e.minute)
    return events, effective_home, effective_away


# ---------------------------------------------------------------------------
# Match summary
# ---------------------------------------------------------------------------

def _build_summary(
    home_name: str, away_name: str,
    home_goals: int, away_goals: int,
    events: List[MatchEvent],
    home_club_id: str,
) -> str:
    if home_goals > away_goals:
        result_str = f"{home_name} win {home_goals}-{away_goals}"
    elif away_goals > home_goals:
        result_str = f"{away_name} win {away_goals}-{home_goals} away"
    else:
        result_str = f"Draw {home_goals}-{away_goals}"

    scorers_home = [e.player_name for e in events
                    if e.event_type in ("goal", "own_goal") and e.club_id == home_club_id]
    scorers_away = [e.player_name for e in events
                    if e.event_type in ("goal", "own_goal") and e.club_id != home_club_id]

    reds = [e for e in events if e.event_type == "red_card"]

    lines = [result_str]
    if scorers_home:
        lines.append(f"  {home_name} scorers: {', '.join(scorers_home)}")
    if scorers_away:
        lines.append(f"  {away_name} scorers: {', '.join(scorers_away)}")
    if reds:
        lines.append(f"  Red cards: {', '.join(e.player_name for e in reds)}")

    total_goals = home_goals + away_goals
    if total_goals >= 5:
        lines.append("  What a thriller — goals galore at the Estadio!")
    elif total_goals == 0:
        lines.append("  A tight, goalless affair. Both defenses were rock solid.")
    elif reds:
        lines.append("  The red card changed the complexion of this match.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def simulate_match(
    fixture: Fixture,
    home_club: Club,
    away_club: Club,
    home_players: List[Player],
    away_players: List[Player],
    seed: Optional[int] = None,
) -> MatchResult:
    """
    Simulate a single match and return a MatchResult.

    Parameters
    ----------
    fixture       : the Fixture being played
    home_club     : Club data for the home side
    away_club     : Club data for the away side
    home_players  : full squad list for home side (will pick best XI)
    away_players  : full squad list for away side
    seed          : optional RNG seed for reproducibility
    """
    rng = random.Random(seed)

    home_xi = select_starting_xi(home_players, home_club.current_formation)
    away_xi = select_starting_xi(away_players, away_club.current_formation)

    h_att, h_def, h_gk = calculate_team_scores(home_xi)
    a_att, a_def, a_gk = calculate_team_scores(away_xi)

    # Home advantage
    h_att *= 1.10
    h_def *= 1.05

    lam_home = _expected_goals(h_att, a_def, a_gk)
    lam_away = _expected_goals(a_att, h_def, h_gk)

    home_goals = _poisson(lam_home, rng)
    away_goals = _poisson(lam_away, rng)

    events, home_goals, away_goals = _generate_events(
        home_xi, away_xi,
        home_club.id, away_club.id,
        home_goals, away_goals,
        rng,
    )

    summary = _build_summary(
        home_club.name, away_club.name,
        home_goals, away_goals,
        events, home_club.id,
    )

    return MatchResult(
        fixture_id=fixture.id,
        home_club_id=home_club.id,
        home_club_name=home_club.name,
        away_club_id=away_club.id,
        away_club_name=away_club.name,
        home_goals=home_goals,
        away_goals=away_goals,
        events=events,
        match_summary=summary,
        matchday=fixture.matchday,
    )
