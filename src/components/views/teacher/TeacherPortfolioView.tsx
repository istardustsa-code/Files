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
  X,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import { FileTypeIconBox, ReviewStatusInline } from '../../common/FileTypeIndicator';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
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
    createSection,
    deleteSection,
    addTeacherSubSection,
    deleteTeacherSubSection,
    addAchievement,
    deleteAchievement,
    uploadFiles,
    toggleManagerViewPermission,
    pushToast,
  } = usePlatform();

  const allowManagerView = currentUser.allowManagerView !== false;

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
  const [subDragging, setSubDragging] = useState(false);
  const subFileInputRef = useRef<HTMLInputElement>(null);
  const subImageInputRef = useRef<HTMLInputElement>(null);
  const subDocInputRef = useRef<HTMLInputElement>(null);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

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

  const activeFiles = visibleFiles.filter((f) => !f.isDeleted);
  const realAchievements = useMemo(
    () => visibleAchievements.filter((a) => a.customFieldValues?._entryKind !== 'note'),
    [visibleAchievements]
  );
  const subSectionNotes = useMemo(
    () => visibleAchievements.filter((a) => a.customFieldValues?._entryKind === 'note'),
    [visibleAchievements]
  );

  // Active sub-section resolution
  const resolvedSubTarget = useMemo(() => {
    if (!activeSubTarget) return null;
    const section = visibleSections.find((s) => s.id === activeSubTarget.sectionId);
    const sub = section?.customFields.find((cf) => cf.id === activeSubTarget.subSectionId);
    if (!section || !sub) return null;
    return { section, sub };
  }, [activeSubTarget, visibleSections]);

  const subImagePreviews = useMemo(
    () => subFilesQueue.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
    [subFilesQueue]
  );

  useEffect(() => {
    return () => {
      subImagePreviews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [subImagePreviews]);

  const openSubSectionModal = (section: PortfolioSection, sub: CustomFieldDefinition) => {
    setActiveSubTarget({ sectionId: section.id, subSectionId: sub.id });
    setSubModalTab('files');
    setSubFilesQueue([]);
    setSubFileTitle('');
    setSubFileNote('');
    setNoteTitle('');
    setNoteContent('');
  };

  const closeSubSectionModal = () => {
    setActiveSubTarget(null);
    setSubFilesQueue([]);
    setSubFileTitle('');
    setSubFileNote('');
    setNoteTitle('');
    setNoteContent('');
  };

  const openUploadFor = (secId?: string, subSecId?: string) => {
    setUploadSectionId(secId);
    setUploadSubSectionId(subSecId);
    setUploadOpen(true);
  };

  const handleSubIncomingFiles = (incoming: FileList | null) => {
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
      setSubFilesQueue((prev) => [...prev, ...valid]);
      if (valid.length === 1 && !subFileTitle) {
        const base = valid[0].name.replace(/\.[^/.]+$/, '');
        if (base.toLowerCase() !== 'image') {
          setSubFileTitle(base);
        }
      }
    }
  };

  const handleSubFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSubTarget) return;
    if (subFilesQueue.length === 0) {
      pushToast('يرجى اختيار ملف أو صورة واحدة على الأقل للإرفاق', 'warning');
      return;
    }

    const { section, sub } = resolvedSubTarget;
    const cleanTitle = subFileTitle.trim();
    const bundleId =
      subFilesQueue.length > 1
        ? `bnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        : undefined;

    await uploadFiles(
      subFilesQueue.map((file) => ({
        file,
        title: cleanTitle || file.name.replace(/\.[^/.]+$/, ''),
        description: subFileNote.trim(),
        sectionId: section.id,
        customFieldValues: {
          _subSectionId: sub.id,
          _subSectionLabel: sub.label,
          ...(bundleId ? { _bundleId: bundleId } : {}),
        },
      }))
    );

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

  const renderFileRow = (file: PortfolioFile) => (
    <div
      key={file.id}
      className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
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

  const activeModalFiles = resolvedSubTarget
    ? activeFiles.filter(
        (f) =>
          f.sectionId === resolvedSubTarget.section.id &&
          getFileSubSectionId(f) === resolvedSubTarget.sub.id
      )
    : [];

  const groupedModalEntries = useMemo(() => {
    const groups: { key: string; primary: PortfolioFile; count: number }[] = [];
    const indexByBundle = new Map<string, number>();

    activeModalFiles.forEach((file) => {
      const bId = getFileBundleId(file);
      if (bId) {
        const existingIdx = indexByBundle.get(bId);
        if (existingIdx !== undefined) {
          groups[existingIdx].count += 1;
          return;
        }
        indexByBundle.set(bId, groups.length);
      }
      groups.push({ key: bId || file.id, primary: file, count: 1 });
    });

    return groups;
  }, [activeModalFiles]);

  const activeModalNotes = resolvedSubTarget
    ? subSectionNotes.filter(
        (n) =>
          n.sectionId === resolvedSubTarget.section.id &&
          n.customFieldValues?._subSectionId === resolvedSubTarget.sub.id
      )
    : [];

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

      {/* Sections & Compact Sub-section Icon Grids */}
      <div className="space-y-5">
        {displayedSections.map((sec) => {
          const secFiles = activeFiles.filter((f) => f.sectionId === sec.id);
          const secNotes = subSectionNotes.filter((n) => n.sectionId === sec.id);
          const subSectionIds = new Set(sec.customFields.map((cf) => cf.id));
          const generalFiles = secFiles.filter((f) => {
            const subId = getFileSubSectionId(f);
            return !subId || !subSectionIds.has(subId);
          });

          return (
            <section
              key={sec.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 sm:p-6 space-y-4"
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
                    const subFileCount = secFiles.filter(
                      (f) => getFileSubSectionId(f) === sub.id
                    ).length;
                    const subNoteCount = secNotes.filter(
                      (n) => n.customFieldValues?._subSectionId === sub.id
                    ).length;
                    const totalItems = subFileCount + subNoteCount;
                    const hasContent = totalItems > 0;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => openSubSectionModal(sec, sub)}
                        className={`group relative rounded-xl border p-3.5 flex flex-col items-center justify-center text-center gap-2.5 transition-all hover:shadow-xs ${
                          hasContent
                            ? 'bg-[#A8B9A5]/12 border-[#A8B9A5]/70 hover:border-[#556952]'
                            : 'bg-[#F7F5F0]/55 border-[#D9C9B5]/75 hover:bg-[#F7F5F0] hover:border-[#556952]/60'
                        }`}
                      >
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
                            {totalItems > 0 ? `${totalItems} عنصر` : 'اضغطي للإرفاق والكتابة'}
                          </p>
                        </div>
                      </button>
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
              {generalFiles.length > 0 && (
                <div className="bg-[#F7F5F0]/40 border border-[#D9C9B5]/60 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <h4 className="text-xs font-semibold text-[#666560]">
                      {sec.customFields.length > 0
                        ? `ملفات عامة في القسم الرئيسي (${generalFiles.length})`
                        : `الملفات المرفوعة (${generalFiles.length})`}
                    </h4>
                  </div>
                  <div className="divide-y divide-[#D9C9B5]/40">
                    {generalFiles.map((file) => renderFileRow(file))}
                  </div>
                </div>
              )}
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
            {(groupedModalEntries.length > 0 || activeModalNotes.length > 0) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#454943]">
                    العناصر المحفوظة ({groupedModalEntries.length + activeModalNotes.length})
                  </h4>
                  <span className="text-[11px] text-[#666560]">
                    اضغطي على أي مربع لعرض كل المرفقات والصور والبيانات
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {groupedModalEntries.map(({ key, primary, count }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreviewFile(primary)}
                      className="relative group bg-white border border-[#D9C9B5]/80 hover:border-[#556952] hover:bg-[#F7F5F0]/50 rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-xs"
                    >
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
                  ))}

                  {activeModalNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setPreviewNote(n)}
                      className="group bg-white border border-[#D9C9B5]/80 hover:border-[#556952] hover:bg-[#F7F5F0]/50 rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 transition-all hover:shadow-xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#3F573C] flex items-center justify-center shrink-0">
                        <PenLine size={17} />
                      </div>
                      <p className="text-xs sm:text-[13px] font-semibold text-[#454943] line-clamp-2 leading-snug w-full">
                        {n.title}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                      اسحبي عدة صور أو ملفات هنا، أو اختاري من الأزرار بالأسفل
                    </p>
                    <p className="text-[11px] text-[#666560] mt-1 tabular-nums">
                      يمكنك إضافة أكثر من صورة وأكثر من مرفق معاً · حتى {settings.maxFileSizeMb} م.ب للملف
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

      <UploadFileModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultSectionId={uploadSectionId}
        defaultSubSectionId={uploadSubSectionId}
      />
      <FilePreviewModal
        file={visibleFiles.find((f) => f.id === previewFile?.id) ?? null}
        onClose={() => setPreviewFile(null)}
      />

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
    </div>
  );
};
