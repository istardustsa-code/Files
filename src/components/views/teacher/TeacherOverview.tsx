import React, { useState } from 'react';
import {
  Upload,
  FolderKanban,
  Award,
  GraduationCap,
  FileCheck2,
  Bell,
  ArrowUpLeft,
  Lock,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { UploadFileModal } from '../../common/UploadFileModal';
import { FilePreviewModal } from '../../common/FilePreviewModal';
import { FileTypeIconBox, ReviewStatusInline } from '../../common/FileTypeIndicator';
import type { PortfolioFile } from '../../../types/platform';
import { formatBytesArabic, formatDateArabic } from '../../../utils/formatters';

export const TeacherOverview: React.FC = () => {
  const {
    currentUser,
    branding,
    schools,
    visibleFiles,
    visibleSections,
    visibleAchievements,
    visibleNotifications,
    getTeacherCompletionPercent,
    setTeacherNav,
  } = usePlatform();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PortfolioFile | null>(null);

  const activeFiles = visibleFiles.filter((f) => !f.isDeleted);
  const completionPct = getTeacherCompletionPercent(currentUser.id);
  const schoolName = schools.find((s) => s.id === currentUser.schoolId)?.name ?? 'مدرستي';
  const certsCount = activeFiles.filter((f) => f.sectionId === 'sec-3').length;
  const evidenceCount = activeFiles.filter((f) => f.sectionId === 'sec-4').length;
  const unreadNotifs = visibleNotifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-6">
      {/* Welcoming Hero + Personal Profile Snapshot */}
      <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[#556952] font-medium">
            <Lock size={14} />
            <span>مساحة خاصة ومؤمنة لحسابك فقط · {schoolName}</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#454943]">
            أهلاً بكِ، أ. {currentUser.fullName}
          </h2>
          <p className="text-sm text-[#666560] leading-relaxed">
            {branding.tagline}. تابعي استكمال شواهدكِ المهنية، ارفعي شهاداتكِ وخططكِ، واطلعي على ملاحظات الاعتماد بكل يسر.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setTeacherNav('profile')}
            className="px-4 py-2.5 text-sm font-medium bg-[#F7F5F0] hover:bg-[#D9C9B5]/40 text-[#454943] border border-[#D9C9B5]/80 rounded-xl transition-colors whitespace-nowrap"
          >
            الملف الشخصي
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#454943] hover:bg-[#353833] text-white rounded-xl transition-colors whitespace-nowrap"
          >
            <Upload size={16} />
            <span>رفع ملف جديد</span>
          </button>
        </div>
      </section>

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
              {visibleAchievements.length}
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
          onClick={() => setTeacherNav('my_evidence')}
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
              const secTitle =
                visibleSections.find((s) => s.id === file.sectionId)?.title ?? 'قسم عام';
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

      <UploadFileModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <FilePreviewModal
        file={visibleFiles.find((f) => f.id === previewFile?.id) ?? null}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};
