/**
 * Consistent API response formatter
 *
 * All responses follow this shape:
 * {
 *   success: boolean,
 *   message: string,
 *   data: object | null,
 *   timestamp: ISO string,
 *   ...(errors: array — only on validation failures)
 *   ...(pagination: object — only on paginated responses)
 * }
 */

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const error = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) body.errors = errors;

  return res.status(statusCode).json(body);
};

const paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { success, error, paginated };
