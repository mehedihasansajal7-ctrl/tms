"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Kind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

const ToastContext = createContext<{ toast: (kind: Kind, message: string) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const STYLES: Record<Kind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-slate-200 bg-white text-slate-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2" aria-live="polite" aria-atomic="true">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${STYLES[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Simple helper component for pages that want a one-off button toast.
export default ToastProvider;
