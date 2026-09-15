import Cards from "./components/Cards";
import { ErrorPage } from "./components/ErrorPage";
import HeaderTitles from "./components/HeaderTitles";
import { OutOfTokens } from "./components/OutOfTokens";
import PlayButtons from "./components/PlayButtons";
import PlayerDealer from "./components/PlayerDealer";
import PlayerDealerMasked from "./components/PlayerDealerMasked";
import { Restart } from "./components/RestartGame";
import { Shuffling } from "./components/Shuffling";
import SplitPlayButtons from "./components/SplitPlayButtons";
import SplitPlayDisabledButtons from "./components/SplitPlayDisabledButtons";
import SplitPlayDoubleDisabledButtons from "./components/SplitPlayDoubleDisabledButtons";
import SplitPlayers from "./components/SplitPlayers";
import SplitWinner from "./components/SplitWinner";
import Winner from "./components/Winner";
import { useGameStateMachine } from "./hooks/useGameStateMachine";
import Betting from "./components/Betting";
import { AnimatePresence, motion } from "motion/react";
import SplitPlayerDealerMasked from "./components/SplitPlayerDealerMasked";
import { Reloading } from "./components/Reloading";
import RecoveryDec from "./components/RecoveryDec";
import UniqueBetBank from "./components/UniqueBetBank";
import Loading from "./components/Loading";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ForgotPasswordModal } from "./components/ForgotPasswordModal";
import { AuthModal } from "./components/AuthModal";
import { ConflictModal } from "./components/ConflictModal";
import { defaultToastOptions } from "./utilities/toast-config";

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const {
    gameState,
    handleAuth,
    handleConflict,
    handleCloseNewPassCase,
    handleForgotPassword,
    handleForgotPasswordSubmit,
    handleSkipAuth,
    handleOnContinue,
    handleOnStartNew,
    handlePlaceBet,
    handleRetakeBet,
    handleStartGame,
    handleHitRequest,
    handleStandRequest,
    handleDoubleRequest,
    handleSplitRequest,
    handleSplitHitRequest,
    handleSplitStandRequest,
    handleSplitDoubleRequest,
    handleInsRequest,
    preRewardBet,
    preRewardTokens,
    insPlaced,
    showInsLost,
    initDeckLen,
    isWFSR,
    isGuest,
  } = useGameStateMachine();

  function PageWrapper({ children }: React.PropsWithChildren<object>) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );
  }

  // Segédfg, megnyitja a login modalt a betting felületen sikeres
  // jelszó módosítás után
  const handlePasswordResetAndOpenLogin = async (
    token: string,
    password: string,
  ) => {
    const result = await handleForgotPasswordSubmit(token, password);
    if (result?.status === "IC") {
      handleCloseNewPassCase();
      return result;
    }
    toast("Password successfully changed!", {
      duration: 3000,
      id: "password-changed-toast",
    });

    setTimeout(() => {
      setIsAuthOpen(true);
    }, 3000);
  };

  return (
    <>
      <HeaderTitles />
      <AnimatePresence>
        {isAuthOpen && (
          <AuthModal
            onClose={() => setIsAuthOpen(false)}
            onAuthSubmit={handleAuth}
            onHandleForgotPassword={handleForgotPassword}
          />
        )}
      </AnimatePresence>
      <Toaster
        position="top-center"
        containerStyle={{
          top: "40%",
        }}
        toastOptions={defaultToastOptions}
      />
      <AnimatePresence mode="wait">
        {(() => {
          switch (gameState.currentGameState) {
            case "LOADING":
              return (
                <div>
                  <PageWrapper>
                    <Loading
                      onOpenAuth={() => setIsAuthOpen(true)}
                      onSkipAuth={() => handleSkipAuth()}
                      isAuthOpen={isAuthOpen}
                      isWFSR={isWFSR}
                    />
                  </PageWrapper>
                </div>
              );
            case "RECOVERY_DECISION":
              return (
                <div>
                  <PageWrapper>
                    <RecoveryDec
                      gameState={gameState}
                      onContinue={handleOnContinue}
                      onStartNew={handleOnStartNew}
                      isWFSR={isWFSR}
                    />
                  </PageWrapper>
                </div>
              );
            case "SHUFFLING":
              return (
                <div>
                  <PageWrapper>
                    <Shuffling />
                  </PageWrapper>
                </div>
              );
            case "INIT_GAME":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                </div>
              );
            case "BETTING":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    isGuest={isGuest}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <Betting
                    gameState={gameState}
                    onPlaceBet={handlePlaceBet}
                    retakeBet={handleRetakeBet}
                    onStartGame={handleStartGame}
                    isWFSR={isWFSR}
                  />
                </div>
              );
            case "MAIN_TURN":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealerMasked
                      gameState={gameState}
                      showInsLost={showInsLost}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    <PlayButtons
                      gameState={gameState}
                      onHit={handleHitRequest}
                      onStand={handleStandRequest}
                      onDouble={handleDoubleRequest}
                      onSplit={handleSplitRequest}
                      onInsurance={handleInsRequest}
                      insPlaced={insPlaced}
                      isWFSR={isWFSR}
                    />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={false}
                  />
                </div>
              );
            case "MAIN_STAND":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealer gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <Winner gameState={gameState} />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={true}
                  />
                </div>
              );
            case "MAIN_STAND_REWARDS_TRANSIT":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealerMasked
                      gameState={gameState}
                      showInsLost={showInsLost}
                    />
                  </div>
                  <div className="game-action-area-wrapper">
                    {/* <Winner gameState={gameState} /> */}
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={true}
                  />
                </div>
              );
            case "SPLIT_TURN":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayButtons
                      gameState={gameState}
                      onHit={handleSplitHitRequest}
                      onStand={handleSplitStandRequest}
                      onSplit={handleSplitRequest}
                      onDouble={handleSplitDoubleRequest}
                      isWFSR={isWFSR}
                    />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={false}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_STAND":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDisabledButtons gameState={gameState} />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={false}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_STAND_DOUBLE":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDoubleDisabledButtons gameState={gameState} />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={false}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_NAT21_TRANSIT":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDisabledButtons gameState={gameState} />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={false}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_FINISH":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealer gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    {/* <SplitWinner gameState={gameState} /> */}
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={true}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_FINISH_OUTCOME":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <PlayerDealer gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitWinner gameState={gameState} />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={true}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "SPLIT_ACE_TRANSIT":
              return (
                <div>
                  <Cards
                    gameState={gameState}
                    initDeckLen={initDeckLen}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                  <div className="player-dealer-area-wrapper">
                    <SplitPlayerDealerMasked gameState={gameState} />
                  </div>
                  <div className="game-action-area-wrapper">
                    <SplitPlayDisabledButtons gameState={gameState} />
                  </div>
                  <UniqueBetBank
                    gameState={gameState} // Ez a JUTALMAKKAL MÓDOSÍTOTT állapot
                    preRewardBet={preRewardBet}
                    preRewardTokens={preRewardTokens} // Ez a JUTALOM ELŐTTI token érték
                    isResultPhase={false}
                  />
                  <div className="players-area-wrapper">
                    <SplitPlayers gameState={gameState} />
                  </div>
                </div>
              );
            case "FORGOT_PASSWORD":
              return (
                <div>
                  <PageWrapper>
                    <ForgotPasswordModal
                      onCloseForm={handleCloseNewPassCase}
                      onResetSubmit={handlePasswordResetAndOpenLogin}
                    />
                  </PageWrapper>
                </div>
              );
            case "CONFLICT":
              return (
                <div>
                  <PageWrapper>
                    <ConflictModal
                      onResolve={handleConflict}
                      conflictData={gameState.conflict_data}
                    />
                  </PageWrapper>
                </div>
              );
            case "OUT_OF_TOKENS":
              return (
                <div>
                  <PageWrapper>
                    <OutOfTokens />
                  </PageWrapper>
                </div>
              );
            case "RESTART_GAME":
              return (
                <div>
                  <PageWrapper>
                    <Restart />
                  </PageWrapper>
                </div>
              );
            case "ERROR":
              return (
                <div>
                  <PageWrapper>
                    <ErrorPage />
                  </PageWrapper>
                </div>
              );
            case "RELOADING":
              return (
                <div>
                  <PageWrapper>
                    <Reloading />
                  </PageWrapper>
                </div>
              );
            default:
              return (
                <div>
                  <PageWrapper>
                    <ErrorPage />
                  </PageWrapper>
                </div>
              );
          }
        })()}
      </AnimatePresence>
    </>
  );
}

export default App;
