export enum VdoErrorCode {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_LOST = 'CONNECTION_LOST',
  
  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_IN_USE = 'DEVICE_IN_USE',
  
  // Stream errors
  STREAM_FAILED = 'STREAM_FAILED',
  STREAM_NOT_FOUND = 'STREAM_NOT_FOUND',
  STREAM_UNAUTHORIZED = 'STREAM_UNAUTHORIZED',
  
  // Configuration errors
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  INVALID_ROOM = 'INVALID_ROOM',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  
  // Browser/system errors
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  WEBRTC_NOT_SUPPORTED = 'WEBRTC_NOT_SUPPORTED',
  IFRAME_BLOCKED = 'IFRAME_BLOCKED',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  BANDWIDTH_INSUFFICIENT = 'BANDWIDTH_INSUFFICIENT',
  
  // Unknown error
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class VdoError extends Error {
  code: VdoErrorCode;
  details?: any;
  recoverable: boolean;

  constructor(code: VdoErrorCode, message: string, details?: any, recoverable: boolean = false) {
    super(message);
    this.name = 'VdoError';
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;
  }
}

export class VdoErrorHandler {
  private errorHandlers: Map<VdoErrorCode, (error: VdoError) => void> = new Map();
  private defaultHandler: ((error: VdoError) => void) | null = null;

  /**
   * Register an error handler for a specific error code
   */
  onError(code: VdoErrorCode, handler: (error: VdoError) => void): void {
    this.errorHandlers.set(code, handler);
  }

  /**
   * Register a default error handler for unhandled errors
   */
  onDefaultError(handler: (error: VdoError) => void): void {
    this.defaultHandler = handler;
  }

  /**
   * Handle an error
   */
  handleError(error: VdoError): void {
    const handler = this.errorHandlers.get(error.code);
    
    if (handler) {
      handler(error);
    } else if (this.defaultHandler) {
      this.defaultHandler(error);
    } else {
      console.error('VDO.ninja unhandled error:', error);
    }
  }

  /**
   * Parse VDO.ninja error events and convert to VdoError
   */
  parseErrorEvent(event: any): VdoError | null {
    if (!event || event.action !== 'error') {
      return null;
    }

    const errorValue = event.value || {};
    const errorType = errorValue.type || 'unknown';
    const errorMessage = errorValue.message || 'An error occurred';
    const errorDetails = errorValue.details || {};

    // Map VDO.ninja error types to our error codes
    const errorMap: Record<string, VdoErrorCode> = {
      'connection-failed': VdoErrorCode.CONNECTION_FAILED,
      'connection-timeout': VdoErrorCode.CONNECTION_TIMEOUT,
      'connection-lost': VdoErrorCode.CONNECTION_LOST,
      'permission-denied': VdoErrorCode.PERMISSION_DENIED,
      'device-not-found': VdoErrorCode.DEVICE_NOT_FOUND,
      'device-in-use': VdoErrorCode.DEVICE_IN_USE,
      'stream-failed': VdoErrorCode.STREAM_FAILED,
      'stream-not-found': VdoErrorCode.STREAM_NOT_FOUND,
      'stream-unauthorized': VdoErrorCode.STREAM_UNAUTHORIZED,
      'invalid-parameters': VdoErrorCode.INVALID_PARAMETERS,
      'invalid-room': VdoErrorCode.INVALID_ROOM,
      'invalid-password': VdoErrorCode.INVALID_PASSWORD,
      'browser-not-supported': VdoErrorCode.BROWSER_NOT_SUPPORTED,
      'webrtc-not-supported': VdoErrorCode.WEBRTC_NOT_SUPPORTED,
      'network-error': VdoErrorCode.NETWORK_ERROR,
      'bandwidth-insufficient': VdoErrorCode.BANDWIDTH_INSUFFICIENT,
    };

    const code = errorMap[errorType] || VdoErrorCode.UNKNOWN_ERROR;
    
    // Determine if error is recoverable
    const recoverableErrors = [
      VdoErrorCode.CONNECTION_LOST,
      VdoErrorCode.NETWORK_ERROR,
      VdoErrorCode.BANDWIDTH_INSUFFICIENT,
    ];
    const recoverable = recoverableErrors.includes(code);

    return new VdoError(code, errorMessage, errorDetails, recoverable);
  }

  /**
   * Clear all error handlers
   */
  clear(): void {
    this.errorHandlers.clear();
    this.defaultHandler = null;
  }
}

/**
 * Common error recovery strategies
 */
export class VdoErrorRecovery {
  /**
   * Attempt to recover from an error
   */
  static async attemptRecovery(error: VdoError, retry: () => Promise<void>): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }

    switch (error.code) {
      case VdoErrorCode.CONNECTION_LOST:
      case VdoErrorCode.NETWORK_ERROR:
        // Wait and retry
        await this.delay(5000);
        try {
          await retry();
          return true;
        } catch {
          return false;
        }

      case VdoErrorCode.BANDWIDTH_INSUFFICIENT:
        // Could implement quality reduction here
        return false;

      default:
        return false;
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: VdoError): string {
    const messages: Record<VdoErrorCode, string> = {
      [VdoErrorCode.CONNECTION_FAILED]: 'Failed to connect to the streaming server',
      [VdoErrorCode.CONNECTION_TIMEOUT]: 'Connection timed out. Please check your internet connection',
      [VdoErrorCode.CONNECTION_LOST]: 'Connection lost. Attempting to reconnect...',
      [VdoErrorCode.PERMISSION_DENIED]: 'Camera/microphone permission denied. Please grant access and try again',
      [VdoErrorCode.DEVICE_NOT_FOUND]: 'Camera or microphone not found. Please check your devices',
      [VdoErrorCode.DEVICE_IN_USE]: 'Camera or microphone is already in use by another application',
      [VdoErrorCode.STREAM_FAILED]: 'Failed to start the stream',
      [VdoErrorCode.STREAM_NOT_FOUND]: 'Stream not found',
      [VdoErrorCode.STREAM_UNAUTHORIZED]: 'You are not authorized to access this stream',
      [VdoErrorCode.INVALID_PARAMETERS]: 'Invalid stream configuration',
      [VdoErrorCode.INVALID_ROOM]: 'Invalid room ID',
      [VdoErrorCode.INVALID_PASSWORD]: 'Invalid password',
      [VdoErrorCode.BROWSER_NOT_SUPPORTED]: 'Your browser is not supported. Please use Chrome, Firefox, or Edge',
      [VdoErrorCode.WEBRTC_NOT_SUPPORTED]: 'WebRTC is not supported in your browser',
      [VdoErrorCode.IFRAME_BLOCKED]: 'Streaming iframe was blocked. Please check your browser settings',
      [VdoErrorCode.NETWORK_ERROR]: 'Network error. Please check your internet connection',
      [VdoErrorCode.BANDWIDTH_INSUFFICIENT]: 'Insufficient bandwidth for streaming',
      [VdoErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
    };

    return messages[error.code] || error.message;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}