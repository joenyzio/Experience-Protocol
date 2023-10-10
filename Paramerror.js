class ParamError extends Error {
  constructor(message, code, details) {
    super(message); // Pass the message to the Error constructor
    this.name = "ParamError"; // Customize the name property

    // Optional error code (for categorizing different types of parameter errors)
    this.code = code || "UNKNOWN";

    // Optional additional details (can be an object with more info)
    this.details = details || {};

    // Capture the stack trace (optional but can be helpful for debugging)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParamError);
    }
  }

  // Optional: Implement a method that converts the error to a string, including all additional information
  toString() {
    return `${this.name} (code: ${this.code}) - ${
      this.message
    }\nDetails: ${JSON.stringify(this.details, null, 2)}`;
  }
}

module.exports = ParamError;
