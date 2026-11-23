class ApiResponse {
  constructor(statusCodeOrObj = 200, message = "Success", data = null) {
    if (typeof statusCodeOrObj === "object" && statusCodeOrObj !== null) {
      this.statusCode = statusCodeOrObj.statusCode ?? 200;
      this.message = statusCodeOrObj.message ?? "Success";
      this.data = statusCodeOrObj.data ?? null;
    } else {
      this.statusCode = statusCodeOrObj;
      this.message = message;
      this.data = data;
    }
    this.success = this.statusCode < 400;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
    });
  }
}

export default ApiResponse;
