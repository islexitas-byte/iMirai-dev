/**
 * Central API configuration
 * Change here once – reflected everywhere
 */

export const API_CONFIG = {
  BACKEND_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ??
    "http://127.0.0.1:8000",
  BACKEND_LOGIN_URL:
    import.meta.env.VITE_API_BASE_URL1 ??
    "http://127.0.0.1:8001"
};
