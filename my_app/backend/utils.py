import re

from my_app.backend.winner_state import WinnerState


NUM_DECKS = 2
CARDS_IN_DECK = 52
TOTAL_INITIAL_CARDS = NUM_DECKS * CARDS_IN_DECK
BJ_IMMEDIATE_STOP = {WinnerState.BLACKJACK_PLAYER_WON, WinnerState.BLACKJACK_PUSH}

MINIMUM_BET = 1
INITIAL_TOKENS = 1000
ERROR_CODES = ["IC", "IU", "UAE", "CONFLICT"]

MIN_PASSWORD_LENGTH = 8
PASSWORD_REGEX_UPPER = r"[A-Z]"
PASSWORD_REGEX_LOWER = r"[a-z]"
PASSWORD_REGEX_NUM = r"\d"

def validate_password_strength(password: str) -> bool:
    """
    Ellenőrzi, hogy a jelszó megfelel-e a biztonsági elvárásoknak:
    - Legalább 8 karakter hosszú
    - Tartalmaz kis- és nagybetűt, valamint számot
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return False

    if not re.search(PASSWORD_REGEX_UPPER, password):
        return False
    if not re.search(PASSWORD_REGEX_LOWER, password):
        return False
    if not re.search(PASSWORD_REGEX_NUM, password):
        return False

    return True
