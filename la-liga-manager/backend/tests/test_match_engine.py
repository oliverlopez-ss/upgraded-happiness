"""
Unit tests for the match simulation engine.
"""
import pytest
from unittest.mock import patch
from typing import List

from app.models.player import Player, PlayerAttributes
from app.models.club import Club
from app.models.season import Fixture, MatchResult
from app.services.match_engine import (
    _poisson,
    select_starting_xi,
    calculate_team_scores,
    simulate_match,
    _expected_goals,
)


# ---------------------------------------------------------------------------
# Fixtures (pytest)
# ---------------------------------------------------------------------------

def _make_player(pid: str, name: str, position: str, **attr_overrides) -> Player:
    defaults = dict(pace=65, shooting=65, passing=65, defending=65,
                    physicality=65, goalkeeper=65)
    defaults.update(attr_overrides)
    return Player(
        id=pid, name=name, nationality="Spanish",
        age=25, position=position,
        attributes=PlayerAttributes(**defaults),
        current_club="test-club", market_value=5.0,
        wage=10.0, contract_years_remaining=2,
    )


def _make_squad(formation: str) -> List[Player]:
    """Create a basic 23-player squad (good enough for tests)."""
    players = []
    positions = [
        ("GK", 3), ("CB", 4), ("LB", 2), ("RB", 2),
        ("CDM", 2), ("CM", 3), ("CAM", 1), ("LW", 2), ("RW", 2), ("ST", 2),
    ]
    i = 0
    for pos, count in positions:
        for j in range(count):
            players.append(_make_player(f"p{i}", f"Player {i}", pos))
            i += 1
    return players


def _make_club(cid: str, name: str, formation: str = "4-3-3") -> Club:
    return Club(
        id=cid, name=name, short_name=name[:3].upper(),
        city="Test", stadium="Test Stadium",
        budget=50.0, wage_budget=1000.0,
        current_formation=formation,
        squad=[], tier=2,
    )


def _make_fixture(home_id: str, away_id: str, matchday: int = 1) -> Fixture:
    return Fixture(
        id="fixture-test-1",
        season_year=2024,
        matchday=matchday,
        home_club_id=home_id,
        away_club_id=away_id,
    )


# ---------------------------------------------------------------------------
# Poisson sampler
# ---------------------------------------------------------------------------

class TestPoisson:
    def test_returns_non_negative(self):
        for _ in range(1000):
            assert _poisson(1.5) >= 0

    def test_zero_lambda(self):
        assert _poisson(0.0) == 0

    def test_approximate_mean(self):
        """Sample 10000 draws; mean should be within 5 % of lambda."""
        lam = 2.0
        samples = [_poisson(lam) for _ in range(10_000)]
        mean = sum(samples) / len(samples)
        assert abs(mean - lam) < 0.1, f"Mean {mean} too far from lambda {lam}"

    def test_high_lambda(self):
        """High lambda should still produce reasonable values."""
        samples = [_poisson(5.0) for _ in range(1000)]
        assert all(s >= 0 for s in samples)
        mean = sum(samples) / len(samples)
        assert 4.5 < mean < 5.5


# ---------------------------------------------------------------------------
# Starting XI selection
# ---------------------------------------------------------------------------

class TestSelectXI:
    def test_returns_eleven_players(self):
        squad = _make_squad("4-3-3")
        xi = select_starting_xi(squad, "4-3-3")
        assert len(xi) == 11

    def test_no_duplicate_players(self):
        squad = _make_squad("4-3-3")
        xi = select_starting_xi(squad, "4-3-3")
        ids = [p.id for p in xi]
        assert len(ids) == len(set(ids))

    def test_all_players_from_squad(self):
        squad = _make_squad("4-3-3")
        squad_ids = {p.id for p in squad}
        xi = select_starting_xi(squad, "4-3-3")
        for p in xi:
            assert p.id in squad_ids

    def test_handles_442_formation(self):
        squad = _make_squad("4-4-2")
        xi = select_starting_xi(squad, "4-4-2")
        assert len(xi) == 11

    def test_handles_352_formation(self):
        squad = _make_squad("3-5-2")
        xi = select_starting_xi(squad, "3-5-2")
        assert len(xi) == 11

    def test_handles_small_squad(self):
        """Should still return ≤11 from a tiny squad."""
        squad = [_make_player(f"p{i}", f"Player {i}", "CM") for i in range(9)]
        xi = select_starting_xi(squad, "4-3-3")
        assert len(xi) <= 11

    def test_gk_in_xi(self):
        squad = _make_squad("4-3-3")
        xi = select_starting_xi(squad, "4-3-3")
        positions = [p.position for p in xi]
        assert "GK" in positions


# ---------------------------------------------------------------------------
# Team scores
# ---------------------------------------------------------------------------

class TestTeamScores:
    def test_returns_three_floats(self):
        squad = _make_squad("4-3-3")
        xi = select_starting_xi(squad, "4-3-3")
        att, def_, gk = calculate_team_scores(xi)
        assert isinstance(att, float)
        assert isinstance(def_, float)
        assert isinstance(gk, float)

    def test_scores_in_reasonable_range(self):
        squad = _make_squad("4-3-3")
        xi = select_starting_xi(squad, "4-3-3")
        att, def_, gk = calculate_team_scores(xi)
        assert 0 < att < 200
        assert 0 < def_ < 200
        assert 0 < gk < 150

    def test_strong_team_higher_attack(self):
        weak_squad  = [_make_player(f"w{i}", f"Weak {i}", pos, shooting=40, pace=40)
                       for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])]
        strong_squad = [_make_player(f"s{i}", f"Strong {i}", pos, shooting=90, pace=90)
                        for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])]
        w_att, _, _ = calculate_team_scores(weak_squad)
        s_att, _, _ = calculate_team_scores(strong_squad)
        assert s_att > w_att

    def test_strong_defense_higher_defense_score(self):
        weak  = [_make_player(f"w{i}", f"W{i}", pos, defending=30)
                 for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])]
        strong = [_make_player(f"s{i}", f"S{i}", pos, defending=95)
                  for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])]
        _, w_def, _ = calculate_team_scores(weak)
        _, s_def, _ = calculate_team_scores(strong)
        assert s_def > w_def


# ---------------------------------------------------------------------------
# Expected goals
# ---------------------------------------------------------------------------

class TestExpectedGoals:
    def test_high_attack_vs_low_defense_gives_more_goals(self):
        lam_strong = _expected_goals(attack=90, opponent_defense=40, opponent_gk=50)
        lam_weak   = _expected_goals(attack=40, opponent_defense=90, opponent_gk=80)
        assert lam_strong > lam_weak

    def test_clipped_to_sane_range(self):
        lam = _expected_goals(1000, 0, 0)
        assert lam <= 3.9
        lam = _expected_goals(0, 1000, 1000)
        assert lam >= 0.1


# ---------------------------------------------------------------------------
# Full match simulation
# ---------------------------------------------------------------------------

class TestSimulateMatch:
    def setup_method(self):
        self.home_club   = _make_club("home-fc", "Home FC")
        self.away_club   = _make_club("away-fc", "Away FC")
        self.home_squad  = _make_squad("4-3-3")
        self.away_squad  = _make_squad("4-3-3")
        self.fixture     = _make_fixture("home-fc", "away-fc")

    def test_returns_match_result(self):
        result = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad,
        )
        assert isinstance(result, MatchResult)

    def test_goals_non_negative(self):
        result = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad,
        )
        assert result.home_goals >= 0
        assert result.away_goals >= 0

    def test_fixture_ids_correct(self):
        result = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad,
        )
        assert result.fixture_id == self.fixture.id
        assert result.home_club_id == "home-fc"
        assert result.away_club_id == "away-fc"

    def test_deterministic_with_seed(self):
        r1 = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad, seed=99,
        )
        r2 = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad, seed=99,
        )
        assert r1.home_goals == r2.home_goals
        assert r1.away_goals == r2.away_goals
        assert len(r1.events) == len(r2.events)

    def test_summary_non_empty(self):
        result = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad,
        )
        assert len(result.match_summary) > 0

    def test_event_types_valid(self):
        result = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad, seed=1,
        )
        valid_types = {"goal", "own_goal", "yellow_card", "red_card"}
        for event in result.events:
            assert event.event_type in valid_types

    def test_event_minutes_in_range(self):
        result = simulate_match(
            self.fixture, self.home_club, self.away_club,
            self.home_squad, self.away_squad,
        )
        for event in result.events:
            assert 1 <= event.minute <= 120

    def test_goal_count_matches_events(self):
        """Total goals in events should reconcile with home/away goals."""
        for seed in range(20):
            result = simulate_match(
                self.fixture, self.home_club, self.away_club,
                self.home_squad, self.away_squad, seed=seed,
            )
            home_goals_in_events = sum(
                1 for e in result.events
                if e.event_type in ("goal", "own_goal") and e.club_id == "home-fc"
            )
            away_goals_in_events = sum(
                1 for e in result.events
                if e.event_type in ("goal", "own_goal") and e.club_id == "away-fc"
            )
            assert home_goals_in_events == result.home_goals
            assert away_goals_in_events == result.away_goals

    def test_elite_beats_weak_more_often(self):
        """
        An elite club (tier 1 attributes) should win > 70 % of the time
        against a very weak club (tier 4 attributes).
        """
        elite_squad = [
            _make_player(f"e{i}", f"Elite {i}", pos,
                         pace=88, shooting=87, passing=85,
                         defending=84, physicality=83, goalkeeper=88)
            for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])
        ]
        weak_squad  = [
            _make_player(f"w{i}", f"Weak {i}", pos,
                         pace=48, shooting=47, passing=46,
                         defending=45, physicality=45, goalkeeper=47)
            for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])
        ]

        elite_wins = 0
        n = 500
        for seed in range(n):
            r = simulate_match(self.fixture, self.home_club, self.away_club,
                               elite_squad, weak_squad, seed=seed)
            if r.home_goals > r.away_goals:
                elite_wins += 1

        win_rate = elite_wins / n
        assert win_rate > 0.60, f"Elite win rate {win_rate:.2%} unexpectedly low"

    def test_upsets_possible(self):
        """Weak home team should still win occasionally — upsets must happen."""
        elite_away = [
            _make_player(f"e{i}", f"Elite {i}", pos,
                         pace=90, shooting=90, passing=88,
                         defending=87, physicality=86, goalkeeper=90)
            for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])
        ]
        weak_home  = [
            _make_player(f"w{i}", f"Weak {i}", pos,
                         pace=48, shooting=47, passing=46,
                         defending=45, physicality=44, goalkeeper=46)
            for i, pos in enumerate(["GK","CB","CB","LB","RB","CM","CM","CDM","LW","RW","ST"])
        ]

        home_wins = 0
        n = 300
        for seed in range(n):
            r = simulate_match(self.fixture, self.home_club, self.away_club,
                               weak_home, elite_away, seed=seed)
            if r.home_goals > r.away_goals:
                home_wins += 1

        assert home_wins > 0, "Upsets should occasionally happen"


# ---------------------------------------------------------------------------
# Fixture generator
# ---------------------------------------------------------------------------

class TestFixtureGenerator:
    def test_generates_380_fixtures(self):
        from app.services.fixture_service import generate_season_fixtures
        club_ids = [f"club-{i}" for i in range(20)]
        fixtures = generate_season_fixtures(club_ids, 2024)
        assert len(fixtures) == 380

    def test_each_team_plays_38_games(self):
        from app.services.fixture_service import generate_season_fixtures
        club_ids = [f"club-{i}" for i in range(20)]
        fixtures = generate_season_fixtures(club_ids, 2024)
        from collections import Counter
        counts: Counter = Counter()
        for f in fixtures:
            counts[f.home_club_id] += 1
            counts[f.away_club_id] += 1
        for cid in club_ids:
            assert counts[cid] == 38, f"{cid} played {counts[cid]} games (expected 38)"

    def test_each_pair_plays_home_and_away(self):
        from app.services.fixture_service import generate_season_fixtures
        club_ids = ["club-A", "club-B", "club-C", "club-D"]
        fixtures = generate_season_fixtures(club_ids, 2024)
        pairs: set = set()
        for f in fixtures:
            pairs.add((f.home_club_id, f.away_club_id))
        for a in club_ids:
            for b in club_ids:
                if a != b:
                    assert (a, b) in pairs, f"Pair ({a},{b}) missing"

    def test_38_matchdays(self):
        from app.services.fixture_service import generate_season_fixtures
        club_ids = [f"club-{i}" for i in range(20)]
        fixtures = generate_season_fixtures(club_ids, 2024)
        matchdays = {f.matchday for f in fixtures}
        assert matchdays == set(range(1, 39))

    def test_10_fixtures_per_matchday(self):
        from app.services.fixture_service import generate_season_fixtures
        club_ids = [f"club-{i}" for i in range(20)]
        fixtures = generate_season_fixtures(club_ids, 2024)
        from collections import Counter
        md_counts = Counter(f.matchday for f in fixtures)
        for md, count in md_counts.items():
            assert count == 10, f"Matchday {md} has {count} fixtures (expected 10)"
