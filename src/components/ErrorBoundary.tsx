import React, { ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { safeStorage } from '../lib/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    try {
      console.error('[ErrorBoundary] Uncaught application error: ' + String(error?.message || error));
    } catch (e) {
      // ignore
    }
  }

  private handleHardReload = () => {
    try {
      safeStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
    } catch (e) {
      console.warn('Error during cache cleanup:', e);
    }
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="error-boundary-card"
          dir="rtl"
          className="min-h-screen bg-[#faf8f5] text-[#1e1e1e] flex flex-col items-center justify-center p-6 text-center font-sans"
        >
          <div className="max-w-md w-full bg-white border border-[#e2ddd3] rounded-2xl p-6 md:p-8 shadow-lg space-y-5">
            <div className="w-14 h-14 bg-amber-500/15 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1e1e1e]">
                אירעה שגיאה בטעינת האפליקציה
              </h2>
              <p className="text-sm text-[#555555] leading-relaxed">
                טעינת העמוד נתקלה בבעיה בלתי צפויה. ניתן לטעון את הדף מחדש או לאפס את זיכרון המטמון.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-[#152935] hover:bg-[#121e29] text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>טעינה מחדש של העמוד</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-[#f0ebe1] text-[#555555] hover:text-[#1e1e1e] border border-[#e2ddd3] rounded-xl font-medium text-xs transition-all cursor-pointer"
              >
                איפוס נתונים מקומיים ומטמון
              </button>
            </div>

            {(import.meta as any).env?.DEV && this.state.error && (
              <pre className="mt-4 text-left text-[11px] bg-red-50 text-red-700 p-3 rounded-lg overflow-x-auto max-h-32 border border-red-200" dir="ltr">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
