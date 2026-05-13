import axios, { type AxiosError } from 'axios';

interface ApiErrorPayload {
  success: false;
  error: { code: string; message: string };
}

/** Extracts a user-facing message from any thrown value. */
export function getApiErrorMessage(e: unknown, fallback = 'An error occurred.'): string {
  if (axios.isAxiosError(e)) {
    const message = (e.response?.data as ApiErrorPayload | undefined)?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/** Returns the server-supplied error code, or null. Useful for branching on PERIOD_LOCKED, etc. */
export function getApiErrorCode(e: unknown): string | null {
  if (!axios.isAxiosError(e)) return null;
  const code = (e.response?.data as ApiErrorPayload | undefined)?.error?.code;
  return typeof code === 'string' ? code : null;
}

/** Narrow Axios error guard for cases that want the full response. */
export function isApiError(e: unknown): e is AxiosError<ApiErrorPayload> {
  return axios.isAxiosError(e);
}
