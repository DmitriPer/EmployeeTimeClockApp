export const APP_TIMEZONE = 'Asia/Jerusalem' as const;
export const APP_LOCALE = 'en-GB' as const;

/** Maximum allowed daily break before deduction kicks in. */
export const MAX_BREAK_MINUTES = 60;

/** Minutes worked per day before overtime starts. */
export const OVERTIME_THRESHOLD_MINUTES = 9 * 60;

/** Maximum length of any user-supplied note (employee or manager). */
export const NOTE_MAX_LENGTH = 1000;

export const ROUTE_LOGIN = '/login';
export const ROUTE_HOME = '/';
export const ROUTE_HISTORY = '/history';
