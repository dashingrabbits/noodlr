export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{24,80}$/;

export const SESSION_SYNC_DEBOUNCE_MS = 180;

export const SESSION_MAX_SAMPLES_PER_UPDATE = 16;

export const SESSION_DEFAULT_SERVER_URL = "ws://localhost:8787";

export const SESSION_SERVER_URL_ENV_KEY = "VITE_SESSION_SERVER_URL";
