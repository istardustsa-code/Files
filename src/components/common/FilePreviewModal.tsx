import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Edit3,
  FolderInput,
  RefreshCw,
  Trash2,
  RotateCcw,
  Save,
  FileText,
} from 'lucide-react';
import { Modal } from './Modal';
import { FileTypeIconBox, ReviewStatusInline } from './FileTypeIndicator';
import { usePlatform } from '../../context/PlatformContext';
import type { PortfolioFile } from '../../types/platform';
import {
  formatBytesArabic,
  formatDateTimeArabic,
  getFileSubSectionId,
  getFileTypeLabelArabic,
  getSectionBreadcrumbLabel,
} from '../../utils/formatters';

interface FilePreviewModalProps {
  file: PortfolioFile | null;
  onClose: () => void;
  readOnly?: boolean;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  readOnly = false,
}) => {
  const {
    visibleSections,
    users,
    isSupabaseLive,
    getSignedFileUrl,
    renameAndUpdateFile,
    replaceFileBinary,
    moveFileToSection,
    softDeleteFile,
    restoreFile,
    pushToast,
  } = usePlatform();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetSubSectionId, setTargetSubSectionId] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (file) {
      setTitle(file.title);
      setDescription(file.description);
      setTargetSectionId(file.sectionId);
      setTargetSubSectionId(getFileSubSectionId(file) ?? '');
      setIsEditing(false);
      setSignedUrl(file.localPreviewUrl ?? null);
      if (!file.localPreviewUrl && isSupabaseLive) {
        getSignedFileUrl(file).then((url) => {
          if (active && url) setSignedUrl(url);
        });
      }
    } else {
      setSignedUrl(null);
    }
    return () => {
      active = false;
    };
  }, [file, isSupabaseLive, getSignedFileUrl]);

  if (!file) return null;

  const owner = users.find((u) => u.id === file.ownerId);
  const sectionBreadcrumb = getSectionBreadcrumbLabel(visibleSections, file);
  const currentSubSectionId = getFileSubSectionId(file) ?? '';
  const targetSectionObj = visibleSections.find((s) => s.id === targetSectionId);
  const targetSubSections = targetSectionObj?.customFields ?? [];

  const handleDownload = async () => {
    const resolvedUrl = signedUrl || (await getSignedFileUrl(file));
    if (resolvedUrl) {
      const a = document.createElement('a');
      a.href = resolvedUrl;
      a.download = file.originalFileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      pushToast('بدأ تنزيل الملف');
      return;
    }

    const demoSummary = [
      `منصة ملفاتي — FILES BY LAMA`,
      `معاينة بيانات ملف تجريبي (بانتظار ربط التخزين الخاص في Supabase)`,
      `--------------------------------------------------`,
      `العنوان: ${file.title}`,
      `اسم الملف الأصلي: ${file.originalFileName}`,
      `القسم: ${sectionBreadcrumb}`,
      `النوع: ${getFileTypeLabelArabic(file.fileType)}`,
      `الحجم: ${formatBytesArabic(file.sizeBytes)}`,
      `الوصف: ${file.description || 'لا يوجد وصف'}`,
    ].join('\n');

    const blob = new Blob([demoSummary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.title}_ملخص.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast('تم تنزيل بطاقة الملف (وضع المعاينة المحلية)', 'info');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    renameAndUpdateFile(file.id, { title, description });
    if (
      (targetSectionId && targetSectionId !== file.sectionId) ||
      targetSubSectionId !== currentSubSectionId
    ) {
      moveFileToSection(file.id, targetSectionId || file.sectionId, targetSubSectionId || undefined);
    }
    setIsEditing(false);
  };

  return (
    <Modal
      isOpen={Boolean(file)}
      onClose={onClose}
      title={file.title}
      subtitle={`${file.originalFileName} · ${formatBytesArabic(file.sizeBytes)}`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Preview Stage */}
        <div className="border border-[#D9C9B5]/80 rounded-2xl bg-[#F7F5F0]/70 overflow-hidden">
          {signedUrl && file.fileType === 'image' ? (
            <div className="flex items-center justify-center bg-white p-4 max-h-80">
              <img
                src={signedUrl}
                alt={file.title}
                className="max-h-72 rounded-xl object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : signedUrl && file.fileType === 'pdf' ? (
            <iframe
              src={signedUrl}
              title={file.title}
              className="w-full h-80 bg-white"
            />
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <FileTypeIconBox fileType={file.fileType} />
              <p className="text-sm font-semibold text-[#454943] mt-3">{file.originalFileName}</p>
              <p className="text-xs text-[#666560] mt-1 max-w-md leading-relaxed">
                {signedUrl
                  ? 'تم توليد رابط موقّع آمن من حاوية التخزين الخاصة. يمكنك تنزيل الملف مباشرة للاطلاع عليه.'
                  : 'معاينة هيكلية ضمن وضع المعاينة المحلية. عند ربط Supabase ستظهر الملفات الحقيقية عبر روابط موقّعة خاصة.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#666560] tabular-nums">
                <span>النوع: {getFileTypeLabelArabic(file.fileType)}</span>
                <span aria-hidden="true">·</span>
                <span>الحجم: {formatBytesArabic(file.sizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>المالك: {owner?.fullName ?? 'غير محدد'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Metadata / Edit Form */}
        {isEditing && !readOnly ? (
          <form onSubmit={handleSaveEdit} className="space-y-4 bg-[#F7F5F0]/50 p-4 rounded-xl border border-[#D9C9B5]/70">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">اسم الملف</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">نقل إلى قسم</label>
                <select
                  value={targetSectionId}
                  onChange={(e) => {
                    setTargetSectionId(e.target.value);
                    setTargetSubSectionId('');
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
                >
                  {visibleSections
                    .filter((s) => s.isActive)
                    .map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.title}
                      </option>
                    ))}
                </select>
              </div>
              {targetSubSections.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#454943] mb-1">
                    القسم الفرعي داخل القسم
                  </label>
                  <select
                    value={targetSubSectionId}
                    onChange={(e) => setTargetSubSectionId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
                  >
                    <option value="">عام في القسم الرئيسي</option>
                    {targetSubSections.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">الوصف والملاحظات</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#454943] bg-white border border-[#D9C9B5] rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#556952] text-white rounded-lg hover:bg-[#455742]"
              >
                <Save size={14} />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D9C9B5]/50">
              <div className="flex items-center gap-2 text-xs text-[#666560]">
                <FileText size={14} />
                <span>القسم: {sectionBreadcrumb}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">تاريخ الرفع: {formatDateTimeArabic(file.uploadedAt)}</span>
              </div>
              <ReviewStatusInline status={file.reviewStatus} />
            </div>

            <div>
              <p className="text-xs font-medium text-[#666560] mb-1">الوصف</p>
              <p className="text-sm text-[#454943] leading-relaxed">
                {file.description || 'لا يوجد وصف مسجل لهذا الملف.'}
              </p>
            </div>

            {file.reviewNote && (
              <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/80">
                <p className="text-xs font-semibold text-[#454943] mb-1">ملاحظة المراجعة</p>
                <p className="text-xs text-[#666560] leading-relaxed">{file.reviewNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#D9C9B5]/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#454943] text-white rounded-lg hover:bg-[#343732] transition-colors whitespace-nowrap"
            >
              <Download size={14} />
              <span>تنزيل الملف</span>
            </button>

            {!readOnly && !file.isDeleted && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Edit3 size={14} />
                  <span>تعديل / نقل</span>
                </button>

                <button
                  type="button"
                  onClick={() => replaceInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg transition-colors whitespace-nowrap"
                >
                  <RefreshCw size={14} />
                  <span>استبدال الملف</span>
                </button>
                <input
                  ref={replaceInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) replaceFileBinary(file.id, f);
                  }}
                />
              </>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              {file.isDeleted ? (
                <button
                  type="button"
                  onClick={() => {
                    restoreFile(file.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#A8B9A5]/30 text-[#3F573C] hover:bg-[#A8B9A5]/50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <RotateCcw size={14} />
                  <span>استعادة الملف</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    softDeleteFile(file.id);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#8A5E56] hover:bg-[#D8BDB7]/30 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Trash2 size={14} />
                  <span>نقل للمحذوفات</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
