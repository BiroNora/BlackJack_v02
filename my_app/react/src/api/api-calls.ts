import type { ErrorResponse, SessionInitResponse } from "../types/game-types";
import { v4 as uuidv4 } from 'uuid';

export async function initializeSessionAPI(
  skipAuth: boolean = false,
): Promise<SessionInitResponse> {
  // 1. Megpróbáljuk lekérni a meglévő azonosítót (ha van)
  const clientUuid = localStorage.getItem("cid") || undefined;

  try {
    // 2. Meghívjuk a végpontot.
    // Mivel a callApiEndpoint-ben ott a credentials: "include",
    // a szerver automatikusan megkapja/beállítja a sütiket.
    const data = await callApiEndpoint<SessionInitResponse>(
      "/api/initialize_session",
      "POST",
      { client_id: clientUuid, skip_auth: skipAuth } // Elküldjük, de a szerver dönt, hogy elfogadja-e
    );

    // 3. Ha a szerver új/másik ID-t adott vissza, elmentjük emlékeztetőnek
    if (data?.client_id) {
      localStorage.setItem("cid", data.client_id);
    }

    return data;
  } catch (error) {
    console.error("Hiba az inicializálás során:", error);
    throw error;
  }
}

export async function checkSessionAPI() {
  return await callApiEndpoint("/api/check_session", "POST", {});
}

export async function setAuth(
  email: string,
  username: string,
  password: string,
  isLogIn: boolean,
  isFirstIn: boolean,
) {
  return await callApiEndpoint("/api/handle_auth", "POST", {
    email: email,
    username: username,
    password: password,
    is_login: isLogIn,
    is_first_in: isFirstIn,
  });
}

export async function handleForgotPasswordAPI(identifier: string, isFirstIn: boolean,) {
  return await callApiEndpoint(`/api/forgot_password`, "POST", {
    identifier: identifier,
    is_first_in: isFirstIn,
  });
}

export async function setForgotPasswordSubmit(token: string, password: string) {
  return await callApiEndpoint(`/api/reset_password/${token}`, "POST", {
    password: password,
  });
}

export async function clearGameState() {
  const data = await callApiEndpoint("/api/clear_game_state", "POST");

  return data;
}

export async function recoverGameState() {
  const data = await callApiEndpoint("/api/recover_game_state", "POST");

  return data;
}

export async function setBet(betAmount: number) {
  const data = await callApiEndpoint("/api/bet", "POST", { bet: betAmount });

  return data;
}

export async function takeBackDeal() {
  const data = await callApiEndpoint("/api/retake_bet", "POST");

  return data;
}

export async function getShuffling() {
  const data = await callApiEndpoint("/api/create_deck", "POST");

  return data;
}

export async function startGame() {
  const data = await callApiEndpoint("/api/start_game", "POST");

  return data;
}

export async function handleHit() {
  const data = await callApiEndpoint("/api/hit", "POST");

  return data;
}

export async function handleInsurance() {
  const data = await callApiEndpoint("/api/ins_request", "POST");

  return data;
}

export async function handleDouble() {
  const data = await callApiEndpoint("/api/double_request", "POST");

  return data;
}

export async function handleStandAndRewards() {
  const data = await callApiEndpoint("/api/stand_and_rewards", "POST");

  return data;
}

export async function handleSplitHand() {
  const data = await callApiEndpoint("/api/split_request", "POST");

  return data;
}

export async function handleSplitHit() {
  const data = await callApiEndpoint("/api/split_hit", "POST");

  return data;
}

export async function addSplitPlayerToGame() {
  const data = await callApiEndpoint("/api/add_split_player_to_game", "POST");

  return data;
}

export async function addToPlayersListByStand() {
  const data = await callApiEndpoint(
    "/api/add_to_players_list_by_stand",
    "POST"
  );

  return data;
}

export async function addPlayerFromPlayers() {
  const data = await callApiEndpoint("/api/add_player_from_players", "POST");

  return data;
}

export async function handleSplitDouble() {
  const data = await callApiEndpoint("/api/split_double_request", "POST");

  return data;
}

export async function handleSplitStandAndRewards() {
  const data = await callApiEndpoint(
    "/api/split_stand_and_rewards",
    "POST"
  );

  return data;
}

export async function setRestart() {
  const data = await callApiEndpoint("/api/set_restart", "POST");

  return data;
}

export async function forceRestart() {
  // Már nem kell a localStorage-ból semmi,
  // mert a callApiEndpoint elküldi a sütit!
  const data = await callApiEndpoint("/api/force_restart", "POST");
  return data;
}

export interface HttpError extends Error {
  response?: {
    // A response property most opcionális
    status: number;
    statusText: string;
    error?: string;
    data?: ErrorResponse; // A szerver válasza (pl. { error: 'No more split hands.' })
  };
}

type ApiRequestBody = Record<string, unknown> | null | undefined;

export async function callApiEndpoint<T>(
  endpoint: string,
  method: string = "GET",
  body: ApiRequestBody = null,
  isRetry: boolean = false
): Promise<T> {
  try {
    const options: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // Sütik küldése a sessionhöz
    };

    if (method === "POST") {
      const effectiveBody = (body ?? {}) as { idempotency_key?: string };
      if (!effectiveBody.idempotency_key) {
        effectiveBody.idempotency_key = uuidv4();
      }
      options.body = JSON.stringify(effectiveBody);
    }

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      const status = response.status;
      let errorData: ErrorResponse = {};

      try {
        errorData = await response.json();
      } catch {
        errorData = { message: "Ismeretlen hiba történt a szerveren." };
      }

      // --- 401 RETRY LOGIKA ---
      if (status === 401 && !isRetry) {
        console.warn("Session lejárt, próbálkozás megújítással...");
        try {
          await initializeSessionAPI();

          return await callApiEndpoint<T>(endpoint, method, body, true);
        } catch (retryError) {
          console.error("Az automata újra-inicializálás sikertelen.");
          throw retryError;
        }
      }

      // Speciális logolás szűrése
      const isSplitHandError = status === 400 && (errorData.error === "No more split hands." || errorData.message === "No more split hands.");
      if (!isSplitHandError && status !== 401) {
        console.error(`API hiba (${status}):`, errorData);
      }

      // Hiba objektum összeállítása
      const errorToThrow = new Error(errorData.message || `HTTP hiba: ${status}`) as HttpError;
      errorToThrow.response = {
        status: status,
        statusText: response.statusText,
        data: errorData,
      };
      throw errorToThrow;
    }

    if (response.status === 204) return {} as T;
    return (await response.json()) as T;

  } catch (error: unknown) {
    // Típusbiztos hibakezelés a catch ágban
    const httpError = error as HttpError;
    const isAuthError = httpError.response?.status === 401;
    const isSplitError = httpError.response?.status === 400 && httpError.response?.data?.error === "No more split hands.";

    if (!isAuthError && !isSplitError) {
      console.error("Váratlan hiba:", error);
    }
    throw error;
  }
}
