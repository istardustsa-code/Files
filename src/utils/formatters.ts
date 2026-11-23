import type {
  FileTypeCategory,
  PortfolioFile,
  PortfolioSection,
  ReviewStatus,
  UserRole,
} from '../types/platform';

export function formatBytesArabic(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} ك.ب`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} م.ب`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} ج.ب`;
}

export function formatDateArabic(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return iso;
  }
}

export function formatDateTimeArabic(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}

export function getRoleLabelArabic(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'مديرة المنصة';
    case 'manager':
      return 'مدير العمل';
    case 'teacher':
      return 'المعلم';
  }
}

export function getFileTypeLabelArabic(type: FileTypeCategory): string {
  switch (type) {
    case 'pdf':
      return 'PDF';
    case 'word':
      return 'Word';
    case 'powerpoint':
      return 'PowerPoint';
    case 'excel':
      return 'Excel';
    case 'image':
      return 'صورة';
  }
}

export function getReviewStatusLabelArabic(status: ReviewStatus): string {
  switch (status) {
    case 'approved':
      return 'معتمد';
    case 'pending':
      return 'بانتظار المراجعة';
    case 'needs_revision':
      return 'يحتاج استكمالاً';
  }
}

export function detectFileCategory(fileName: string, mimeType: string): FileTypeCategory {
  const lower = fileName.toLowerCase();
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/.test(lower)) {
    return 'image';
  }
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    mimeType.includes('wordprocessingml') ||
    mimeType === 'application/msword' ||
    /\.(docx?|rtf)$/.test(lower)
  ) {
    return 'word';
  }
  if (
    mimeType.includes('presentationml') ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    /\.(pptx?|ppsx?)$/.test(lower)
  ) {
    return 'powerpoint';
  }
  if (
    mimeType.includes('spreadsheetml') ||
    mimeType === 'application/vnd.ms-excel' ||
    /\.(xlsx?|csv)$/.test(lower)
  ) {
    return 'excel';
  }
  return 'pdf';
}

export function exportCsvArabic(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getFileSubSectionId(file: PortfolioFile): string | undefined {
  const val = file.customFieldValues?._subSectionId;
  return typeof val === 'string' && val.trim() ? val.trim() : undefined;
}

export function getSubSectionTitle(
  sections: PortfolioSection[],
  file: PortfolioFile
): string | undefined {
  const subId = getFileSubSectionId(file);
  if (!subId) return undefined;
  const sec = sections.find((s) => s.id === file.sectionId);
  return (
    sec?.customFields.find((cf) => cf.id === subId)?.label ??
    file.customFieldValues?._subSectionLabel
  );
}

export function getSectionBreadcrumbLabel(
  sections: PortfolioSection[],
  file: PortfolioFile
): string {
  const sec = sections.find((s) => s.id === file.sectionId);
  if (!sec) return 'قسم عام';
  const subTitle = getSubSectionTitle(sections, file);
  return subTitle ? `${sec.title} ← ${subTitle}` : sec.title;
}

export function getFileBundleId(file: PortfolioFile): string | undefined {
  const val = file.customFieldValues?._bundleId;
  return typeof val === 'string' && val.trim() ? val.trim() : undefined;
}
