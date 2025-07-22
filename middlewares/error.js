class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}
// this one of the industry standard method to handle error 

export const errorMiddleware = (err, req, res, next) => {
  err.message = err.message || "Internal server error.";
  err.statusCode = err.statusCode || 500;

  if (err.name === "JsonWebTokenError") {
    const message = "Json web token is invalid, Try again.";
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "TokenExpiredError") {
    const message = "Json web token is expired, Try again.";
    err = new ErrorHandler(message, 400);
  }
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }
// Source of errors:

// Automatically added by libraries like Mongoose during validation errors.
// Manually added in custom error-handling logic, if needed.
// Purpose of errors:

// To provide detailed, field-specific error messages for better debugging and client responses.
// When is errors Available?

// Only for specific error types (e.g., Mongoose ValidationError) or when explicitly added.
  const errorMessage = err.errors // this errors feild is added to err by mongodb //     Mongoose populates the errors field in the ValidationError object.
    ? Object.values(err.errors)
        .map((error) => error.message)
        .join(" ")
    : err.message;

  return res.status(err.statusCode).json({
    success: false,
    message: errorMessage,
  });
};

export default ErrorHandler;
