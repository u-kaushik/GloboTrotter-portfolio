import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-red-50 rounded-[2rem] border-4 border-red-100 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 font-bold mb-6 max-w-xs mx-auto">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Reload App
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
