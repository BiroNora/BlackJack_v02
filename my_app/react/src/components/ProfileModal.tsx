import { motion } from "motion/react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ProfileModalProps {
  onClose: () => void;
  username: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  onClose,
  username,
}) => {
  const [currentUsername, setCurrentUsername] = useState(username);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  const handleEditClick = () => {
    setTempUsername(currentUsername);
    setIsEditing(true);
  };

  const handleSave = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!tempUsername) {
      toast("Username is missing", {
        id: "pass-error",
        duration: 2000,
      });
      return;
    }
    setCurrentUsername(tempUsername);
    setIsEditing(false);
    // Itt küldheted majd el az API-nak is a módosítást!
  };

  const handleCancel = () => {
    setIsEditing(false);
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
        <button className="close-btn" onClick={onClose}>
          ⏻
        </button>
        <div className="pd-top">
          <h2>Your Profile</h2>
        </div>

        <div className="form-group">
          <h3>Username:</h3>
          {!isEditing ? (
            // --- OLVASÓ NÉZET (Csak szöveg + ceruza ikon) ---
            <>
              <div className="password-input-wrapper">
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    paddingLeft: "40px",
                    paddingRight: "40px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUsername}
                </div>
                <button
                  onClick={handleEditClick}
                  title="editing"
                  className="eye-toggle"
                  style={{ color: "#000000", fontSize: "1.7rem" }}
                >
                  🖉
                </button>
              </div>
            </>
          ) : (
            // --- SZERKESZTŐ NÉZET (Input mező + Mentés / Mégse) ---
            <>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                minLength={3}
                maxLength={25}
                pattern="^[a-zA-Z0-9_]{3,25}$"
                title="3-25 characters. Letters, numbers, and underscores only."
                autoFocus // Automatikusan fókuszba hozza az inputot, ha rákattintasz a ceruzára
              />
              <div className="button-container1" style={{ marginTop: "2rem" }}>
                <button onClick={handleSave} style={{ minWidth: "6rem" }}>
                  Save
                </button>
                <button onClick={handleCancel} style={{ minWidth: "6rem" }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
