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
