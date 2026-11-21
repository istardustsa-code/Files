import React, { useMemo, useRef, useState } from 'react';
import { UploadCloud, X, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { usePlatform } from '../../context/PlatformContext';
import { detectFileCategory, formatBytesArabic, getFileTypeLabelArabic } from '../../utils/formatters';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSectionId?: string;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  defaultSectionId,
}) => {
  const { visibleSections, settings, uploadFiles, pushToast } = usePlatform();
  const activeSections = useMemo(
    () => visibleSections.filter((s) => s.isActive),
    [visibleSections]
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sectionId, setSectionId] = useState<string>(
    defaultSectionId || activeSections[0]?.id || ''
  );
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSection = useMemo(
    () => activeSections.find((s) => s.id === sectionId) ?? activeSections[0],
    [activeSections, sectionId]
  );

  const handleIncomingFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const valid: File[] = [];
    const maxBytes = settings.maxFileSizeMb * 1024 * 1024;

    Array.from(incoming).forEach((file) => {
      const cat = detectFileCategory(file.name, file.type);
      if (!settings.allowedFileTypes.includes(cat)) {
        pushToast(`نوع الملف "${file.name}" غير مفعّل في إعدادات المنصة`, 'warning');
        return;
      }
      if (file.size > maxBytes) {
        pushToast(
          `حجم الملف "${file.name}" يتجاوز الحد المسموح (${settings.maxFileSizeMb} م.ب)`,
          'warning'
        );
        return;
      }
      valid.push(file);
    });

    if (valid.length > 0) {
      setSelectedFiles((prev) => [...prev, ...valid]);
      if (valid.length === 1 && !customTitle) {
        setCustomTitle(valid[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      pushToast('يرجى اختيار ملف واحد على الأقل للرفع', 'warning');
      return;
    }
    const targetSecId = selectedSection?.id || activeSections[0]?.id;
    if (!targetSecId) return;

    uploadFiles(
      selectedFiles.map((file, idx) => ({
        file,
        title:
          selectedFiles.length === 1 && customTitle.trim()
            ? customTitle.trim()
            : file.name.replace(/\.[^/.]+$/, '') + (idx > 0 ? '' : ''),
        description,
        sectionId: targetSecId,
        customFieldValues,
      }))
    );

    setSelectedFiles([]);
    setCustomTitle('');
    setDescription('');
    setCustomFieldValues({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="رفع ملفات إلى ملف الإنجاز"
      subtitle="يدعم رفع ملف واحد أو عدة ملفات (PDF، Word، PowerPoint، Excel، الصور)"
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleIncomingFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            isDragging
              ? 'border-[#556952] bg-[#A8B9A5]/15'
              : 'border-[#D9C9B5] bg-[#F7F5F0]/60 hover:bg-[#F7F5F0]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,image/*"
            className="hidden"
            onChange={(e) => handleIncomingFiles(e.target.files)}
          />
          <div className="w-11 h-11 rounded-xl bg-white border border-[#D9C9B5]/80 flex items-center justify-center mx-auto mb-3 text-[#556952]">
            <UploadCloud size={22} />
          </div>
          <p className="text-sm font-medium text-[#454943]">
            اسحب الملفات وأفلتها هنا، أو انقر لاختيار الملفات من جهازك
          </p>
          <p className="text-xs text-[#666560] mt-1 tabular-nums">
            الحد الأقصى لحجم الملف: {settings.maxFileSizeMb} م.ب · الصيغ المسموحة:{' '}
            {settings.allowedFileTypes.map(getFileTypeLabelArabic).join('، ')}
          </p>
        </div>

        {/* Selected files queue */}
        {selectedFiles.length > 0 && (
          <div className="border border-[#D9C9B5]/80 rounded-xl divide-y divide-[#D9C9B5]/50 bg-[#F7F5F0]/40 max-h-44 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={16} className="text-[#556952] shrink-0" />
                  <span className="text-sm text-[#454943] truncate">{file.name}</span>
                  <span className="text-xs text-[#666560] font-mono-num shrink-0">
                    {formatBytesArabic(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[#85847E] hover:text-[#8A5E56] p-1 shrink-0"
                  aria-label="إزالة الملف من القائمة"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Section & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1.5">
              القسم المستهدف
            </label>
            <select
              value={selectedSection?.id ?? ''}
              onChange={(e) => {
                setSectionId(e.target.value);
                setCustomFieldValues({});
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
            >
              {activeSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {selectedFiles.length <= 1 && (
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1.5">
                عنوان الملف في المنصة
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="مثال: شهادة برنامج التعلم النشط"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943] placeholder:text-[#85847E]"
              />
            </div>
          )}
        </div>

        {/* Dynamic custom fields from selected section */}
        {selectedSection && selectedSection.customFields.length > 0 && (
          <div className="pt-2 border-t border-[#D9C9B5]/50 space-y-3">
            <p className="text-xs font-semibold text-[#556952]">
              بيانات إضافية لقسم {selectedSection.title}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {selectedSection.customFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-[#454943] mb-1">
                    {field.label}
                    {field.required && <span className="text-[#8A5E56] mr-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={customFieldValues[field.id] ?? ''}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
                    >
                      <option value="">اختر...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={customFieldValues[field.id] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943] placeholder:text-[#85847E]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-[#454943] mb-1.5">
            وصف الملف أو الملاحظات المهنية
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="أضف وصفاً موجزاً يوضح محتوى الشاهد أو الإنجاز..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943] placeholder:text-[#85847E]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9C9B5]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#454943] bg-[#F7F5F0] hover:bg-[#D9C9B5]/40 rounded-lg transition-colors whitespace-nowrap"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-lg transition-colors whitespace-nowrap"
          >
            حفظ ورفع الملفات ({selectedFiles.length})
          </button>
        </div>
      </form>
    </Modal>
  );
};
