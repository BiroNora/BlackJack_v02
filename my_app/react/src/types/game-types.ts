export type GameState =
  | "LOADING"
  | "RECOVERY_DECISION"
  | "SHUFFLING"
  | "BETTING"
  | "INIT_GAME"
  | "MAIN_TURN"
  | "MAIN_STAND"
  | "MAIN_STAND_REWARDS_TRANSIT"
  | "SPLIT_TURN"
  | "SPLIT_STAND"
  | "SPLIT_STAND_DOUBLE"
  | "SPLIT_NAT21_TRANSIT"
  | "SPLIT_FINISH"
  | "SPLIT_FINISH_OUTCOME"
  | "SPLIT_ACE_TRANSIT"
  | "OUT_OF_TOKENS"
  | "RESTART_GAME"
  | "ERROR"
  | "RELOADING"
  | "FORGOT_PASSWORD"
  | "CONFLICT";

export interface GameStateData {
  currentGameState: GameState;
  player: PlayerData;
  dealer_masked: DealerMaskedData;
  dealer_unmasked: DealerUnmaskedData;
  aces: boolean;
  winner: number;
  players: Record<string, PlayerData>;
  split_req: number;
  deck_len: number;
  tokens: number;
  bet: number;
  bet_list: number[];
  target_phase: GameState | null;
  pre_phase: GameState | null;
}

export interface ApiResponse {
  status: string;
  message?: string;
  current_tokens: number;
  is_guest: boolean;
  game_state: GameStateData; // Csak a játék adatai
  game_state_hint: string;
}

export interface PlayerData {
  id: string;
  hand: string[];
  sum: number;
  hand_state: number;
  can_split: boolean;
  stated: boolean;
  bet: number;
  has_hit: number;
}

export interface DealerMaskedData {
  hand: string[];
  sum: number;
  can_insure: boolean;
}

export interface DealerUnmaskedData {
  hand: string[];
  sum: number;
  hand_state: number;
  natural_21: number;
}

export type GameStateForClient = {
  deck_len: number;
  target_phase: GameState | null;
};

export type SessionInitResponse = {
  status: "success";
  message: string;
  user_id: string;
  client_id: string;
  tokens: number;
  game_state: GameStateForClient;
  game_state_hint: "USER_SESSION_INITIALIZED";
  total_initial_cards: number;
};

export type ErrorResponse = {
  message?: string; // Az üzenet opcionális, ha a backend nem mindig küld ilyet
  code?: string | number;
  error?: string; // Lehet, hogy a backend küld hibakódot is
  details?: string | object; // További részletek
};

export type GameStateMachineHookResult = {
  gameState: GameStateData;
  currentGameState: GameState;
  transitionToState: (
    newState: GameState,
    newData?: Partial<GameStateData>,
  ) => void;
  handleSkipAuth: () => Promise<void>;
  handleAuth: (
    email: string,
    username: string,
    password: string,
    isLogIn: boolean,
  ) => Promise<{ status: string } | void>;
  handleConflict: (version_new: boolean) => Promise<{ status: string } | void>;
  handleCloseNewPassCase: () => void;
  handleForgotPassword: (
    identifier: string,
  ) => Promise<{ status: string } | void>;
  handleForgotPasswordSubmit: (
    token: string,
    password: string,
  ) => Promise<{ status: string } | void>;
  handleOnContinue: () => void;
  handleOnStartNew: () => void;
  handlePlaceBet: (amount: number) => Promise<void>;
  handleRetakeBet: () => void;
  handleStartGame: () => void;
  handleHitRequest: () => void;
  handleStandRequest: () => void;
  handleDoubleRequest: () => void;
  handleSplitRequest: () => Promise<void>;
  handleSplitHitRequest: () => Promise<void>;
  handleSplitStandRequest: () => Promise<void>;
  handleSplitDoubleRequest: () => Promise<void>;
  handleInsRequest: () => void;
  preRewardBet: number | null;
  preRewardTokens: number | null;
  insPlaced: boolean;
  showInsLost: boolean;
  initDeckLen: number | null;
  isWFSR: boolean;
  isGuest: boolean;
};

export const states = [
  "",
  "BLACKJACK Player won!",
  "BlackJack push",
  "BlackJack Dealer won!",
  "Push",
  "Player lost",
  "Player won",
  "Dealer won",
  "twenty one",
  "bust",
  "under 21",
  "BlackJack",
];
