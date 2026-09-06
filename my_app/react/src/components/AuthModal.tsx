import React, { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { EyeClosed, EyeOpen } from "./EyeIcon";

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
  const handleForgotPassword = async () => {
    if (!email || email.trim() === "") {
      toast("Missing email address", {
        id: "forgot-pass-error",
        duration: 2000,
      });
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
      let errorMessage =
        err instanceof Error ? err.message : "Error sending email";

      // Ha a backend azt küldi, hogy "User does not exist", azt átírhatod emberibbre is ha akarod:
      if (errorMessage === "IC") {
        errorMessage = "Invalid credentials";
      }

      toast(errorMessage, {
        id: "forgot-pass-error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailArg = isLogin ? email : email;
    const usernameArg = isLogin ? email : username;

    try {
      const result = await onAuthSubmit(emailArg, usernameArg, password, isLogin);

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
      let errorMessage =
        err instanceof Error ? err.message : "Authentication failed";
      if (errorMessage === "IC") {
        errorMessage = "Invalid credentials";
      }
      if (errorMessage === "UAE") {
        errorMessage = "Email or Username already exists";
      }
      if (errorMessage === "IU") {
        errorMessage = "Invalid username format";
      }

      toast(errorMessage, {
        id: "auth-error-toast",
        duration: 3000,
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
              value={email}
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
              At least 6 characters long
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
                minLength={3}
                maxLength={30}
                pattern="^[a-zA-Z0-9_]{3,30}$"
                title="3-30 characters. Letters, numbers, and underscores only."
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
