import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Edit3,
  RefreshCw,
  Trash2,
  RotateCcw,
  Save,
  FileText,
  ImagePlus,
  FilePlus2,
} from 'lucide-react';
import { Modal } from './Modal';
import { FileTypeIconBox, ReviewStatusInline } from './FileTypeIndicator';
import { usePlatform } from '../../context/PlatformContext';
import type { PortfolioFile } from '../../types/platform';
import {
  detectFileCategory,
  formatBytesArabic,
  formatDateTimeArabic,
  getFileBundleId,
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
    visibleFiles,
    users,
    settings,
    isSupabaseLive,
    getSignedFileUrl,
    renameAndUpdateFile,
    replaceFileBinary,
    appendFilesToEntry,
    moveFileToSection,
    softDeleteFile,
    restoreFile,
    pushToast,
  } = usePlatform();

  const bundleFiles = useMemo(() => {
    if (!file) return [];
    const bundleId = getFileBundleId(file);
    if (!bundleId) return [file];
    const siblings = visibleFiles.filter(
      (f) => !f.isDeleted && f.ownerId === file.ownerId && getFileBundleId(f) === bundleId
    );
    return siblings.length > 0 ? siblings : [file];
  }, [file, visibleFiles]);

  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const activeFile = useMemo(() => {
    if (bundleFiles.length === 0) return file;
    return bundleFiles.find((f) => f.id === activeAttachmentId) ?? bundleFiles[0];
  }, [bundleFiles, activeAttachmentId, file]);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetSubSectionId, setTargetSubSectionId] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addImagesInputRef = useRef<HTMLInputElement>(null);
  const addDocsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      setActiveAttachmentId(file.id);
      setTitle(file.title);
      setDescription(file.description);
      setTargetSectionId(file.sectionId);
      setTargetSubSectionId(getFileSubSectionId(file) ?? '');
      setIsEditing(false);
    } else {
      setActiveAttachmentId(null);
      setSignedUrl(null);
    }
  }, [file?.id]);

  useEffect(() => {
    let active = true;
    if (activeFile) {
      setSignedUrl(activeFile.localPreviewUrl ?? null);
      if (!activeFile.localPreviewUrl && isSupabaseLive) {
        getSignedFileUrl(activeFile).then((url) => {
          if (active && url) setSignedUrl(url);
        });
      }
    } else {
      setSignedUrl(null);
    }
    return () => {
      active = false;
    };
  }, [activeFile, isSupabaseLive, getSignedFileUrl]);

  if (!file || !activeFile) return null;

  const owner = users.find((u) => u.id === activeFile.ownerId);
  const sectionBreadcrumb = getSectionBreadcrumbLabel(visibleSections, activeFile);
  const currentSubSectionId = getFileSubSectionId(activeFile) ?? '';
  const targetSectionObj = visibleSections.find((s) => s.id === targetSectionId);
  const targetSubSections = targetSectionObj?.customFields ?? [];

  const handleAppendIncomingFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const valid: File[] = [];
    const maxBytes = settings.maxFileSizeMb * 1024 * 1024;

    Array.from(incoming).forEach((f) => {
      const cat = detectFileCategory(f.name, f.type);
      if (!settings.allowedFileTypes.includes(cat)) {
        pushToast(`نوع الملف "${f.name}" غير مفعّل في إعدادات المنصة`, 'warning');
        return;
      }
      if (f.size > maxBytes) {
        pushToast(
          `حجم الملف "${f.name}" يتجاوز الحد المسموح (${settings.maxFileSizeMb} م.ب)`,
          'warning'
        );
        return;
      }
      valid.push(f);
    });

    if (valid.length > 0) {
      await appendFilesToEntry(activeFile.id, valid);
    }
  };

  const handleDownload = async () => {
    const resolvedUrl = signedUrl || (await getSignedFileUrl(activeFile));
    if (resolvedUrl) {
      const a = document.createElement('a');
      a.href = resolvedUrl;
      a.download = activeFile.originalFileName;
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
      `العنوان: ${activeFile.title}`,
      `اسم الملف الأصلي: ${activeFile.originalFileName}`,
      `القسم: ${sectionBreadcrumb}`,
      `النوع: ${getFileTypeLabelArabic(activeFile.fileType)}`,
      `الحجم: ${formatBytesArabic(activeFile.sizeBytes)}`,
      `الوصف: ${activeFile.description || 'لا يوجد وصف'}`,
    ].join('\n');

    const blob = new Blob([demoSummary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.title}_ملخص.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast('تم تنزيل بطاقة الملف (وضع المعاينة المحلية)', 'info');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    renameAndUpdateFile(activeFile.id, { title, description });
    if (
      (targetSectionId && targetSectionId !== activeFile.sectionId) ||
      targetSubSectionId !== currentSubSectionId
    ) {
      moveFileToSection(
        activeFile.id,
        targetSectionId || activeFile.sectionId,
        targetSubSectionId || undefined
      );
    }
    setIsEditing(false);
  };

  return (
    <Modal
      isOpen={Boolean(file)}
      onClose={onClose}
      title={activeFile.title}
      subtitle={
        bundleFiles.length > 1
          ? `${bundleFiles.length} مرفقات وصور · المحدد حالياً: ${activeFile.originalFileName}`
          : `${activeFile.originalFileName} · ${formatBytesArabic(activeFile.sizeBytes)}`
      }
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Bundled Attachments Switcher + Add More Images/Files */}
        {(bundleFiles.length > 1 || (!readOnly && !activeFile.isDeleted)) && (
          <div className="p-3.5 rounded-2xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#454943]">
                المرفقات والصور داخل هذا الملف ({bundleFiles.length})
              </p>

              {!readOnly && !activeFile.isDeleted && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addImagesInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:border-[#556952] rounded-lg"
                  >
                    <ImagePlus size={13} className="text-[#556952]" />
                    <span>+ إضافة صور</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addDocsInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:border-[#556952] rounded-lg"
                  >
                    <FilePlus2 size={13} className="text-[#556952]" />
                    <span>+ إضافة مرفقات</span>
                  </button>
                  <input
                    ref={addImagesInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleAppendIncomingFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={addDocsInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      void handleAppendIncomingFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </div>

            {bundleFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                {bundleFiles.map((item, idx) => {
                  const isSelected = item.id === activeFile.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveAttachmentId(item.id)}
                      className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-right transition-colors ${
                        isSelected
                          ? 'bg-white border-[#556952] shadow-xs'
                          : 'bg-white/70 border-[#D9C9B5]/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileTypeIconBox fileType={item.fileType} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#454943] truncate">
                            {idx + 1}. {item.originalFileName}
                          </p>
                          <p className="text-[11px] text-[#666560] tabular-nums">
                            {getFileTypeLabelArabic(item.fileType)} ·{' '}
                            {formatBytesArabic(item.sizeBytes)}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[11px] font-medium text-[#556952] shrink-0">
                          معروض
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Preview Stage */}
        <div className="border border-[#D9C9B5]/80 rounded-2xl bg-[#F7F5F0]/70 overflow-hidden">
          {signedUrl && activeFile.fileType === 'image' ? (
            <div className="flex items-center justify-center bg-white p-4 max-h-80">
              <img
                src={signedUrl}
                alt={activeFile.originalFileName}
                className="max-h-72 rounded-xl object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : signedUrl && activeFile.fileType === 'pdf' ? (
            <iframe
              src={signedUrl}
              title={activeFile.originalFileName}
              className="w-full h-80 bg-white"
            />
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <FileTypeIconBox fileType={activeFile.fileType} />
              <p className="text-sm font-semibold text-[#454943] mt-3">
                {activeFile.originalFileName}
              </p>
              <p className="text-xs text-[#666560] mt-1 max-w-md leading-relaxed">
                {signedUrl
                  ? 'تم توليد رابط موقّع آمن من حاوية التخزين الخاصة. يمكنك تنزيل الملف مباشرة للاطلاع عليه.'
                  : 'معاينة هيكلية ضمن وضع المعاينة المحلية. عند ربط Supabase ستظهر الملفات الحقيقية عبر روابط موقّعة خاصة.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#666560] tabular-nums">
                <span>النوع: {getFileTypeLabelArabic(activeFile.fileType)}</span>
                <span aria-hidden="true">·</span>
                <span>الحجم: {formatBytesArabic(activeFile.sizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>المالك: {owner?.fullName ?? 'غير محدد'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Metadata / Edit Form */}
        {isEditing && !readOnly ? (
          <form
            onSubmit={handleSaveEdit}
            className="space-y-4 bg-[#F7F5F0]/50 p-4 rounded-xl border border-[#D9C9B5]/70"
          >
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
              <label className="block text-xs font-medium text-[#454943] mb-1">
                النص والملاحظات المكتوبة
              </label>
              <textarea
                rows={3}
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
          <div className="space-y-4 text-sm">
            {/* Structured File Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/60 text-xs">
              <div>
                <span className="text-[#666560] block mb-0.5">القسم والمسار</span>
                <span className="font-medium text-[#454943]">{sectionBreadcrumb}</span>
              </div>
              <div>
                <span className="text-[#666560] block mb-0.5">حالة المراجعة</span>
                <ReviewStatusInline status={activeFile.reviewStatus} />
              </div>
              <div>
                <span className="text-[#666560] block mb-0.5">نوع الملف وحجمه</span>
                <span className="font-medium text-[#454943] tabular-nums">
                  {getFileTypeLabelArabic(activeFile.fileType)} ·{' '}
                  {formatBytesArabic(activeFile.sizeBytes)}
                </span>
              </div>
              <div>
                <span className="text-[#666560] block mb-0.5">تاريخ الرفع</span>
                <span className="font-medium text-[#454943] tabular-nums">
                  {formatDateTimeArabic(activeFile.uploadedAt)}
                </span>
              </div>
              <div>
                <span className="text-[#666560] block mb-0.5">اسم الملف الأصلي</span>
                <span className="font-medium text-[#454943] break-all">
                  {activeFile.originalFileName}
                </span>
              </div>
              {owner && (
                <div>
                  <span className="text-[#666560] block mb-0.5">صاحب الملف</span>
                  <span className="font-medium text-[#454943]">{owner.fullName}</span>
                </div>
              )}
            </div>

            {/* Written Text / Description Card */}
            <div className="p-4 rounded-xl bg-white border border-[#D9C9B5]/70 space-y-1.5">
              <p className="text-xs font-semibold text-[#556952] flex items-center gap-1.5">
                <FileText size={13} />
                <span>النص والملاحظات المكتوبة مع الملف</span>
              </p>
              <p className="text-sm text-[#454943] leading-relaxed whitespace-pre-wrap">
                {activeFile.description || 'لا توجد كتابة أو ملاحظات مسجلة مع هذا الملف.'}
              </p>
            </div>

            {activeFile.reviewNote && (
              <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/80">
                <p className="text-xs font-semibold text-[#454943] mb-1">ملاحظة المراجعة</p>
                <p className="text-xs text-[#666560] leading-relaxed whitespace-pre-wrap">
                  {activeFile.reviewNote}
                </p>
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
              <span>تنزيل هذا المرفق</span>
            </button>

            {!readOnly && !activeFile.isDeleted && (
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
                  <span>استبدال المرفق</span>
                </button>
                <input
                  ref={replaceInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) replaceFileBinary(activeFile.id, f);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              {activeFile.isDeleted ? (
                <button
                  type="button"
                  onClick={() => {
                    restoreFile(activeFile.id);
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
                    const remaining = bundleFiles.filter((f) => f.id !== activeFile.id);
                    softDeleteFile(activeFile.id);
                    if (remaining.length > 0) {
                      setActiveAttachmentId(remaining[0].id);
                    } else {
                      onClose();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#8A5E56] hover:bg-[#D8BDB7]/30 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Trash2 size={14} />
                  <span>
                    {bundleFiles.length > 1 ? 'حذف هذا المرفق فقط' : 'نقل للمحذوفات'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
