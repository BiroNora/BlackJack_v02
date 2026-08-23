import { useEffect, useState } from "react";
import "../styles/loading.css";
import { motion } from "motion/react";

interface LoadingProps {
  onOpenAuth: () => void;
  onSkipAuth: () => void;
  isAuthOpen: boolean;
  isWFSR: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  onOpenAuth,
  onSkipAuth,
  isAuthOpen,
  isWFSR,
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  const fadeProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  };
  const hideButtons = !showButtons || isClicked || isAuthOpen || isWFSR;

  return (
    <>
      {!isAuthOpen && (
        <div className="loading-container-centered">
          <h1>
            L O A D I N G<span className="dot dot-1">.</span>
            <span className="dot dot-2">.</span>
            <span className="dot dot-3">.</span>
          </h1>
        </div>
      )}

      {!hideButtons && (
        <motion.div {...fadeProps}>
          <div className="text">
            <button
              className="submit-btn"
              onClick={(e) => {
                e.preventDefault();
                setIsClicked(true);
                onOpenAuth();
              }}
            >
              Log in to save your scores
            </button>
          </div>
          <div className="text">
            <button
              className="submit-btn"
              onClick={(e) => {
                e.preventDefault();
                onSkipAuth();
              }}
            >
              No, thanks
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default Loading;

