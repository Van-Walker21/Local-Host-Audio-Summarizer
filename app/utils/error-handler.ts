class ApplicationError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromError(error: Error, statusCode: number = 500): ApplicationError {
    return new ApplicationError(error.message, statusCode, {
      originalError: error.name,
      stack: error.stack
    });
  }
}

class ModelError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 503, details);
    this.name = 'ModelError';
  }
}

class AudioProcessingError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'AudioProcessingError';
  }
}

export {
  ApplicationError,
  ModelError,
  AudioProcessingError
};
