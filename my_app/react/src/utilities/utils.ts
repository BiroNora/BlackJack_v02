import type {ConflictDetails, GameStateData} from "../types/game-types";
import toast from "react-hot-toast";
import * as Constants from "./constants";
import { ERROR_MESSAGES, type AuthError } from "./constants";

export function extractGameStateData(apiResponse: unknown):
  | (Partial<GameStateData> & {
  conflict_data?: ConflictDetails;
  username?: string;
  target_user_id?: string;
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
      target_user_id?: string;
    } = {
      ...rawGameState,
      ...(typeof res.current_tokens === "number"
        ? {tokens: res.current_tokens}
        : {}),
      ...(typeof res.username === "string" ? {username: res.username} : {}),
      ...(res.conflict_data ? {
        conflict_data: res.conflict_data,
        target_user_id: res.conflict_data.target_user_id
      } : {}),
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

/**
 * Ellenőrzi, hogy a jelszó megfelel-e a biztonsági elvárásoknak:
 * - Legalább 8 karakter hosszú
 * - Tartalmaz kis- és nagybetűt, valamint számot
 */
export function validatePasswordStrength(password: string): boolean {
  if (!password || password.length < Constants.MIN_PASSWORD_LENGTH || password.length > Constants.MAX_PASSWORD_LENGTH) {
    return false;
  }

  if (new TextEncoder().encode(password).length > Constants.MAX_PASSWORD_BYTES) {
    return false;
  }

  if (!Constants.PASSWORD_REGEX_UPPER.test(password)) {
    return false;
  }
  if (!Constants.PASSWORD_REGEX_LOWER.test(password)) {
    return false;
  }
  return Constants.PASSWORD_REGEX_NUM.test(password);
}

export const showAuthError = (errorKey: AuthError) => {
  const message = ERROR_MESSAGES[errorKey] || "An unexpected error occurred";
  toast(message, {
    id: "auth-error-toast",
    duration: 3000,
  });
};
