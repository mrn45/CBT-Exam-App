import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
}

// Global Store for simplest Toast usage without context wrapping everywhere
let globalAddToast: (options: ToastOptions) => void = () => {};

export function useToastManager() {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const addToast = useCallback((options: ToastOptions) => {
    setToast(options);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  globalAddToast = addToast;

  return { toast };
}

export function toast(message: string, type: ToastType = 'success') {
  globalAddToast({ message, type });
}

export function ToastContainer({ currentToast }: { currentToast: ToastOptions | null }) {
  return (
    <div className="fixed top-6 right-6 z-[100] pointer-events-none flex flex-col gap-2">
      <AnimatePresence>
        {currentToast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`
              glass-panel flex items-center gap-4 px-6 py-4 rounded-2xl border-l-4 shadow-xl pointer-events-auto
              ${currentToast.type === 'error' ? 'border-l-red-500' : 
                currentToast.type === 'warning' ? 'border-l-amber-500' : 
                currentToast.type === 'info' ? 'border-l-violet-500' : 
                'border-l-green-500'}
            `}
          >
            <div className={`
              w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-slate-200
              ${currentToast.type === 'error' ? 'text-red-500' : 
                currentToast.type === 'warning' ? 'text-amber-500' : 
                currentToast.type === 'info' ? 'text-violet-400' : 
                'text-green-500'}
            `}>
              {currentToast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {currentToast.type === 'error' && <XCircle className="w-5 h-5" />}
              {currentToast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {currentToast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <span className="font-medium text-sm text-slate-800">
              {currentToast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
