// backend/src/utils/configValidator.js
/**
 * Validates and normalizes environment configuration.
 * Throws on missing critical vars; sets sensible defaults where possible.
 */
const logger = require('./logger');

function isLocalHost(h) {
  return ['localhost', '127.0.0.1', '::1'].includes((h || '').toLowerCase());
}

function normalizeBaseUrl(u) {
  if (!u) return u;
  return u.replace(/\/+$/, ''); // strip trailing slash
}

module.exports = function validateConfig() {
  const errors = [];
  const warnings = [];

  const NODE_ENV = process.env.NODE_ENV || 'development';

  // --- DATABASE_URL ---
  const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
  if (!DATABASE_URL) {
    errors.push('DATABASE_URL is required (e.g., postgres://user:pass@host:5432/db)');
  } else {
    try {
      const url = new URL(DATABASE_URL.replace(/^postgresql:\/\//, 'postgres://'));
      if (!/^postgres/.test(url.protocol)) {
        errors.push(`DATABASE_URL must use postgres protocol, got "${url.protocol}"`);
      }
      // Default SSL for non-local DBs if not explicitly set
      const host = url.hostname;
      if (!isLocalHost(host) && !process.env.PGSSL) {
        warnings.push('PGSSL not set; defaulting to "require" for cloud Postgres.');
        process.env.PGSSL = 'require';
      }
    } catch {
      errors.push('DATABASE_URL is not a valid URL.');
    }
  }

  // --- PORT ---
  let PORT = parseInt(process.env.PORT || '3000', 10);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    warnings.push(`Invalid PORT "${process.env.PORT}", defaulting to 3000.`);
    PORT = 3000;
    process.env.PORT = String(PORT);
  }

  // --- PUBLIC_BASE_URL ---
  // Prefer explicit; else use Vercel/Render-style envs; else localhost
  let PUBLIC_BASE_URL =
    process.env.PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    (process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL : '') ||
    `http://localhost:${PORT}`;
  PUBLIC_BASE_URL = normalizeBaseUrl(PUBLIC_BASE_URL);
  process.env.PUBLIC_BASE_URL = PUBLIC_BASE_URL;

  // --- JWT_SECRET ---
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    errors.push('JWT_SECRET is required and should be at least 16 characters.');
  }

  // --- Google OAuth (optional but validated if partially configured) ---
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  let googleCallback = process.env.GOOGLE_CALLBACK_URL;

  const googleAny = googleId || googleSecret || googleCallback;
  if (googleAny) {
    if (!googleId || !googleSecret) {
      errors.push('Google OAuth: both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required when enabling Google login.');
    }
    if (!googleCallback) {
      // Default to common callback route (adjust if your route differs)
      googleCallback = `${PUBLIC_BASE_URL}/auth/google/callback`;
      process.env.GOOGLE_CALLBACK_URL = googleCallback;
      warnings.push(`GOOGLE_CALLBACK_URL was not set; defaulted to ${googleCallback}`);
    }
  }

  // --- Tesseract languages (optional) ---
  if (!process.env.TESSERACT_LANGS) {
    process.env.TESSERACT_LANGS = 'eng';
  }

  // --- Log level normalization ---
  const ll = (process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
  const allowed = ['debug', 'info', 'warn', 'error'];
  if (!allowed.includes(ll)) {
    warnings.push(`LOG_LEVEL "${process.env.LOG_LEVEL}" is invalid; defaulting to "${NODE_ENV === 'production' ? 'info' : 'debug'}".`);
    process.env.LOG_LEVEL = NODE_ENV === 'production' ? 'info' : 'debug';
  } else {
    process.env.LOG_LEVEL = ll;
  }

  // Report and throw if needed
  if (warnings.length) {
    logger.warn('Configuration warnings', { warnings });
  }
  if (errors.length) {
    logger.error('Configuration errors', { errors });
    const err = new Error(`Invalid configuration: ${errors.join(' | ')}`);
    err.code = 'CONFIG_VALIDATION_ERROR';
    throw err;
  }

  // Return a normalized snapshot for convenience (optional)
  return {
    env: NODE_ENV,
    port: PORT,
    databaseUrl: process.env.DATABASE_URL,
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    jwtSecretSet: true,
    googleOAuthEnabled: Boolean(googleId && googleSecret),
    logLevel: process.env.LOG_LEVEL,
    sslMode: process.env.PGSSL || 'disable'
  };
};
