import React, { useEffect, useRef, useState } from "react";
import { EyeClosed, EyeOpen } from "./EyeIcon";
import { motion } from "motion/react";
import { showAuthError, validatePasswordStrength } from "../utilities/utils";
import {
  AuthError,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_PATTERN_STR,
} from "../utilities/constants";

interface AuthModalProps {
  onClose: () => void;
  onAuthSubmit: (
    email: string,
    username: string,
    password: string,
    isLogin: boolean,
  ) => Promise<{ status: string } | void>;
  onHandleForgotPassword: (email: string) => Promise<{ status: string } | void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthSubmit,
  onHandleForgotPassword,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, [isLogin]);

  const handleForgotPassword = async () => {
    if (!email || email.trim() === "") {
      showAuthError(AuthError.EMPTY_FIELD);
      return;
    }

    setLoading(true);

    try {
      const res = await onHandleForgotPassword(email);
      if (res?.status === "IC") {
        throw new Error("IC");
      }

      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "";

      let errorKey = AuthError.DEFAULT;
      if (errorMessage === "IC") {
        errorKey = AuthError.INVALID_CREDENTIALS;
      }

      showAuthError(errorKey);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    if (isLogin) {
      // Bejelentkezéskor az email/username és a jelszó nem lehet üres, és nem lehet túl hosszú
      if (
        !email ||
        email.trim().length === 0 ||
        email.length > MAX_EMAIL_LENGTH
      ) {
        showAuthError(AuthError.INVALID_CREDENTIALS_FORMAT);
        return;
      }
      if (
        !password ||
        password.trim().length === 0 ||
        password.length > MAX_PASSWORD_LENGTH
      ) {
        showAuthError(AuthError.INVALID_CREDENTIALS_FORMAT);
        return;
      }
    } else {
      // Regisztráció
      if (
        !email ||
        email.trim().length < MIN_EMAIL_LENGTH ||
        email.length > MAX_EMAIL_LENGTH
      ) {
        showAuthError(AuthError.INVALID_CREDENTIALS_FORMAT);
        return;
      }

      // Username regex ellenőrzés regisztrációnál
      const usernameRegex = new RegExp(USERNAME_PATTERN_STR);
      if (!username || !usernameRegex.test(username)) {
        showAuthError(AuthError.INVALID_CREDENTIALS_FORMAT);
        return;
      }

      // Jelszó hossza és erőssége
      if (
        !password ||
        password.length > MAX_PASSWORD_LENGTH ||
        !validatePasswordStrength(password)
      ) {
        showAuthError(AuthError.PASSWORD_WEAKNESS);
        return;
      }
    }
    setLoading(true);

    const emailArg = isLogin ? email : email;
    const usernameArg = isLogin ? email : username;

    try {
      const result = await onAuthSubmit(
        emailArg,
        usernameArg,
        password,
        isLogin,
      );

      if (result?.status === "IC") {
        throw new Error("IC");
      }
      if (result?.status === "UAE") {
        throw new Error("UAE");
      }
      if (result?.status === "IU") {
        throw new Error("IU");
      }

      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "";

      let errorKey = AuthError.DEFAULT;
      if (errorMessage === "IC") {
        errorKey = AuthError.INVALID_CREDENTIALS;
      }
      if (errorMessage === "UAE") {
        errorKey = AuthError.USER_EXISTS;
      }
      if (errorMessage === "IU") {
        errorKey = AuthError.INVALID_USERNAME;
      }

      showAuthError(errorKey);
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
        <button className="close-btn" onClick={onClose}>
          ⏻
        </button>
        <div className="pd-top">
          <h2>{isLogin ? "Log In" : "Register"}</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group form-height">
            <label htmlFor="email">
              {isLogin ? "Email or User Name" : "Email"}
            </label>
            <input
              id="email"
              ref={emailInputRef}
              value={email}
              maxLength={MAX_EMAIL_LENGTH}
              minLength={!isLogin ? MIN_EMAIL_LENGTH : MIN_USERNAME_LENGTH}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group form-height">
            <label htmlFor="password">Password</label>

            <div className="password-input-wrapper">
              <input
                id="password"
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

            <small id="password-hint" className="helper-text">
              At least 8 characters long upper & lower case & nums required
            </small>
          </div>

          {isLogin && (
            <div
              className="form-group form-height forgot-text"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </div>
          )}
          {!isLogin && (
            <div className="form-group form-height">
              <label htmlFor="username">User Name</label>
              <input
                id="username"
                type="text"
                value={username}
                placeholder="e.g. player_123"
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                minLength={MIN_USERNAME_LENGTH}
                maxLength={MAX_USERNAME_LENGTH}
                pattern={USERNAME_PATTERN_STR}
                title="3-25 characters. Letters, numbers, and underscores only."
                required
              />
              <small id="username-hint" className="helper-text">
                Letters, numbers, and underscores only.
              </small>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Log In" : "Register"}
          </button>
        </form>

        <p className="switch-text" onClick={() => setIsLogin(!isLogin)}>
          {isLogin
            ? "Don't have an account? Sign up!"
            : "Already registered? Sign in!"}
        </p>
      </motion.div>
    </motion.div>
  );
};
