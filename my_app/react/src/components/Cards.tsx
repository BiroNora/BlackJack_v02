import { useEffect, useState } from "react";
import type { GameStateData } from "../types/game-types";
import "../styles/cards.css";

interface CardsProps {
  gameState: GameStateData;
  initDeckLen: number | null;
  isGuest?: boolean;
  username?: string;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
}

const Cards: React.FC<CardsProps> = ({
  gameState,
  initDeckLen,
  isGuest,
  username,
  onOpenAuth,
  onOpenProfile,
}) => {
  const { deck_len, currentGameState } = gameState;
  const [displayedDeckLen, setDisplayedDeckLen] = useState(deck_len);
  const [tmp, setTmp] = useState(initDeckLen);

  useEffect(() => {
    setDisplayedDeckLen(tmp!);
    if (initDeckLen !== null && initDeckLen > deck_len) {
      const interval = setInterval(() => {
        setDisplayedDeckLen((prevDisplayedLen) => {
          if (prevDisplayedLen <= deck_len) {
            clearInterval(interval);
            setTmp(deck_len);
            return deck_len;
          }
          return prevDisplayedLen - 1;
        });
      }, 400);

      return () => clearInterval(interval);
    } else {
      setDisplayedDeckLen(deck_len);
    }
  }, [deck_len, initDeckLen, tmp]);

  const isBettingPhase = currentGameState === "BETTING" || !currentGameState;
  const truncateUsername = (name: string, maxLen = 12) => {
    return name.length > maxLen ? name.substring(0, maxLen) + "..." : name;
  };

  return (
    <div className="cards merriweather" id="cards">
      <div className="cards-left">
        <span className="label">Cards:</span>
        <span className="deck-count">{displayedDeckLen}</span>
      </div>

      <div className="cards-right">
        {isBettingPhase &&
          (isGuest ? (
            <a
              href="#auth"
              className="login-link"
              onClick={(e) => {
                e.preventDefault();
                onOpenAuth?.();
              }}
            >
              Log in / Sign up
            </a>
          ) : (
            <a
              href="#profile"
              className="login-link"
              onClick={(e) => {
                e.preventDefault();
                onOpenProfile?.();
              }}
            >
              {truncateUsername(username || "")}'s profile
            </a>
          ))}
      </div>
    </div>
  );
};

export default Cards;
