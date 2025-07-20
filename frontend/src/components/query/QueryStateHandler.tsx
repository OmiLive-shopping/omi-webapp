import React from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

interface QueryStateHandlerProps<T = any> {
  query: UseQueryResult<T, Error>;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error) => React.ReactNode;
  emptyComponent?: React.ReactNode;
  showEmptyOn?: (data: T) => boolean;
}

export function QueryStateHandler<T = any>({
  query,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  showEmptyOn,
}: QueryStateHandlerProps<T>) {
  // Loading state
  if (query.isLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </>
    );
  }

  // Error state
  if (query.isError) {
    const error = query.error;
    
    return (
      <>
        {errorComponent ? (
          errorComponent(error)
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {error instanceof ApiError && error.status === 404
                ? 'Not Found'
                : 'Something went wrong'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => query.refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </>
    );
  }

  // Success state with data
  if (query.isSuccess && query.data) {
    // Check if we should show empty state
    if (showEmptyOn && showEmptyOn(query.data)) {
      return (
        <>
          {emptyComponent || (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                No Data Available
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                There's nothing to show here yet.
              </p>
            </div>
          )}
        </>
      );
    }

    return <>{children(query.data)}</>;
  }

  // No data
  return null;
}

// Specialized handlers for common patterns
export function PaginatedQueryHandler<T>({
  query,
  children,
  ...props
}: Omit<QueryStateHandlerProps<{ data: T[]; total: number }>, 'showEmptyOn'>) {
  return (
    <QueryStateHandler
      query={query}
      showEmptyOn={(data) => data.data.length === 0}
      {...props}
    >
      {children}
    </QueryStateHandler>
  );
}

// Loading skeleton components
export const LoadingSkeletons = {
  List: ({ count = 3 }: { count?: number }) => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      ))}
    </div>
  ),

  Card: () => (
    <div className="animate-pulse">
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  ),

  Text: ({ lines = 3 }: { lines?: number }) => (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        ></div>
      ))}
    </div>
  ),
};

// Error boundary for queries
export class QueryErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Query error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Reload Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}