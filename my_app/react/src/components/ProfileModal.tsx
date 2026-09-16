import { motion } from "motion/react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ProfileModalProps {
  onClose: () => void;
  username: string;
  handleSave: (username: string) => Promise<{ status: string } | void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  onClose,
  username,
  handleSave: saveUsername,
}) => {
  const [currentUsername, setCurrentUsername] = useState(username);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  const handleEditClick = () => {
    setTempUsername(currentUsername);
    setIsEditing(true);
  };

  const handleSaveClick = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!tempUsername || tempUsername.trim() === "") {
      toast("Username is missing", {
        id: "pass-error",
        duration: 2000,
      });
      return;
    }
    try {
      const result = await saveUsername(tempUsername);

      if (result && result.status === "IC") {
        toast("Invalid username format or already taken", {
          id: "pass-error",
          duration: 2000,
        });
        return;
      }

      setCurrentUsername(tempUsername);
      setIsEditing(false);
      toast.success("Username updated successfully!", { duration: 2000 });
    } catch {
      toast("Failed to update username", { duration: 2000 });
    }
  };

  const handleCancel = () => {
    setTempUsername(currentUsername);
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
                  style={{
                    color: "#000000",
                    fontSize: "1.7rem",
                    transform: "scaleX(-1)",
                    display: "inline-block",
                  }}
                >
                  ✎
                </button>
              </div>
            </>
          ) : (
            // --- SZERKESZTŐ NÉZET (Input mező + Mentés / Mégse) ---
            <form onSubmit={handleSaveClick}>
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
                <button type="submit" style={{ minWidth: "6rem" }}>
                  Save
                </button>
                <button onClick={handleCancel} style={{ minWidth: "6rem" }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
