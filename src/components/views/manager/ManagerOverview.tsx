import React from 'react';
import {
  GraduationCap,
  Building2,
  ClipboardCheck,
  TrendingUp,
  ArrowUpLeft,
} from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { formatDateTimeArabic } from '../../../utils/formatters';

export const ManagerOverview: React.FC = () => {
  const {
    currentUser,
    assignedTeachers,
    assignedSchools,
    assignedGroups,
    visibleFiles,
    activityLogs,
    getTeacherCompletionPercent,
    setManagerNav,
  } = usePlatform();

  const pendingReviews = visibleFiles.filter((f) => f.reviewStatus === 'pending');
  const viewableTeachers = assignedTeachers.filter((t) => t.allowManagerView !== false);
  const avgCompletion =
    viewableTeachers.length > 0
      ? Math.round(
          viewableTeachers.reduce((acc, t) => acc + getTeacherCompletionPercent(t.id), 0) /
            viewableTeachers.length
        )
      : 0;

  const viewableTeacherIds = new Set(viewableTeachers.map((t) => t.id));
  const recentTeacherActivities = activityLogs
    .filter((a) => viewableTeacherIds.has(a.actorId))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Manager Welcome */}
      <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium text-[#556952]">لوحة مدير العمل · نطاق الإشراف المعتمد</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#454943]">
            أهلاً بكِ، أ. {currentUser.fullName}
          </h2>
          <p className="text-sm text-[#666560] leading-relaxed">
            تابعي تقدم المعلمين التابعين لكِ عبر المدارس والمجموعات المسندة، وراجعي الشواهد والملفات المرفوعة للاعتماد المهني.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setManagerNav('review_portfolios')}
          className="px-5 py-2.5 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors whitespace-nowrap shrink-0"
        >
          أدوات المراجعة ({pendingReviews.length} بانتظار المراجعة)
        </button>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setManagerNav('assigned_teachers')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#454943] flex items-center justify-center">
              <GraduationCap size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">المعلمون المسندون</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums">
              {assignedTeachers.length}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setManagerNav('assigned_schools')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D9C9B5]/40 text-[#454943] flex items-center justify-center">
              <Building2 size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">المدارس والمجموعات</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums">
              {assignedSchools.length} · {assignedGroups.length}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setManagerNav('review_portfolios')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#D8BDB7]/35 text-[#454943] flex items-center justify-center">
              <ClipboardCheck size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">ملفات بانتظار المراجعة</p>
            <p className="font-display text-2xl font-bold text-[#454943] tabular-nums">
              {pendingReviews.length}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setManagerNav('reports')}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 text-right hover:border-[#A8B9A5] transition-colors space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] text-[#454943] flex items-center justify-center">
              <TrendingUp size={19} />
            </div>
            <ArrowUpLeft size={16} className="text-[#85847E]" />
          </div>
          <div>
            <p className="text-xs text-[#666560]">متوسط اكتمال النطاق</p>
            <p className="font-display text-2xl font-bold text-[#556952] tabular-nums">
              {avgCompletion}%
            </p>
          </div>
        </button>
      </section>

      {/* Completion overview + Recent Teacher Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#454943]">إحصائيات إنجاز المعلمين</h3>
          <div className="space-y-4">
            {assignedTeachers.map((t) => {
              const canView = t.allowManagerView !== false;
              const pct = canView ? getTeacherCompletionPercent(t.id) : 0;
              const sch = assignedSchools.find((s) => s.id === t.schoolId)?.name ?? '';
              return (
                <div key={t.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-[#454943]">{t.fullName}</span>
                      <span className="text-xs text-[#666560] mr-2">· {sch}</span>
                    </div>
                    <span className="font-mono-num text-xs font-semibold tabular-nums text-[#666560]">
                      {canView ? `${pct}%` : 'ملف خاص'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#F7F5F0] overflow-hidden">
                    <div
                      className={canView ? 'h-full bg-[#A8B9A5]' : 'h-full bg-[#D9C9B5]/40'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#454943]">أحدث نشاطات المعلمين المسندين</h3>
          {recentTeacherActivities.length === 0 ? (
            <p className="text-sm text-[#666560]">لا توجد نشاطات حديثة ضمن نطاق إشرافك.</p>
          ) : (
            <div className="divide-y divide-[#D9C9B5]/40">
              {recentTeacherActivities.map((act) => (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#454943]">
                      <span className="font-semibold">{act.actorName}</span> — {act.description}
                    </p>
                    {act.targetName && (
                      <p className="text-xs text-[#556952]">{act.targetName}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#666560] tabular-nums shrink-0">
                    {formatDateTimeArabic(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
