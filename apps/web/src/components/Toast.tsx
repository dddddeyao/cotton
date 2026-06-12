import { useState, useCallback, type ReactNode } from 'react';
import { ToastContext, type ToastType } from './toast-context';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-success',
    error: 'bg-danger',
    info: 'bg-primary',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${typeStyles[t.type]} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-[fadeIn_0.2s_ease-out]`}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
