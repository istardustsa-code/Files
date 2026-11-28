import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  UploadCloud,
  FolderKanban,
  Award,
  GraduationCap,
  FileCheck2,
  Bell,
  ArrowUpLeft,
  Lock,
  Ticket,
  ImagePlus,
  FilePlus2,
  FolderOpen,
  Zap,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import {
  FileTypeIconBox,
  ReviewStatusInline,
} from '../../common/FileTypeIndicator';
import { VisitCodeModal, isVisitLogActiveNow } from './VisitCodeModal';
import type { PortfolioFile } from '../../../types/platform';
import {
  detectFileCategory,
  formatBytesArabic,
  formatDateArabic,
  getSectionBreadcrumbLabel,
} from '../../../utils/formatters';

export const TeacherOverview: React.FC = () => {
  const {
    currentUser,
    branding,
    schools,
    visibleFiles,
    visibleSections,
    visibleAchievements,
    visibleNotifications,
    settings,
    getTeacherCompletionPercent,
    setTeacherNav,
    openTeacherSection,
    uploadFiles,
    uploadProgress,
    myVisitCode,
    myVisitLogs,
    pushToast,
  } = usePlatform();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);

  const activeSections = useMemo(
    () => visibleSections.filter((s) => s.isActive),
    [visibleSections]
  );
  const [quickSecId, setQuickSecId] = useState<string>('');
  const [quickSubId, setQuickSubId] = useState<string>('');
  const [quickDragging, setQuickDragging] = useState(false);
  const quickAllInputRef = useRef<HTMLInputElement>(null);
  const quickImgInputRef = useRef<HTMLInputElement>(null);
  const quickDocInputRef = useRef<HTMLInputElement>(null);

  const resolvedQuickSec = useMemo(
    () => activeSections.find((s) => s.id === quickSecId) ?? activeSections[0],
    [activeSections, quickSecId]
  );
  const quickSubs = resolvedQuickSec?.customFields ?? [];
  const resolvedQuickSub = useMemo(
    () => quickSubs.find((cf) => cf.id === quickSubId),
    [quickSubs, quickSubId]
  );

  const liveVisitCount = myVisitLogs.filter((l) =>
    isVisitLogActiveNow(l.lastSeenAt, l.isLive)
  ).length;

  const activeFiles = useMemo(
    () => visibleFiles.filter((f) => !f.isDeleted),
    [visibleFiles]
  );
  const fileCountBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of activeFiles) {
      map.set(f.sectionId, (map.get(f.sectionId) ?? 0) + 1);
    }
    return map;
  }, [activeFiles]);
  const completionPct = getTeacherCompletionPercent(currentUser.id);
  const schoolName = useMemo(
    () => schools.find((s) => s.id === currentUser.schoolId)?.name ?? 'مدرستي',
    [schools, currentUser.schoolId]
  );
  const certsCount = fileCountBySection.get('sec-3') ?? 0;
  const evidenceCount = fileCountBySection.get('sec-4') ?? 0;
  const achievementsCount = useMemo(
    () => visibleAchievements.filter((a) => a.customFieldValues?._entryKind !== 'note').length,
    [visibleAchievements]
  );
  const unreadNotifs = useMemo(
    () => visibleNotifications.filter((n) => !n.isRead),
    [visibleNotifications]
  );

  const handleQuickInstantUpload = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0 || !resolvedQuickSec) return;
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

    if (valid.length === 0) return;

    const bundleId =
      valid.length > 1
        ? `bnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        : undefined;

    const customFieldValues: Record<string, string> = {};
    if (resolvedQuickSub) {
      customFieldValues._subSectionId = resolvedQuickSub.id;
      customFieldValues._subSectionLabel = resolvedQuickSub.label;
    }
    if (bundleId) {
      customFieldValues._bundleId = bundleId;
    }

    void uploadFiles(
      valid.map((file) => ({
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        sectionId: resolvedQuickSec.id,
        customFieldValues,
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcoming Hero + Direct 1-Click Actions */}
      <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[#556952] font-medium">
            <Lock size={14} />
            <span>مساحة خاصة ومؤمنة لحسابك فقط · {schoolName}</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#454943]">
            أهلاً بكِ، أ. {currentUser.fullName}
          </h2>
          <p className="text-sm text-[#666560] leading-relaxed">
            {branding.tagline}. يمكنكِ من هنا الوصول لأقسامكِ ورفع ملفاتكِ وصوركِ بنقرة واحدة مباشرة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setTeacherNav('my_portfolio')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#556952] hover:bg-[#455742] text-white rounded-xl transition-colors whitespace-nowrap"
          >
            <FolderKanban size={16} />
            <span>فتح ملف الإنجاز</span>
          </button>
          <button
            type="button"
            onClick={() => setVisitModalOpen(true)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap ${
              myVisitCode?.isActive
                ? 'bg-[#A8B9A5]/20 border-[#556952]/60 text-[#3F573C] hover:bg-[#A8B9A5]/30'
                : 'bg-[#F7F5F0] hover:bg-[#D9C9B5]/40 text-[#454943] border-[#D9C9B5]/80'
            }`}
          >
            <Ticket size={16} className="text-[#556952]" />
            <span>كود الزيارة المؤقتة</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                liveVisitCount > 0
                  ? 'bg-[#3F573C] text-white'
                  : myVisitCode?.isActive
                    ? 'bg-[#556952] text-white'
                    : 'bg-white text-[#666560]'
              }`}
            >
              {liveVisitCount > 0
                ? 'متواجدة الآن'
                : myVisitCode?.isActive
                  ? 'مفعل'
                  : 'متوقف'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#454943] hover:bg-[#353833] text-white rounded-xl transition-colors whitespace-nowrap"
          >
            <Upload size={16} />
            <span>رفع ملف بملاحظات</span>
          </button>
        </div>
      </section>

      {/* Instant 1-Click Reception Dropzone */}
      {settings.dashboardWidgets.showQuickUpload !== false && resolvedQuickSec && (
        <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#A8B9A5]/25 text-[#3F573C] flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[#454943]">
                  إضافة سريعة وفورية للملفات والصور
                </h3>
                <p className="text-xs text-[#666560]">
                  اختاري القسم ثم اسحبي الملفات أو اضغطي لاختيارها — تُحفظ فوراً دون أي خطوات إضافية
                </p>
              </div>
            </div>

            {uploadProgress?.active && (
              <div className="px-3 py-1.5 rounded-xl bg-[#A8B9A5]/25 border border-[#556952]/40 text-xs font-semibold text-[#3F573C] tabular-nums">
                جاري الرفع: {uploadProgress.completed} / {uploadProgress.total}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={resolvedQuickSec.id}
              onChange={(e) => {
                setQuickSecId(e.target.value);
                setQuickSubId('');
              }}
              aria-label="القسم الأساسي للإضافة الفورية"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F7F5F0]/60 border border-[#D9C9B5]/80 rounded-xl text-[#454943]"
            >
              {activeSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  القسم: {sec.title}
                </option>
              ))}
            </select>

            {quickSubs.length > 0 && (
              <select
                value={quickSubId}
                onChange={(e) => setQuickSubId(e.target.value)}
                aria-label="القسم الفرعي للإضافة الفورية"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F7F5F0]/60 border border-[#D9C9B5]/80 rounded-xl text-[#454943]"
              >
                <option value="">عام داخل {resolvedQuickSec.title}</option>
                {quickSubs.map((cf) => (
                  <option key={cf.id} value={cf.id}>
                    فرعي: {cf.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setQuickDragging(true);
            }}
            onDragLeave={() => setQuickDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setQuickDragging(false);
              handleQuickInstantUpload(e.dataTransfer.files);
            }}
            onClick={() => quickAllInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
              quickDragging
                ? 'border-[#556952] bg-[#A8B9A5]/20'
                : 'border-[#D9C9B5] bg-[#F7F5F0]/55 hover:bg-[#F7F5F0]'
            }`}
          >
            <input
              ref={quickAllInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                handleQuickInstantUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={quickImgInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleQuickInstantUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={quickDocInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                handleQuickInstantUpload(e.target.files);
                e.target.value = '';
              }}
            />

            <div className="flex items-center gap-3 text-center sm:text-right">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#D9C9B5]/80 flex items-center justify-center text-[#556952] shrink-0 hidden sm:flex">
                <UploadCloud size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#454943]">
                  اسحبي الصور أو المستندات هنا للرفع المباشر إلى «
                  {resolvedQuickSub ? resolvedQuickSub.label : resolvedQuickSec.title}»
                </p>
                <p className="text-xs text-[#666560] mt-0.5 tabular-nums">
                  رفع فوري متوازي وسريع للملفات والصور · حتى {settings.maxFileSizeMb} م.ب
                </p>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => quickImgInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:border-[#556952] rounded-xl whitespace-nowrap"
              >
                <ImagePlus size={14} className="text-[#556952]" />
                <span>إضافة صور فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => quickDocInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl whitespace-nowrap"
              >
                <FilePlus2 size={14} />
                <span>إضافة ملفات فوراً</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Quick-Jump Section Cards (1 click straight to section) */}
      {activeSections.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-semibold text-[#454943]">
              الوصول السريع للأقسام
            </h3>
            <button
              type="button"
              onClick={() => setTeacherNav('my_portfolio')}
              className="text-xs font-medium text-[#556952] hover:underline"
            >
              عرض جميع الأقسام ({activeSections.length})
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeSections.slice(0, 10).map((sec) => {
              const count = fileCountBySection.get(sec.id) ?? 0;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => openTeacherSection(sec.id)}
                  className="bg-white border border-[#D9C9B5]/70 hover:border-[#556952] hover:bg-[#F7F5F0]/50 rounded-xl p-3.5 text-right transition-colors flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#F7F5F0] border border-[#D9C9B5]/60 text-[#556952] flex items-center justify-center shrink-0">
                      <FolderOpen size={16} />
                    </span>
                    <span className="text-xs font-mono-num font-semibold text-[#556952] tabular-nums">
                      {count} ملف
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-semibold text-[#454943] line-clamp-2 leading-snug">
                    {sec.title}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setTeacherNav('my_portfolio')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#454943] flex items-center justify-center">
              <FolderKanban size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">اكتمال ملف الإنجاز</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums mt-0.5">
              {completionPct}%
            </p>
            <div className="w-full h-1.5 rounded-full bg-[#F7F5F0] mt-2 overflow-hidden">
              <div className="h-full bg-[#A8B9A5]" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTeacherNav('my_achievements')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D8BDB7]/35 text-[#454943] flex items-center justify-center">
              <Award size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">إنجازاتي الموثقة</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums mt-0.5">
              {achievementsCount}
            </p>
            <p className="text-xs text-[#666560] mt-1">مبادرات وخطابات شكر</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTeacherNav('my_certificates')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D9C9B5]/40 text-[#454943] flex items-center justify-center">
              <GraduationCap size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">شهاداتي ودوراتي</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums mt-0.5">
              {certsCount}
            </p>
            <p className="text-xs text-[#666560] mt-1">برامج تطوير مهني</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTeacherNav('my_files')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] text-[#454943] flex items-center justify-center">
              <FileCheck2 size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">الشواهد والملفات</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums mt-0.5">
              {activeFiles.length}
            </p>
            <p className="text-xs text-[#666560] mt-1 tabular-nums">
              {evidenceCount} منها شواهد تعليمية
            </p>
          </div>
        </button>
      </section>

      {/* Recent Uploads + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#454943]">أحدث ملفاتي المرفوعة</h3>
            <button
              type="button"
              onClick={() => setTeacherNav('my_files')}
              className="text-xs font-medium text-[#556952] hover:underline"
            >
              إدارة جميع ملفاتي
            </button>
          </div>

          <div className="divide-y divide-[#D9C9B5]/40">
            {activeFiles.slice(0, 5).map((file) => {
              const secTitle = getSectionBreadcrumbLabel(visibleSections, file);
              return (
                <div
                  key={file.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileTypeIconBox fileType={file.fileType} size="sm" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="text-sm font-medium text-[#454943] hover:text-[#556952] truncate block text-right"
                      >
                        {file.title}
                      </button>
                      <p className="text-xs text-[#666560] tabular-nums">
                        {secTitle} · {formatBytesArabic(file.sizeBytes)} ·{' '}
                        {formatDateArabic(file.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <ReviewStatusInline status={file.reviewStatus} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#454943]">التنبيهات والمراجعات</h3>
            <button
              type="button"
              onClick={() => setTeacherNav('notifications')}
              className="text-xs font-medium text-[#556952] hover:underline"
            >
              الكل ({unreadNotifs.length})
            </button>
          </div>

          <div className="space-y-3">
            {visibleNotifications.slice(0, 3).map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-xl border border-[#D9C9B5]/60 space-y-1 ${
                  !notif.isRead ? 'bg-[#A8B9A5]/15' : 'bg-[#F7F5F0]/50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#454943]">
                  <Bell size={13} className="text-[#556952] shrink-0" />
                  <span className="truncate">{notif.title}</span>
                </div>
                <p className="text-xs text-[#666560] line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {uploadOpen && (
        <UploadFileModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}
      {previewFile && (
        <FilePreviewModal
          file={visibleFiles.find((f) => f.id === previewFile.id) ?? null}
          onClose={() => setPreviewFile(null)}
        />
      )}
      {visitModalOpen && (
        <VisitCodeModal isOpen={visitModalOpen} onClose={() => setVisitModalOpen(false)} />
      )}
    </div>
  );
};

