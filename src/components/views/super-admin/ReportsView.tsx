import React from 'react';
import { Download } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { exportCsvArabic, getReviewStatusLabelArabic } from '../../../utils/formatters';

export const ReportsView: React.FC = () => {
  const {
    currentRole,
    schools,
    users,
    assignedTeachers,
    assignedSchools,
    visibleFiles,
    visibleSections,
    getTeacherCompletionPercent,
    pushToast,
  } = usePlatform();

  const scopeTeachers =
    currentRole === 'manager'
      ? assignedTeachers
      : users.filter((u) => u.role === 'teacher');
  const scopeSchools = currentRole === 'manager' ? assignedSchools : schools;
  const activeFiles = visibleFiles.filter((f) => !f.isDeleted);

  const handleExportReport = () => {
    const headers = ['اسم المعلم', 'المدرسة', 'عدد الملفات', 'الملفات المعتمدة', 'نسبة الاكتمال %'];
    const rows = scopeTeachers.map((t) => {
      const sName = schools.find((s) => s.id === t.schoolId)?.name ?? 'غير محدد';
      const tFiles = activeFiles.filter((f) => f.ownerId === t.id);
      const approved = tFiles.filter((f) => f.reviewStatus === 'approved').length;
      return [t.fullName, sName, tFiles.length, approved, getTeacherCompletionPercent(t.id)];
    });
    exportCsvArabic('تقرير_انجاز_ملفاتي.csv', headers, rows);
    pushToast('تم تصدير تقرير الإنجاز بصيغة CSV');
  };

  const reviewBreakdown = (['approved', 'pending', 'needs_revision'] as const).map((status) => ({
    status,
    label: getReviewStatusLabelArabic(status),
    count: activeFiles.filter((f) => f.reviewStatus === status).length,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">التقارير والإحصائيات</h2>
          <p className="text-xs text-[#666560] mt-0.5">
            تحليل مؤشرات الإنجاز، توزيع الملفات على الأقسام، وحالات الاعتماد
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors whitespace-nowrap"
        >
          <Download size={16} />
          <span>تصدير التقرير (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion by School */}
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#454943]">متوسط الإنجاز حسب المدرسة</h3>
          <div className="space-y-4">
            {scopeSchools.map((sch) => {
              const schTeachers = scopeTeachers.filter((t) => t.schoolId === sch.id);
              const avg =
                schTeachers.length > 0
                  ? Math.round(
                      schTeachers.reduce((a, t) => a + getTeacherCompletionPercent(t.id), 0) /
                        schTeachers.length
                    )
                  : 0;
              return (
                <div key={sch.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#454943]">{sch.name}</span>
                    <span className="font-mono-num text-xs text-[#666560] tabular-nums">
                      {schTeachers.length} معلمين · {avg}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#F7F5F0] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#A8B9A5]"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review Status Breakdown */}
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#454943]">توزيع حالات المراجعة والاعتماد</h3>
          <div className="grid grid-cols-3 gap-3">
            {reviewBreakdown.map((item) => (
              <div
                key={item.status}
                className="p-4 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/60 text-center"
              >
                <p className="font-display text-2xl font-bold text-[#454943] tabular-nums">
                  {item.count}
                </p>
                <p className="text-xs text-[#666560] mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#D9C9B5]/50 space-y-2">
            <h4 className="text-xs font-semibold text-[#666560]">أكثر الأقسام تفاعلاً</h4>
            {visibleSections
              .map((sec) => ({
                sec,
                count: activeFiles.filter((f) => f.sectionId === sec.id).length,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 4)
              .map(({ sec, count }) => (
                <div
                  key={sec.id}
                  className="flex items-center justify-between text-xs py-1.5"
                >
                  <span className="text-[#454943]">{sec.title}</span>
                  <span className="font-mono-num font-semibold text-[#556952] tabular-nums">
                    {count} ملفات
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
