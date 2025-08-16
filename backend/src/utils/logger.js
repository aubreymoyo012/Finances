// backend/src/utils/logger.js
/**
 * Lightweight structured logger with levels, safe metadata, and child loggers.
 * No external deps. Works in Node 22+.
 */
const LEVELS = ['debug', 'info', 'warn', 'error'];
const env = process.env.NODE_ENV || 'development';
const levelFromEnv = (process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug')).toLowerCase();
const activeLevel = LEVELS.includes(levelFromEnv) ? levelFromEnv : 'info';

function ts() {
  return new Date().toISOString();
}

function safeMeta(meta) {
  if (meta == null) return undefined;
  try {
    // Drop undefined values and functions; avoid circular refs
    return JSON.parse(JSON.stringify(meta, (_, v) => (typeof v === 'function' ? undefined : v)));
  } catch {
    return { note: 'meta_unserializable' };
  }
}

function write(level, msg, meta, bindings) {
  if (LEVELS.indexOf(level) < LEVELS.indexOf(activeLevel)) return;
  const record = {
    time: ts(),
    level,
    msg: String(msg),
    ...(bindings && Object.keys(bindings).length ? { ctx: bindings } : {}),
    ...(meta !== undefined ? { meta: safeMeta(meta) } : {})
  };
  const line = env === 'production' ? JSON.stringify(record) : `${record.time} ${level.toUpperCase()} ${record.msg}${record.meta ? ' ' + JSON.stringify(record.meta) : ''}${record.ctx ? ' ' + JSON.stringify(record.ctx) : ''}`;

  // Map level to console method
  (level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : level === 'info' ? console.info
    : console.debug)(line);
}

function baseLogger(bindings = {}) {
  return {
    level: activeLevel,
    debug: (msg, meta) => write('debug', msg, meta, bindings),
    info:  (msg, meta) => write('info',  msg, meta, bindings),
    warn:  (msg, meta) => write('warn',  msg, meta, bindings),
    error: (msg, meta) => {
      // Expand Error objects nicely
      if (meta instanceof Error) {
        const { name, message, stack, ...rest } = meta;
        return write('error', msg || message, { name, message, stack, ...rest }, bindings);
      }
      write('error', msg, meta, bindings);
    },
    child(extra) {
      return baseLogger({ ...bindings, ...extra });
    },
    // Optional: hook for HTTP request logging (e.g. morgan)
    stream: {
      write: (str) => write('info', 'http', { line: String(str).trim() }, bindings)
    }
  };
}

module.exports = baseLogger();
