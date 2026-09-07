// Simple environment-aware logger
// In development (NODE_ENV !== 'production') debug/info are enabled; in production they are no-ops.

const isDev = process.env.NODE_ENV !== 'production';

export const debug = (...args: unknown[]): void => { if (isDev) console.debug(...args); };
export const info = (...args: unknown[]): void => { if (isDev) console.info(...args); };
export const warn = (...args: unknown[]): void => { console.warn(...args); };
export const error = (...args: unknown[]): void => { console.error(...args); };

export default { debug, info, warn, error };