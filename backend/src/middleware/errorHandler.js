import env from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || err.name || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred';

  // Do not log in test runs unless unexpected 500
  if (env.NODE_ENV !== 'test' || statusCode >= 500) {
    console.error(`[Error] [${req.method} ${req.url}]:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}
