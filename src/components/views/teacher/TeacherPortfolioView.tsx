import React, { useState } from 'react';
import { Plus, Upload, Award, FolderOpen, Trash2, Eye, EyeOff, FolderTree } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import { FileTypeIconBox, ReviewStatusInline } from '../../common/FileTypeIndicator';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
import type { AchievementItem, PortfolioFile } from '../../../types/platform';
import {
  formatBytesArabic,
  formatDateArabic,
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
    addAchievement,
    deleteAchievement,
    toggleManagerViewPermission,
  } = usePlatform();

  const allowManagerView = currentUser.allowManagerView !== false;

  const [uploadSectionId, setUploadSectionId] = useState<string | undefined>(undefined);
  const [uploadSubSectionId, setUploadSubSectionId] = useState<string | undefined>(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);

  const [customSectionModal, setCustomSectionModal] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState('');
  const [newSecDesc, setNewSecDesc] = useState('');

  const [achModal, setAchModal] = useState(false);
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achDate, setAchDate] = useState(new Date().toISOString().slice(0, 10));
  const [achLevel, setAchLevel] = useState<AchievementItem['level']>('مدرسة');

  const activeFiles = visibleFiles.filter((f) => !f.isDeleted);

  const openUploadFor = (secId?: string, subSecId?: string) => {
    setUploadSectionId(secId);
    setUploadSubSectionId(subSecId);
    setUploadOpen(true);
  };

  const renderFileRow = (file: PortfolioFile) => (
    <div
      key={file.id}
      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
      <div className="flex items-center gap-3 shrink-0">
        <ReviewStatusInline status={file.reviewStatus} />
        <button
          type="button"
          onClick={() => setPreviewFile(file)}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5]/70 text-[#454943] rounded-lg hover:bg-[#D9C9B5]/30"
        >
          عرض وإدارة
        </button>
      </div>
    </div>
  );

  const handleCreateCustomSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecTitle.trim()) return;
    createSection({
      title: newSecTitle.trim(),
      description: newSecDesc.trim() || 'قسم شخصي مخصص في ملف الإنجاز',
      iconName: 'FolderPlus',
      accentColor: '#D9C9B5',
      isActive: true,
      isRequired: false,
      isSystemDefault: false,
      ownerId: currentUser.id,
      category: 'أقسام مخصصة',
      customFields: [],
    });
    setNewSecTitle('');
    setNewSecDesc('');
    setCustomSectionModal(false);
  };

  const handleAddAchievement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achTitle.trim()) return;
    addAchievement({
      sectionId: 'sec-2',
      title: achTitle.trim(),
      description: achDesc.trim(),
      date: achDate,
      level: achLevel,
    });
    setAchTitle('');
    setAchDesc('');
    setAchModal(false);
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

        {visibleAchievements.length === 0 ? (
          <EmptyState
            icon={Award}
            title="لم تتم إضافة إنجازات بعد"
            description="وثّقي إنجازاتك التربوية ومشاركاتك المتميزة هنا."
            actionLabel="إضافة أول إنجاز"
            onAction={() => setAchModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleAchievements.map((ach) => (
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
    if (focusMode === 'certificates') return sec.id === 'sec-3';
    if (focusMode === 'evidence') return sec.id === 'sec-4';
    if (focusMode === 'custom_sections') return sec.ownerId === currentUser.id || sec.id === 'sec-11';
    return true;
  });

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
            جميع الملفات المعروضة هنا خاصة بحسابك فقط ولا يطلع عليها أي معلم آخر
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {settings.allowTeacherCustomSections &&
            (focusMode === 'all' || focusMode === 'custom_sections') && (
              <button
                type="button"
                onClick={() => setCustomSectionModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0] rounded-xl whitespace-nowrap"
              >
                <Plus size={15} />
                <span>قسم شخصي جديد</span>
              </button>
            )}
          <button
            type="button"
            onClick={() => openUploadFor(displayedSections[0]?.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl whitespace-nowrap"
          >
            <Upload size={15} />
            <span>رفع ملف</span>
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
          {allowManagerView ? <Eye size={16} className="shrink-0" /> : <EyeOff size={16} className="shrink-0" />}
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

      {/* Sections & their nested sub-sections and files */}
      <div className="space-y-5">
        {displayedSections.map((sec) => {
          const secFiles = activeFiles.filter((f) => f.sectionId === sec.id);
          const subSectionIds = new Set(sec.customFields.map((cf) => cf.id));
          const generalFiles = secFiles.filter((f) => {
            const subId = getFileSubSectionId(f);
            return !subId || !subSectionIds.has(subId);
          });

          return (
            <section
              key={sec.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#D9C9B5]/50">
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
                      <span className="text-xs text-[#666560]">· قسم شخصي</span>
                    )}
                    {sec.customFields.length > 0 && (
                      <span className="text-xs text-[#666560]">
                        · {sec.customFields.length} أقسام فرعية
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#666560]">{sec.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => openUploadFor(sec.id, undefined)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg whitespace-nowrap"
                >
                  <Upload size={14} />
                  <span>إضافة لهذا القسم ({secFiles.length})</span>
                </button>
              </div>

              {sec.customFields.length > 0 ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 gap-3.5">
                    {sec.customFields.map((sub) => {
                      const subFiles = secFiles.filter((f) => getFileSubSectionId(f) === sub.id);
                      return (
                        <div
                          key={sub.id}
                          className="bg-[#F7F5F0]/55 border border-[#D9C9B5]/80 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <FolderTree size={14} className="text-[#556952] shrink-0" />
                                <h4 className="text-sm font-semibold text-[#454943]">
                                  {sub.label}
                                </h4>
                                {sub.required && (
                                  <span className="text-[11px] font-medium text-[#556952]">
                                    · مطلوب
                                  </span>
                                )}
                                <span className="text-xs text-[#666560] tabular-nums">
                                  ({subFiles.length} مرفقات)
                                </span>
                              </div>
                              {sub.placeholder && (
                                <p className="text-xs text-[#666560] pr-5">{sub.placeholder}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => openUploadFor(sec.id, sub.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#D9C9B5]/30 rounded-lg whitespace-nowrap shrink-0"
                            >
                              <Upload size={13} />
                              <span>إضافة ملف / صورة / مرفق</span>
                            </button>
                          </div>

                          {subFiles.length === 0 ? (
                            <div className="pt-2 border-t border-[#D9C9B5]/40 flex flex-wrap items-center justify-between gap-2 text-xs text-[#666560]">
                              <span className="flex items-center gap-2">
                                <FolderOpen size={14} className="text-[#85847E]" />
                                <span>لا توجد ملفات أو صور مرفوعة في هذا القسم الفرعي بعد.</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => openUploadFor(sec.id, sub.id)}
                                className="text-[#556952] font-medium hover:underline"
                              >
                                رفع ملف أو صورة
                              </button>
                            </div>
                          ) : (
                            <div className="divide-y divide-[#D9C9B5]/45 border-t border-[#D9C9B5]/45 pt-1">
                              {subFiles.map((file) => renderFileRow(file))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {generalFiles.length > 0 && (
                    <div className="bg-white border border-[#D9C9B5]/70 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-1">
                        <h4 className="text-xs font-semibold text-[#666560]">
                          ملفات ومرفقات عامة في القسم ({generalFiles.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => openUploadFor(sec.id, undefined)}
                          className="text-xs text-[#556952] font-medium hover:underline"
                        >
                          إضافة ملف عام
                        </button>
                      </div>
                      <div className="divide-y divide-[#D9C9B5]/40">
                        {generalFiles.map((file) => renderFileRow(file))}
                      </div>
                    </div>
                  )}
                </div>
              ) : secFiles.length === 0 ? (
                <div className="py-4 flex items-center justify-between text-xs text-[#666560]">
                  <span className="flex items-center gap-2">
                    <FolderOpen size={15} className="text-[#85847E]" />
                    <span>لا توجد ملفات مرفوعة في هذا القسم حتى الآن.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openUploadFor(sec.id, undefined)}
                    className="text-[#556952] font-medium hover:underline"
                  >
                    رفع أول ملف
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#D9C9B5]/40">
                  {secFiles.map((file) => renderFileRow(file))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Add Personal Custom Section Modal */}
      <Modal
        isOpen={customSectionModal}
        onClose={() => setCustomSectionModal(false)}
        title="إنشاء قسم شخصي جديد"
        subtitle="أضف قسماً إضافياً لتنظيم ملفاتك الخاصة"
      >
        <form onSubmit={handleCreateCustomSection} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">اسم القسم</label>
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
            <label className="block text-xs font-medium text-[#454943] mb-1">الوصف</label>
            <textarea
              rows={2}
              value={newSecDesc}
              onChange={(e) => setNewSecDesc(e.target.value)}
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
    </div>
  );
};
