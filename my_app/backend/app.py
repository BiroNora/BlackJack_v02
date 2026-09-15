from sqlalchemy import or_
import os
import uuid
import logging
import math
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

from my_app.backend.models import db, User
from my_app.backend.services.user_service import UserService
from my_app.backend.game import TOTAL_INITIAL_CARDS, Game
from my_app.backend.game_serializer import GameSerializer
from my_app.backend.phase_state import PhaseState

load_dotenv()

MINIMUM_BET = 1
INITIAL_TOKENS = 1000

# =========================================================================
# FLASK APPLICATION BASICS
# =========================================================================
base_dir = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(base_dir, "my_app", "react", "dist")

app = Flask(__name__, static_folder=static_path, template_folder=static_path)
app.config["SECRET_KEY"] = os.environ.get(
    "FLASK_SECRET_KEY", "default-dev-secret-key-NEVER-USE-IN-PROD"
)
# Session permanencia beállítása
# app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=31)  # Például 31 nap
# app.config["SESSION_COOKIE_SECURE"] = False

app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=31)
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("VERCEL", "False") == "True"
app.config["SESSION_COOKIE_HTTPONLY"] = True

# Flask limiter inicializálás
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[
        "200 per day",
        "50 per hour",
    ],  # Alapértelmezett korlátok az egész appra
    storage_uri="memory://",  # Memóriában tárolja a számlálót
)

# =========================================================================
# DATABASE SETUP (NEON POSTGRES)
# =========================================================================
DATABASE_URL = os.environ.get(
    "DATABASE_URL_SIMPLE", "postgresql://player:pass@localhost:5433/blackjack_game"
)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

# Logging finomhangolás
log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)

with app.app_context():
    db.create_all()


# =========================================================================
# AUTH DECORATORS
# =========================================================================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return (
                jsonify(
                    {
                        "error": "ERROR: Invalid user session.",
                        "game_state_hint": "INVALID_USER_SESSION",
                    }
                ),
                401,
            )

        user = db.session.get(User, user_id)
        if not user:
            session.pop("user_id", None)
            return (
                jsonify(
                    {
                        "error": "ERROR: Invalid user session.",
                        "game_state_hint": "INVALID_USER_SESSION",
                    }
                ),
                401,
            )

        user.last_activity = datetime.now(timezone.utc)

        return f(user=user, *args, **kwargs)

    return decorated_function


def with_game_state(f):
    @wraps(f)
    def decorated_function(user, *args, **kwargs):
        # 1. Alapvető ellenőrzés
        if not user.current_game_state:
            return (
                jsonify(
                    {
                        "error": "Game state not initialized.",
                        "game_state_hint": "MISSING_GAME_STATE",
                    }
                ),
                400,
            )

        # 2. IDEMPOTENCIA ELLENŐRZÉS
        # Megpróbáljuk kiszedni a kulcsot a JSON body-ból
        data = request.get_json(silent=True) or {}
        ikey = data.get("idempotency_key")

        # Deszerializálunk (szükség van rá az idempotens válaszhoz is)
        game = Game.deserialize(user.current_game_state)

        if ikey and user.idempotency_key == ikey:
            # Ha a kulcs egyezik, nem futtatjuk le a függvényt (f),
            # csak visszaadjuk az aktuális állapotot.
            return (
                jsonify(
                    {
                        "status": "success",
                        "idempotent": True,
                        "current_tokens": user.tokens,
                        "game_state": GameSerializer.serialize_by_context(
                            game, request.path
                        ),
                    }
                ),
                200,
            )

        # 3. A végpont végrehajtása
        kwargs["user"] = user
        kwargs["game"] = game

        response = f(*args, **kwargs)

        # 4. Automatikus mentés és Idempotencia kulcs frissítése
        status_code = 200
        if isinstance(response, tuple):
            status_code = response[1]
        elif hasattr(response, "status_code"):
            status_code = response.status_code

        if 200 <= status_code < 300:
            user.current_game_state = game.serialize()
            # Itt mentjük el az új kulcsot, hogy a következő azonos kérést már megfogjuk
            if ikey:
                user.idempotency_key = ikey
            db.session.commit()

        return response

    return decorated_function


def with_user_service(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        db_session = db.session
        service = UserService(db_session)

        # Hozzáadjuk a user_service-t a paraméterekhez
        kwargs["user_service"] = service

        return f(*args, **kwargs)

    return decorated_function


def api_error_handler(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)  # Meghívjuk az eredeti végpont függvényt

        except ValueError as e:
            # Specifikus hiba (pl. pakli üres, érvénytelen adat)
            db.session.rollback()
            game = kwargs.get("game")
            user = kwargs.get("user")

            response_data = {
                "status": "error",
                "message": str(e),
                "game_state_hint": "CLIENT_ERROR_SPECIFIC",
            }

            if game:
                # Hiba esetén is a kontextusnak megfelelő állapotot küldjük
                response_data["game_state"] = GameSerializer.serialize_by_context(
                    game, request.path
                )
            if user:
                response_data["current_tokens"] = user.tokens

            return jsonify(response_data), 400

        except Exception as e:
            db.session.rollback()
            print(f"Váratlan szerver hiba az API végponton: {e}")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "CRITICAL SERVER ERROR",
                        "game_state_hint": "SERVER_ERROR_GENERIC",
                    }
                ),
                500,
            )

    return decorated_function


@app.route("/")
def index():
    return render_template("index.html")


# =========================================================================
# GAME API ENDPOINTS
# =========================================================================
# 0/1
@app.route("/api/initialize_session", methods=["POST"])
@api_error_handler
def initialize_session():
    """
    Inicializálja a felhasználói sessiont a Postgres DB alapján.
    """
    data = request.get_json() or {}
    client_id_from_request = data.get("client_id")

    # JAVÍTÁS: Ha üres, null vagy a JS-ből érkező "undefined" string, generálunk egy újat
    if (
        not client_id_from_request
        or client_id_from_request == "undefined"
        or client_id_from_request == "null"
    ):
        client_id_from_request = str(uuid.uuid4())

    # 1. Felhasználó keresése (vagy a session-ből, vagy client_id alapján)
    user_id_in_session = session.get("user_id")
    user = None

    if user_id_in_session:
        user = db.session.get(User, user_id_in_session)

    if not user:
        # Ha a session-ben nincs meg, megkeressük client_id alapján
        user = User.query.filter_by(client_id=client_id_from_request).first()

    # 2. Új felhasználó létrehozása, ha még nem létezik
    if not user:
        try:
            # Létrehozunk egy alap játékállapotot az új usernek
            initial_game = Game()
            user = User(
                client_id=client_id_from_request,
                tokens=1000,
                current_game_state=initial_game.serialize(),
            )
            db.session.add(user)
            db.session.commit()
        except IntegrityError:
            # Ha közben valaki más létrehozta, visszagördítünk és lekérjük
            db.session.rollback()
            user = User.query.filter_by(client_id=client_id_from_request).one()

    # 3. Session és állapot frissítése
    session["user_id"] = user.id
    session.permanent = True

    # A last_activity-t a modell automatikusan frissíti az onupdate miatt,
    # de itt is beállíthatjuk.
    user.last_activity = datetime.now(timezone.utc)

    # 4. Játékállapot előkészítése
    if not user.current_game_state:
        game_instance = Game()
        user.current_game_state = game_instance.serialize()
    else:
        game_instance = Game.deserialize(user.current_game_state)

    # Árva tétek visszatérítése
    if not game_instance.is_round_active and game_instance.bet > 0:
        user.tokens += game_instance.bet
        game_instance.bet = 0
        game_instance.bet_list = []

    game_instance.is_session_init = True

    user.current_game_state = game_instance.serialize()
    db.session.commit()

    if user.tokens <= 0 and not game_instance.is_round_active:
        calculated_phase = PhaseState.OUT_OF_TOKENS
    elif game_instance.is_round_active:
        calculated_phase = PhaseState.RECOVERY_DECISION
    else:
        calculated_phase = PhaseState.BETTING

    custom_game_state = {
        "deck_len": game_instance.deck_len_init,
        "target_phase": calculated_phase,
        "bet": game_instance.bet,
    }

    return (
        jsonify(
            {
                "status": "success",
                "message": "User and game session initialized.",
                "client_id": user.client_id,
                "tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": custom_game_state,
                "game_state_hint": "USER_SESSION_INITIALIZED",
                "total_initial_cards": TOTAL_INITIAL_CARDS,
            }
        ),
        200,
    )


# 0/2
@app.route("/api/check_session", methods=["POST"])
@api_error_handler
@with_user_service
def check_session(user_service):
    user = user_service.handle_check_session(session, request)

    if not user:
        return (
            jsonify(
                {
                    "status": "not_logged_in",
                    "game_state": {"target_phase": PhaseState.LOADING.value},
                }
            ),
            200,
        )

    raw_game = getattr(user, "current_game_state")
    game = Game.deserialize(raw_game) if isinstance(raw_game, (dict, str)) else raw_game
    print("386 raw_game: ", raw_game)
    return (
        jsonify(
            {
                "status": "success",
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
            }
        ),
        200,
    )


# 0/3
@app.route("/api/handle_auth", methods=["POST"])
@api_error_handler
@with_user_service
def handle_auth(user_service):
    data = request.get_json()
    email = data.get("email")
    username = data.get("username")
    password = data.get("password")
    is_login = data.get("is_login")

    current_user_id = session.get("user_id")

    guest_user = (
        user_service.db.query(User).get(current_user_id)
        if current_user_id
        else None
    )

    try:
        user = user_service.handle_user_auth(
            email, username, password, is_login, current_user_id
        )
    except ValueError as e:
        error_code = str(e)

        if error_code == "CONFLICT":
            target_user = (
                user_service.db.query(User)
                .filter(or_(User.email == email, User.user_name == username))
                .first()
            )

            target_tokens = target_user.tokens if target_user else 0
            guest_tokens = guest_user.tokens if guest_user else 0

            if target_user: # régi adat
                session["pending_target_user_id"] = target_user.id

            serialized_game = None
            if guest_user and guest_user.current_game_state:
                raw_game = guest_user.current_game_state
                game = (
                    Game.deserialize(raw_game)
                    if isinstance(raw_game, (dict, str))
                    else raw_game
                )

                # Fázisok beállítása a konfliktushoz és a későbbi visszatéréshez
                game.target_phase = PhaseState.CONFLICT

                guest_user.current_game_state = game.serialize()
                user_service.db.commit()

                serialized_game = GameSerializer.serialize_by_context(game, request.path)

            return (
                jsonify(
                    {
                        "status": error_code,
                        "game_state": serialized_game,
                        "conflict_data": {
                            "existing_user": {
                                "balance": target_tokens,
                            },
                            "current_session": {
                                "balance": guest_tokens,
                            },
                        },
                    }
                ),
                200,
            )

        return jsonify({"status": error_code}), 200

    session["user_id"] = user.id

    raw_game = getattr(user, "current_game_state", None)
    if raw_game:
        game = (
            Game.deserialize(raw_game)
            if isinstance(raw_game, (dict, str))
            else raw_game
        )
    else:
        # Biztonsági fallback, ha valamiért üres lenne
        game = Game()
        user.current_game_state = game.serialize()

    game.target_phase = PhaseState.BETTING
    user.current_game_state = game.serialize()
    user_service.db.commit()

    return (
        jsonify(
            {
                "status": "success",
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "current_tokens": user.tokens,
                "is_guest": guest_user.is_guest if guest_user else True,
            }
        ),
        200,
    )


# 1
@app.route("/api/bet", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def bet(user, game):
    data = request.get_json() or {}
    bet_amount = data.get("bet", 0)

    if not isinstance(bet_amount, (int, float)) or bet_amount < MINIMUM_BET:
        raise ValueError(f"Bet must be at least {MINIMUM_BET}.")

    if user.tokens < bet_amount:
        raise ValueError("Insufficient tokens.")

    game.set_bet(bet_amount)
    game.set_bet_list(bet_amount)
    user.tokens -= bet_amount

    return (
        jsonify(
            {
                "status": "success",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "BET_SUCCESSFULLY_PLACED",
            }
        ),
        200,
    )


# 2
@app.route("/api/retake_bet", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def retake_bet(user, game):
    current_bet_list = game.get_bet_list()
    if not current_bet_list:
        raise ValueError("No bet to retake.")

    amount_to_return = game.retake_bet_from_bet_list()

    if amount_to_return > 0:
        user.tokens += amount_to_return

    return (
        jsonify(
            {
                "status": "success",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "BET_SUCCESSFULLY_RETAKEN",
            }
        ),
        200,
    )


# 3
@app.route("/api/create_deck", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def create_deck(user, game):
    game.create_deck()

    return (
        jsonify(
            {
                "status": "success",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "DECK_CREATED",
            }
        ),
        200,
    )


# 4
@app.route("/api/start_game", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def start_game(user, game):
    game.initialize_new_round()

    return (
        jsonify(
            {
                "status": "success",
                "message": "New round initialized.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "NEW_ROUND_INITIALIZED",
            }
        ),
        200,
    )


# 5
@app.route("/api/ins_request", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def ins_request(user, game):
    bet = game.get_bet()
    insurance_amount = math.ceil(bet / 2)

    if user.tokens < insurance_amount:
        raise ValueError("Insufficient tokens.")

    ins = game.insurance_request()
    user.tokens += ins

    return (
        jsonify(
            {
                "status": "success",
                "message": "Insurance placed successfully.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "INSURANCE_PROCESSED",
            }
        ),
        200,
    )


# 6
@app.route("/api/hit", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def hit(user, game):
    game.hit(False, False)

    return (
        jsonify(
            {
                "status": "success",
                "tokens": user.tokens,
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "HIT_RECIEVED",
            }
        ),
        200,
    )


# 7
@app.route("/api/double_request", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def double_request(user, game):
    bet_amount_to_double = game.get_bet()

    if user.tokens < bet_amount_to_double:
        raise ValueError("Insufficient tokens.")

    amount_deducted = game.double_request()
    user.tokens -= amount_deducted
    game.hit(True, False)

    return (
        jsonify(
            {
                "status": "success",
                "message": "Double placed successfully.",
                "double_amount": amount_deducted,
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "DOUBLE_RECIEVED",
            }
        ),
        200,
    )


# 8
@app.route("/api/stand_and_rewards", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def stand_and_rewards(user, game):
    game.stand(False)
    token_change = game.rewards()
    user.tokens += token_change

    game_data = GameSerializer.serialize_by_context(game, request.path)

    if user.tokens <= 0:
        game_data["pre_phase"] = PhaseState.OUT_OF_TOKENS.value
    else:
        game_data["pre_phase"] = PhaseState.BETTING.value

    return (
        jsonify(
            {
                "status": "success",
                "message": "Rewards processed and tokens updated.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": game_data,
                "game_state_hint": "REWARDS_PROCESSED",
            }
        ),
        200,
    )


# SPLIT part
# 9
@app.route("/api/split_request", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def split_request(user, game):
    bet_amount = game.get_bet()

    if user.tokens < bet_amount:
        raise ValueError("Insufficient tokens.")

    if not game.can_split(game.player["hand"]) or len(game.players) > 3:
        raise ValueError("Split not possible.")

    game.split_hand()
    user.tokens -= bet_amount

    return (
        jsonify(
            {
                "status": "success",
                "message": "Split hand placed successfully.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "SPLIT_SUCCESS",
            }
        ),
        200,
    )


# 10
@app.route("/api/add_to_players_list_by_stand", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def add_to_players_list_by_stand(user, game):
    game.add_to_players_list_by_stand()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Split hand placed successfully.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "NEXT_SPLIT_HAND_ACTIVATED",
            }
        ),
        200,
    )


# 11
@app.route("/api/add_split_player_to_game", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def add_split_player_to_game(user, game):
    if not game.players:
        raise ValueError("No more split hands.")

    game.add_split_player_to_game()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Split hand placed successfully.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "NEXT_SPLIT_HAND_ACTIVATED",
            }
        ),
        200,
    )


# 12
@app.route("/api/add_player_from_players", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def add_player_from_players(user, game):
    if not game.players:
        raise ValueError("No more split hands.")

    game.add_player_from_players()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Split hand placed successfully.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "NEXT_SPLIT_HAND_ACTIVATED",
            }
        ),
        200,
    )


# 13
@app.route("/api/split_hit", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def split_hit(user, game):
    game.hit(False, True)

    return (
        jsonify(
            {
                "status": "success",
                "tokens": user.tokens,
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "HIT_RECIEVED",
            }
        ),
        200,
    )


# 14
@app.route("/api/split_double_request", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def split_double_request(user, game):
    bet_amount_to_double = game.get_bet()

    if user.tokens < bet_amount_to_double:
        raise ValueError("Insufficient tokens.")

    amount_deducted = game.double_request()
    user.tokens -= amount_deducted
    game.hit(True, True)

    return (
        jsonify(
            {
                "status": "success",
                "message": "Double placed successfully.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "DOUBLE_RECIEVED",
            }
        ),
        200,
    )


# 15
@app.route("/api/split_stand_and_rewards", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def split_stand_and_rewards(user, game):
    game.stand(True)
    token_change = game.rewards()
    user.tokens += token_change

    game_data = GameSerializer.serialize_by_context(game, request.path)

    game_data["pre_phase"] = (
        PhaseState.OUT_OF_TOKENS.value
        if user.tokens <= 0
        and (not game_data["players"] or len(game_data["players"]) == 0)
        else PhaseState.BETTING.value
    )

    return (
        jsonify(
            {
                "status": "success",
                "message": "Rewards processed and tokens updated.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": game_data,
                "game_state_hint": "REWARDS_PROCESSED",
            }
        ),
        200,
    )


# 16
@app.route("/api/set_restart", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def set_restart(user, game):
    game.restart_game()

    user.tokens = 1000

    return (
        jsonify(
            {
                "status": "success",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "HIT_RESTART",
            }
        ),
        200,
    )


# 17
@app.route("/api/force_restart", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def force_restart_by_client_id(user, game):
    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    game.restart_game()

    user.current_game_state = game.serialize()
    user.idempotency_key = None

    db.session.commit()

    return (
        jsonify(
            {
                "status": "success",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "FORCE_RESTART_SUCCESSFUL",
            }
        ),
        200,
    )


# 18
@app.route("/api/recover_game_state", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def recover_game_state(user, game):
    game.is_session_init = False
    user.current_game_state = game.serialize()

    db.session.commit()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Game state recovered.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "RECOVERY_DATA_LOADED",
            }
        ),
        200,
    )


# 19
@app.route("/api/clear_game_state", methods=["POST"])
@api_error_handler
@login_required
@with_game_state
def clear_game_state(user, game):
    game.clear_game_state()

    # Idempotencia törlése, hogy az új kör tiszta lappal induljon
    user.idempotency_key = None

    return (
        jsonify(
            {
                "status": "success",
                "message": "Game state cleared.",
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "game_state_hint": "GAME STATE CLEARED",
            }
        ),
        200,
    )


# 20
@app.route("/api/forgot_password", methods=["POST"])
@limiter.limit("5 per minute")
@api_error_handler
@with_user_service
def forgot_password(user_service):
    data = request.get_json()
    identifier = data.get("identifier")

    user = user_service.get_user_by_identifier(identifier)

    raw_game = getattr(user, "current_game_state", None)

    has_game_state = raw_game is not None and raw_game != {}
    if isinstance(raw_game, dict):
        game = Game.deserialize(raw_game)
    else:
        game = Game()

    if not has_game_state:
        game.clear_up()
        game.deck = [None] * TOTAL_INITIAL_CARDS
        user.current_game_state = game.serialize()
        flag_modified(user, "current_game_state")

    db.session.commit()

    try:
        serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
        token = serializer.dumps(identifier, salt="password-reset-salt")
    except:
        return jsonify({"status": "IC"}), 200

    return (
        jsonify(
            {
                "status": "success",
                "current_tokens": INITIAL_TOKENS,
                "is_guest": user.is_guest,
                "game_state": {
                    "target_phase": "FORGOT_PASSWORD",
                    "deck_len": game.get_deck_len(),
                },
                "token": token,
            }
        ),
        200,
    )


# 21
@app.route("/api/reset_password/<token>", methods=["POST"])
@api_error_handler
@with_user_service
def reset_password(token, user_service):
    serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    try:
        # A token 5 percig (300 másodpercig) érvényes
        identifier = serializer.loads(token, salt="password-reset-salt", max_age=300)
    except Exception:
        return jsonify({"error": "The link is invalid or has expired."}), 400

    data = request.get_json()
    new_password = data.get("password")

    if not new_password:
        return jsonify({"status": "IC"}), 200

    user = user_service.get_user_by_identifier(identifier)

    if not user:
        return jsonify({"status": "IC"}), 200

    user_service.update_password(user, new_password)

    return jsonify({"status": "success"}), 200


# 22
@app.route("/api/handle_conflict", methods=["POST"])
@api_error_handler
@with_user_service
def handle_conflict(user_service):
    data = request.get_json()
    version_new = data.get("version_new")

    current_user_id = session.get("user_id")
    target_user_id = session.pop("pending_target_user_id", None) # régi adat

    if not target_user_id:
        return jsonify({"status": "EXPIRED"}), 200

    try:
        user = user_service.handle_conflict(
            current_user_id, target_user_id, version_new
        )
    except ValueError as e:
        return jsonify({"status": str(e)}), 200

    # Frissítjük a sessiont a végleges célfiók ID-jára
    session["user_id"] = user.id

    raw_game = getattr(user, "current_game_state", None)
    if raw_game:
        game = (
            Game.deserialize(raw_game)
            if isinstance(raw_game, (dict, str))
            else raw_game
        )
    else:
        game = Game()
        user.current_game_state = game.serialize()
        user_service.db.commit()

    return (
        jsonify(
            {
                "status": "success",
                "game_state": GameSerializer.serialize_by_context(game, request.path),
                "current_tokens": user.tokens,
                "is_guest": user.is_guest,
            }
        ),
        200,
    )


# dedicated cron
@app.route("/api/cron/cleanup-guests", methods=["GET"])
@with_user_service
def cron_cleanup_guests(user_service):
    # Vercel Cron biztonsági ellenőrzés
    auth_header = request.headers.get("Authorization")
    cron_secret = os.environ.get("CRON_SECRET")

    if not cron_secret or auth_header != f"Bearer {cron_secret}":
        return jsonify({"error": "Unauthorized"}), 401

    try:
        deleted_count = user_service.delete_old_guests()
        return (
            jsonify(
                {
                    "status": "success",
                    "message": f"Successfully deleted {deleted_count} old guest accounts.",
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 20
@app.route("/error_page", methods=["GET"])
def error_page():
    return render_template("error.html")
