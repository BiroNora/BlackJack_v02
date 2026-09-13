from typing import Any, Dict
from my_app.backend.phase_state import PhaseState
from my_app.backend.game import BJ_IMMEDIATE_STOP, TOTAL_INITIAL_CARDS


class GameSerializer:
    @staticmethod
    def serialize_by_context(game, path: str) -> Dict[str, Any]:
        p = path or ""

        if "recover_game_state" in p:
            if game.players or game.split_req > 0:
                return GameSerializer.serialize_split_hand(game)
            return GameSerializer.serialize_initial_and_hit_state(
                game, is_recovery=True
            )

        if "split_stand_and_rewards" in p:
            return GameSerializer.serialize_split_stand_and_rewards(game)
        if "add_to_players_list_by_stand" in p:
            return GameSerializer.serialize_add_to_players_list_by_stand(game)
        if "add_player_from_players" in p:
            return GameSerializer.serialize_add_player_from_players(game)
        if "split" in p:
            return GameSerializer.serialize_split_hand(game)
        if "ins_request" in p:
            return GameSerializer.serialize_for_insurance(game)
        if "double_request" in p:
            return GameSerializer.serialize_double_state(game)
        if "rewards" in p:
            return GameSerializer.serialize_reward_state(game)
        if "create_deck" in p:
            return GameSerializer.serialize_create_deck(game)
        if "start_game" in p:
            return GameSerializer.serialize_start_game(game)
        if "clear_game_state" in p:
            return GameSerializer.serialize_clear_game_state(game)
        if "handle_conflict" in p or "check_session" in p:
            # Ha a játékosok listája létezik vagy split van, kezeljük splitként
            if getattr(game, "players", None) or getattr(game, "split_req", 0) > 0:
                return GameSerializer.serialize_split_hand(game)

            # Ha van aktív kártya és aktív kör
            if getattr(game, "player", None) and getattr(game, "is_round_active", None):
                # A natural_21 alapján beállítjuk a megfelelő target_phase-t
                natural_21_val = getattr(game, "natural_21", 0)
                if natural_21_val in BJ_IMMEDIATE_STOP:
                    game.target_phase = PhaseState.MAIN_STAND_REWARDS_TRANSIT
                else:
                    game.target_phase = PhaseState.MAIN_TURN

                return GameSerializer.serialize_initial_and_hit_state(game)

            # Alapértelmezett / tétrakási fázis fallback
            return GameSerializer.serialize_for_client_bets(game)

        if any(x in p for x in ["hit"]):
            return GameSerializer.serialize_initial_and_hit_state(game)

        if any(x in p for x in ["bet", "retake_bet", "restart"]):
            return GameSerializer.serialize_for_client_bets(game)

        return GameSerializer.serialize_for_client_init(game)

    @staticmethod
    def serialize_for_client_init(game) -> Dict[str, Any]:
        return {
            "deck_len": game.deck_len_init if len(game.deck) == 0 else len(game.deck),
            "target_phase": game.get_target_phase().value,
            "pre_phase": PhaseState.NONE.value,
        }

    @staticmethod
    def serialize_clear_game_state(game) -> Dict[str, Any]:
        return {
            "bet": 0,
            "bet_list": [],
            "deck_len": game.deck_len_init,
            "target_phase": PhaseState.BETTING.value,
            "pre_phase": PhaseState.NONE.value,
        }

    @staticmethod
    def serialize_for_client_bets(game) -> Dict[str, Any]:
        d_len = (
            TOTAL_INITIAL_CARDS
            if (not game.is_round_active and game.is_session_init)
            else game.get_deck_len()
        )

        calc_phase = (
            PhaseState.NONE
            if not game.bet_list
            else (
                PhaseState.SHUFFLING
                if (d_len == TOTAL_INITIAL_CARDS or d_len < 60)
                else PhaseState.INIT_GAME
            )
        )

        return {
            "bet": game.bet,
            "bet_list": game.bet_list,
            "deck_len": d_len,
            "target_phase": PhaseState.BETTING.value,
            "pre_phase": calc_phase.value,
        }

    @staticmethod
    def serialize_create_deck(game) -> Dict[str, Any]:
        return {
            "bet": game.bet,
            "deck_len": game.deck_len_init,
            "target_phase": game.get_target_phase().value,
        }

    @staticmethod
    def serialize_initial_and_hit_state(
        game, is_recovery: bool = False
    ) -> Dict[str, Any]:
        return {
            "player": game.player,
            "dealer_masked": game.dealer_masked,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": (
                PhaseState.MAIN_TURN.value
                if is_recovery
                else game.get_target_phase().value
            ),
        }

    @staticmethod
    def serialize_start_game(game) -> Dict[str, Any]:
        return {
            "player": game.player,
            "dealer_masked": game.dealer_masked,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": game.get_target_phase().value,
            "pre_phase": game.get_pre_phase().value,
        }

    @staticmethod
    def serialize_for_insurance(game) -> Dict[str, Any]:
        state = {
            "player": game.player,
            "natural_21": game.natural_21,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": game.get_target_phase().value,
            "pre_phase": game.get_pre_phase().value if game.get_pre_phase() else None,
        }
        if game.natural_21 == 3:
            state["dealer_unmasked"] = game.dealer_unmasked
        else:
            state["dealer_masked"] = game.dealer_masked
        return state

    @staticmethod
    def serialize_double_state(game) -> Dict[str, Any]:
        return {
            "player": game.player,
            "deck_len": game.get_deck_len(),
            "target_phase": game.get_target_phase().value,
        }

    @staticmethod
    def serialize_reward_state(game) -> Dict[str, Any]:
        return {
            "player": game.player,
            "dealer_unmasked": game.dealer_unmasked,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "winner": game.winner,
            "target_phase": game.get_target_phase().value,
        }

    @staticmethod
    def serialize_split_hand(game) -> Dict[str, Any]:
        return {
            "player": game.player,
            "dealer_masked": game.dealer_masked,
            "aces": game.aces,
            "players": game._get_sorted_hands(),
            "split_req": game.split_req,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": game.get_target_phase().value,
            "pre_phase": game.get_pre_phase().value if game.get_pre_phase() else None,
        }

    @staticmethod
    def serialize_add_to_players_list_by_stand(game) -> Dict[str, Any]:
        state = {
            "player": game.player,
            "aces": game.aces,
            "players": game._get_sorted_hands(),
            "split_req": game.split_req,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": game.get_target_phase().value,
            "pre_phase": game.get_pre_phase().value if game.get_pre_phase() else None,
        }
        if game.split_req > 0:
            state["dealer_masked"] = game.dealer_masked
        else:
            dealer_data = game.dealer_unmasked.copy()
            if not game.unmasked_sum_sent:
                dealer_data["sum"] = 0
                game.unmasked_sum_sent = True
            state["dealer_unmasked"] = dealer_data
        return state

    @staticmethod
    def serialize_add_player_from_players(game) -> Dict[str, Any]:
        return {
            "player": game.player,
            "dealer_unmasked": game.dealer_unmasked,
            "aces": game.aces,
            "players": game._get_sorted_hands(),
            "split_req": game.split_req,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": game.get_target_phase().value,
            "pre_phase": game.get_pre_phase().value if game.get_pre_phase() else None,
        }

    @staticmethod
    def serialize_split_stand_and_rewards(game) -> Dict[str, Any]:
        return {
            "player": game.player,
            "dealer_unmasked": game.dealer_unmasked,
            "players": game._get_sorted_hands(),
            "winner": game.winner,
            "split_req": game.split_req,
            "deck_len": game.get_deck_len(),
            "bet": game.bet,
            "target_phase": game.get_target_phase().value,
            "pre_phase": game.get_pre_phase().value if game.get_pre_phase() else None,
        }
