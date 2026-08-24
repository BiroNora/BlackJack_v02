import type React from "react";
import { useState } from "react";
import { EyeClosed, EyeOpen } from "./EyeIcon";
import { motion } from "motion/react";
import toast from "react-hot-toast";

interface ForgotPasswordProps {
  onCloseForm: () => void;
  onResetSubmit: (
    token: string,
    password: string,
  ) => Promise<{ status: string } | void>;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordProps> = ({
  onCloseForm,
  onResetSubmit,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast("Password must be at least 6 characters long", {
        id: "pass-error",
        duration: 2000,
      });
      return;
    }

    if (password !== confirmPassword) {
      toast("Passwords do not match", {
        id: "pass-match-error",
        duration: 2000,
      });
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("_rf_") || "";
      console.log("token, :", token);
      const res = await onResetSubmit(token, password);

      if (res?.status === "IC") {
        toast("Invalid or expired token. Please try again.", {
          duration: 3000,
          id: "ic-error-toast",
        });
        return;
      }

      onCloseForm();

      setTimeout(() => {
        toast("Please log in with your new password.", {
          duration: 3000,
          id: "please-login-toast",
        });
      }, 3000);
    } catch {
      toast("Failed to reset password", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="pass-overlay-backdrop"
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
        <h2>Change Password</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New password</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Re-enter new password</label>

            <div className="password-input-wrapper">
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </button>
            </div>
          </div>

          <div>
            <small id="password-hint" className="helper-text">
              At least 6 characters long
            </small>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Please wait..." : "Confirm"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};
