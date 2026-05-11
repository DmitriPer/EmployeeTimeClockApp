import axios from 'axios';

export function getApiErrorMessage(e: unknown, fallback = 'An error occurred.'): string {
  if (axios.isAxiosError(e)) {
    const message = e.response?.data?.error?.message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}
