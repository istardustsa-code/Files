import React, { useMemo, useState } from 'react';
import { Search, Eye, Building2, Users } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { Modal } from '../../common/Modal';
import { FileTypeIconBox, ReviewStatusInline } from '../../common/FileTypeIndicator';
import { formatDateArabic } from '../../../utils/formatters';
import type { UserAccount } from '../../../types/platform';

interface ManagerTeachersViewProps {
  mode: 'teachers' | 'schools';
}

export const ManagerTeachersView: React.FC<ManagerTeachersViewProps> = ({ mode }) => {
  const {
    assignedTeachers,
    assignedSchools,
    assignedGroups,
    visibleFiles,
    visibleSections,
    getTeacherCompletionPercent,
  } = usePlatform();

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [inspectTeacher, setInspectTeacher] = useState<UserAccount | null>(null);

  const filteredTeachers = useMemo(() => {
    return assignedTeachers
      .filter((t) => (schoolFilter === 'all' ? true : t.schoolId === schoolFilter))
      .filter((t) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          t.fullName.toLowerCase().includes(q) ||
          (t.specialty ?? '').toLowerCase().includes(q)
        );
      });
  }, [assignedTeachers, schoolFilter, search]);

  if (mode === 'schools') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {assignedSchools.map((sch) => {
          const schGroups = assignedGroups.filter((g) => g.schoolId === sch.id);
          const schTeachers = assignedTeachers.filter((t) => t.schoolId === sch.id);
          return (
            <div
              key={sch.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#454943] flex items-center justify-center shrink-0">
                  <Building2 size={19} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#454943]">{sch.name}</h3>
                  <p className="text-xs text-[#666560]">
                    {sch.stage} · {sch.city} · {schTeachers.length} معلمين مسندين
                  </p>
                </div>
              </div>

              {schGroups.length > 0 && (
                <div className="pt-3 border-t border-[#D9C9B5]/50 space-y-2">
                  <p className="text-xs font-medium text-[#666560]">المجموعات التابعة</p>
                  <div className="space-y-1.5">
                    {schGroups.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7F5F0] text-xs"
                      >
                        <span className="flex items-center gap-2 text-[#454943] font-medium">
                          <Users size={14} className="text-[#556952]" />
                          {g.name}
                        </span>
                        <span className="text-[#666560]">{g.specialty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const inspectFiles = inspectTeacher
    ? visibleFiles.filter((f) => f.ownerId === inspectTeacher.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#85847E] pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المعلم أو التخصص..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl"
          />
        </div>

        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="px-3.5 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl text-[#454943]"
        >
          <option value="all">جميع المدارس المسندة</option>
          {assignedSchools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeachers.map((t) => {
          const pct = getTeacherCompletionPercent(t.id);
          const schoolName = assignedSchools.find((s) => s.id === t.schoolId)?.name ?? '';
          const tFilesCount = visibleFiles.filter((f) => f.ownerId === t.id).length;

          return (
            <div
              key={t.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#A8B9A5]/30 text-[#454943] flex items-center justify-center font-semibold">
                    {t.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#454943]">{t.fullName}</h3>
                    <p className="text-xs text-[#666560]">
                      {t.specialty || t.jobTitle} · {schoolName}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-[#666560]">
                    <span>اكتمال ملف الإنجاز</span>
                    <span className="font-mono-num font-semibold text-[#454943]">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#F7F5F0] overflow-hidden">
                    <div className="h-full bg-[#A8B9A5]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#D9C9B5]/50 flex items-center justify-between text-xs">
                <span className="text-[#666560] tabular-nums">{tFilesCount} ملفات مرفوعة</span>
                <button
                  type="button"
                  onClick={() => setInspectTeacher(t)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-[#F7F5F0] hover:bg-[#D9C9B5]/40 text-[#454943] rounded-lg"
                >
                  <Eye size={14} />
                  <span>عرض ملف الإنجاز</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Teacher Portfolio Modal */}
      <Modal
        isOpen={Boolean(inspectTeacher)}
        onClose={() => setInspectTeacher(null)}
        title={`ملف إنجاز: ${inspectTeacher?.fullName ?? ''}`}
        subtitle={inspectTeacher?.jobTitle}
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4">
          {inspectFiles.length === 0 ? (
            <p className="text-sm text-[#666560]">لم يقم المعلم برفع ملفات حتى الآن.</p>
          ) : (
            <div className="divide-y divide-[#D9C9B5]/50 border border-[#D9C9B5]/70 rounded-xl">
              {inspectFiles.map((f) => {
                const secName = visibleSections.find((s) => s.id === f.sectionId)?.title ?? '';
                return (
                  <div key={f.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileTypeIconBox fileType={f.fileType} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#454943] truncate">{f.title}</p>
                        <p className="text-xs text-[#666560] tabular-nums">
                          {secName} · {formatDateArabic(f.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <ReviewStatusInline status={f.reviewStatus} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
