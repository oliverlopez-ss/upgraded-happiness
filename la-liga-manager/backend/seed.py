"""
Seed script — generates a full La Liga 2024 season in game.db.

Run from the backend/ directory:
    python seed.py

Generates:
  - 20 real La Liga clubs
  - 23 position-appropriate players per club (460 total)
  - 380 season fixtures (19 matchdays × 10 games × 2 halves)
  - Standings rows for all clubs
  - Game state (user manages Sevilla FC)
  - Default user tactics
"""
import os
import sys
import random
import uuid

# Make sure imports resolve when run as a script from backend/
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, init_db
from app.database import (
    ClubORM, PlayerORM, StandingsORM, FixtureORM,
    GameStateORM, UserTacticsORM,
)
from app.services.fixture_service import generate_season_fixtures
from app.services.match_engine import select_starting_xi
from app.models.player import Player, PlayerAttributes

SEASON_YEAR   = 2024
USER_CLUB_ID  = "sevilla-fc"
RANDOM_SEED   = 42

random.seed(RANDOM_SEED)

# ---------------------------------------------------------------------------
# Club definitions (tier 1–4 drives player quality)
# ---------------------------------------------------------------------------

CLUBS = [
    # id, name, short_name, city, stadium, budget(M€), wage_budget(k€/wk), tier, colors
    ("real-madrid",    "Real Madrid",    "RMA", "Madrid",       "Estadio Santiago Bernabéu",  200.0, 3500, 1, "#ffffff", "#febe10"),
    ("barcelona",      "FC Barcelona",   "BAR", "Barcelona",    "Estadi Olímpic Lluís Companys", 150.0, 3200, 1, "#a50044", "#004d98"),
    ("atletico-madrid","Atlético Madrid","ATM", "Madrid",       "Estadio Metropolitano",      120.0, 2800, 1, "#cb3524", "#2f4993"),
    ("athletic-bilbao","Athletic Club",  "ATH", "Bilbao",       "Estadio San Mamés",           80.0, 1800, 2, "#ee2523", "#ffffff"),
    ("real-sociedad",  "Real Sociedad",  "RSO", "San Sebastián","Estadio Anoeta",               75.0, 1600, 2, "#003da5", "#ffffff"),
    ("villarreal",     "Villarreal CF",  "VIL", "Villarreal",   "Estadio de la Cerámica",       70.0, 1500, 2, "#ffdd00", "#004f9f"),
    ("real-betis",     "Real Betis",     "BET", "Seville",      "Estadio Benito Villamarín",    65.0, 1400, 2, "#00954c", "#ffffff"),
    ("sevilla-fc",     "Sevilla FC",     "SEV", "Seville",      "Estadio Ramón Sánchez-Pizjuán",60.0, 1300, 2, "#d91a21", "#ffffff"),
    ("girona",         "Girona FC",      "GIR", "Girona",       "Estadio Municipal de Montilivi",50.0, 900, 3, "#cc0000", "#ffffff"),
    ("mallorca",       "RCD Mallorca",   "MAL", "Palma",        "Estadio de Son Moix",          45.0, 800, 3, "#c8102e", "#000000"),
    ("celta-vigo",     "Celta Vigo",     "CEL", "Vigo",         "Estadio de Balaídos",          40.0, 750, 3, "#75aadb", "#ffffff"),
    ("osasuna",        "CA Osasuna",     "OSA", "Pamplona",     "Estadio El Sadar",             40.0, 700, 3, "#d4021d", "#003da5"),
    ("rayo-vallecano", "Rayo Vallecano", "RAY", "Madrid",       "Campo de Fútbol de Vallecas",  35.0, 650, 3, "#d4021d", "#ffffff"),
    ("getafe",         "Getafe CF",      "GET", "Getafe",       "Coliseum Alfonso Pérez",       35.0, 650, 3, "#214f93", "#ffffff"),
    ("valencia",       "Valencia CF",    "VAL", "Valencia",     "Estadio Mestalla",             45.0, 900, 3, "#f7a01d", "#000000"),
    ("alaves",         "Deportivo Alavés","ALA","Vitoria-Gasteiz","Estadio de Mendizorroza",    25.0, 500, 4, "#0067b1", "#ffffff"),
    ("leganes",        "CD Leganés",     "LEG", "Leganés",      "Estadio Municipal de Butarque",20.0, 420, 4, "#003087", "#ffffff"),
    ("espanyol",       "RCD Espanyol",   "ESP", "Barcelona",    "Estadio RCDE",                 30.0, 600, 4, "#003da5", "#ffffff"),
    ("valladolid",     "Real Valladolid","VLL", "Valladolid",   "Estadio José Zorrilla",        20.0, 420, 4, "#6f1e51", "#ffffff"),
    ("las-palmas",     "UD Las Palmas",  "LPA", "Las Palmas",   "Estadio Gran Canaria",         25.0, 480, 4, "#fadd02", "#003da5"),
]

# ---------------------------------------------------------------------------
# Name pools (nationality → (first_names, last_names))
# ---------------------------------------------------------------------------

NAMES = {
    "Spanish": (
        ["Carlos", "David", "Sergio", "Alejandro", "Marcos", "Pablo", "Diego",
         "Luis", "Miguel", "Antonio", "Rafael", "José", "Manuel", "Pedro",
         "Jorge", "Iván", "Raúl", "Rubén", "Víctor", "Fernando", "Jesús",
         "Roberto", "Ángel", "Óscar", "Daniel", "Alberto", "Andrés", "Álvaro",
         "Cristian", "Javier", "Nacho", "Dani", "Nico", "Mikel", "Aitor",
         "Unai", "Jon", "Enric", "Marc", "Pedri"],
        ["García", "Rodríguez", "Martínez", "López", "Sánchez", "Pérez",
         "González", "Fernández", "Romero", "Díaz", "Torres", "Jiménez",
         "Navarro", "Ruiz", "Moreno", "Molina", "Delgado", "Ortega",
         "Gutiérrez", "Ramos", "Vargas", "Alonso", "Vega", "Reyes",
         "Medina", "Castillo", "Blanco", "Herrera", "Méndez", "Aguilar",
         "Mora", "Santos", "Gil", "Cruz", "Lara", "Núñez", "Soria", "Moya"],
    ),
    "Brazilian": (
        ["Lucas", "Felipe", "Bruno", "Gabriel", "Rafael", "Vitor", "Mateus",
         "Rodrigo", "Thiago", "Anderson", "Willian", "Fábio", "Ricardo",
         "Eduardo", "Davi", "Caio", "Leandro", "Danilo", "Alex", "Julio",
         "Vinicius", "Rodrygo", "Endrick", "Wesley"],
        ["Silva", "Costa", "Santos", "Oliveira", "Pereira", "Ferreira",
         "Carvalho", "Rodrigues", "Almeida", "Gomes", "Souza", "Lima",
         "Araújo", "Barbosa", "Moreira", "Cunha", "Machado", "Fonseca"],
    ),
    "Argentine": (
        ["Lionel", "Ángel", "Rodrigo", "Facundo", "Lautaro", "Nicolás",
         "Gonzalo", "Julián", "Mauro", "Nahuel", "Ezequiel", "Joaquín",
         "Emiliano", "Franco", "Gastón", "Leandro", "Maximiliano"],
        ["Messi", "Di María", "Martínez", "Fernández", "Romero", "González",
         "Gómez", "Pérez", "Álvarez", "Sánchez", "Gutiérrez", "Herrera",
         "Acuña", "De Paul", "Mac Allister", "Dybala"],
    ),
    "French": (
        ["Antoine", "Kylian", "Ousmane", "Raphaël", "Benjamin", "Théo",
         "Adrien", "William", "Kingsley", "Paul", "Moussa", "Marcus",
         "Ibrahima", "Randal", "Aurélien"],
        ["Griezmann", "Mbappé", "Dembélé", "Varane", "Pavard", "Hernandez",
         "Rabiot", "Saliba", "Coman", "Pogba", "Sissoko", "Thuram",
         "Konaté", "Tchouaméni", "Camavinga"],
    ),
    "Portuguese": (
        ["Cristiano", "Bruno", "João", "Bernardo", "Rúben", "Diogo",
         "Rafael", "Nélson", "Gonçalo", "Vitinha", "Otávio"],
        ["Ronaldo", "Fernandes", "Félix", "Silva", "Dias", "Jota",
         "Leão", "Semedo", "Ramos", "Costa", "Cabral"],
    ),
    "German": (
        ["Thomas", "Joshua", "Leon", "Kai", "Leroy", "Toni", "Manuel",
         "Niklas", "Antonio", "Robin"],
        ["Müller", "Kimmich", "Goretzka", "Havertz", "Sané", "Kroos",
         "Neuer", "Süle", "Rüdiger", "Koch"],
    ),
    "Croatian": (
        ["Luka", "Ivan", "Mateo", "Ante", "Marcelo", "Joško"],
        ["Modrić", "Perišić", "Kovačić", "Budimir", "Brozović", "Gvardiol"],
    ),
    "Moroccan": (
        ["Achraf", "Hakim", "Youssef", "Noussair", "Azzedine"],
        ["Hakimi", "Ziyech", "En-Nesyri", "Mazraoui", "Ounahi"],
    ),
}

_ALL_NATIONALITIES = list(NAMES.keys())
_NAT_WEIGHTS = [40, 15, 12, 10, 8, 5, 5, 5]   # Spanish-heavy


def _random_name(nationality: str) -> str:
    firsts, lasts = NAMES.get(nationality, NAMES["Spanish"])
    return f"{random.choice(firsts)} {random.choice(lasts)}"


def _random_nationality() -> str:
    return random.choices(_ALL_NATIONALITIES, weights=_NAT_WEIGHTS, k=1)[0]


# ---------------------------------------------------------------------------
# Attribute generation — position + tier aware
# ---------------------------------------------------------------------------

# Base rating range by tier
_TIER_BASE = {1: 74, 2: 66, 3: 59, 4: 52}
_TIER_RANGE = {1: 18, 2: 15, 3: 13, 4: 11}

# Per-position attribute offsets from base
_POS_OFFSETS = {
    #            pace  shoot  pass  defend  physic  gk
    "GK":  [  -20,  -40,  -15,    0,    5,   20 ],
    "CB":  [   -5,  -25,  -10,   20,   15,  -45 ],
    "LB":  [   15,  -15,    5,   10,    5,  -45 ],
    "RB":  [   15,  -15,    5,   10,    5,  -45 ],
    "CDM": [   -5,  -15,    5,   15,   10,  -45 ],
    "CM":  [    5,   -5,   15,    0,    5,  -45 ],
    "CAM": [   10,   10,   20,  -20,   -5,  -45 ],
    "LW":  [   25,   10,   10,  -25,   -5,  -45 ],
    "RW":  [   25,   10,   10,  -25,   -5,  -45 ],
    "ST":  [   15,   25,    0,  -30,   10,  -45 ],
}


def _gen_attrs(position: str, tier: int) -> dict:
    base = _TIER_BASE[tier]
    spread = _TIER_RANGE[tier]
    offsets = _POS_OFFSETS.get(position, [0] * 6)
    keys = ["pace", "shooting", "passing", "defending", "physicality", "goalkeeper"]
    result = {}
    for k, off in zip(keys, offsets):
        val = base + off + random.randint(-spread // 2, spread)
        result[k] = max(1, min(99, val))
    return result


def _market_value(tier: int, age: int, overall: int) -> float:
    """Rough market value in M€."""
    base = {1: 40, 2: 18, 3: 7, 4: 2.5}[tier]
    age_factor = max(0.3, 1.0 - max(0, age - 27) * 0.08)
    quality_factor = 0.5 + (overall - 60) / 80
    mv = base * age_factor * quality_factor * random.uniform(0.7, 1.3)
    return round(max(0.1, mv), 1)


def _wage(market_value: float) -> float:
    """Weekly wage in k€, correlated with market value."""
    wk = market_value * random.uniform(1.5, 3.0)
    return round(max(0.5, wk), 1)


# ---------------------------------------------------------------------------
# Squad layout per club (23 players)
# ---------------------------------------------------------------------------

SQUAD_LAYOUT = [
    "GK", "GK", "GK",
    "CB", "CB", "CB", "CB",
    "LB", "LB",
    "RB", "RB",
    "CDM", "CDM",
    "CM", "CM", "CM",
    "CAM",
    "LW", "LW",
    "RW", "RW",
    "ST", "ST",
]
assert len(SQUAD_LAYOUT) == 23


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _overall_for_player(attrs: dict, position: str) -> int:
    weights = {
        "GK":  [("goalkeeper", 0.6), ("defending", 0.2), ("physicality", 0.1), ("passing", 0.1)],
        "CB":  [("defending", 0.45), ("physicality", 0.25), ("passing", 0.15), ("pace", 0.15)],
        "LB":  [("defending", 0.3), ("pace", 0.3), ("passing", 0.25), ("physicality", 0.15)],
        "RB":  [("defending", 0.3), ("pace", 0.3), ("passing", 0.25), ("physicality", 0.15)],
        "CDM": [("defending", 0.4), ("physicality", 0.25), ("passing", 0.25), ("pace", 0.1)],
        "CM":  [("passing", 0.35), ("physicality", 0.2), ("defending", 0.2), ("pace", 0.15), ("shooting", 0.1)],
        "CAM": [("passing", 0.35), ("shooting", 0.3), ("pace", 0.2), ("physicality", 0.15)],
        "LW":  [("pace", 0.35), ("shooting", 0.3), ("passing", 0.2), ("physicality", 0.15)],
        "RW":  [("pace", 0.35), ("shooting", 0.3), ("passing", 0.2), ("physicality", 0.15)],
        "ST":  [("shooting", 0.45), ("physicality", 0.25), ("pace", 0.2), ("passing", 0.1)],
    }
    parts = weights.get(position, [(k, 1/6) for k in attrs])
    return int(sum(attrs[k] * w for k, w in parts if k in attrs))


def build_club_orm(data: tuple) -> ClubORM:
    cid, name, short, city, stadium, budget, wage_budget, tier, pc, sc = data
    return ClubORM(
        id=cid, name=name, short_name=short, city=city, stadium=stadium,
        budget=budget, wage_budget=wage_budget, tier=tier,
        current_formation="4-3-3",
        primary_color=pc, secondary_color=sc,
    )


def build_player_orm(position: str, club_id: str, tier: int) -> PlayerORM:
    nat = _random_nationality()
    attrs = _gen_attrs(position, tier)
    overall = _overall_for_player(attrs, position)
    age = random.randint(18, 34)
    mv  = _market_value(tier, age, overall)
    return PlayerORM(
        id=str(uuid.uuid4()),
        name=_random_name(nat),
        nationality=nat,
        age=age,
        position=position,
        current_club=club_id,
        market_value=mv,
        wage=_wage(mv),
        contract_years_remaining=random.randint(1, 5),
        is_transfer_listed=False,
        is_free_agent=False,
        **attrs,
    )


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

def seed():
    init_db()
    db = SessionLocal()

    try:
        # Clear existing data
        db.query(UserTacticsORM).delete()
        db.query(GameStateORM).delete()
        db.query(StandingsORM).delete()
        db.query(FixtureORM).delete()
        db.query(PlayerORM).delete()
        db.query(ClubORM).delete()
        db.commit()
        print("Cleared existing data.")

        # --- Clubs ---
        club_orms = [build_club_orm(c) for c in CLUBS]
        db.add_all(club_orms)
        db.commit()
        print(f"Created {len(club_orms)} clubs.")

        # --- Players ---
        player_orms = []
        for club_data in CLUBS:
            club_id = club_data[0]
            tier    = club_data[7]
            for position in SQUAD_LAYOUT:
                player_orms.append(build_player_orm(position, club_id, tier))
        db.add_all(player_orms)
        db.commit()
        print(f"Created {len(player_orms)} players ({len(player_orms)//len(CLUBS)} per club).")

        # --- Fixtures (380 total) ---
        club_ids = [c[0] for c in CLUBS]
        fixtures = generate_season_fixtures(club_ids, SEASON_YEAR)
        fixture_orms = [
            FixtureORM(
                id=f.id, season_year=f.season_year, matchday=f.matchday,
                home_club_id=f.home_club_id, away_club_id=f.away_club_id,
                played=False,
            )
            for f in fixtures
        ]
        db.add_all(fixture_orms)
        db.commit()
        print(f"Created {len(fixture_orms)} fixtures across {max(f.matchday for f in fixtures)} matchdays.")

        # --- Standings ---
        standings_orms = [
            StandingsORM(season_year=SEASON_YEAR, club_id=c[0])
            for c in CLUBS
        ]
        db.add_all(standings_orms)
        db.commit()
        print("Created standings rows.")

        # --- Game state ---
        gs = GameStateORM(
            id=1,
            season_year=SEASON_YEAR,
            current_matchday=0,
            phase="pre_season",
            user_club_id=USER_CLUB_ID,
            transfer_window_open=True,
            last_matchday_results=[],
        )
        db.add(gs)
        db.commit()
        print(f"Game state: managing {USER_CLUB_ID}, season {SEASON_YEAR}.")

        # --- Default tactics (auto-pick best XI for user) ---
        from app.models.player import Player as PydPlayer, PlayerAttributes
        sevilla_players_orm = [p for p in player_orms if p.current_club == USER_CLUB_ID]
        sevilla_players = []
        for p in sevilla_players_orm:
            sevilla_players.append(PydPlayer(
                id=p.id, name=p.name, nationality=p.nationality, age=p.age,
                position=p.position,
                attributes=PlayerAttributes(
                    pace=p.pace, shooting=p.shooting, passing=p.passing,
                    defending=p.defending, physicality=p.physicality,
                    goalkeeper=p.goalkeeper,
                ),
                current_club=p.current_club, market_value=p.market_value,
                wage=p.wage, contract_years_remaining=p.contract_years_remaining,
            ))

        xi = select_starting_xi(sevilla_players, "4-3-3")
        xi_ids = [p.id for p in xi]
        bench  = [p.id for p in sevilla_players if p.id not in set(xi_ids)][:12]

        user_tactics = UserTacticsORM(
            id=1,
            club_id=USER_CLUB_ID,
            formation="4-3-3",
            starting_xi=xi_ids,
            bench=bench,
        )
        db.add(user_tactics)
        db.commit()
        print(f"Default tactics set: 4-3-3 with {len(xi_ids)} starters.")

        # --- Summary ---
        print("\n✅ Seed complete!")
        print(f"   Season : {SEASON_YEAR}")
        print(f"   Clubs  : {len(club_orms)}")
        print(f"   Players: {len(player_orms)}")
        print(f"   Fixtures: {len(fixture_orms)}")
        print(f"   Your club: Sevilla FC")
        print("\nStart the API with:")
        print("   uvicorn app.main:app --reload")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
