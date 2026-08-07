export class AppError extends Error {
  constructor(
    public readonly code: string, // makine-okunur: "ASSET_NOT_FOUND"
    message: string, // Türkçe, kullanıcıya gösterilebilir
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super("RATE_LIMITED", message, 429);
  }
}
