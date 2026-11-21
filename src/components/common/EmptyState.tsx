import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-[#F7F5F0] border border-[#D9C9B5]/60 flex items-center justify-center text-[#666560] mb-4">
        <Icon size={22} strokeWidth={1.7} />
      </div>
      <h3 className="text-base font-semibold text-[#454943] mb-1">{title}</h3>
      <p className="text-sm text-[#666560] max-w-md leading-relaxed mb-5">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg hover:bg-[#363934] transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
