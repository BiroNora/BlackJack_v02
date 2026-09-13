import { motion } from "motion/react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ConflictModalProps {
  onResolve: (versionNew: boolean) => Promise<{ status: string } | void>;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  onResolve,
}) => {
  const [loading, setLoading] = useState(false);

  const handleChoice = async (versionNew: boolean) => {
    setLoading(true);
    try {
      const result = await onResolve(versionNew);

      if (result && result.status === "success") {
        toast("Game state resolved successfully", {
          id: "conflict-resolve-success",
          duration: 2000,
        });
      } else {
        toast("Failed to resolve conflict", {
          id: "conflict-resolve-error",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Network error during conflict resolution:", error);
      toast("Network error occurred", {
        id: "conflict-network-error",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleChoice(true)}
          >
            {loading ? "Processing..." : "Yes"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleChoice(false)}
          >
            {loading ? "Processing..." : "No"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
