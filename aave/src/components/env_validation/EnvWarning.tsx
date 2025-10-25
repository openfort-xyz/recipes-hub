import { useState, Component, type ErrorInfo, type ReactNode } from 'react';

interface EnvWarningProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode; onError?: (error: Error) => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Let the parent handle the error display
    }

    return this.props.children;
  }
}

const EnvWarning: React.FC<EnvWarningProps> = ({ children }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);

  const requiredEnvVars = [
    { key: 'VITE_OPENFORT_PUBLISHABLE_KEY', name: 'Openfort Publishable Key' },
    { key: 'VITE_OPENFORT_SHIELD_PUBLIC_KEY', name: 'Openfort Shield Public Key' },
    { key: 'VITE_BACKEND_URL', name: 'Backend URL' },
    { key: 'VITE_OPENFORT_POLICY_ID', name: 'Openfort Policy ID' },
  ];

  const missingEnvVars = requiredEnvVars.filter(
    ({ key }) => !import.meta.env[key] || import.meta.env[key].trim() === ''
  );

  const hasIssues = missingEnvVars.length > 0 || renderError !== null;

  if (!hasIssues || isDismissed) {
    return (
      <ErrorBoundary onError={setRenderError}>
        {children}
      </ErrorBoundary>
    );
  }

  return (
    <>
      <div className="bg-red-900/90 border border-red-600 text-red-100 px-6 py-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-100">
                  {missingEnvVars.length > 0 ? 'Environment Configuration Required' : 'Configuration Error'}
                </h3>
                <div className="mt-2 text-red-200">
                  {missingEnvVars.length > 0 && (
                    <>
                      <p className="text-sm mb-3">
                        The following environment variables are missing or empty in your <code className="bg-red-800/50 px-1 py-0.5 rounded text-xs">.env</code> file:
                      </p>
                      <ul className="text-sm space-y-1 ml-4 mb-4">
                        {missingEnvVars.map(({ key, name }) => (
                          <li key={key} className="flex items-center">
                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0"></span>
                            <code className="bg-red-800/50 px-1 py-0.5 rounded text-xs mr-2">{key}</code>
                            <span className="text-xs text-red-300">({name})</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {renderError && (
                    <>
                      <p className="text-sm mb-3">
                        Application failed to load due to a configuration error:
                      </p>
                      <div className="bg-red-800/50 px-3 py-2 rounded text-xs font-mono mb-4">
                        {renderError.message}
                      </div>
                    </>
                  )}

                  <div className="mt-3 p-3 bg-red-800/30 rounded-md">
                    <p className="text-sm text-red-200">
                      <strong>To fix this:</strong>
                    </p>
                    <ol className="text-sm text-red-200 mt-1 ml-4 space-y-1">
                      {missingEnvVars.length > 0 && (
                        <>
                          <li>1. Open the <code className="bg-red-700/50 px-1 py-0.5 rounded text-xs">.env</code> file in your project root</li>
                          <li>2. Add values for the missing environment variables</li>
                          <li>3. Restart your development server</li>
                        </>
                      )}
                      {renderError && (
                        <>
                          <li>1. Check that your environment variables have valid values</li>
                          <li>2. Ensure your backend server is running if VITE_BACKEND_URL is configured</li>
                          <li>3. Verify your Openfort account settings match the provided keys</li>
                          <li>4. Restart your development server</li>
                        </>
                      )}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="flex-shrink-0 ml-4 text-red-400 hover:text-red-300 transition-colors"
              aria-label="Dismiss warning"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {children}
    </>
  );
};

export default EnvWarning;