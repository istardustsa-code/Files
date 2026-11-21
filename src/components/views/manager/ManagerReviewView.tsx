import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type { PortfolioFile, ReviewStatus } from '../../../types/platform';
import { FileTypeIconBox, ReviewStatusInline } from '../../common/FileTypeIndicator';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import { Modal } from '../../common/Modal';
import { formatDateArabic } from '../../../utils/formatters';

export const ManagerReviewView: React.FC = () => {
  const { visibleFiles, visibleSections, assignedTeachers, reviewFile } = usePlatform();

  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);
  const [reviewTarget, setReviewTarget] = useState<PortfolioFile | null>(null);
  const [decision, setDecision] = useState<ReviewStatus>('approved');
  const [note, setNote] = useState('');

  const filtered = useMemo(() => {
    return visibleFiles.filter((f) =>
      statusFilter === 'all' ? true : f.reviewStatus === statusFilter
    );
  }, [visibleFiles, statusFilter]);

  const openReviewModal = (file: PortfolioFile, initialDecision: ReviewStatus) => {
    setReviewTarget(file);
    setDecision(initialDecision);
    setNote(file.reviewNote ?? '');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    reviewFile(reviewTarget.id, decision, note);
    setReviewTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">أدوات مراجعة واعتماد الملفات</h2>
          <p className="text-xs text-[#666560] mt-0.5">
            مراجعة الشواهد والخطط المرفوعة من المعلمين التابعين لكِ واعتمادها أو إرسال ملاحظات استكمال
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-xl">
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'pending', label: 'بانتظار المراجعة' },
              { id: 'approved', label: 'معتمد' },
              { id: 'needs_revision', label: 'يحتاج استكمالاً' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.id ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl divide-y divide-[#D9C9B5]/40">
        {filtered.map((file) => {
          const teacher = assignedTeachers.find((t) => t.id === file.ownerId);
          const section = visibleSections.find((s) => s.id === file.sectionId);

          return (
            <div
              key={file.id}
              className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <FileTypeIconBox fileType={file.fileType} />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#454943]">{file.title}</h3>
                    <ReviewStatusInline status={file.reviewStatus} />
                  </div>
                  <p className="text-xs text-[#666560] tabular-nums">
                    المعلم: <strong className="text-[#454943]">{teacher?.fullName ?? '—'}</strong> ·{' '}
                    {section?.title ?? ''} · {formatDateArabic(file.uploadedAt)}
                  </p>
                  {file.reviewNote && (
                    <p className="text-xs text-[#666560] bg-[#F7F5F0] px-3 py-1.5 rounded-lg inline-block mt-1">
                      ملاحظة سابقة: {file.reviewNote}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg whitespace-nowrap"
                >
                  <Eye size={14} />
                  <span>معاينة</span>
                </button>
                <button
                  type="button"
                  onClick={() => openReviewModal(file, 'approved')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#556952] text-white hover:bg-[#455742] rounded-lg whitespace-nowrap"
                >
                  <CheckCircle2 size={14} />
                  <span>اعتماد</span>
                </button>
                <button
                  type="button"
                  onClick={() => openReviewModal(file, 'needs_revision')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8A5E56] bg-[#D8BDB7]/30 hover:bg-[#D8BDB7]/50 rounded-lg whitespace-nowrap"
                >
                  <AlertCircle size={14} />
                  <span>طلب استكمال</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Decision Modal */}
      <Modal
        isOpen={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={`مراجعة ملف: ${reviewTarget?.title ?? ''}`}
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">قرار المراجعة</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value as ReviewStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            >
              <option value="approved">اعتماد الملف</option>
              <option value="needs_revision">يحتاج استكمالاً / تعديل</option>
              <option value="pending">إبقاء قيد المراجعة</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              ملاحظات وتوصيات للمعلم
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اكتب ملاحظة واضحة وبناءة..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9C9B5]/50">
            <button
              type="button"
              onClick={() => setReviewTarget(null)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
            >
              حفظ قرار المراجعة
            </button>
          </div>
        </form>
      </Modal>

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        readOnly
      />
    </div>
  );
};
