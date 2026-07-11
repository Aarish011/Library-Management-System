const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message =
      Object.values(err.errors)[0]?.message ||
      'Please check the information you entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = 'The requested record could not be found';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Your session is invalid. Please sign in again';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please sign in again';
    error = { message, statusCode: 401 };
  }

  const statusCode = error.statusCode || 500;
  const publicMessage =
    statusCode >= 500
      ? 'We could not complete your request right now. Please try again shortly.'
      : error.message || 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    message: publicMessage,
  });
};

module.exports = errorHandler;
