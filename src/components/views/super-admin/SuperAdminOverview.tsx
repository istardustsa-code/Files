import React from 'react';
import {
  GraduationCap,
  Briefcase,
  Building2,
  Files,
  Award,
  HardDrive,
  ArrowUpLeft,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { formatBytesArabic, formatDateTimeArabic, getRoleLabelArabic } from '../../../utils/formatters';

export const SuperAdminOverview: React.FC = () => {
  const {
    currentUser,
    branding,
    users,
    schools,
    visibleFiles,
    visibleAchievements,
    activityLogs,
    settings,
    getTeacherCompletionPercent,
    setAdminNav,
  } = usePlatform();

  const teachers = users.filter((u) => u.role === 'teacher');
  const managers = users.filter((u) => u.role === 'manager');
  const activeFiles = visibleFiles.filter((f) => !f.isDeleted);
  const totalBytes = activeFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  const avgCompletion =
    teachers.length > 0
      ? Math.round(
          teachers.reduce((acc, t) => acc + getTeacherCompletionPercent(t.id), 0) / teachers.length
        )
      : 0;

  // Breakdown by file type for storage overview
  const storageByType = [
    { label: 'مستندات PDF', type: 'pdf', color: '#D8BDB7' },
    { label: 'عروض PowerPoint', type: 'powerpoint', color: '#D9C9B5' },
    { label: 'صور وتوثيق', type: 'image', color: '#A8B9A5' },
    { label: 'مستندات Word و Excel', type: 'office', color: '#85847E' },
  ].map((bucket) => {
    const matching = activeFiles.filter((f) =>
      bucket.type === 'office'
        ? f.fileType === 'word' || f.fileType === 'excel'
        : f.fileType === bucket.type
    );
    const bytes = matching.reduce((s, f) => s + f.sizeBytes, 0);
    return { ...bucket, count: matching.length, bytes };
  });

  const kpis = [
    {
      label: 'إجمالي المعلمين',
      value: teachers.length,
      sub: `${teachers.filter((t) => t.isActive).length} حساباً نشطاً`,
      icon: GraduationCap,
      nav: 'teachers' as const,
      tint: 'bg-[#A8B9A5]/25 text-[#454943]',
    },
    {
      label: 'مديرو العمل',
      value: managers.length,
      sub: 'إشراف ومتابعة ميدانية',
      icon: Briefcase,
      nav: 'managers' as const,
      tint: 'bg-[#D9C9B5]/40 text-[#454943]',
    },
    {
      label: 'المدارس والمراكز',
      value: schools.length,
      sub: 'مؤسسات تعليمية مسجلة',
      icon: Building2,
      nav: 'schools' as const,
      tint: 'bg-[#D8BDB7]/35 text-[#454943]',
    },
    {
      label: 'الملفات المرفوعة',
      value: activeFiles.length,
      sub: formatBytesArabic(totalBytes),
      icon: Files,
      nav: 'files' as const,
      tint: 'bg-[#F7F5F0] text-[#454943]',
    },
    {
      label: 'الإنجازات الموثقة',
      value: visibleAchievements.length,
      sub: 'إنجازات مهنية معتمدة',
      icon: Award,
      nav: 'portfolios' as const,
      tint: 'bg-[#A8B9A5]/20 text-[#454943]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-[#556952]">
            لوحة تحكم {branding.platformName} · {branding.secondaryName}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#454943]">
            مرحباً بكِ، أ. {currentUser.fullName}
          </h2>
          <p className="text-sm text-[#666560] leading-relaxed">
            {branding.tagline}. يمكنكِ من هنا متابعة إنجاز المعلمين، تخصيص أقسام ملف الإنجاز، إدارة الصلاحيات، ومراقبة التوثيق المهني عبر جميع المدارس.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setAdminNav('sections')}
            className="px-4 py-2.5 text-sm font-medium bg-[#F7F5F0] hover:bg-[#D9C9B5]/40 text-[#454943] border border-[#D9C9B5]/80 rounded-xl transition-colors whitespace-nowrap"
          >
            بناء وتخصيص الأقسام
          </button>
          <button
            type="button"
            onClick={() => setAdminNav('users')}
            className="px-4 py-2.5 text-sm font-medium bg-[#454943] hover:bg-[#353833] text-white rounded-xl transition-colors whitespace-nowrap"
          >
            إدارة المستخدمين
          </button>
        </div>
      </section>

      {/* 5 KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setAdminNav(item.nav)}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.tint}`}>
                  <Icon size={19} strokeWidth={1.8} />
                </div>
                <ArrowUpLeft size={16} className="text-[#85847E]" />
              </div>
              <div>
                <p className="text-xs text-[#666560] mb-1">{item.label}</p>
                <p className="font-display text-2xl font-bold text-[#454943] tabular-nums">
                  {item.value}
                </p>
                <p className="text-xs text-[#666560] mt-1 tabular-nums">{item.sub}</p>
              </div>
            </button>
          );
        })}
      </section>

      {/* Portfolio Completion + Storage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.dashboardWidgets.showCompletionOverview && (
          <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#454943]">
                  نظرة عامة على اكتمال ملفات الإنجاز
                </h3>
                <p className="text-xs text-[#666560] mt-0.5">
                  نسبة استيفاء الأقسام المطلوبة لكل معلم
                </p>
              </div>
              <span className="font-display text-xl font-bold text-[#556952] tabular-nums">
                {avgCompletion}%
              </span>
            </div>

            <div className="space-y-4">
              {teachers.map((teacher) => {
                const pct = getTeacherCompletionPercent(teacher.id);
                const schoolName =
                  schools.find((s) => s.id === teacher.schoolId)?.name ?? 'غير محدد';
                return (
                  <div key={teacher.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-[#454943]">{teacher.fullName}</span>
                        <span className="text-xs text-[#666560] mr-2">· {schoolName}</span>
                      </div>
                      <span className="font-mono-num text-xs font-semibold text-[#454943] tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F7F5F0] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#A8B9A5] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {settings.dashboardWidgets.showStorageOverview && (
          <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#454943]">
                  نظرة عامة على التخزين والملفات
                </h3>
                <p className="text-xs text-[#666560] mt-0.5">
                  توزيع المساحة المستخدمة حسب نوع المستندات
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#666560] font-mono-num tabular-nums">
                <HardDrive size={16} className="text-[#556952]" />
                <span>{formatBytesArabic(totalBytes)}</span>
              </div>
            </div>

            <div className="space-y-3.5">
              {storageByType.map((item) => {
                const ratio = totalBytes > 0 ? Math.round((item.bytes / totalBytes) * 100) : 0;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 py-2 border-b border-[#D9C9B5]/40 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#454943]">{item.label}</p>
                        <p className="text-xs text-[#666560] tabular-nums">{item.count} ملفات</p>
                      </div>
                    </div>
                    <div className="text-left tabular-nums shrink-0">
                      <p className="font-mono-num text-xs font-semibold text-[#454943]">
                        {formatBytesArabic(item.bytes)}
                      </p>
                      <p className="text-[11px] text-[#666560]">{ratio}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Recent Activities */}
      {settings.dashboardWidgets.showRecentActivities && (
        <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#454943]">أحدث النشاطات في المنصة</h3>
            <button
              type="button"
              onClick={() => setAdminNav('activity_log')}
              className="text-xs font-medium text-[#556952] hover:underline"
            >
              عرض السجل الكامل
            </button>
          </div>

          <div className="divide-y divide-[#D9C9B5]/40">
            {activityLogs.slice(0, 5).map((act) => (
              <div
                key={act.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm text-[#454943]">
                    <span className="font-semibold">{act.actorName}</span>{' '}
                    <span className="text-[#666560]">({getRoleLabelArabic(act.actorRole)})</span>{' '}
                    — {act.description}
                  </p>
                  {act.targetName && (
                    <p className="text-xs text-[#556952] font-medium">{act.targetName}</p>
                  )}
                </div>
                <span className="text-xs text-[#666560] tabular-nums shrink-0">
                  {formatDateTimeArabic(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
