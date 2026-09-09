import { motion } from "motion/react";

interface ConflictModalProps {
  onClose: () => void;
  onResolve: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  onClose,
  onResolve,
}) => {
  return (
    <motion.div
      className="auth-overlay-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="auth-card merriweather"
        initial={{ y: -50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <h2>"A saved game already exists. Overwrite?"</h2>

        <button>
          Yes
        </button>
        <button>
          No
        </button>
      </motion.div>
    </motion.div>
  );
};
