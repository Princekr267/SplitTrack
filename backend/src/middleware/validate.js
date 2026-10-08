/**
 * Zod validation middleware for body, params, and query.
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    if (schema.params) {
      req.params = await schema.params.parseAsync(req.params);
    }
    if (schema.query) {
      req.query = await schema.query.parseAsync(req.query);
    }
    if (schema.body) {
      req.body = await schema.body.parseAsync(req.body);
    }
    next();
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0]?.message || 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }
    next(error);
  }
};
