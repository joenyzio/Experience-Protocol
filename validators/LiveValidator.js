class LiveValidator {
  validateStatement(statement) {
    if (typeof statement !== "object" || statement === null) {
      return { valid: false, message: "Statement is not an object." };
    }

    // Validate 'actor'
    if (!statement.actor || !statement.actor.mbox) {
      return { valid: false, message: "Invalid actor or missing mbox." };
    }

    // Validate 'verb'
    if (!statement.verb || !statement.verb.id) {
      return { valid: false, message: "Invalid verb or missing id." };
    }

    // Validate 'object'
    if (!statement.object || !statement.object.id) {
      return { valid: false, message: "Invalid object or missing id." };
    }

    return { valid: true, message: "Valid statement." };
  }
}

// Use CommonJS export
module.exports = LiveValidator;
