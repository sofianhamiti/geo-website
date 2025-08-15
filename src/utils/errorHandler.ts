/**
 * Centralized Error Handling Utility
 * Provides consistent error logging, user messages, and fallback behaviors
 */

// Standard error types for the application
export enum ErrorType {
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  LAYER_ERROR = 'LAYER_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Severity levels for error classification
export enum ErrorSeverity {
  LOW = 'LOW',           // Non-critical, user can continue
  MEDIUM = 'MEDIUM',     // Affects functionality but not critical
  HIGH = 'HIGH',         // Critical error affecting core functionality
  CRITICAL = 'CRITICAL'  // Application-breaking error
}

// Standardized error interface
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context?: string;
  originalError?: Error | unknown;
  timestamp: Date;
  stack?: string;
}

// Error handler configuration
const ERROR_CONFIG = {
  // Whether to log errors to console in production
  logInProduction: false,
  
  // Maximum error message length for user display
  maxUserMessageLength: 200,
  
  // Whether to include technical details in user messages
  includeTechnicalDetails: false,
  
  // Default retry configurations
  defaultRetries: 3,
  retryDelayMs: 1000,
};

/**
 * Create a standardized AppError
 */
export function createAppError(
  type: ErrorType,
  severity: ErrorSeverity,
  message: string,
  userMessage: string,
  context?: string,
  originalError?: Error | unknown
): AppError {
  return {
    type,
    severity,
    message,
    userMessage: userMessage.length > ERROR_CONFIG.maxUserMessageLength 
      ? userMessage.substring(0, ERROR_CONFIG.maxUserMessageLength) + '...'
      : userMessage,
    context,
    originalError,
    timestamp: new Date(),
    stack: originalError instanceof Error ? originalError.stack : undefined
  };
}

/**
 * Log error with consistent formatting
 */
export function logError(error: AppError): void {
  const isDev = import.meta.env.DEV;
  const shouldLog = isDev || ERROR_CONFIG.logInProduction;
  
  if (!shouldLog) return;

  // Log error for debugging
  console.error(`[${error.severity}] ${error.type}${error.context ? ` (${error.context})` : ''}: ${error.message}`);
  
  // Use appropriate console method based on severity
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
    case ErrorSeverity.MEDIUM:
    case ErrorSeverity.LOW:
      // Console logging removed for production build optimization
      break;
  }
  
  // Log stack trace for development
  if (isDev && error.stack) {
    // Stack trace logging removed for production build optimization
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(
  error: unknown,
  context: string,
  userFriendlyContext: string = 'loading data'
): AppError {
  let errorType = ErrorType.API_ERROR;
  let message = 'Unknown API error';
  let userMessage = `Failed to load ${userFriendlyContext}. Please try again.`;

  if (error instanceof Error) {
    message = error.message;
    
    // Classify error types based on message content
    if (error.message.includes('fetch') || error.message.includes('network')) {
      errorType = ErrorType.NETWORK_ERROR;
      userMessage = `Network connection issue while ${userFriendlyContext}. Check your internet connection.`;
    } else if (error.message.includes('404')) {
      userMessage = `${userFriendlyContext} service is temporarily unavailable.`;
    } else if (error.message.includes('500')) {
      userMessage = `${userFriendlyContext} service is experiencing issues. Try again later.`;
    }
  }

  const appError = createAppError(
    errorType,
    ErrorSeverity.MEDIUM,
    message,
    userMessage,
    context,
    error
  );

  logError(appError);
  return appError;
}

/**
 * Handle storage errors (localStorage, etc.)
 */
export function handleStorageError(
  error: unknown,
  operation: 'save' | 'load',
  dataType: string
): AppError {
  const message = error instanceof Error ? error.message : 'Storage operation failed';
  const userMessage = operation === 'save' 
    ? `Could not save ${dataType}. Your changes may not persist.`
    : `Could not load saved ${dataType}. Using defaults instead.`;

  const appError = createAppError(
    ErrorType.STORAGE_ERROR,
    ErrorSeverity.LOW,
    message,
    userMessage,
    `${operation}:${dataType}`,
    error
  );

  logError(appError);
  return appError;
}

/**
 * Handle layer rendering errors
 */
export function handleLayerError(
  error: unknown,
  layerName: string,
  fallbackBehavior: string = 'disabled'
): AppError {
  const message = error instanceof Error ? error.message : 'Layer rendering failed';
  const userMessage = `${layerName} layer is temporarily ${fallbackBehavior}. Other features continue to work normally.`;

  const appError = createAppError(
    ErrorType.LAYER_ERROR,
    ErrorSeverity.LOW,
    message,
    userMessage,
    layerName,
    error
  );

  logError(appError);
  return appError;
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  message: string,
  field: string,
  userMessage?: string
): AppError {
  const appError = createAppError(
    ErrorType.VALIDATION_ERROR,
    ErrorSeverity.MEDIUM,
    message,
    userMessage || `${field} validation failed. Please check your input.`,
    field
  );

  logError(appError);
  return appError;
}

/**
 * Safe async operation wrapper with retry logic
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string,
  fallback: T,
  maxRetries: number = ERROR_CONFIG.defaultRetries
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, ERROR_CONFIG.retryDelayMs * attempt));
        continue;
      }
    }
  }
  
  // All retries failed
  handleApiError(lastError, context);

  return fallback;
}

/**
 * Safe sync operation wrapper
 */
export function safeSyncOperation<T>(
  operation: () => T,
  context: string,
  fallback: T
): T {
  try {
    return operation();
  } catch (error) {
    const appError = createAppError(
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.LOW,
      error instanceof Error ? error.message : 'Unknown error',
      `Operation failed: ${context}`,
      context,
      error
    );
    
    logError(appError);
    return fallback;
  }
}

/**
 * Error boundary helper for React components
 */
export function getErrorBoundaryMessage(error: Error, _errorInfo: { componentStack: string }): string {
  const appError = createAppError(
    ErrorType.UNKNOWN_ERROR,
    ErrorSeverity.HIGH,
    error.message,
    'Something went wrong with this component. Please refresh the page.',
    'React Error Boundary',
    error
  );
  
  logError(appError);
  
  return appError.userMessage;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: AppError): string {
  if (ERROR_CONFIG.includeTechnicalDetails && import.meta.env.DEV) {
    return `${error.userMessage}\n\nTechnical details: ${error.message}`;
  }
  
  return error.userMessage;
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: AppError): boolean {
  return error.type === ErrorType.NETWORK_ERROR || 
         error.type === ErrorType.API_ERROR ||
         error.severity === ErrorSeverity.LOW ||
         error.severity === ErrorSeverity.MEDIUM;
}

/**
 * Get suggested user action for error
 */
export function getSuggestedAction(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK_ERROR:
      return 'Check your internet connection and try again.';
    case ErrorType.API_ERROR:
      return 'The service may be temporarily unavailable. Please try again in a few minutes.';
    case ErrorType.STORAGE_ERROR:
      return 'Check if your browser allows local storage and try again.';
    case ErrorType.VALIDATION_ERROR:
      return 'Please correct the highlighted fields and try again.';
    case ErrorType.LAYER_ERROR:
      return 'This feature is temporarily unavailable. Other map features continue to work.';
    default:
      return 'Please refresh the page and try again.';
  }
}
