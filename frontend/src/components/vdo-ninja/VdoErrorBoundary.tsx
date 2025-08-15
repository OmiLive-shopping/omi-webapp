import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Camera,
  Mic,
  Shield,
  Server,
  Clock,
  XCircle,
  Info
} from 'lucide-react';
import {
  VdoErrorType,
  VdoErrorSeverity,
  VdoError,
  detectErrorType,
  detectErrorSeverity,
  getRecoveryManager
} from '@/lib/vdo-ninja/error-recovery';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableAutoRecovery?: boolean;
  showErrorDetails?: boolean;
  streamId?: string;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  vdoError: VdoError | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  errorCount: number;
}

export class VdoErrorBoundary extends Component<Props, State> {
  private recoveryManager = getRecoveryManager({
    enableAutoRecovery: this.props.enableAutoRecovery ?? true,
    onRecoveryAttempt: (error, attempt) => {
      this.setState({ recoveryAttempts: attempt });
    },
    onRecoverySuccess: () => {
      this.setState({ hasError: false, isRecovering: false });
    },
    onRecoveryFailed: () => {
      this.setState({ isRecovering: false });
    }
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      vdoError: null,
      isRecovering: false,
      recoveryAttempts: 0,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Create VDO error
    const errorType = detectErrorType(error);
    const errorSeverity = detectErrorSeverity(error);
    
    const vdoError = this.recoveryManager.createError(
      errorType,
      error.message,
      {
        severity: errorSeverity,
        details: {
          stack: error.stack,
          componentStack: errorInfo.componentStack
        },
        recoverable: errorSeverity !== VdoErrorSeverity.CRITICAL
      }
    );
    
    this.setState({
      errorInfo,
      vdoError,
      errorCount: this.state.errorCount + 1
    });
    
    // Call error handler
    onError?.(error, errorInfo);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('VDO Error Boundary caught error:', error, errorInfo);
    }
    
    // Attempt auto-recovery if enabled
    if (this.props.enableAutoRecovery && vdoError.recoverable) {
      this.attemptRecovery(vdoError);
    }
  }

  private async attemptRecovery(error: VdoError) {
    this.setState({ isRecovering: true });
    
    try {
      const success = await this.recoveryManager.handleError(error);
      
      if (success) {
        // Reset error state on successful recovery
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          vdoError: null,
          isRecovering: false,
          recoveryAttempts: 0
        });
      } else {
        this.setState({ isRecovering: false });
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      vdoError: null,
      recoveryAttempts: 0
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorIcon(type: VdoErrorType) {
    switch (type) {
      case VdoErrorType.CONNECTION_ERROR:
        return <WifiOff className="w-12 h-12" />;
      case VdoErrorType.MEDIA_ERROR:
        return <Camera className="w-12 h-12" />;
      case VdoErrorType.PERMISSION_ERROR:
        return <Shield className="w-12 h-12" />;
      case VdoErrorType.STREAM_ERROR:
        return <Server className="w-12 h-12" />;
      case VdoErrorType.TIMEOUT_ERROR:
        return <Clock className="w-12 h-12" />;
      case VdoErrorType.NETWORK_ERROR:
        return <WifiOff className="w-12 h-12" />;
      default:
        return <AlertTriangle className="w-12 h-12" />;
    }
  }

  private getErrorMessage(error: VdoError): string {
    switch (error.type) {
      case VdoErrorType.CONNECTION_ERROR:
        return 'Failed to connect to the streaming service';
      case VdoErrorType.MEDIA_ERROR:
        return 'Camera or microphone access error';
      case VdoErrorType.PERMISSION_ERROR:
        return 'Permission denied to access media devices';
      case VdoErrorType.STREAM_ERROR:
        return 'Stream encountered an error';
      case VdoErrorType.TIMEOUT_ERROR:
        return 'Operation timed out';
      case VdoErrorType.NETWORK_ERROR:
        return 'Network connection issue';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }

  private getSeverityColor(severity: VdoErrorSeverity): string {
    switch (severity) {
      case VdoErrorSeverity.LOW:
        return 'text-blue-500';
      case VdoErrorSeverity.MEDIUM:
        return 'text-yellow-500';
      case VdoErrorSeverity.HIGH:
        return 'text-orange-500';
      case VdoErrorSeverity.CRITICAL:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  render() {
    const {
      hasError,
      error,
      vdoError,
      isRecovering,
      recoveryAttempts,
      errorCount
    } = this.state;
    
    const { children, fallback, showErrorDetails, className } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    const errorType = vdoError?.type || VdoErrorType.UNKNOWN_ERROR;
    const errorSeverity = vdoError?.severity || VdoErrorSeverity.MEDIUM;

    return (
      <div className={`min-h-[400px] flex items-center justify-center p-8 ${className || ''}`}>
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            {/* Error Icon */}
            <div className={`flex justify-center mb-4 ${this.getSeverityColor(errorSeverity)}`}>
              {this.getErrorIcon(errorType)}
            </div>

            {/* Error Title */}
            <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-white">
              {isRecovering ? 'Recovering...' : 'Stream Error'}
            </h2>

            {/* Error Message */}
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              {vdoError ? this.getErrorMessage(vdoError) : error?.message}
            </p>

            {/* Recovery Status */}
            {isRecovering && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 text-blue-500">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Attempting recovery... (Attempt {recoveryAttempts})</span>
                </div>
              </div>
            )}

            {/* Error Details */}
            {showErrorDetails && error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <span className="inline-flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Error Details
                  </span>
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto max-h-32">
                  <div className="text-gray-700 dark:text-gray-300">
                    <div>Type: {errorType}</div>
                    <div>Severity: {errorSeverity}</div>
                    <div>Count: {errorCount}</div>
                    {error.stack && (
                      <div className="mt-2 whitespace-pre-wrap break-all">
                        {error.stack}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Action Buttons */}
            {!isRecovering && (
              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                
                {errorSeverity === VdoErrorSeverity.CRITICAL && (
                  <button
                    onClick={this.handleReload}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reload Page
                  </button>
                )}
              </div>
            )}

            {/* Help Text */}
            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              {vdoError?.recoverable
                ? 'This error may be temporary. Please try again.'
                : 'If this problem persists, please contact support.'}
            </p>
          </div>
        </div>
      </div>
    );
  }
}

// Functional component wrapper for easier use with hooks
export const VdoErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
  streamId?: string;
}> = ({ error, resetError, streamId }) => {
  const errorType = detectErrorType(error);
  const errorSeverity = detectErrorSeverity(error);
  
  return (
    <div className="min-h-[300px] flex items-center justify-center p-4">
      <div className="text-center">
        <div className={`mb-4 ${
          errorSeverity === VdoErrorSeverity.CRITICAL ? 'text-red-500' : 'text-yellow-500'
        }`}>
          <AlertTriangle className="w-12 h-12 mx-auto" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">
          {errorType === VdoErrorType.CONNECTION_ERROR
            ? 'Connection Lost'
            : errorType === VdoErrorType.MEDIA_ERROR
            ? 'Media Error'
            : 'Stream Error'}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          {error.message || 'Something went wrong with the stream'}
        </p>
        
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        
        {streamId && (
          <p className="mt-2 text-xs text-gray-500">
            Stream ID: {streamId}
          </p>
        )}
      </div>
    </div>
  );
};