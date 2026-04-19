"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

// -------- Toast system (lightweight, no extra dep) ---------------------------
type ToastVariant = "error" | "info";
interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}
interface ToastContextValue {
  push(message: string, variant?: ToastVariant): void;
}
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <Providers />");
  return ctx;
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto max-w-sm rounded-lg border px-4 py-3 text-sm shadow-panel backdrop-blur-md ${
              t.variant === "error"
                ? "border-verdict-avoid/30 bg-verdict-avoid/10 text-verdict-avoid"
                : "border-accent-500/30 bg-accent-500/10 text-accent-200"
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------------------------------------------

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, variant: ToastVariant = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const toastValue = useMemo<ToastContextValue>(() => ({ push }), [push]);

  return (
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <ToastViewport toasts={toasts} />
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
