export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express requires four arguments to recognize an error handler.
export function errorHandler(error, _request, response, _next) {
  if (error.name === 'VersionError') return response.status(409).json({ message: 'This task changed during the update. Refresh tasks before trying again.' });
  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: 'Task validation failed.', errors: Object.values(error.errors).map(e => e.message) });
  }
  if (error.name === 'CastError') {
    return response.status(400).json({ message: 'Invalid task field value.' });
  }
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ message: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ message: 'Request body is too large.' });
  }
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
    return response.status(503).json({ message: 'Database is unavailable. Try again shortly.' });
  }
  const status = error.status >= 400 && error.status <= 599 ? error.status : 500;
  // Do not expose connection strings, credentials, or internal stack traces.
  response.status(status).json({ message: status >= 500 && !(error instanceof HttpError) ? 'The server could not complete the request. Please try again.' : error.message });
}
