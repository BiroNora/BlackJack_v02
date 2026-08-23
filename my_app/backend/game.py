import copy
import math
import random

from collections import Counter
from typing import Any, Dict

from my_app.backend.hand_state import HandState
from my_app.backend.phase_state import PhaseState
from my_app.backend.winner_state import WinnerState

NUM_DECKS = 2
CARDS_IN_DECK = 52
TOTAL_INITIAL_CARDS = NUM_DECKS * CARDS_IN_DECK


class Game:
    NONE = 0
    BJ_IMMEDIATE_STOP = {WinnerState.BLACKJACK_PLAYER_WON, WinnerState.BLACKJACK_PUSH}

    def __init__(self):
        self.player: Dict[str, Any] = {
            "id": Game.NONE,
            "hand": [],
            "sum": 0,
            "hand_state": HandState.NONE,
            "can_split": False,
            "stated": False,
            "bet": 0,
            "has_hit": 0,
        }
        self.dealer_masked: Dict[str, Any] = {
            "hand": [],
            "sum": 0,
            "can_insure": False,
        }
        self.dealer_unmasked: Dict[str, Any] = {
            "hand": [],
            "sum": 0,
            "hand_state": HandState.NONE,
            "natural_21": WinnerState.NONE,
        }
        self.split_player: Dict[str, Any] = {
            "id": Game.NONE,
            "hand": [],
            "sum": 0,
            "hand_state": HandState.NONE,
            "can_split": False,
            "stated": False,
            "bet": 0,
            "has_hit": 0,
        }
        self.natural_21 = WinnerState.NONE
        self.aces = False
        self.winner = WinnerState.NONE
        self.hand_counter: int = 0  # helper for the players dict
        self.players: Dict[str, Dict[str, Any]] = {}
        self.players_index = {}  # helper for the players dict
        self.stated = False
        self.split_req: int = 0
        self.unmasked_sum_sent = False
        self.suits = ["♥", "♦", "♣", "♠"]
        self.ranks = ["A", "K", "Q", "J", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
        # self.ranks = ["A", "K", "K", "K", "9", "10"]
        self.deck = []
        self.deck_len_init = TOTAL_INITIAL_CARDS
        self.bet: int = 0
        self.bet_list = []
        self.is_round_active = False
        self.target_phase = PhaseState.LOADING
        self.pre_phase = PhaseState.NONE
        self.is_session_init = False

    def initialize_new_round(self):
        self.clear_up()

        card1 = self.deck.pop(0)
        card2 = self.deck.pop(0)
        card3 = self.deck.pop(0)
        card4 = self.deck.pop(0)

        player_hand = [card1, card3]
        dealer_hand = [card2, card4]
        dealer_masked = [" ✪ ", card4]

        player_sum = self.sum(player_hand, True)
        dealer_masked_sum = self.sum([card4], False)
        dealer_unmasked_sum = self.sum(dealer_hand, False)

        self.natural_21 = self.init_natural_21_state(player_hand, dealer_hand)

        can_split = self.can_split(player_hand)
        can_insure = card4[-1] == "A"

        player_state = (
            self.hand_state(player_sum, True) if player_sum == 21 else HandState.NONE
        )
        dealer_unmasked_state = self.hand_state(dealer_unmasked_sum, False)

        bet = self.get_bet()

        self.is_round_active = True
        self.is_session_init = False

        self.target_phase = PhaseState.INIT_GAME
        self.pre_phase = (
            PhaseState.MAIN_STAND_REWARDS_TRANSIT
            if self.natural_21 in Game.BJ_IMMEDIATE_STOP
            else PhaseState.MAIN_TURN
        )

        self.aces = True if card1[-1] == "A" and card3[-1] == "A" else False

        self.player = {
            "id": self._generate_sequential_id(),
            "hand": player_hand,
            "sum": player_sum,
            "hand_state": player_state,
            "can_split": can_split,
            "stated": self.stated,
            "bet": bet,
            "has_hit": 0,
        }
        self.dealer_masked: Dict[str, Any] = {
            "hand": dealer_masked,
            "sum": dealer_masked_sum,
            "can_insure": can_insure,
        }
        self.dealer_unmasked: Dict[str, Any] = {
            "hand": dealer_hand,
            "sum": dealer_unmasked_sum,
            "hand_state": dealer_unmasked_state,
            "natural_21": self.natural_21,
        }

    def sum(self, hand, is_player):
        ranks = self.hand_to_ranks(hand)
        counts = Counter(ranks)
        nums_of_ace = counts["A"]
        res = 0
        BLACKJACK_LIMIT = 21
        for rank in ranks:
            if rank in ["K", "Q", "J", "0"]:
                res += 10
            elif rank.isdigit():
                res += int(rank)
        if nums_of_ace > 0:
            for _ in range(nums_of_ace):
                if res + 11 <= BLACKJACK_LIMIT:
                    res += 11
                else:
                    res += 1
        if is_player:
            self.set_player_sum(res)
        else:
            self.set_dealer_sum(res)

        return res

    def init_natural_21_state(self, player_hand, dealer_hand):
        player_natural = self.sum(player_hand, True) == 21 and len(player_hand) == 2
        dealer_natural = self.sum(dealer_hand, False) == 21 and len(dealer_hand) == 2

        if player_natural and dealer_natural:
            self.natural_21 = WinnerState.BLACKJACK_PUSH
        elif player_natural:
            self.natural_21 = WinnerState.BLACKJACK_PLAYER_WON
        elif dealer_natural:
            self.natural_21 = WinnerState.BLACKJACK_DEALER_WON
        else:
            self.natural_21 = WinnerState.NONE

        return self.natural_21

    def hand_state(self, count, is_player):
        if count > 21:
            state = HandState.BUST
        elif count == 21:
            state = HandState.TWENTY_ONE
        else:
            state = HandState.UNDER_21

        if is_player and (
            self.natural_21 == WinnerState.BLACKJACK_PLAYER_WON
            or self.natural_21 == WinnerState.BLACKJACK_PUSH
        ):
            state = HandState.BLACKJACK

        if not is_player and (
            self.natural_21 == WinnerState.BLACKJACK_DEALER_WON
            or self.natural_21 == WinnerState.BLACKJACK_PUSH
        ):
            state = HandState.BLACKJACK

        return state

    def winner_state(self):
        player = self.player["sum"]
        dealer = self.dealer_unmasked["sum"]

        if player > 21:
            self.winner = WinnerState.PLAYER_LOST

        elif dealer > 21:
            self.winner = WinnerState.PLAYER_WON

        elif player == dealer:
            self.winner = WinnerState.PUSH

        elif player > dealer:
            self.winner = WinnerState.PLAYER_WON

        else:
            self.winner = WinnerState.DEALER_WON

        return self.winner

    def hit(self, is_double, has_split):
        if not self.is_round_active:
            return
        new_card = self.deck.pop(0)
        self.set_player_hand(new_card)
        self.player["has_hit"] = self.player.get("has_hit", 0) + 1

        curr_sum = self.sum(self.player["hand"], True)
        self.player["sum"] = curr_sum

        if not has_split:
            self.target_phase = (
                PhaseState.MAIN_STAND_REWARDS_TRANSIT
                if curr_sum >= 21 or is_double
                else PhaseState.MAIN_TURN
            )
        else:
            if is_double:
                self.target_phase = PhaseState.SPLIT_STAND_DOUBLE
            elif curr_sum >= 21:
                self.target_phase = (
                    PhaseState.SPLIT_STAND_DOUBLE
                    if self.player.get("has_hit") == 1
                    else PhaseState.SPLIT_STAND
                )
            else:
                self.target_phase = PhaseState.SPLIT_TURN

    def stand(self, has_split):
        count = self.sum(self.dealer_unmasked["hand"], False)
        if self.sum(self.player["hand"], True) <= 21:
            while count < 17:
                card = self.deck.pop(0)
                self.dealer_unmasked["hand"].append(card)
                count = self.sum(self.dealer_unmasked["hand"], False)
                self.dealer_unmasked["sum"] = count

        self.dealer_unmasked["sum"] = count
        self.dealer_unmasked["hand_state"] = self.hand_state(count, False)
        self.player["hand_state"] = self.hand_state(self.player["sum"], True)
        self.winner = Game.NONE
        self.winner = self.winner_state()

        self.target_phase = (
            PhaseState.MAIN_STAND if not has_split else PhaseState.SPLIT_FINISH_OUTCOME
        )

    def rewards(self) -> int:
        bet = self.player["bet"]
        natural_21_scenario = self.dealer_unmasked["natural_21"]
        reward_amount = 0  # Alapértelmezett érték: 0 (veszteség)

        if self.natural_21 == 1:
            reward_amount = math.floor(bet * 2.5)  # Eredeti tét + 1.5x nyeremény
        elif self.winner == 6 and natural_21_scenario != 3:
            reward_amount = bet * 2  # Eredeti tét + 1x nyeremény
        elif (
            self.winner == 4 and natural_21_scenario != 3
        ) or natural_21_scenario == 2:
            reward_amount = bet

        self.set_bet_to_null()
        self.set_bet_list_to_null()
        self.is_round_active = bool(self.players)

        return reward_amount

    def retake_bet_from_bet_list(self):
        if len(self.bet_list) != 0:
            bet = self.bet_list.pop()
            self.set_bet(-bet)
            return bet
        else:
            return 0

    def insurance_request(self):
        ins_cost = math.ceil(self.bet / 2)

        if self.dealer_unmasked["natural_21"] == 3:
            bet = self.bet
            self.set_bet_to_null()
            self.set_bet_list_to_null()
            self.is_round_active = False
            self.player["hand_state"] = self.hand_state(self.player["sum"], True)
            self.target_phase = PhaseState.MAIN_STAND
            self.pre_phase = PhaseState.BETTING

            return bet
        else:
            self.target_phase = PhaseState.MAIN_TURN
            self.pre_phase = PhaseState.NONE

            return -ins_cost

    def double_request(self):
        self.player["bet"] += self.bet

        return self.bet

    def split_hand(self):
        if not self.can_split(self.player["hand"]) or len(self.players) > 3:
            return

        old_id = self.player["id"]
        card_to_split = self.player["hand"].pop(0)
        new_hand1 = [card_to_split]
        new_hand2 = [self.player["hand"].pop()]

        new_id_B = self._generate_sequential_id()
        new_hand = self.deal_card(new_hand1, True, hand_id=old_id)
        hand_to_list = self.deal_card(new_hand2, False, hand_id=new_id_B)

        self.player = new_hand
        self.players[hand_to_list["id"]] = hand_to_list
        old_id = self.player["id"]

        self.players_index[old_id] = self.stated
        self.players_index[new_id_B] = self.stated

        is_nat21 = self.player["hand_state"] == HandState.TWENTY_ONE

        self.set_split_req(1)

        self.target_phase = (
            PhaseState.SPLIT_ACE_TRANSIT
            if self.aces
            else PhaseState.SPLIT_NAT21_TRANSIT if is_nat21 else PhaseState.SPLIT_TURN
        )
        self.pre_phase = (
            PhaseState.SPLIT_STAND if is_nat21 and not self.aces else PhaseState.NONE
        )

    def deal_card(self, hand, is_first, hand_id):
        if self.deck and is_first:
            hand.append(self.deck.pop(0))

        player_sum = self.sum(hand, True)
        can_split = False if self.aces else self.can_split(hand)
        player_state = (
            self.hand_state(player_sum, True) if is_first else HandState.UNDER_21
        )
        player = {
            "id": hand_id,
            "hand": hand,
            "sum": player_sum,
            "hand_state": player_state,
            "can_split": can_split,
            "stated": self.stated,
            "bet": self.bet,
            "has_hit": 0,
        }

        return player

    def add_to_players_list_by_stand(self):
        is_active = any(
            hand_data.get("stated") is False for hand_data in self.players.values()
        )

        if is_active:
            self.player["stated"] = True
            self.players[self.player["id"]] = self.player
            ID = self.player["id"]
            self.players_index[ID] = True

        self.target_phase = (
            PhaseState.SPLIT_FINISH
            if self.split_req == 0
            else PhaseState.SPLIT_ACE_TRANSIT  # if self.aces
        )

    def find_smallest_false_stated_id(self):
        if not self.players_index:
            return None

        unplayed_id_generator = (
            hand_id
            for hand_id, is_stated in sorted(self.players_index.items())
            if is_stated is False
        )
        # next() adja vissza a legelső (legkisebb) False állapotú ID-t
        return next(unplayed_id_generator, None)

    def add_split_player_to_game(self):
        if not self.players:
            return None

        hand_id = self.find_smallest_false_stated_id()

        if hand_id is None:
            return None

        # ESET 1: VISSZATÖLTÉS (Cache Védelme a Strict Mode miatt)
        if self.split_player and self.split_player.get("id") == hand_id:
            self.player = copy.deepcopy(self.split_player)

        # ESET 2: Gyors kiút (A lap már be van töltve)
        elif self.player and self.player.get("id") == hand_id:
            pass

        # ESET 3: ELSŐ FUTÁS (Lap kiemelése, mentés, és set_split_req)
        elif hand_id in self.players:
            self.player = self.players.pop(hand_id)
            self.split_player = copy.deepcopy(self.player)
            self.set_split_req(-1)
        else:
            return None

        if len(self.player.get("hand", [])) < 2:
            if self.deck:
                card = self.deck.pop(0)
                self.player["hand"].append(card)

        hand = self.player["hand"]
        player_sum = self.sum(hand, True)
        can_split = self.can_split(hand)
        self.player["sum"] = player_sum
        state = self.hand_state(player_sum, True)
        self.player["hand_state"] = state
        self.player["can_split"] = can_split

        self.target_phase = (
            PhaseState.SPLIT_NAT21_TRANSIT
            if not self.aces and state == HandState.TWENTY_ONE
            else (
                PhaseState.SPLIT_ACE_TRANSIT
                if self.aces and self.split_req != 0
                else (
                    PhaseState.SPLIT_FINISH
                    if self.aces and self.split_req == 0
                    else PhaseState.SPLIT_TURN
                )
            )
        )
        self.pre_phase = (
            PhaseState.SPLIT_STAND if state == HandState.TWENTY_ONE else PhaseState.NONE
        )

        return self.player

    def add_player_from_players(self):
        if not self.players:
            return self.player

        first_id = list(self.players.keys())[0]
        self.player = self.players.pop(first_id)
        self.target_phase = PhaseState.SPLIT_FINISH

        return self.player

    def create_deck(self):
        single_deck = [f"{suit}{rank}" for suit in self.suits for rank in self.ranks]
        self.deck = single_deck * 2
        random.shuffle(self.deck)
        self.target_phase = PhaseState.INIT_GAME
        return self.deck

    # helpers
    def _generate_sequential_id(self) -> str:
        self.hand_counter += 1
        formatted_count = f"{self.hand_counter:03d}"

        return f"H-{formatted_count}"

    def sort_key_combined(self, hand):
        # False (asc) < True (asc)
        stated_status = hand.get("stated", True)
        hand_id = hand.get("id", "")

        return (stated_status, hand_id)

    def clear_up(self):
        self.player: Dict[str, Any] = {
            "id": Game.NONE,
            "hand": [],
            "sum": 0,
            "hand_state": HandState.NONE,
            "can_split": False,
            "stated": False,
            "bet": 0,
            "has_hit": 0,
        }
        self.dealer_masked: Dict[str, Any] = {
            "hand": [],
            "sum": 0,
            "can_insure": False,
        }
        self.dealer_unmasked: Dict[str, Any] = {
            "hand": [],
            "sum": 0,
            "hand_state": HandState.NONE,
            "natural_21": WinnerState.NONE,
        }
        self.split_player: Dict[str, Any] = {
            "id": Game.NONE,
            "hand": [],
            "sum": 0,
            "hand_state": HandState.NONE,
            "can_split": False,
            "stated": False,
            "bet": 0,
            "has_hit": 0,
        }
        self.aces = False
        self.natural_21 = WinnerState.NONE
        self.winner = WinnerState.NONE
        self.hand_counter = 0
        self.players = {}
        self.players_index = {}
        self.split_req = 0
        self.unmasked_sum_sent = False
        self.is_round_active = False
        self.target_phase = PhaseState.BETTING
        self.pre_phase = PhaseState.NONE

    def restart_game(self):
        self.__init__()

    def hand_to_ranks(self, hand):
        return "".join(c[-1] for c in hand)

    def can_split(self, hand):
        ranks = self.hand_to_ranks(hand)
        tens = ["K", "Q", "J", "0"]

        return len(ranks) == 2 and (
            (ranks[0] == ranks[1]) or (ranks[0] in tens and ranks[1] in tens)
        )

    def load_state_from_data(self, data):
        self.is_round_active = data.get("is_round_active", False)

    def clear_game_state(self):
        self.__init__()
        self.target_phase = PhaseState.BETTING

    # getters, setters
    def set_player_hand(self, card):
        self.player["hand"].append(card)

    def set_player_sum(self, sum):
        self.player["sum"] = sum

    def set_dealer_sum(self, sum):
        self.dealer_masked["sum"] = sum

    def get_player_state(self):
        return self.player["hand_state"]

    def set_player_state(self, state):
        self.player["hand_state"] = state

    def get_dealer_state(self):
        return self.dealer_unmasked["hand_state"]

    def set_dealer_state(self, state):
        self.dealer_unmasked["hand_state"] = state

    def get_players(self):
        return self.players

    def set_bet(self, amount):
        self.bet += amount
        self.player["bet"] = self.player["bet"] + amount

    def set_bet_to_null(self):
        self.bet = 0
        self.player["bet"] = 0

    def get_bet(self):
        return self.bet

    def get_bet_list(self):
        return self.bet_list

    def set_bet_list(self, bet):
        self.bet_list.append(bet)

    def set_bet_list_to_null(self):
        self.bet_list = []

    def get_split_req(self):
        return self.split_req

    def set_split_req(self, count):
        self.split_req += count

    def get_deck_len(self):
        if len(self.deck) > 0:
            return len(self.deck)
        else:
            return self.deck_len_init

    def get_is_round_active(self):
        return self.is_round_active

    def update_target_phase(self):
        self.target_phase = self.get_target_phase()

    # >>>> TARGET PHASE
    def get_target_phase(self):
        return self.target_phase

    def get_pre_phase(self):
        return self.pre_phase

    @staticmethod
    def _get_sort_key_combined(hand):
        return (hand.get("hand_stated", True), hand.get("id", ""))

    def _get_sorted_hands(self):
        all_hands = list(self.players.values())
        return sorted(all_hands, key=self._get_sort_key_combined)

    def serialize(self):
        sorted_players_list = self._get_sorted_hands()

        return {
            "deck": self.deck,
            "player": self.player,
            "dealer_masked": self.dealer_masked,
            "dealer_unmasked": self.dealer_unmasked,
            "split_player": self.split_player,
            "aces": self.aces,
            "natural_21": self.natural_21,
            "winner": self.winner,
            "hand_counter": self.hand_counter,
            "players": sorted_players_list,
            "players_index": self.players_index,
            "split_req": self.split_req,
            "unmasked_sum_sent": self.unmasked_sum_sent,
            "deck_len": self.get_deck_len(),
            "bet": self.bet,
            "bet_list": self.bet_list,
            "is_round_active": self.is_round_active,
            "target_phase": self.get_target_phase().value,
            "pre_phase": self.get_pre_phase().value,
            "is_session_init": self.is_session_init,
        }

    @classmethod
    def deserialize(cls, data):
        game = cls()
        game.deck = data["deck"]
        game.player = data["player"]
        game.dealer_masked = data["dealer_masked"]
        game.dealer_unmasked = data["dealer_unmasked"]
        game.split_player = data["split_player"]
        game.aces = data["aces"]
        game.natural_21 = data["natural_21"]
        game.winner = data["winner"]
        game.hand_counter = data["hand_counter"]
        game.players = {hand["id"]: hand for hand in data["players"]}
        game.players_index = data.get("players_index", {})
        game.split_req = data["split_req"]
        game.unmasked_sum_sent = data["unmasked_sum_sent"]
        game.deck_len = data["deck_len"]
        game.bet = data["bet"]
        game.bet_list = data["bet_list"]
        game.is_round_active = data.get("is_round_active", False)
        raw_pre = data.get("pre_phase")
        raw_target = data.get("target_phase")
        if raw_target:
            game.target_phase = PhaseState(raw_target)
        if raw_pre:
            game.pre_phase = PhaseState(raw_pre)
        # Ha valamiért nem volt a mentésben, a get_ függvények adják meg az alapot
        if not raw_target:
            game.target_phase = game.get_target_phase()
        if not raw_pre:
            game.pre_phase = game.get_pre_phase()
        game.is_session_init = data.get("is_session_init", False)

        return game
