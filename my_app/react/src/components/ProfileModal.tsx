import { motion } from "motion/react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ProfileModalProps {
  onCloseForm: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  onCloseForm,
}) => {
   const [username, setUsername] = useState("");

  const handleSubmit = async (e: React.SubmitEvent) => {
      e.preventDefault();

      if (!username) {
      toast("Username is missing", {
        id: "pass-error",
        duration: 2000,
      });
      return;
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
        <button className="close-btn" onClick={onCloseForm}>
          ⏻
        </button>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Your Username</label>

            <div className="password-input-wrapper">
              <input
                id="username"
                type="text"
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
