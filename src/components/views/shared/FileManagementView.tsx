import React, { useMemo, useState } from 'react';
import {
  Upload,
  Search,
  LayoutGrid,
  List,
  Trash2,
  RotateCcw,
  Eye,
  FolderOpen,
  FilePlus2,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type { FileTypeCategory, PortfolioFile } from '../../../types/platform';
import { FileTypeIconBox, FileTypeInlineText, ReviewStatusInline } from '../../common/FileTypeIndicator';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { EmptyState } from '../../common/EmptyState';
import { formatBytesArabic, formatDateArabic } from '../../../utils/formatters';

interface FileManagementViewProps {
  initialSectionFilter?: string;
}

export const FileManagementView: React.FC<FileManagementViewProps> = ({
  initialSectionFilter = 'all',
}) => {
  const {
    currentRole,
    visibleFiles,
    visibleSections,
    users,
    globalSearch,
    softDeleteFile,
    restoreFile,
    permanentlyDeleteFile,
  } = usePlatform();

  const [tab, setTab] = useState<'active' | 'trash'>('active');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sectionFilter, setSectionFilter] = useState<string>(initialSectionFilter);
  const [typeFilter, setTypeFilter] = useState<FileTypeCategory | 'all'>('all');
  const [localSearch, setLocalSearch] = useState('');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioFile | null>(null);

  const effectiveSearch = (localSearch || globalSearch).trim().toLowerCase();

  const filteredFiles = useMemo(() => {
    return visibleFiles
      .filter((f) => (tab === 'trash' ? f.isDeleted : !f.isDeleted))
      .filter((f) => (sectionFilter === 'all' ? true : f.sectionId === sectionFilter))
      .filter((f) => (typeFilter === 'all' ? true : f.fileType === typeFilter))
      .filter((f) => {
        if (!effectiveSearch) return true;
        const ownerName = users.find((u) => u.id === f.ownerId)?.fullName ?? '';
        return (
          f.title.toLowerCase().includes(effectiveSearch) ||
          f.originalFileName.toLowerCase().includes(effectiveSearch) ||
          f.description.toLowerCase().includes(effectiveSearch) ||
          ownerName.toLowerCase().includes(effectiveSearch)
        );
      });
  }, [visibleFiles, tab, sectionFilter, typeFilter, effectiveSearch, users]);

  const activeCount = visibleFiles.filter((f) => !f.isDeleted).length;
  const trashCount = visibleFiles.filter((f) => f.isDeleted).length;

  const getSectionTitle = (secId: string) =>
    visibleSections.find((s) => s.id === secId)?.title ?? 'قسم عام';
  const getOwnerName = (ownerId: string) =>
    users.find((u) => u.id === ownerId)?.fullName ?? '—';

  return (
    <div className="space-y-6">
      {/* Toolbar Header */}
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Active vs Trash Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] border border-[#D9C9B5]/60 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                tab === 'active'
                  ? 'bg-white text-[#454943] shadow-xs'
                  : 'text-[#666560] hover:text-[#454943]'
              }`}
            >
              الملفات النشطة ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('trash')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                tab === 'trash'
                  ? 'bg-white text-[#8A5E56] shadow-xs'
                  : 'text-[#666560] hover:text-[#454943]'
              }`}
            >
              سلة المحذوفات ({trashCount})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Grid/Table Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] border border-[#D9C9B5]/60 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="عرض جدولي"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
                }`}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="عرض شبكي"
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#343732] rounded-xl transition-colors whitespace-nowrap"
            >
              <Upload size={16} />
              <span>رفع ملفات</span>
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#D9C9B5]/40">
          <div className="relative">
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#85847E] pointer-events-none"
            />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="بحث باسم الملف أو الوصف..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl text-[#454943] placeholder:text-[#85847E] focus:bg-white"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl text-[#454943]"
            aria-label="تصفية حسب القسم"
          >
            <option value="all">جميع الأقسام</option>
            {visibleSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.title}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FileTypeCategory | 'all')}
            className="w-full px-3.5 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl text-[#454943]"
            aria-label="تصفية حسب نوع الملف"
          >
            <option value="all">جميع الصيغ</option>
            <option value="pdf">مستندات PDF</option>
            <option value="word">مستندات Word</option>
            <option value="powerpoint">عروض PowerPoint</option>
            <option value="excel">جداول Excel</option>
            <option value="image">الصور</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredFiles.length === 0 ? (
        <EmptyState
          icon={tab === 'trash' ? Trash2 : FolderOpen}
          title={tab === 'trash' ? 'سلة المحذوفات فارغة' : 'لا توجد ملفات مطابقة'}
          description={
            tab === 'trash'
              ? 'الملفات التي تقوم بنقلها إلى سلة المحذوفات ستظهر هنا لإتاحة استعادتها أو حذفها نهائياً.'
              : 'لم يتم العثور على ملفات ضمن هذه المعايير. يمكنك رفع ملفات جديدة أو تعديل خيارات التصفية.'
          }
          actionLabel={tab === 'active' ? 'رفع ملف جديد' : undefined}
          onAction={tab === 'active' ? () => setUploadOpen(true) : undefined}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#F7F5F0]/70 border-b border-[#D9C9B5]/60 text-xs font-semibold text-[#666560]">
                  <th className="py-3.5 px-4">الملف</th>
                  <th className="py-3.5 px-4">القسم</th>
                  {currentRole === 'super_admin' && <th className="py-3.5 px-4">المالك</th>}
                  <th className="py-3.5 px-4">الصيغة والحجم</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">تاريخ الرفع</th>
                  <th className="py-3.5 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9C9B5]/40 text-sm">
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-[#F7F5F0]/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <FileTypeIconBox fileType={file.fileType} size="sm" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="font-medium text-[#454943] hover:text-[#556952] text-right truncate block max-w-xs"
                          >
                            {file.title}
                          </button>
                          <p className="text-xs text-[#666560] truncate max-w-xs">
                            {file.originalFileName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#454943] whitespace-nowrap">
                      {getSectionTitle(file.sectionId)}
                    </td>
                    {currentRole === 'super_admin' && (
                      <td className="py-3 px-4 text-xs text-[#666560] whitespace-nowrap">
                        {getOwnerName(file.ownerId)}
                      </td>
                    )}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-[#666560] tabular-nums">
                        <FileTypeInlineText fileType={file.fileType} />
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{formatBytesArabic(file.sizeBytes)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ReviewStatusInline status={file.reviewStatus} />
                    </td>
                    <td className="py-3 px-4 text-xs text-[#666560] tabular-nums whitespace-nowrap">
                      {formatDateArabic(file.uploadedAt)}
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="p-2 rounded-lg text-[#666560] hover:text-[#454943] hover:bg-[#F7F5F0]"
                          title="معاينة وتعديل"
                          aria-label="معاينة وتعديل"
                        >
                          <Eye size={16} />
                        </button>
                        {file.isDeleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreFile(file.id)}
                              className="p-2 rounded-lg text-[#556952] hover:bg-[#A8B9A5]/25"
                              title="استعادة"
                              aria-label="استعادة"
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(file)}
                              className="p-2 rounded-lg text-[#8A5E56] hover:bg-[#D8BDB7]/30"
                              title="حذف نهائي"
                              aria-label="حذف نهائي"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => softDeleteFile(file.id)}
                            className="p-2 rounded-lg text-[#85847E] hover:text-[#8A5E56] hover:bg-[#D8BDB7]/25"
                            title="نقل للمحذوفات"
                            aria-label="نقل للمحذوفات"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#A8B9A5] transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <FileTypeIconBox fileType={file.fileType} />
                  <ReviewStatusInline status={file.reviewStatus} />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="text-base font-semibold text-[#454943] hover:text-[#556952] text-right line-clamp-1"
                  >
                    {file.title}
                  </button>
                  <p className="text-xs text-[#666560] mt-1 line-clamp-2 leading-relaxed">
                    {file.description || file.originalFileName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#666560] tabular-nums">
                  <span>{getSectionTitle(file.sectionId)}</span>
                  <span aria-hidden="true">·</span>
                  <FileTypeInlineText fileType={file.fileType} />
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{formatBytesArabic(file.sizeBytes)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#D9C9B5]/50 flex items-center justify-between gap-2">
                <span className="text-xs text-[#666560] tabular-nums">
                  {formatDateArabic(file.uploadedAt)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg transition-colors whitespace-nowrap"
                  >
                    معاينة وإدارة
                  </button>
                  {file.isDeleted ? (
                    <button
                      type="button"
                      onClick={() => restoreFile(file.id)}
                      className="p-1.5 text-[#556952] hover:bg-[#A8B9A5]/25 rounded-lg"
                      title="استعادة"
                    >
                      <RotateCcw size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => softDeleteFile(file.id)}
                      className="p-1.5 text-[#85847E] hover:text-[#8A5E56] rounded-lg"
                      title="نقل للمحذوفات"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating bottom quick note on trash */}
      {tab === 'active' && visibleFiles.length > 0 && (
        <div className="flex items-center justify-between text-xs text-[#666560] px-1">
          <span>
            إجمالي الملفات المعروضة: <strong className="font-mono-num text-[#454943]">{filteredFiles.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 text-[#556952] hover:underline font-medium"
          >
            <FilePlus2 size={14} />
            <span>إضافة ملفات جديدة</span>
          </button>
        </div>
      )}

      <UploadFileModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <FilePreviewModal
        file={visibleFiles.find((f) => f.id === previewFile?.id) ?? null}
        onClose={() => setPreviewFile(null)}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) permanentlyDeleteFile(deleteTarget.id);
        }}
        title="تأكيد الحذف النهائي"
        description={`هل أنت متأكد من الحذف النهائي لملف "${deleteTarget?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائياً"
      />
    </div>
  );
};
