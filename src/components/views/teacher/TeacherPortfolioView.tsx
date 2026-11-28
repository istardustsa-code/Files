import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Upload,
  UploadCloud,
  Award,
  Folder,
  FolderCheck,
  FolderPlus,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  FilePlus2,
  PenLine,
  Ticket,
  X,
  Check,
  CheckSquare,
  FolderInput,
  Zap,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import {
  FileTypeIconBox,
  ReviewStatusInline,
} from '../../common/FileTypeIndicator';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
import { VisitCodeModal, isVisitLogActiveNow } from './VisitCodeModal';
import type {
  AchievementItem,
  CustomFieldDefinition,
  PortfolioFile,
  PortfolioSection,
} from '../../../types/platform';
import {
  detectFileCategory,
  formatBytesArabic,
  formatDateArabic,
  getFileBundleId,
  getFileSubSectionId,
} from '../../../utils/formatters';

interface TeacherPortfolioViewProps {
  focusMode: 'all' | 'achievements' | 'certificates' | 'evidence' | 'custom_sections';
}

export const TeacherPortfolioView: React.FC<TeacherPortfolioViewProps> = ({ focusMode }) => {
  const {
    currentUser,
    visibleSections,
    visibleFiles,
    visibleAchievements,
    settings,
    focusedSectionId,
    setFocusedSectionId,
    createSection,
    deleteSection,
    addTeacherSubSection,
    deleteTeacherSubSection,
    addAchievement,
    deleteAchievement,
    uploadFiles,
    uploadProgress,
    batchMoveFilesToSection,
    batchSoftDeleteFiles,
    toggleManagerViewPermission,
    myVisitCode,
    myVisitLogs,
    pushToast,
  } = usePlatform();

  const allowManagerView = currentUser.allowManagerView !== false;
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const liveVisitCount = myVisitLogs.filter((l) =>
    isVisitLogActiveNow(l.lastSeenAt, l.isLive)
  ).length;

  const [uploadSectionId, setUploadSectionId] = useState<string | undefined>(undefined);
  const [uploadSubSectionId, setUploadSubSectionId] = useState<string | undefined>(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);
  const [previewNote, setPreviewNote] = useState<AchievementItem | null>(null);

  // Selected sub-section workspace modal state
  const [activeSubTarget, setActiveSubTarget] = useState<{
    sectionId: string;
    subSectionId: string;
  } | null>(null);
  const [subModalTab, setSubModalTab] = useState<'files' | 'note'>('files');
  const [subFilesQueue, setSubFilesQueue] = useState<File[]>([]);
  const [subFileTitle, setSubFileTitle] = useState('');
  const [subFileNote, setSubFileNote] = useState('');
  const [subInstantUpload, setSubInstantUpload] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('files_by_lama_instant_upload') === '1';
    } catch {
      return false;
    }
  });
  const [subDragging, setSubDragging] = useState(false);
  const [dragHoverSubKey, setDragHoverSubKey] = useState<string | null>(null);
  const quickCardTargetRef = useRef<{
    section: PortfolioSection;
    sub: CustomFieldDefinition;
  } | null>(null);
  const quickCardInputRef = useRef<HTMLInputElement>(null);
  const subFileInputRef = useRef<HTMLInputElement>(null);
  const subImageInputRef = useRef<HTMLInputElement>(null);
  const subDocInputRef = useRef<HTMLInputElement>(null);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Multi-select state for sub-section modal & general files
  const [subSelectMode, setSubSelectMode] = useState(false);
  const [selectedSubFileIds, setSelectedSubFileIds] = useState<Set<string>>(new Set());
  const [selectedSubNoteIds, setSelectedSubNoteIds] = useState<Set<string>>(new Set());
  const [selectedGeneralIds, setSelectedGeneralIds] = useState<Set<string>>(new Set());

  // Shared Batch Move Modal state
  const [moveModalFileIds, setMoveModalFileIds] = useState<string[]>([]);
  const [moveTargetSectionId, setMoveTargetSectionId] = useState<string>('');
  const [moveTargetSubSectionId, setMoveTargetSubSectionId] = useState<string>('');
  const [isMovingBatch, setIsMovingBatch] = useState(false);

  // Custom Main Section Modal
  const [customSectionModal, setCustomSectionModal] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState('');
  const [newSecDesc, setNewSecDesc] = useState('');
  const [newSecInitialSubs, setNewSecInitialSubs] = useState('');

  // Custom Sub-Section Modal (inside any main section)
  const [addSubParentSec, setAddSubParentSec] = useState<PortfolioSection | null>(null);
  const [newSubLabel, setNewSubLabel] = useState('');
  const [newSubHint, setNewSubHint] = useState('');

  // Achievements Modal
  const [achModal, setAchModal] = useState(false);
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achDate, setAchDate] = useState(new Date().toISOString().slice(0, 10));
  const [achLevel, setAchLevel] = useState<AchievementItem['level']>('مدرسة');

  const activeFiles = useMemo(
    () => visibleFiles.filter((f) => !f.isDeleted),
    [visibleFiles]
  );
  const realAchievements = useMemo(
    () => visibleAchievements.filter((a) => a.customFieldValues?._entryKind !== 'note'),
    [visibleAchievements]
  );
  const subSectionNotes = useMemo(
    () => visibleAchievements.filter((a) => a.customFieldValues?._entryKind === 'note'),
    [visibleAchievements]
  );

  // Pre-index active files and notes by sectionId and subSectionId for O(1) rendering lookups
  const sectionDataMap = useMemo(() => {
    const map = new Map<
      string,
      {
        allFiles: PortfolioFile[];
        filesBySub: Map<string, PortfolioFile[]>;
        notesBySub: Map<string, AchievementItem[]>;
        totalNotesCount: number;
      }
    >();

    const ensureEntry = (sectionId: string) => {
      let entry = map.get(sectionId);
      if (!entry) {
        entry = {
          allFiles: [],
          filesBySub: new Map(),
          notesBySub: new Map(),
          totalNotesCount: 0,
        };
        map.set(sectionId, entry);
      }
      return entry;
    };

    for (const f of activeFiles) {
      const entry = ensureEntry(f.sectionId);
      entry.allFiles.push(f);
      const subId = getFileSubSectionId(f);
      if (subId) {
        const list = entry.filesBySub.get(subId);
        if (list) list.push(f);
        else entry.filesBySub.set(subId, [f]);
      }
    }

    for (const n of subSectionNotes) {
      const entry = ensureEntry(n.sectionId);
      entry.totalNotesCount += 1;
      const subId = n.customFieldValues?._subSectionId;
      if (subId) {
        const list = entry.notesBySub.get(subId);
        if (list) list.push(n);
        else entry.notesBySub.set(subId, [n]);
      }
    }

    return map;
  }, [activeFiles, subSectionNotes]);

  // Active sub-section resolution
  const resolvedSubTarget = useMemo(() => {
    if (!activeSubTarget) return null;
    const section = visibleSections.find((s) => s.id === activeSubTarget.sectionId);
    const sub = section?.customFields.find((cf) => cf.id === activeSubTarget.subSectionId);
    if (!section || !sub) return null;
    return { section, sub };
  }, [activeSubTarget, visibleSections]);

  const subImagePreviews = useMemo(
    () =>
      subFilesQueue.map((f, idx) =>
        idx < 10 && f.type.startsWith('image/') ? URL.createObjectURL(f) : null
      ),
    [subFilesQueue]
  );

  useEffect(() => {
    if (!focusedSectionId) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`portfolio-section-${focusedSectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setFocusedSectionId(null);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusedSectionId, setFocusedSectionId]);

  useEffect(() => {
    return () => {
      subImagePreviews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [subImagePreviews]);

  // Clean up stale selected IDs if files/notes are deleted or moved
  useEffect(() => {
    const activeIdSet = new Set(activeFiles.map((f) => f.id));
    setSelectedSubFileIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIdSet.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
    setSelectedGeneralIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (activeIdSet.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [activeFiles]);

  useEffect(() => {
    const noteIdSet = new Set(subSectionNotes.map((n) => n.id));
    setSelectedSubNoteIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (noteIdSet.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [subSectionNotes]);

  const openSubSectionModal = (section: PortfolioSection, sub: CustomFieldDefinition) => {
    setActiveSubTarget({ sectionId: section.id, subSectionId: sub.id });
    setSubModalTab('files');
    setSubFilesQueue([]);
    setSubFileTitle('');
    setSubFileNote('');
    setNoteTitle('');
    setNoteContent('');
    setSubSelectMode(false);
    setSelectedSubFileIds(new Set());
    setSelectedSubNoteIds(new Set());
  };

  const closeSubSectionModal = () => {
    setActiveSubTarget(null);
    setSubFilesQueue([]);
    setSubFileTitle('');
    setSubFileNote('');
    setNoteTitle('');
    setNoteContent('');
    setSubSelectMode(false);
    setSelectedSubFileIds(new Set());
    setSelectedSubNoteIds(new Set());
  };

  const openBatchMoveModal = (
    fileIds: string[],
    currentSecId?: string,
    currentSubId?: string
  ) => {
    if (fileIds.length === 0) return;
    const defaultSec =
      visibleSections.find((s) => s.id === currentSecId) ?? visibleSections[0];
    const otherSub = defaultSec?.customFields.find((cf) => cf.id !== currentSubId);
    setMoveModalFileIds(fileIds);
    setMoveTargetSectionId(defaultSec?.id ?? '');
    setMoveTargetSubSectionId(otherSub?.id ?? '');
  };

  const handleConfirmBatchMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (moveModalFileIds.length === 0 || !moveTargetSectionId) return;
    setIsMovingBatch(true);
    try {
      await batchMoveFilesToSection(
        moveModalFileIds,
        moveTargetSectionId,
        moveTargetSubSectionId || undefined
      );
      setMoveModalFileIds([]);
      setSelectedSubFileIds(new Set());
      setSelectedGeneralIds(new Set());
      setSubSelectMode(false);
    } finally {
      setIsMovingBatch(false);
    }
  };

  const openUploadFor = (secId?: string, subSecId?: string) => {
    setUploadSectionId(secId);
    setUploadSubSectionId(subSecId);
    setUploadOpen(true);
  };

  const validateIncomingFileList = (incoming: FileList | null): File[] => {
    if (!incoming || incoming.length === 0) return [];
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

    return valid;
  };

  const dispatchDirectSubUpload = (
    section: PortfolioSection,
    sub: CustomFieldDefinition,
    incomingFiles: File[],
    customTitleText = '',
    customNoteText = ''
  ) => {
    if (incomingFiles.length === 0) return;
    const cleanTitle = customTitleText.trim();
    const bundleId =
      incomingFiles.length > 1
        ? `bnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        : undefined;

    void uploadFiles(
      incomingFiles.map((file) => ({
        file,
        title: cleanTitle || file.name.replace(/\.[^/.]+$/, ''),
        description: customNoteText.trim(),
        sectionId: section.id,
        customFieldValues: {
          _subSectionId: sub.id,
          _subSectionLabel: sub.label,
          ...(bundleId ? { _bundleId: bundleId } : {}),
        },
      }))
    );
  };

  const handleSubIncomingFiles = (incoming: FileList | null) => {
    const valid = validateIncomingFileList(incoming);
    if (valid.length === 0) return;

    if (subInstantUpload && resolvedSubTarget) {
      dispatchDirectSubUpload(
        resolvedSubTarget.section,
        resolvedSubTarget.sub,
        valid,
        subFileTitle,
        subFileNote
      );
      setSubFileTitle('');
      setSubFileNote('');
      return;
    }

    setSubFilesQueue((prev) => [...prev, ...valid]);
    if (valid.length === 1 && !subFileTitle) {
      const base = valid[0].name.replace(/\.[^/.]+$/, '');
      if (base.toLowerCase() !== 'image') {
        setSubFileTitle(base);
      }
    }
  };

  const handleSubFileUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSubTarget) return;
    if (subFilesQueue.length === 0) {
      pushToast('يرجى اختيار ملف أو صورة واحدة على الأقل للإرفاق', 'warning');
      return;
    }

    const { section, sub } = resolvedSubTarget;
    dispatchDirectSubUpload(section, sub, subFilesQueue, subFileTitle, subFileNote);

    setSubFilesQueue([]);
    setSubFileTitle('');
    setSubFileNote('');
  };

  const handleSaveSubNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSubTarget) return;
    if (!noteContent.trim() && !noteTitle.trim()) {
      pushToast('يرجى كتابة العنوان أو النص أولاً', 'warning');
      return;
    }
    const { section, sub } = resolvedSubTarget;
    await addAchievement({
      sectionId: section.id,
      title: noteTitle.trim() || sub.label,
      description: noteContent.trim(),
      date: new Date().toISOString().slice(0, 10),
      level: 'مدرسة',
      customFieldValues: {
        _subSectionId: sub.id,
        _subSectionLabel: sub.label,
        _entryKind: 'note',
      },
    });
    setNoteTitle('');
    setNoteContent('');
  };

  const handleCreateCustomSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecTitle.trim()) return;
    const initialSubList: CustomFieldDefinition[] = newSecInitialSubs
      .split(/\n|،|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label, idx) => ({
        id: `cf-personal-${Date.now()}-${idx}`,
        label,
        type: 'subsection',
        required: false,
      }));

    await createSection({
      title: newSecTitle.trim(),
      description: newSecDesc.trim() || 'قسم أساسي شخصي في ملف الإنجاز',
      iconName: 'FolderPlus',
      accentColor: '#A8B9A5',
      isActive: true,
      isRequired: false,
      isSystemDefault: false,
      ownerId: currentUser.id,
      category: 'أقسام مخصصة',
      customFields: initialSubList,
    });
    setNewSecTitle('');
    setNewSecDesc('');
    setNewSecInitialSubs('');
    setCustomSectionModal(false);
  };

  const handleCreateSubSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubParentSec || !newSubLabel.trim()) return;
    await addTeacherSubSection(addSubParentSec.id, {
      label: newSubLabel.trim(),
      placeholder: newSubHint.trim() || undefined,
    });
    setNewSubLabel('');
    setNewSubHint('');
    setAddSubParentSec(null);
  };

  const handleAddAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achTitle.trim()) return;
    const defaultAchSection =
      visibleSections.find((s) => s.title.includes('إنجاز'))?.id ??
      visibleSections[0]?.id ??
      'sec-2';
    addAchievement({
      sectionId: defaultAchSection,
      title: achTitle.trim(),
      description: achDesc.trim(),
      date: achDate,
      level: achLevel,
    });
    setAchTitle('');
    setAchDesc('');
    setAchModal(false);
  };

  const toggleGeneralFile = (id: string) => {
    setSelectedGeneralIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderFileRow = (file: PortfolioFile) => {
    const isChecked = selectedGeneralIds.has(file.id);
    return (
      <div
        key={file.id}
        className={`py-2.5 px-2 -mx-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isChecked ? 'bg-[#A8B9A5]/15' : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => toggleGeneralFile(file.id)}
            aria-label={`تحديد ${file.title}`}
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
              isChecked
                ? 'bg-[#556952] border-[#556952] text-white'
                : 'bg-white border-[#D9C9B5] hover:border-[#556952]'
            }`}
          >
            {isChecked && <Check size={12} strokeWidth={2.5} />}
          </button>
          <FileTypeIconBox fileType={file.fileType} size="sm" />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setPreviewFile(file)}
              className="text-sm font-medium text-[#454943] hover:text-[#556952] text-right truncate block"
            >
              {file.title}
            </button>
            <p className="text-xs text-[#666560] tabular-nums">
              {formatBytesArabic(file.sizeBytes)} · {formatDateArabic(file.uploadedAt)}
              {file.description ? ` · ${file.description}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ReviewStatusInline status={file.reviewStatus} />
          <button
            type="button"
            onClick={() => setPreviewFile(file)}
            className="px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] border border-[#D9C9B5]/70 text-[#454943] rounded-lg hover:bg-[#D9C9B5]/40"
          >
            عرض وإدارة
          </button>
        </div>
      </div>
    );
  };

  // Achievements view
  if (focusMode === 'achievements') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#454943]">سجل إنجازاتي المهنية</h2>
            <p className="text-xs text-[#666560] mt-0.5">
              توثيق الجوائز، الدروس التطبيقية، وخطابات الشكر الخاصة بكِ
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white rounded-xl hover:bg-[#353833] whitespace-nowrap"
          >
            <Plus size={16} />
            <span>إضافة إنجاز جديد</span>
          </button>
        </div>

        {realAchievements.length === 0 ? (
          <EmptyState
            icon={Award}
            title="لم تتم إضافة إنجازات بعد"
            description="وثّقي إنجازاتك التربوية ومشاركاتك المتميزة هنا."
            actionLabel="إضافة أول إنجاز"
            onAction={() => setAchModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {realAchievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#556952] font-medium">
                      <Award size={15} />
                      <span>نطاق: {ach.level}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDateArabic(ach.date)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAchievement(ach.id)}
                      className="text-[#85847E] hover:text-[#8A5E56]"
                      aria-label="حذف الإنجاز"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <h3 className="text-base font-semibold text-[#454943]">{ach.title}</h3>
                  <p className="text-sm text-[#666560] leading-relaxed">{ach.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={achModal} onClose={() => setAchModal(false)} title="توثيق إنجاز مهني جديد">
          <form onSubmit={handleAddAchievement} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">عنوان الإنجاز</label>
              <input
                type="text"
                value={achTitle}
                onChange={(e) => setAchTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">المستوى</label>
                <select
                  value={achLevel}
                  onChange={(e) => setAchLevel(e.target.value as AchievementItem['level'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                >
                  <option value="مدرسة">مدرسة</option>
                  <option value="مكتب تعليم">مكتب تعليم</option>
                  <option value="إدارة تعليم">إدارة تعليم</option>
                  <option value="وطني">وطني</option>
                  <option value="دولي">دولي</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">تاريخ الإنجاز</label>
                <input
                  type="date"
                  value={achDate}
                  onChange={(e) => setAchDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">تفاصيل الإنجاز</label>
              <textarea
                rows={3}
                value={achDesc}
                onChange={(e) => setAchDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D9C9B5]/50">
              <button
                type="button"
                onClick={() => setAchModal(false)}
                className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
              >
                حفظ الإنجاز
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Filter sections depending on mode
  const displayedSections = visibleSections.filter((sec) => {
    if (focusMode === 'certificates') return sec.id === 'sec-3' || sec.title.includes('شهاد');
    if (focusMode === 'evidence') return sec.id === 'sec-4' || sec.title.includes('شواهد');
    if (focusMode === 'custom_sections') {
      return sec.ownerId === currentUser.id || sec.category === 'أقسام مخصصة' || sec.id === 'sec-11';
    }
    return true;
  });

  const activeModalFiles = useMemo(() => {
    if (!resolvedSubTarget) return [];
    return (
      sectionDataMap
        .get(resolvedSubTarget.section.id)
        ?.filesBySub.get(resolvedSubTarget.sub.id) ?? []
    );
  }, [resolvedSubTarget, sectionDataMap]);

  const groupedModalEntries = useMemo(() => {
    const groups: { key: string; primary: PortfolioFile; fileIds: string[]; count: number }[] = [];
    const indexByBundle = new Map<string, number>();

    activeModalFiles.forEach((file) => {
      const bId = getFileBundleId(file);
      if (bId) {
        const existingIdx = indexByBundle.get(bId);
        if (existingIdx !== undefined) {
          groups[existingIdx].count += 1;
          groups[existingIdx].fileIds.push(file.id);
          return;
        }
        indexByBundle.set(bId, groups.length);
      }
      groups.push({ key: bId || file.id, primary: file, fileIds: [file.id], count: 1 });
    });

    return groups;
  }, [activeModalFiles]);

  const activeModalNotes = useMemo(() => {
    if (!resolvedSubTarget) return [];
    return (
      sectionDataMap
        .get(resolvedSubTarget.section.id)
        ?.notesBySub.get(resolvedSubTarget.sub.id) ?? []
    );
  }, [resolvedSubTarget, sectionDataMap]);

  const moveTargetSectionObj = visibleSections.find((s) => s.id === moveTargetSectionId);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">
            {focusMode === 'certificates'
              ? 'شهاداتي ودوراتي التدريبية'
              : focusMode === 'evidence'
                ? 'الشواهد التعليمية'
                : focusMode === 'custom_sections'
                  ? 'مستنداتي وأقسامي المخصصة'
                  : 'أقسام ملف الإنجاز المهني'}
          </h2>
          <p className="text-xs text-[#666560] mt-0.5">
            اضغطي على أيقونة أي قسم فرعي لإرفاق الملفات أو الصور أو الكتابة، ويمكنك إضافة أقسام أساسية أو فرعية خاصة بكِ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setVisitModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors whitespace-nowrap ${
              myVisitCode?.isActive
                ? 'bg-[#A8B9A5]/20 border-[#556952]/60 text-[#3F573C] hover:bg-[#A8B9A5]/30'
                : 'bg-white border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0]'
            }`}
          >
            <Ticket size={15} className="text-[#556952]" />
            <span>كود الزيارة المؤقتة</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                liveVisitCount > 0
                  ? 'bg-[#3F573C] text-white'
                  : myVisitCode?.isActive
                    ? 'bg-[#556952] text-white'
                    : 'bg-[#F7F5F0] text-[#666560]'
              }`}
            >
              {liveVisitCount > 0
                ? 'زائرة متواجدة الآن'
                : myVisitCode?.isActive
                  ? 'مفعل'
                  : 'متوقف'}
            </span>
          </button>
          {settings.allowTeacherCustomSections !== false &&
            (focusMode === 'all' || focusMode === 'custom_sections') && (
              <button
                type="button"
                onClick={() => setCustomSectionModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0] rounded-xl whitespace-nowrap"
              >
                <Plus size={15} />
                <span>إضافة قسم أساسي</span>
              </button>
            )}
          <button
            type="button"
            onClick={() => openUploadFor(displayedSections[0]?.id, undefined)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl whitespace-nowrap"
          >
            <Upload size={15} />
            <span>رفع ملف سريع</span>
          </button>
        </div>
      </div>

      {/* Quick Privacy Control Bar for Manager Visibility */}
      <div
        className={`rounded-2xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 ${
          allowManagerView
            ? 'bg-[#A8B9A5]/15 border-[#A8B9A5]/50 text-[#3F573C]'
            : 'bg-[#D8BDB7]/20 border-[#D8BDB7]/60 text-[#7B4B43]'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs">
          {allowManagerView ? (
            <Eye size={16} className="shrink-0" />
          ) : (
            <EyeOff size={16} className="shrink-0" />
          )}
          <span>
            {allowManagerView
              ? 'حالة الخصوصية: يسمح لمدير العمل المشرف على مدرستك بالاطلاع على ملفك ومراجعته فقط (لا يراه بقية المعلمين).'
              : 'حالة الخصوصية: ملفك مخفي الآن عن مدير العمل ولا يمكن لأي شخص غيرك الاطلاع عليه.'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void toggleManagerViewPermission(!allowManagerView)}
          className="px-3.5 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0] rounded-lg whitespace-nowrap"
        >
          {allowManagerView ? 'إخفاء عن المدير' : 'السماح للمدير بالاطلاع'}
        </button>
      </div>

      {/* Hidden direct quick-upload input for 1-click sub-section card upload */}
      <input
        ref={quickCardInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const target = quickCardTargetRef.current;
          if (target) {
            const valid = validateIncomingFileList(e.target.files);
            if (valid.length > 0) {
              dispatchDirectSubUpload(target.section, target.sub, valid);
            }
          }
          quickCardTargetRef.current = null;
          e.target.value = '';
        }}
      />

      {uploadProgress?.active && (
        <div className="rounded-xl bg-[#A8B9A5]/20 border border-[#556952]/40 px-4 py-2.5 flex items-center justify-between text-xs text-[#3F573C]">
          <span className="font-medium">جاري الرفع السريع للملفات...</span>
          <span className="font-mono-num font-semibold">
            {uploadProgress.completed} / {uploadProgress.total}
          </span>
        </div>
      )}

      {/* Sections & Compact Sub-section Icon Grids */}
      <div className="space-y-5">
        {displayedSections.map((sec) => {
          const secData = sectionDataMap.get(sec.id);
          const secFiles = secData?.allFiles ?? [];
          const subSectionIds = new Set(sec.customFields.map((cf) => cf.id));
          const generalFiles = secFiles.filter((f) => {
            const subId = getFileSubSectionId(f);
            return !subId || !subSectionIds.has(subId);
          });

          return (
            <section
              key={sec.id}
              id={`portfolio-section-${sec.id}`}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 sm:p-6 space-y-4 scroll-mt-24"
            >
              {/* Main section header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#D9C9B5]/50">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sec.accentColor }}
                    />
                    <h3 className="text-base font-semibold text-[#454943]">{sec.title}</h3>
                    {sec.isRequired && (
                      <span className="text-xs text-[#556952] font-medium">· قسم أساسي</span>
                    )}
                    {sec.ownerId && (
                      <span className="text-xs text-[#666560]">· قسم خاص بكِ</span>
                    )}
                    {sec.customFields.length > 0 && (
                      <span className="text-xs text-[#666560]">
                        · {sec.customFields.length} أقسام فرعية
                      </span>
                    )}
                  </div>
                  {sec.description && <p className="text-xs text-[#666560]">{sec.description}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {settings.allowTeacherCustomSections !== false && (
                    <button
                      type="button"
                      onClick={() => setAddSubParentSec(sec)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0] rounded-lg whitespace-nowrap"
                    >
                      <FolderPlus size={13} />
                      <span>+ قسم فرعي</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openUploadFor(sec.id, undefined)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg whitespace-nowrap"
                  >
                    <Upload size={13} />
                    <span>رفع عام ({secFiles.length})</span>
                  </button>
                  {sec.ownerId === currentUser.id && (
                    <button
                      type="button"
                      onClick={() => void deleteSection(sec.id)}
                      className="p-1.5 text-[#85847E] hover:text-[#8A5E56] rounded-lg hover:bg-[#D8BDB7]/20"
                      title="حذف القسم الشخصي"
                      aria-label="حذف القسم الشخصي"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Compact Icon Grid for Sub-Sections */}
              {(sec.customFields.length > 0 || settings.allowTeacherCustomSections !== false) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sec.customFields.map((sub) => {
                    const subFileCount = secData?.filesBySub.get(sub.id)?.length ?? 0;
                    const subNoteCount = secData?.notesBySub.get(sub.id)?.length ?? 0;
                    const totalItems = subFileCount + subNoteCount;
                    const hasContent = totalItems > 0;
                    const cardDropKey = `${sec.id}::${sub.id}`;
                    const isDropActive = dragHoverSubKey === cardDropKey;

                    return (
                      <div
                        key={sub.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openSubSectionModal(sec, sub)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openSubSectionModal(sec, sub);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragHoverSubKey(cardDropKey);
                        }}
                        onDragLeave={() => {
                          setDragHoverSubKey((prev) => (prev === cardDropKey ? null : prev));
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragHoverSubKey(null);
                          const valid = validateIncomingFileList(e.dataTransfer.files);
                          if (valid.length > 0) {
                            dispatchDirectSubUpload(sec, sub, valid);
                          }
                        }}
                        className={`group relative cursor-pointer rounded-xl border p-3.5 flex flex-col items-center justify-center text-center gap-2.5 transition-colors hover:shadow-xs ${
                          isDropActive
                            ? 'bg-[#A8B9A5]/25 border-[#556952] ring-2 ring-[#556952]/50'
                            : hasContent
                              ? 'bg-[#A8B9A5]/12 border-[#A8B9A5]/70 hover:border-[#556952]'
                              : 'bg-[#F7F5F0]/55 border-[#D9C9B5]/75 hover:bg-[#F7F5F0] hover:border-[#556952]/60'
                        }`}
                      >
                        {/* 1-Click Direct Quick Upload Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            quickCardTargetRef.current = { section: sec, sub };
                            quickCardInputRef.current?.click();
                          }}
                          title={`رفع ملفات فوري داخل ${sub.label}`}
                          aria-label={`رفع سريع داخل ${sub.label}`}
                          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-white/90 border border-[#D9C9B5]/80 text-[#556952] hover:bg-[#556952] hover:text-white hover:border-[#556952] flex items-center justify-center transition-colors opacity-85 group-hover:opacity-100"
                        >
                          <Upload size={12} />
                        </button>

                        {totalItems > 0 && (
                          <span className="absolute top-2 left-2 min-w-[20px] h-5 px-1.5 rounded-md bg-[#556952] text-white text-[11px] font-mono-num font-medium flex items-center justify-center">
                            {totalItems}
                          </span>
                        )}

                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                            hasContent
                              ? 'bg-[#A8B9A5]/30 text-[#3F573C]'
                              : 'bg-white border border-[#D9C9B5]/70 text-[#556952]'
                          }`}
                        >
                          {hasContent ? <FolderCheck size={20} /> : <Folder size={20} />}
                        </div>

                        <div className="space-y-0.5 w-full">
                          <p className="text-xs sm:text-[13px] font-semibold text-[#454943] line-clamp-2 leading-snug">
                            {sub.label}
                          </p>
                          <p className="text-[11px] text-[#85847E]">
                            {isDropActive
                              ? 'أفلتي للرفع الفوري هنا'
                              : totalItems > 0
                                ? `${totalItems} عنصر`
                                : 'اضغطي أو اسحبي للإرفاق'}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {settings.allowTeacherCustomSections !== false && (
                    <button
                      type="button"
                      onClick={() => setAddSubParentSec(sec)}
                      className="rounded-xl border border-dashed border-[#D9C9B5] bg-transparent hover:bg-[#F7F5F0]/60 hover:border-[#556952] p-3.5 flex flex-col items-center justify-center text-center gap-2 text-[#666560] hover:text-[#454943] transition-colors"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/60 flex items-center justify-center text-[#556952]">
                        <Plus size={19} />
                      </div>
                      <span className="text-xs font-medium">إضافة قسم فرعي</span>
                    </button>
                  )}
                </div>
              )}

              {/* General / legacy files in the main section not attached to a sub-section */}
              {generalFiles.length > 0 && (() => {
                const generalSelectedInSec = generalFiles
                  .filter((f) => selectedGeneralIds.has(f.id))
                  .map((f) => f.id);
                const allGeneralSelectedInSec =
                  generalFiles.length > 0 && generalSelectedInSec.length === generalFiles.length;

                return (
                  <div className="bg-[#F7F5F0]/40 border border-[#D9C9B5]/60 rounded-xl p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                      <h4 className="text-xs font-semibold text-[#666560]">
                        {sec.customFields.length > 0
                          ? `ملفات عامة في القسم الرئيسي (${generalFiles.length})`
                          : `الملفات المرفوعة (${generalFiles.length})`}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGeneralIds((prev) => {
                            const next = new Set(prev);
                            if (allGeneralSelectedInSec) {
                              generalFiles.forEach((f) => next.delete(f.id));
                            } else {
                              generalFiles.forEach((f) => next.add(f.id));
                            }
                            return next;
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#556952] hover:underline"
                      >
                        <CheckSquare size={12} />
                        <span>{allGeneralSelectedInSec ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
                      </button>
                    </div>

                    {generalSelectedInSec.length > 0 && (
                      <div className="bg-[#A8B9A5]/20 border border-[#556952]/30 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#3F573C]">
                          تم تحديد <span className="font-mono-num">{generalSelectedInSec.length}</span> ملف
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openBatchMoveModal(generalSelectedInSec, sec.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white border border-[#D9C9B5] text-[#454943] rounded-md hover:border-[#556952]"
                          >
                            <FolderInput size={12} className="text-[#556952]" />
                            <span>نقل لقسم آخر</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await batchSoftDeleteFiles(generalSelectedInSec);
                              setSelectedGeneralIds((prev) => {
                                const next = new Set(prev);
                                generalSelectedInSec.forEach((id) => next.delete(id));
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#D8BDB7]/40 text-[#7B4B43] rounded-md hover:bg-[#D8BDB7]/60"
                          >
                            <Trash2 size={12} />
                            <span>حذف المحدد</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-[#D9C9B5]/40">
                      {generalFiles.map((file) => renderFileRow(file))}
                    </div>
                  </div>
                );
              })()}
            </section>
          );
        })}
      </div>

      {/* Interactive Sub-Section Modal (View items, Attach Files/Images, Write Notes) */}
      <Modal
        isOpen={Boolean(resolvedSubTarget)}
        onClose={closeSubSectionModal}
        title={resolvedSubTarget?.sub.label ?? ''}
        subtitle={
          resolvedSubTarget
            ? `${resolvedSubTarget.section.title}${
                resolvedSubTarget.sub.placeholder ? ` · ${resolvedSubTarget.sub.placeholder}` : ''
              }`
            : undefined
        }
        maxWidthClass="max-w-2xl"
      >
        {resolvedSubTarget && (
          <div className="space-y-5">
            {/* Personal Sub-Section delete option */}
            {(resolvedSubTarget.sub.id.startsWith('cf-personal-') ||
              resolvedSubTarget.section.ownerId === currentUser.id) && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/60 text-xs text-[#666560]">
                <span>هذا القسم الفرعي خاص بكِ ويمكنك حذفه بعد تفريغ محتواه.</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteTeacherSubSection(
                      resolvedSubTarget.section.id,
                      resolvedSubTarget.sub.id
                    );
                    if (activeModalFiles.length === 0 && activeModalNotes.length === 0) {
                      closeSubSectionModal();
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[#8A5E56] font-medium hover:underline shrink-0"
                >
                  <Trash2 size={13} />
                  <span>حذف القسم الفرعي</span>
                </button>
              </div>
            )}

            {/* Saved Items inside this sub-section: single clean title box per entry/bundle */}
            {(groupedModalEntries.length > 0 || activeModalNotes.length > 0) && (() => {
              const allEntryFileIds = groupedModalEntries.flatMap((g) => g.fileIds);
              const selectedFileIdList = Array.from(selectedSubFileIds);
              const selectedNoteIdList = Array.from(selectedSubNoteIds);
              const totalSelectedEntriesCount =
                groupedModalEntries.filter((g) =>
                  g.fileIds.some((id) => selectedSubFileIds.has(id))
                ).length + selectedNoteIdList.length;
              const allEntriesSelected =
                groupedModalEntries.length + activeModalNotes.length > 0 &&
                allEntryFileIds.every((id) => selectedSubFileIds.has(id)) &&
                activeModalNotes.every((n) => selectedSubNoteIds.has(n.id));

              return (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-[#454943]">
                        العناصر المحفوظة ({groupedModalEntries.length + activeModalNotes.length})
                      </h4>
                      <span className="text-[11px] text-[#666560]">
                        {subSelectMode
                          ? 'اضغطي على المربعات لتحديد أكثر من عنصر للحذف أو النقل'
                          : 'اضغطي على أي مربع لعرض كل المرفقات والصور والبيانات'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {subSelectMode && (
                        <button
                          type="button"
                          onClick={() => {
                            if (allEntriesSelected) {
                              setSelectedSubFileIds(new Set());
                              setSelectedSubNoteIds(new Set());
                            } else {
                              setSelectedSubFileIds(new Set(allEntryFileIds));
                              setSelectedSubNoteIds(new Set(activeModalNotes.map((n) => n.id)));
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#F7F5F0] border border-[#D9C9B5] text-[#454943] hover:border-[#556952] rounded-lg"
                        >
                          <span>{allEntriesSelected ? 'إلغاء الكل' : 'تحديد الكل'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSubSelectMode((prev) => {
                            if (prev) {
                              setSelectedSubFileIds(new Set());
                              setSelectedSubNoteIds(new Set());
                            }
                            return !prev;
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border rounded-lg transition-colors ${
                          subSelectMode
                            ? 'bg-[#454943] border-[#454943] text-white'
                            : 'bg-white border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0]'
                        }`}
                      >
                        <CheckSquare size={12} />
                        <span>{subSelectMode ? 'إنهاء التحديد' : 'تحديد متعدد'}</span>
                      </button>
                    </div>
                  </div>

                  {subSelectMode && totalSelectedEntriesCount > 0 && (
                    <div className="bg-[#A8B9A5]/20 border border-[#556952]/30 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#3F573C]">
                        تم تحديد <span className="font-mono-num">{totalSelectedEntriesCount}</span> عنصر
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedFileIdList.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              openBatchMoveModal(
                                selectedFileIdList,
                                resolvedSubTarget.section.id,
                                resolvedSubTarget.sub.id
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] rounded-lg hover:border-[#556952]"
                          >
                            <FolderInput size={13} className="text-[#556952]" />
                            <span>نقل لقسم آخر ({selectedFileIdList.length})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (selectedFileIdList.length > 0) {
                              await batchSoftDeleteFiles(selectedFileIdList);
                            }
                            for (const noteId of selectedNoteIdList) {
                              await deleteAchievement(noteId);
                            }
                            setSelectedSubFileIds(new Set());
                            setSelectedSubNoteIds(new Set());
                            setSubSelectMode(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#D8BDB7]/40 text-[#7B4B43] rounded-lg hover:bg-[#D8BDB7]/60"
                        >
                          <Trash2 size={13} />
                          <span>حذف المحدد</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {groupedModalEntries.map(({ key, primary, fileIds, count }) => {
                      const isSelected = fileIds.some((id) => selectedSubFileIds.has(id));
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (subSelectMode) {
                              setSelectedSubFileIds((prev) => {
                                const next = new Set(prev);
                                if (isSelected) {
                                  fileIds.forEach((id) => next.delete(id));
                                } else {
                                  fileIds.forEach((id) => next.add(id));
                                }
                                return next;
                              });
                            } else {
                              setPreviewFile(primary);
                            }
                          }}
                          className={`relative group border rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-xs ${
                            subSelectMode && isSelected
                              ? 'bg-[#A8B9A5]/20 border-[#556952] ring-1 ring-[#556952]'
                              : 'bg-white border-[#D9C9B5]/80 hover:border-[#556952] hover:bg-[#F7F5F0]/50'
                          }`}
                        >
                          {subSelectMode && (
                            <span
                              className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-[#556952] border-[#556952] text-white'
                                  : 'bg-white border-[#D9C9B5]'
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={2.5} />}
                            </span>
                          )}
                          {count > 1 && (
                            <span className="absolute top-2 left-2 px-1.5 h-5 rounded-md bg-[#556952] text-white text-[10px] font-mono-num font-medium flex items-center justify-center">
                              {count}
                            </span>
                          )}
                          <FileTypeIconBox fileType={primary.fileType} size="sm" />
                          <p className="text-xs sm:text-[13px] font-semibold text-[#454943] line-clamp-2 leading-snug w-full">
                            {primary.title}
                          </p>
                        </button>
                      );
                    })}

                    {activeModalNotes.map((n) => {
                      const isNoteSelected = selectedSubNoteIds.has(n.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (subSelectMode) {
                              setSelectedSubNoteIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(n.id)) next.delete(n.id);
                                else next.add(n.id);
                                return next;
                              });
                            } else {
                              setPreviewNote(n);
                            }
                          }}
                          className={`relative group border rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-xs ${
                            subSelectMode && isNoteSelected
                              ? 'bg-[#A8B9A5]/20 border-[#556952] ring-1 ring-[#556952]'
                              : 'bg-white border-[#D9C9B5]/80 hover:border-[#556952] hover:bg-[#F7F5F0]/50'
                          }`}
                        >
                          {subSelectMode && (
                            <span
                              className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isNoteSelected
                                  ? 'bg-[#556952] border-[#556952] text-white'
                                  : 'bg-white border-[#D9C9B5]'
                              }`}
                            >
                              {isNoteSelected && <Check size={11} strokeWidth={2.5} />}
                            </span>
                          )}
                          <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#3F573C] flex items-center justify-center shrink-0">
                            <PenLine size={17} />
                          </div>
                          <p className="text-xs sm:text-[13px] font-semibold text-[#454943] line-clamp-2 leading-snug w-full">
                            {n.title}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Add Action Tabs: Attach Files/Images OR Write Text Note */}
            <div className="border border-[#D9C9B5]/80 rounded-2xl p-4 space-y-4 bg-[#F7F5F0]/35">
              <div className="flex items-center gap-1 p-1 bg-white border border-[#D9C9B5]/70 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setSubModalTab('files')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    subModalTab === 'files'
                      ? 'bg-[#454943] text-white'
                      : 'text-[#666560] hover:text-[#454943]'
                  }`}
                >
                  <Upload size={13} />
                  <span>إرفاق ملفات أو صور</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubModalTab('note')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    subModalTab === 'note'
                      ? 'bg-[#454943] text-white'
                      : 'text-[#666560] hover:text-[#454943]'
                  }`}
                >
                  <PenLine size={13} />
                  <span>كتابة نص / توثيق</span>
                </button>
              </div>

              {subModalTab === 'files' ? (
                <form onSubmit={handleSubFileUploadSubmit} className="space-y-3.5">
                  <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#D9C9B5]/70 cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#454943]">
                      <Zap size={13} className="text-[#556952]" />
                      <span>
                        <strong>رفع فوري تلقائي</strong> عند اختيار أو سحب الملفات
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={subInstantUpload}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSubInstantUpload(checked);
                        try {
                          window.localStorage.setItem(
                            'files_by_lama_instant_upload',
                            checked ? '1' : '0'
                          );
                        } catch {
                          // ignore storage quota/privacy errors
                        }
                      }}
                      className="w-4 h-4 accent-[#556952] rounded cursor-pointer"
                    />
                  </label>

                  {uploadProgress?.active && (
                    <div className="px-3 py-2 rounded-xl bg-[#A8B9A5]/20 border border-[#556952]/40 text-xs font-medium text-[#3F573C] flex items-center justify-between">
                      <span>جاري الرفع السريع...</span>
                      <span className="font-mono-num font-semibold">
                        {uploadProgress.completed} / {uploadProgress.total}
                      </span>
                    </div>
                  )}

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setSubDragging(true);
                    }}
                    onDragLeave={() => setSubDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setSubDragging(false);
                      handleSubIncomingFiles(e.dataTransfer.files);
                    }}
                    onClick={() => subFileInputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                      subDragging
                        ? 'border-[#556952] bg-[#A8B9A5]/15'
                        : 'border-[#D9C9B5] bg-white hover:bg-[#F7F5F0]/60'
                    }`}
                  >
                    <input
                      ref={subFileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleSubIncomingFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={subImageInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handleSubIncomingFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={subDocInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv"
                      className="hidden"
                      onChange={(e) => {
                        handleSubIncomingFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <UploadCloud size={22} className="mx-auto mb-2 text-[#556952]" />
                    <p className="text-xs sm:text-sm font-medium text-[#454943]">
                      {subInstantUpload
                        ? 'اسحبي الصور أو الملفات هنا للرفع والحفظ الفوري'
                        : 'اسحبي عدة صور أو ملفات هنا، أو اختاري من الأزرار بالأسفل'}
                    </p>
                    <p className="text-[11px] text-[#666560] mt-1 tabular-nums">
                      رفع متوازي سريع · يدعم ملفات كبيرة (+100 صفحة) حتى {settings.maxFileSizeMb} م.ب للملف
                    </p>
                    <div
                      className="mt-3 flex flex-wrap items-center justify-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => subImageInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] border border-[#D9C9B5] text-[#454943] hover:border-[#556952] rounded-lg"
                      >
                        <ImagePlus size={14} className="text-[#556952]" />
                        <span>إضافة صور (متعددة)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => subDocInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] border border-[#D9C9B5] text-[#454943] hover:border-[#556952] rounded-lg"
                      >
                        <FilePlus2 size={14} className="text-[#556952]" />
                        <span>إضافة ملفات (متعددة)</span>
                      </button>
                    </div>
                  </div>

                  {subFilesQueue.length > 0 && (
                    <div className="border border-[#D9C9B5]/80 rounded-xl divide-y divide-[#D9C9B5]/50 bg-white max-h-44 overflow-y-auto">
                      <div className="px-3 py-2 bg-[#F7F5F0]/80 text-xs font-medium text-[#454943] flex items-center justify-between">
                        <span>المحدد حالياً ({subFilesQueue.length} مرفقات وصور)</span>
                        <span className="text-[11px] text-[#666560]">يمكنك إضافة المزيد قبل الحفظ</span>
                      </div>
                      {subFilesQueue.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between gap-2.5 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {subImagePreviews[idx] ? (
                              <img
                                src={subImagePreviews[idx]!}
                                alt={file.name}
                                decoding="async"
                                className="w-8 h-8 rounded-lg object-cover border border-[#D9C9B5]/70 shrink-0"
                              />
                            ) : file.type.startsWith('image/') ? (
                              <ImageIcon size={15} className="text-[#556952] shrink-0" />
                            ) : (
                              <FileText size={15} className="text-[#556952] shrink-0" />
                            )}
                            <span className="text-xs sm:text-sm text-[#454943] truncate">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-[#666560] font-mono-num shrink-0">
                              {formatBytesArabic(file.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSubFilesQueue((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-[#85847E] hover:text-[#8A5E56] p-1 shrink-0"
                            aria-label="إزالة الملف"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#454943] mb-1">
                      اسم الملف المطلوب (سيظهر على المربع)
                    </label>
                    <input
                      type="text"
                      value={subFileTitle}
                      onChange={(e) => setSubFileTitle(e.target.value)}
                      placeholder={`مثال: ${resolvedSubTarget.sub.label} — الأسبوع الأول`}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#454943] mb-1">
                      كتابة ملاحظات أو وصف مع المرفق (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={subFileNote}
                      onChange={(e) => setSubFileNote(e.target.value)}
                      placeholder="اكتبي أي تفاصيل أو توضيح يرافق الملف أو الصورة..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-lg"
                    >
                      حفظ وإرفاق ({subFilesQueue.length})
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveSubNote} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-[#454943] mb-1">
                      عنوان التوثيق أو الملاحظة
                    </label>
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder={`مثال: ملخص ${resolvedSubTarget.sub.label}`}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#454943] mb-1">
                      النص والتفاصيل
                    </label>
                    <textarea
                      rows={4}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      required
                      placeholder="اكتبي المحتوى أو الملاحظات التي ترغبين في حفظها داخل هذا القسم الفرعي..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-lg"
                    >
                      حفظ النص في القسم
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Personal Main Section Modal */}
      <Modal
        isOpen={customSectionModal}
        onClose={() => setCustomSectionModal(false)}
        title="إضافة قسم أساسي جديد"
        subtitle="أنشئي قسماً رئيسياً خاصاً بكِ ويمكنك تقسيمه لأقسام فرعية أيضاً"
      >
        <form onSubmit={handleCreateCustomSection} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">اسم القسم الأساسي</label>
            <input
              type="text"
              value={newSecTitle}
              onChange={(e) => setNewSecTitle(e.target.value)}
              required
              placeholder="مثال: أوراق العمل الإثرائية"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">الوصف (اختياري)</label>
            <textarea
              rows={2}
              value={newSecDesc}
              onChange={(e) => setNewSecDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              أقسام فرعية مبدئية (اختياري — قسم في كل سطر)
            </label>
            <textarea
              rows={3}
              value={newSecInitialSubs}
              onChange={(e) => setNewSecInitialSubs(e.target.value)}
              placeholder={'مثال:\nنماذج أوراق العمل\nصور التطبيق الصفي'}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9C9B5]/50">
            <button
              type="button"
              onClick={() => setCustomSectionModal(false)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
            >
              إنشاء القسم
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Personal Sub-Section Modal inside ANY Main Section */}
      <Modal
        isOpen={Boolean(addSubParentSec)}
        onClose={() => setAddSubParentSec(null)}
        title={`إضافة قسم فرعي داخل: ${addSubParentSec?.title ?? ''}`}
        subtitle="سيظهر كأيقونة منظمة داخل القسم ومخصص لحسابكِ فقط"
      >
        <form onSubmit={handleCreateSubSection} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">اسم القسم الفرعي</label>
            <input
              type="text"
              value={newSubLabel}
              onChange={(e) => setNewSubLabel(e.target.value)}
              required
              placeholder="مثال: خطط الأسبوع الثاني أو صور المبادرة"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              ملاحظة توضيحية (اختياري)
            </label>
            <input
              type="text"
              value={newSubHint}
              onChange={(e) => setNewSubHint(e.target.value)}
              placeholder="وصف مختصر لما يتم حفظه في هذا القسم الفرعي"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9C9B5]/50">
            <button
              type="button"
              onClick={() => setAddSubParentSec(null)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
            >
              إضافة القسم الفرعي
            </button>
          </div>
        </form>
      </Modal>

      {uploadOpen && (
        <UploadFileModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          defaultSectionId={uploadSectionId}
          defaultSubSectionId={uploadSubSectionId}
        />
      )}
      {previewFile && (
        <FilePreviewModal
          file={visibleFiles.find((f) => f.id === previewFile.id) ?? null}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Standalone Text Note Detail Modal */}
      <Modal
        isOpen={Boolean(previewNote)}
        onClose={() => setPreviewNote(null)}
        title={previewNote?.title ?? ''}
        subtitle={
          previewNote
            ? `${
                visibleSections.find((s) => s.id === previewNote.sectionId)?.title ?? 'قسم عام'
              }${
                previewNote.customFieldValues?._subSectionLabel
                  ? ` ← ${previewNote.customFieldValues._subSectionLabel}`
                  : ''
              } · ${formatDateArabic(previewNote.date)}`
            : undefined
        }
      >
        {previewNote && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F7F5F0]/60 border border-[#D9C9B5]/70 space-y-1.5">
              <p className="text-xs font-semibold text-[#556952] flex items-center gap-1.5">
                <PenLine size={13} />
                <span>المحتوى النصي والتفاصيل</span>
              </p>
              <p className="text-sm text-[#454943] whitespace-pre-wrap leading-relaxed">
                {previewNote.description || 'لا توجد تفاصيل إضافية مسجلة.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#D9C9B5]/60">
              <button
                type="button"
                onClick={async () => {
                  const id = previewNote.id;
                  setPreviewNote(null);
                  await deleteAchievement(id);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#8A5E56] hover:bg-[#D8BDB7]/30 rounded-lg"
              >
                <Trash2 size={14} />
                <span>حذف التوثيق</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewNote(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Move Files Modal */}
      <Modal
        isOpen={moveModalFileIds.length > 0}
        onClose={() => setMoveModalFileIds([])}
        title="نقل الملفات المحددة إلى قسم آخر"
        subtitle={`سيتم نقل (${moveModalFileIds.length}) ملف إلى القسم المختار`}
      >
        <form onSubmit={handleConfirmBatchMove} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1.5">
              القسم الأساسي الوجهة
            </label>
            <select
              value={moveTargetSectionId}
              onChange={(e) => {
                setMoveTargetSectionId(e.target.value);
                setMoveTargetSubSectionId('');
              }}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
            >
              {visibleSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {moveTargetSectionObj && moveTargetSectionObj.customFields.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1.5">
                القسم الفرعي (اختياري)
              </label>
              <select
                value={moveTargetSubSectionId}
                onChange={(e) => setMoveTargetSubSectionId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
              >
                <option value="">عام داخل القسم الأساسي</option>
                {moveTargetSectionObj.customFields.map((cf) => (
                  <option key={cf.id} value={cf.id}>
                    {cf.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9C9B5]/60">
            <button
              type="button"
              onClick={() => setMoveModalFileIds([])}
              className="px-4 py-2 text-xs sm:text-sm bg-[#F7F5F0] text-[#454943] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isMovingBatch || !moveTargetSectionId}
              className="px-5 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white rounded-lg hover:bg-[#353833] disabled:opacity-60"
            >
              {isMovingBatch ? 'جاري النقل...' : `تأكيد النقل (${moveModalFileIds.length})`}
            </button>
          </div>
        </form>
      </Modal>

      {visitModalOpen && (
        <VisitCodeModal isOpen={visitModalOpen} onClose={() => setVisitModalOpen(false)} />
      )}
    </div>
  );
};
