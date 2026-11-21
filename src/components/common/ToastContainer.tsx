import React from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = usePlatform();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'warning'
            ? AlertCircle
            : toast.tone === 'info'
              ? Info
              : CheckCircle2;
        const iconColor =
          toast.tone === 'warning'
            ? 'text-[#8A5E56]'
            : toast.tone === 'info'
              ? 'text-[#666560]'
              : 'text-[#556952]';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 bg-white border border-[#D9C9B5] shadow-md rounded-xl px-4 py-3 text-sm text-[#454943]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon size={18} className={`${iconColor} shrink-0`} />
              <span className="truncate">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-[#85847E] hover:text-[#454943] p-1 shrink-0"
              aria-label="إغلاق التنبيه"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
