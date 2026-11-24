import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800 font-sans">
          <div className="max-w-lg w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xl">
              !
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">LabelGuard India Initialization</h1>
              <p className="text-xs text-slate-500 mt-1">
                A browser-side state exception was caught:
              </p>
            </div>
            <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap font-mono">
              {this.state.error?.toString()}
            </pre>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  try { localStorage.clear(); } catch(e){}
                  window.location.href = '/scanner';
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
              >
                Reset App & Go to Scanner
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
