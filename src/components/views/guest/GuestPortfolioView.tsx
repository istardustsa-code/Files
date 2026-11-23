import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Download,
  Eye,
  FileText,
  Folder,
  FolderCheck,
  LogOut,
  PenLine,
  ShieldCheck,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { LogoMark } from '../../common/LogoMark';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
import { FileTypeIconBox, ReviewStatusInline } from '../../common/FileTypeIndicator';
import type {
  AchievementItem,
  CustomFieldDefinition,
  PortfolioFile,
  PortfolioSection,
} from '../../../types/platform';
import {
  formatBytesArabic,
  formatDateArabic,
  formatDateTimeArabic,
  getFileBundleId,
  getFileSubSectionId,
  getFileTypeLabelArabic,
  getSectionBreadcrumbLabel,
} from '../../../utils/formatters';

export const GuestPortfolioView: React.FC = () => {
  const {
    guestVisitSession,
    exitGuestVisitSession,
    getGuestSignedFileUrl,
    branding,
    isSupabaseLive,
    pushToast,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<'portfolio' | 'achievements'>('portfolio');
  const [activeSubTarget, setActiveSubTarget] = useState<{
    sectionId: string;
    subSectionId: string;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<AchievementItem | null>(null);

  const sections = guestVisitSession?.sections ?? [];
  const files = guestVisitSession?.files ?? [];
  const achievements = guestVisitSession?.achievements ?? [];

  const realAchievements = useMemo(
    () => achievements.filter((a) => a.customFieldValues?._entryKind !== 'note'),
    [achievements]
  );
  const subSectionNotes = useMemo(
    () => achievements.filter((a) => a.customFieldValues?._entryKind === 'note'),
    [achievements]
  );

  const resolvedSubTarget = useMemo(() => {
    if (!activeSubTarget) return null;
    const section = sections.find((s) => s.id === activeSubTarget.sectionId);
    const sub = section?.customFields.find((cf) => cf.id === activeSubTarget.subSectionId);
    if (!section || !sub) return null;
    return { section, sub };
  }, [activeSubTarget, sections]);

  const activeModalFiles = resolvedSubTarget
    ? files.filter(
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

  const bundleFiles = useMemo(() => {
    if (!previewFile) return [];
    const bundleId = getFileBundleId(previewFile);
    if (!bundleId) return [previewFile];
    const siblings = files.filter(
      (f) => !f.isDeleted && f.ownerId === previewFile.ownerId && getFileBundleId(f) === bundleId
    );
    return siblings.length > 0 ? siblings : [previewFile];
  }, [previewFile, files]);

  const activeFile = useMemo(() => {
    if (bundleFiles.length === 0) return previewFile;
    return bundleFiles.find((f) => f.id === activeAttachmentId) ?? bundleFiles[0];
  }, [bundleFiles, activeAttachmentId, previewFile]);

  useEffect(() => {
    if (previewFile) {
      setActiveAttachmentId(previewFile.id);
    } else {
      setActiveAttachmentId(null);
      setSignedUrl(null);
    }
  }, [previewFile?.id]);

  useEffect(() => {
    let active = true;
    if (activeFile) {
      setSignedUrl(activeFile.localPreviewUrl ?? null);
      if (!activeFile.localPreviewUrl && isSupabaseLive) {
        getGuestSignedFileUrl(activeFile).then((url) => {
          if (active && url) setSignedUrl(url);
        });
      }
    } else {
      setSignedUrl(null);
    }
    return () => {
      active = false;
    };
  }, [activeFile?.id, activeFile?.storagePath, isSupabaseLive]);

  if (!guestVisitSession) return null;

  const { teacher, enteredAt } = guestVisitSession;

  const openSubSectionModal = (section: PortfolioSection, sub: CustomFieldDefinition) => {
    setActiveSubTarget({ sectionId: section.id, subSectionId: sub.id });
  };

  const handleDownload = async () => {
    if (!activeFile) return;
    const resolvedUrl = signedUrl || (await getGuestSignedFileUrl(activeFile));
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
    pushToast('تعذر تحميل رابط المرفق في الوقت الحالي', 'warning');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F5F0] text-[#454943] flex flex-col">
      {/* Top Read-Only Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-[#D9C9B5]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LogoMark size="sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-bold text-[#454943] truncate">
                  ملف المعلمة: {teacher.fullName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#A8B9A5]/25 border border-[#A8B9A5]/60 text-[11px] font-semibold text-[#3F573C]">
                  <Eye size={12} />
                  <span>للاطلاع فقط</span>
                </span>
              </div>
              <p className="text-xs text-[#666560] truncate">
                {teacher.jobTitle}
                {teacher.specialty ? ` · ${teacher.specialty}` : ''}
                {teacher.schoolName ? ` · ${teacher.schoolName}` : ''}
                {' · '}
                {branding.platformName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void exitGuestVisitSession()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors whitespace-nowrap"
          >
            <LogOut size={15} />
            <span>إنهاء الزيارة والخروج</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Read-Only Security Notice & Summary */}
        <div className="bg-white border border-[#D9C9B5]/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/20 text-[#3F573C] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-[#454943]">
                وضع الزيارة المؤقتة · قراءة واطلاع فقط (بدون صلاحية تعديل)
              </p>
              <p className="text-xs text-[#666560] leading-relaxed">
                يمكنكِ تصفح جميع الأقسام والصور والشواهد والمرفقات وتنزيلها، ولا يتيح هذا الوضع أي تعديل أو حذف على ملف المعلمة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#666560] tabular-nums">
            <div>
              <span className="block text-[11px] text-[#85847E]">وقت الدخول</span>
              <span className="font-medium text-[#454943]">{formatDateTimeArabic(enteredAt)}</span>
            </div>
            <div className="border-r border-[#D9C9B5]/70 pr-4">
              <span className="block text-[11px] text-[#85847E]">إجمالي المرفقات</span>
              <span className="font-semibold text-[#454943]">{files.length}</span>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-white border border-[#D9C9B5]/70 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'portfolio'
                ? 'bg-[#454943] text-white'
                : 'text-[#666560] hover:text-[#454943]'
            }`}
          >
            أقسام ملف الإنجاز ({sections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'achievements'
                ? 'bg-[#454943] text-white'
                : 'text-[#666560] hover:text-[#454943]'
            }`}
          >
            الإنجازات المهنية ({realAchievements.length})
          </button>
        </div>

        {activeTab === 'achievements' ? (
          realAchievements.length === 0 ? (
            <EmptyState
              icon={Award}
              title="لا توجد إنجازات مهنية مسجلة"
              description="لم تقم المعلمة بإضافة إنجازات مهنية في هذا التبويب بعد."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {realAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs text-[#556952] font-medium">
                    <Award size={15} />
                    <span>نطاق: {ach.level}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatDateArabic(ach.date)}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#454943]">{ach.title}</h3>
                  <p className="text-sm text-[#666560] leading-relaxed">{ach.description}</p>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-5">
            {sections.map((sec) => {
              const secFiles = files.filter((f) => f.sectionId === sec.id);
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
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#D9C9B5]/50">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sec.accentColor }}
                        />
                        <h2 className="text-base font-semibold text-[#454943]">{sec.title}</h2>
                        {sec.customFields.length > 0 && (
                          <span className="text-xs text-[#666560]">
                            · {sec.customFields.length} أقسام فرعية
                          </span>
                        )}
                      </div>
                      {sec.description && (
                        <p className="text-xs text-[#666560]">{sec.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#666560] bg-[#F7F5F0] px-3 py-1 rounded-lg tabular-nums">
                      {secFiles.length + secNotes.length} عنصر
                    </span>
                  </div>

                  {sec.customFields.length > 0 && (
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
                                : 'bg-[#F7F5F0]/55 border-[#D9C9B5]/75 hover:bg-[#F7F5F0]'
                            }`}
                          >
                            {totalItems > 0 && (
                              <span className="absolute top-2 left-2 min-w-[20px] h-5 px-1.5 rounded-md bg-[#556952] text-white text-[11px] font-mono-num font-medium flex items-center justify-center">
                                {totalItems}
                              </span>
                            )}
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
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
                                {totalItems > 0 ? `${totalItems} عنصر · اضغطي للعرض` : 'لا توجد ملفات بعد'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {generalFiles.length > 0 && (
                    <div className="bg-[#F7F5F0]/40 border border-[#D9C9B5]/60 rounded-xl p-3.5 space-y-1">
                      <h3 className="text-xs font-semibold text-[#666560] pb-1">
                        {sec.customFields.length > 0
                          ? `ملفات عامة في القسم الرئيسي (${generalFiles.length})`
                          : `الملفات المرفوعة (${generalFiles.length})`}
                      </h3>
                      <div className="divide-y divide-[#D9C9B5]/40">
                        {generalFiles.map((file) => (
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
                                  {formatBytesArabic(file.sizeBytes)} ·{' '}
                                  {formatDateArabic(file.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="px-3.5 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5]/80 text-[#454943] rounded-lg hover:bg-[#F7F5F0] shrink-0"
                            >
                              عرض واطلاع
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Read-Only Sub-Section Modal */}
      <Modal
        isOpen={Boolean(resolvedSubTarget)}
        onClose={() => setActiveSubTarget(null)}
        title={resolvedSubTarget?.sub.label ?? ''}
        subtitle={resolvedSubTarget ? `${resolvedSubTarget.section.title} · اطلاع فقط` : undefined}
        maxWidthClass="max-w-2xl"
      >
        {resolvedSubTarget && (
          <div className="space-y-4">
            {groupedModalEntries.length === 0 && activeModalNotes.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#666560]">
                لا توجد ملفات أو نصوص مضافة في هذا القسم الفرعي حتى الآن.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#454943]">
                    العناصر المحفوظة ({groupedModalEntries.length + activeModalNotes.length})
                  </h4>
                  <span className="text-[11px] text-[#666560]">
                    اضغطي على أي مربع لعرض جميع الصور والمرفقات والنص
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

            <div className="flex justify-end pt-3 border-t border-[#D9C9B5]/60">
              <button
                type="button"
                onClick={() => setActiveSubTarget(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Read-Only File / Bundle Preview Modal */}
      <Modal
        isOpen={Boolean(previewFile && activeFile)}
        onClose={() => setPreviewFile(null)}
        title={activeFile?.title ?? ''}
        subtitle={
          activeFile
            ? bundleFiles.length > 1
              ? `${bundleFiles.length} مرفقات وصور · المحدد: ${activeFile.originalFileName}`
              : `${activeFile.originalFileName} · ${formatBytesArabic(activeFile.sizeBytes)}`
            : undefined
        }
        maxWidthClass="max-w-3xl"
      >
        {activeFile && (
          <div className="space-y-5">
            {bundleFiles.length > 1 && (
              <div className="p-3.5 rounded-2xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 space-y-2.5">
                <p className="text-xs font-semibold text-[#454943]">
                  المرفقات والصور داخل هذا العنصر ({bundleFiles.length})
                </p>
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
              </div>
            )}

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
                      ? 'تم فتح المرفق بأمان. يمكنكِ تنزيله مباشرة للاطلاع عليه.'
                      : 'معاينة المرفق (وضع القراءة فقط).'}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/60 text-xs">
              <div>
                <span className="text-[#666560] block mb-0.5">القسم والمسار</span>
                <span className="font-medium text-[#454943]">
                  {getSectionBreadcrumbLabel(sections, activeFile)}
                </span>
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
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#D9C9B5]/70 space-y-1.5">
              <p className="text-xs font-semibold text-[#556952] flex items-center gap-1.5">
                <FileText size={13} />
                <span>النص والملاحظات المكتوبة مع الملف</span>
              </p>
              <p className="text-sm text-[#454943] leading-relaxed whitespace-pre-wrap">
                {activeFile.description || 'لا توجد كتابة أو ملاحظات مسجلة مع هذا الملف.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#D9C9B5]/60">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#454943] text-white rounded-lg hover:bg-[#343732]"
              >
                <Download size={14} />
                <span>تنزيل هذا المرفق</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 text-xs font-medium bg-[#F7F5F0] text-[#454943] rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Read-Only Text Note Modal */}
      <Modal
        isOpen={Boolean(previewNote)}
        onClose={() => setPreviewNote(null)}
        title={previewNote?.title ?? ''}
        subtitle={
          previewNote
            ? `${
                sections.find((s) => s.id === previewNote.sectionId)?.title ?? 'قسم عام'
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
            <div className="flex justify-end pt-3 border-t border-[#D9C9B5]/60">
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
