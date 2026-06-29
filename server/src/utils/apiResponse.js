export class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static success(statusCode, message, data, meta) {
    return new ApiResponse(statusCode, message, data, meta);
  }

  static created(message, data) {
    return new ApiResponse(201, message, data);
  }

  static ok(message, data, meta) {
    return new ApiResponse(200, message, data, meta);
  }

  static noContent() {
    return new ApiResponse(204, "No content");
  }

  send(res) {
    const body = {
      success: this.success,
      message: this.message,
    };
    if (this.data !== undefined) body.data = this.data;
    if (this.meta !== undefined) body.meta = this.meta;
    body.timestamp = this.timestamp;

    return res.status(this.statusCode).json(body);
  }
}
