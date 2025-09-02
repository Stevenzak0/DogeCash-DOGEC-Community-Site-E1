export class ErrorBoundary {
  static handle(error, context = {}) {
    console.error('[ErrorBoundary]', {
      message: error?.message || String(error),
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    // Optional: sendToMonitoring(error, context);
  }
}