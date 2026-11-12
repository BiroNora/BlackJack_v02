import type { ConflictDetails, GameStateData } from "../types/game-types";

export function extractGameStateData(apiResponse: unknown):
  | (Partial<GameStateData> & {
      conflict_data?: ConflictDetails;
      username?: string;
    })
  | undefined {
  if (
    typeof apiResponse !== "object" ||
    apiResponse === null ||
    !("game_state" in apiResponse) ||
    typeof (apiResponse as { game_state: unknown }).game_state !== "object" ||
    (apiResponse as { game_state: unknown }).game_state === null
  ) {
    return undefined;
  }

  const res = apiResponse as {
    current_tokens?: number;
    game_state: Partial<GameStateData>;
    conflict_data?: ConflictDetails;
    username?: string;
  };

  const rawGameState = res.game_state as Partial<GameStateData>;

  try {
    const processedData: Partial<GameStateData> & {
      conflict_data?: ConflictDetails;
      username?: string;
    } = {
      ...rawGameState,
      ...(typeof res.current_tokens === "number"
        ? { tokens: res.current_tokens }
        : {}),
      ...(typeof res.username === "string" ? { username: res.username } : {}),
      ...(res.conflict_data ? { conflict_data: res.conflict_data } : {}),
    };
    return processedData;
  } catch (e) {
    console.error("extractGameStateData error: ", e);
    return undefined;
  }
}

export function formatNumber(number: number) {
  return number.toLocaleString("en-US");
}

export const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REGEX_UPPER = /[A-Z]/;
const PASSWORD_REGEX_LOWER = /[a-z]/;
const PASSWORD_REGEX_NUM = /\d/;

/**
 * Ellenőrzi, hogy a jelszó megfelel-e a biztonsági elvárásoknak:
 * - Legalább 8 karakter hosszú
 * - Tartalmaz kis- és nagybetűt, valamint számot
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return false;
  }

  if (!PASSWORD_REGEX_UPPER.test(password)) {
    return false;
  }
  if (!PASSWORD_REGEX_LOWER.test(password)) {
    return false;
  }
  if (!PASSWORD_REGEX_NUM.test(password)) {
    return false;
  }

  return true;
}
