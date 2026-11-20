import React, { useEffect, useRef, useState } from "react";
import { EyeClosed, EyeOpen } from "./EyeIcon";
import { motion } from "motion/react";
import { showAuthError, validatePasswordStrength } from "../utilities/utils";
import {
  AuthError,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../utilities/constants";

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
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!password || !validatePasswordStrength(password)) {
      showAuthError(AuthError.PASSWORD_WEAKNESS);
      return;
    }

    if (password !== confirmPassword) {
      showAuthError(AuthError.PASSWORD_MISMATCH);
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("_rf_") || "";
      const res = await onResetSubmit(token, password);

      if (res?.status === "IC") {
        showAuthError(AuthError.EXPIRED_TOKEN);
        return;
      }
    } catch {
      showAuthError(AuthError.PASSWORD_RESET_FAILED);
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
        <div className="pd-top">
          <h2>Change Password</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New password</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
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
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
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
              At least 8 characters long upper & lower case & nums required
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
