interface ValidationError {
  key: string;
  message: string;
}

interface EnvErrorModalProps {
  errors: ValidationError[];
  onClose?: () => void;
}

export function EnvErrorModal({ errors, onClose }: EnvErrorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-red-500/50 rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Configuration Error</h2>
            <p className="text-neutral-400 mt-1">Environment variables are missing or invalid</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {errors.map((error, index) => (
            <div key={index} className="bg-neutral-800 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <div className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-mono text-sm text-red-300 mb-1">{error.key}</div>
                  <div className="text-neutral-300">{error.message}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-neutral-800 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-300 font-semibold mb-2">How to fix:</h3>
              <ol className="text-neutral-300 space-y-1 text-sm list-decimal list-inside">
                <li>Create or update your <code className="bg-neutral-700 px-1.5 py-0.5 rounded text-xs">.env</code> file</li>
                <li>Copy values from <code className="bg-neutral-700 px-1.5 py-0.5 rounded text-xs">.env.example</code></li>
                <li>Fill in the missing environment variables</li>
                <li>Restart the development server</li>
              </ol>
            </div>
          </div>
        </div>

        {onClose && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors duration-200"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}