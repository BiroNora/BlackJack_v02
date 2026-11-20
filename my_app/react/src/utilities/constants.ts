export const MIN_EMAIL_LENGTH = 8;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_USERNAME_LENGTH = 25;

export const MIN_PASSWORD_LENGTH = 8;
export const USERNAME_PATTERN_STR = "^[a-zA-Z0-9_]{3,25}$";
export const USERNAME_REGEX = new RegExp(USERNAME_PATTERN_STR);
export const PASSWORD_REGEX_UPPER = /[A-Z]/;
export const PASSWORD_REGEX_LOWER = /[a-z]/;
export const PASSWORD_REGEX_NUM = /\d/;

export const MAX_PASSWORD_LENGTH = 64;
export const MAX_PASSWORD_BYTES = 72;

export enum AuthError {
  CONFLICT_FAILED = "CONFLICT_FAILED",
  EMPTY_FIELD = "EMPTY_FIELD",
  EXPIRED_TOKEN = "EXPIRED_TOKEN",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  INVALID_CREDENTIALS_FORMAT = "INVALID_CREDENTIALS_FORMAT",
  INVALID_LENGTH = "INVALID_LENGTH",
  INVALID_USERNAME = "INVALID_USERNAME",
  INVALID_USERNAME_OR = "INVALID_USERNAME_OR",
  NETWORK_ERROR = "NETWORK_ERROR",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_MISMATCH = "PASSWORD_MISMATCH",
  PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED",
  PASSWORD_WEAKNESS = "PASSWORD_WEAKNESS",
  USER_EXISTS = "USER_EXISTS",
  USER_MISSING = "USER_MISSING",
  USER_UPDATE_FAILED = "USER_UPDATE_FAILED",
  USER_UPDATE_SUCCESS = "USER_UPDATE_SUCCESS",
  DEFAULT = "DEFAULT"
}

export const ERROR_MESSAGES: Record<AuthError, string> = {
  [AuthError.CONFLICT_FAILED]: "Conflict resolution failed",
  [AuthError.EMPTY_FIELD]: "Field cannot be empty",
  [AuthError.EXPIRED_TOKEN]: "Invalid or expired token. Please try again.",
  [AuthError.INVALID_CREDENTIALS]: "Invalid credentials",
  [AuthError.INVALID_CREDENTIALS_FORMAT]: "Invalid credentials format",
  [AuthError.INVALID_LENGTH]: "Input length exceeds maximum allowed limit",
  [AuthError.INVALID_USERNAME]: "Invalid username format",
  [AuthError.INVALID_USERNAME_OR]: "Invalid username format or already taken",
  [AuthError.NETWORK_ERROR]: "Network error occurred",
  [AuthError.PASSWORD_CHANGED]: "Password successfully changed",
  [AuthError.PASSWORD_MISMATCH]: "Passwords do not match",
  [AuthError.PASSWORD_RESET_FAILED]: "Failed to reset password",
  [AuthError.PASSWORD_WEAKNESS]: "At least 8 characters long upper & lower case & nums required",
  [AuthError.USER_EXISTS]: "Email or Username already exists",
  [AuthError.USER_MISSING]: "Username is missing",
  [AuthError.USER_UPDATE_FAILED]: "Failed to update username",
  [AuthError.USER_UPDATE_SUCCESS]: "Username updated successfully!",
  [AuthError.DEFAULT]: "Authentication failed",
};
