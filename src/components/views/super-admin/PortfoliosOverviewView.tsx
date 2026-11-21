import React, { useState } from 'react';
import { FolderKanban, CheckCircle2, Clock } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';

export const PortfoliosOverviewView: React.FC = () => {
  const { users, schools, visibleFiles, sections, getTeacherCompletionPercent, setAdminNav } =
    usePlatform();
  const [schoolFilter, setSchoolFilter] = useState('all');

  const teachers = users
    .filter((u) => u.role === 'teacher')
    .filter((u) => (schoolFilter === 'all' ? true : u.schoolId === schoolFilter));

  const requiredSections = sections.filter((s) => s.isActive && !s.ownerId && s.isRequired);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">
            متابعة ملفات الإنجاز المهني
          </h2>
          <p className="text-xs text-[#666560] mt-0.5">
            تقييم نسبة استيفاء الأقسام الأساسية وعدد الشواهد المرفوعة لكل معلم
          </p>
        </div>

        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="px-3.5 py-2 text-sm bg-[#F7F5F0] border border-[#D9C9B5] rounded-xl text-[#454943]"
        >
          <option value="all">جميع المدارس</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {teachers.map((teacher) => {
          const pct = getTeacherCompletionPercent(teacher.id);
          const teacherFiles = visibleFiles.filter(
            (f) => f.ownerId === teacher.id && !f.isDeleted
          );
          const approvedCount = teacherFiles.filter((f) => f.reviewStatus === 'approved').length;
          const schoolName =
            schools.find((s) => s.id === teacher.schoolId)?.name ?? 'غير مسندة';

          return (
            <div
              key={teacher.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#D8BDB7]/40 text-[#454943] flex items-center justify-center font-semibold">
                    {teacher.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#454943]">{teacher.fullName}</h3>
                    <p className="text-xs text-[#666560]">
                      {teacher.specialty || teacher.jobTitle} · {schoolName}
                    </p>
                  </div>
                </div>
                <span className="font-display text-lg font-bold text-[#556952] tabular-nums">
                  {pct}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#F7F5F0] overflow-hidden">
                <div
                  className="h-full bg-[#A8B9A5] rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#666560] pt-1">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <FolderKanban size={14} className="text-[#556952]" />
                  <span>{teacherFiles.length} ملفاً مرفوعاً</span>
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <CheckCircle2 size={14} className="text-[#466143]" />
                  <span>{approvedCount} ملفاً معتمداً</span>
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock size={14} className="text-[#85847E]" />
                  <span>{requiredSections.length} أقسام إلزامية</span>
                </span>
              </div>

              <div className="pt-3 border-t border-[#D9C9B5]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAdminNav('files')}
                  className="text-xs font-medium text-[#556952] hover:underline"
                >
                  استعراض ملفات الإنجاز في إدارة الملفات
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
