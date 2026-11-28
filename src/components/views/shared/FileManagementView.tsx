import React, { useEffect, useMemo, useState } from 'react';
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
  FolderInput,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type { FileTypeCategory, PortfolioFile } from '../../../types/platform';
import {
  FileTypeIconBox,
  FileTypeInlineText,
  ReviewStatusInline,
} from '../../common/FileTypeIndicator';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { EmptyState } from '../../common/EmptyState';
import { Modal } from '../../common/Modal';
import {
  formatBytesArabic,
  formatDateArabic,
  getSectionBreadcrumbLabel,
} from '../../../utils/formatters';

interface FileManagementViewProps {
  initialSectionFilter?: string;
}

export const FileManagementView: React.FC<FileManagementViewProps> = ({
  initialSectionFilter = 'all',
}) => {
  const {
    currentRole,
    currentUser,
    visibleFiles,
    visibleSections,
    users,
    globalSearch,
    softDeleteFile,
    batchSoftDeleteFiles,
    restoreFile,
    batchRestoreFiles,
    permanentlyDeleteFile,
    batchPermanentlyDeleteFiles,
    batchMoveFilesToSection,
    uploadProgress,
  } = usePlatform();

  const [tab, setTab] = useState<'active' | 'trash'>('active');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sectionFilter, setSectionFilter] = useState<string>(initialSectionFilter);
  const [typeFilter, setTypeFilter] = useState<FileTypeCategory | 'all'>('all');
  const [localSearch, setLocalSearch] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetSectionId, setMoveTargetSectionId] = useState('');
  const [moveTargetSubSectionId, setMoveTargetSubSectionId] = useState('');
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioFile | null>(null);

  const effectiveSearch = (localSearch || globalSearch).trim().toLowerCase();

  const ownerNameById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.id, u.fullName));
    return map;
  }, [users]);

  const filteredFiles = useMemo(() => {
    return visibleFiles
      .filter((f) => (tab === 'trash' ? f.isDeleted : !f.isDeleted))
      .filter((f) => (sectionFilter === 'all' ? true : f.sectionId === sectionFilter))
      .filter((f) => (typeFilter === 'all' ? true : f.fileType === typeFilter))
      .filter((f) => {
        if (!effectiveSearch) return true;
        const ownerName = ownerNameById.get(f.ownerId) ?? '';
        const sectionLabel = getSectionBreadcrumbLabel(visibleSections, f);
        return (
          f.title.toLowerCase().includes(effectiveSearch) ||
          f.originalFileName.toLowerCase().includes(effectiveSearch) ||
          f.description.toLowerCase().includes(effectiveSearch) ||
          ownerName.toLowerCase().includes(effectiveSearch) ||
          sectionLabel.toLowerCase().includes(effectiveSearch)
        );
      });
  }, [
    visibleFiles,
    visibleSections,
    tab,
    sectionFilter,
    typeFilter,
    effectiveSearch,
    ownerNameById,
  ]);

  const selectableFiles = useMemo(
    () =>
      filteredFiles.filter(
        (f) => currentRole === 'super_admin' || f.ownerId === currentUser.id
      ),
    [filteredFiles, currentRole, currentUser.id]
  );

  // Clear stale selection when switching tabs or filtering files out
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab]);

  useEffect(() => {
    const visibleIdSet = new Set(selectableFiles.map((f) => f.id));
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(Array.from(prev).filter((id) => visibleIdSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [selectableFiles]);

  const { activeCount, trashCount } = useMemo(() => {
    let active = 0;
    let trash = 0;
    for (const f of visibleFiles) {
      if (f.isDeleted) trash += 1;
      else active += 1;
    }
    return { activeCount: active, trashCount: trash };
  }, [visibleFiles]);

  const getSectionLabel = (file: PortfolioFile) =>
    getSectionBreadcrumbLabel(visibleSections, file);
  const getOwnerName = (ownerId: string) => ownerNameById.get(ownerId) ?? '—';

  const allSelected =
    selectableFiles.length > 0 &&
    selectableFiles.every((f) => selectedIds.has(f.id));

  const toggleSelectFile = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableFiles.map((f) => f.id)));
    }
  };

  const openBatchMoveModal = () => {
    const defaultSec = visibleSections.find((s) => s.isActive)?.id ?? '';
    setMoveTargetSectionId(defaultSec);
    setMoveTargetSubSectionId('');
    setMoveModalOpen(true);
  };

  const moveTargetSection = useMemo(
    () => visibleSections.find((s) => s.id === moveTargetSectionId),
    [visibleSections, moveTargetSectionId]
  );

  const handleConfirmBatchMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTargetSectionId || selectedIds.size === 0) return;
    await batchMoveFilesToSection(
      Array.from(selectedIds),
      moveTargetSectionId,
      moveTargetSubSectionId || undefined
    );
    setMoveModalOpen(false);
    setSelectedIds(new Set());
  };

  const handleBatchSoftDelete = async () => {
    if (selectedIds.size === 0) return;
    await batchSoftDeleteFiles(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    await batchRestoreFiles(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleConfirmBatchPermanentDelete = async () => {
    if (selectedIds.size === 0) return;
    await batchPermanentlyDeleteFiles(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

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

          <div className="flex flex-wrap items-center gap-2.5">
            {selectableFiles.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                  allSelected
                    ? 'bg-[#A8B9A5]/20 border-[#556952]/60 text-[#3F573C]'
                    : 'bg-white border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0]'
                }`}
              >
                {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                <span>{allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
              </button>
            )}

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
        {uploadProgress?.active && (
          <div className="px-3.5 py-2 rounded-xl bg-[#A8B9A5]/18 border border-[#A8B9A5]/50 text-xs text-[#3F573C] flex items-center justify-between gap-3">
            <span>جاري الرفع السريع للملفات...</span>
            <span className="font-mono-num font-semibold">
              {uploadProgress.completed} / {uploadProgress.total}
            </span>
          </div>
        )}
      </div>

      {/* Multi-Select Batch Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#A8B9A5]/20 border border-[#556952]/50 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-[#3F573C]">
            <span>تم تحديد {selectedIds.size} ملفات</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#666560] hover:text-[#454943]"
            >
              <X size={13} />
              <span>إلغاء التحديد</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab === 'active' ? (
              <>
                <button
                  type="button"
                  onClick={openBatchMoveModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#556952] text-white hover:bg-[#455742] rounded-xl whitespace-nowrap"
                >
                  <FolderInput size={14} />
                  <span>نقل إلى قسم آخر</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleBatchSoftDelete()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#8A5E56] text-white hover:bg-[#734C45] rounded-xl whitespace-nowrap"
                >
                  <Trash2 size={14} />
                  <span>حذف المحدد ({selectedIds.size})</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleBatchRestore()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#556952] text-white hover:bg-[#455742] rounded-xl whitespace-nowrap"
                >
                  <RotateCcw size={14} />
                  <span>استعادة المحدد ({selectedIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBatchDeleteConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#8A5E56] text-white hover:bg-[#734C45] rounded-xl whitespace-nowrap"
                >
                  <Trash2 size={14} />
                  <span>حذف نهائي للمحدد ({selectedIds.size})</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
                  <th className="py-3.5 pr-4 pl-2 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="تحديد جميع الملفات"
                      className="w-4 h-4 rounded accent-[#556952] cursor-pointer"
                    />
                  </th>
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
                {filteredFiles.map((file) => {
                  const canSelect =
                    currentRole === 'super_admin' || file.ownerId === currentUser.id;
                  const isChecked = selectedIds.has(file.id);

                  return (
                    <tr
                      key={file.id}
                      className={`transition-colors ${
                        isChecked ? 'bg-[#A8B9A5]/12' : 'hover:bg-[#F7F5F0]/50'
                      }`}
                    >
                      <td className="py-3 pr-4 pl-2">
                        {canSelect && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectFile(file.id)}
                            aria-label={`تحديد ${file.title}`}
                            className="w-4 h-4 rounded accent-[#556952] cursor-pointer"
                          />
                        )}
                      </td>
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
                        {getSectionLabel(file)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFiles.map((file) => {
            const canSelect =
              currentRole === 'super_admin' || file.ownerId === currentUser.id;
            const isChecked = selectedIds.has(file.id);

            return (
              <div
                key={file.id}
                className={`border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isChecked
                    ? 'bg-[#A8B9A5]/10 border-[#556952]'
                    : 'bg-white border-[#D9C9B5]/70 hover:border-[#A8B9A5]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {canSelect && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectFile(file.id)}
                          aria-label={`تحديد ${file.title}`}
                          className="w-4 h-4 rounded accent-[#556952] cursor-pointer shrink-0"
                        />
                      )}
                      <FileTypeIconBox fileType={file.fileType} />
                    </div>
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
                    <span>{getSectionLabel(file)}</span>
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
            );
          })}
        </div>
      )}

      {/* Floating bottom quick note on trash */}
      {tab === 'active' && visibleFiles.length > 0 && (
        <div className="flex items-center justify-between text-xs text-[#666560] px-1">
          <span>
            إجمالي الملفات المعروضة:{' '}
            <strong className="font-mono-num text-[#454943]">{filteredFiles.length}</strong>
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

      {/* Batch Move Modal */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title={`نقل ${selectedIds.size} ملفات إلى قسم آخر`}
        subtitle="اختاري القسم الأساسي والقسم الفرعي المطلوب نقل الملفات المحددة إليه."
      >
        <form onSubmit={handleConfirmBatchMove} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              القسم الأساسي الهدف
            </label>
            <select
              value={moveTargetSectionId}
              onChange={(e) => {
                setMoveTargetSectionId(e.target.value);
                setMoveTargetSubSectionId('');
              }}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
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

          {moveTargetSection && moveTargetSection.customFields.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">
                القسم الفرعي داخل {moveTargetSection.title}
              </label>
              <select
                value={moveTargetSubSectionId}
                onChange={(e) => setMoveTargetSubSectionId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
              >
                <option value="">عام داخل القسم الرئيسي</option>
                {moveTargetSection.customFields.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9C9B5]/60">
            <button
              type="button"
              onClick={() => setMoveModalOpen(false)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-[#556952] text-white hover:bg-[#455742] rounded-lg"
            >
              <FolderInput size={15} />
              <span>نقل المحدد ({selectedIds.size})</span>
            </button>
          </div>
        </form>
      </Modal>

      {uploadOpen && (
        <UploadFileModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}
      {previewFile && (
        <FilePreviewModal
          file={visibleFiles.find((f) => f.id === previewFile.id) ?? null}
          onClose={() => setPreviewFile(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) permanentlyDeleteFile(deleteTarget.id);
          }}
          title="تأكيد الحذف النهائي"
          description={`هل أنت متأكد من الحذف النهائي لملف "${deleteTarget.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف نهائياً"
        />
      )}
      {batchDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={batchDeleteConfirmOpen}
          onClose={() => setBatchDeleteConfirmOpen(false)}
          onConfirm={() => void handleConfirmBatchPermanentDelete()}
          title="تأكيد الحذف النهائي للملفات المحددة"
          description={`هل أنت متأكد من الحذف النهائي لـ ${selectedIds.size} ملفات محددة؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف نهائياً"
        />
      )}
    </div>
  );
};

