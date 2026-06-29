export class ErrorResponse {
  constructor(statusCode, message, details = null) {
    this.success = false;
    this.statusCode = statusCode;
    this.message = message;
    if (details !== null) this.details = details;
    this.timestamp = new Date().toISOString();
  }

  send(res) {
    const body = {
      success: this.success,
      message: this.message,
    };
    if (this.details !== undefined) body.details = this.details;
    body.timestamp = this.timestamp;

    return res.status(this.statusCode).json(body);
  }
}
