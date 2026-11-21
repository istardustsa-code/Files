import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { FileTypeCategory, ReviewStatus } from '../../types/platform';
import { getFileTypeLabelArabic, getReviewStatusLabelArabic } from '../../utils/formatters';

export const FileTypeIconBox: React.FC<{ fileType: FileTypeCategory; size?: 'sm' | 'md' }> = ({
  fileType,
  size = 'md',
}) => {
  const boxSize = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'sm' ? 16 : 19;

  switch (fileType) {
    case 'pdf':
      return (
        <div
          className={`${boxSize} bg-[#D8BDB7]/35 text-[#7B4B43] flex items-center justify-center shrink-0`}
        >
          <FileText size={iconSize} strokeWidth={1.8} />
        </div>
      );
    case 'word':
      return (
        <div
          className={`${boxSize} bg-[#A8B9A5]/30 text-[#455A42] flex items-center justify-center shrink-0`}
        >
          <File size={iconSize} strokeWidth={1.8} />
        </div>
      );
    case 'powerpoint':
      return (
        <div
          className={`${boxSize} bg-[#D9C9B5]/45 text-[#6D5A43] flex items-center justify-center shrink-0`}
        >
          <Presentation size={iconSize} strokeWidth={1.8} />
        </div>
      );
    case 'excel':
      return (
        <div
          className={`${boxSize} bg-[#A8B9A5]/40 text-[#3F573C] flex items-center justify-center shrink-0`}
        >
          <FileSpreadsheet size={iconSize} strokeWidth={1.8} />
        </div>
      );
    case 'image':
      return (
        <div
          className={`${boxSize} bg-[#F7F5F0] border border-[#D9C9B5] text-[#454943] flex items-center justify-center shrink-0`}
        >
          <ImageIcon size={iconSize} strokeWidth={1.8} />
        </div>
      );
  }
};

export const FileTypeInlineText: React.FC<{ fileType: FileTypeCategory }> = ({ fileType }) => {
  return <span className="font-mono-num text-xs text-[#666560]">{getFileTypeLabelArabic(fileType)}</span>;
};

export const ReviewStatusInline: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#466143]">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>{getReviewStatusLabelArabic(status)}</span>
      </span>
    );
  }
  if (status === 'needs_revision') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A5E56]">
        <AlertCircle size={14} className="shrink-0" />
        <span>{getReviewStatusLabelArabic(status)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#666560]">
      <Clock size={14} className="shrink-0" />
      <span>{getReviewStatusLabelArabic(status)}</span>
    </span>
  );
};
