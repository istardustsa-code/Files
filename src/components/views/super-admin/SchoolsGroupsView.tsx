import React, { useState } from 'react';
import { Building2, Plus, Trash2, Users } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { Modal } from '../../common/Modal';

export const SchoolsGroupsView: React.FC = () => {
  const {
    schools,
    groups,
    users,
    createSchool,
    deleteSchool,
    createGroup,
    deleteGroup,
  } = usePlatform();

  const [schoolModal, setSchoolModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);

  const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');
  const [sStage, setSStage] = useState('المرحلة الابتدائية');
  const [sCity, setSCity] = useState('الرياض');
  const [sManagerId, setSManagerId] = useState('');

  const [gName, setGName] = useState('');
  const [gSchoolId, setGSchoolId] = useState(schools[0]?.id ?? '');
  const [gSpecialty, setGSpecialty] = useState('');

  const managers = users.filter((u) => u.role === 'manager');

  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;
    createSchool({
      name: sName.trim(),
      code: sCode.trim() || `SCH-${Math.floor(200 + Math.random() * 700)}`,
      stage: sStage,
      city: sCity,
      managerId: sManagerId || undefined,
    });
    setSName('');
    setSCode('');
    setSchoolModal(false);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gName.trim() || !gSchoolId) return;
    createGroup({
      name: gName.trim(),
      schoolId: gSchoolId,
      specialty: gSpecialty.trim() || 'تخصص عام',
    });
    setGName('');
    setGSpecialty('');
    setGroupModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#454943]">المدارس والمجموعات التعليمية</h2>
          <p className="text-xs text-[#666560]">
            تنظيم المدارس والمجموعات التخصصية وربطها بمديري العمل والمعلمين
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setGroupModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0] rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            <span>إضافة مجموعة</span>
          </button>
          <button
            type="button"
            onClick={() => setSchoolModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            <span>إضافة مدرسة</span>
          </button>
        </div>
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {schools.map((school) => {
          const mgr = managers.find((m) => m.id === school.managerId);
          const schoolGroups = groups.filter((g) => g.schoolId === school.id);
          const teacherCount = users.filter(
            (u) => u.role === 'teacher' && u.schoolId === school.id
          ).length;

          return (
            <div
              key={school.id}
              className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#454943] flex items-center justify-center shrink-0">
                    <Building2 size={19} />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSchool(school.id)}
                    className="p-1.5 text-[#85847E] hover:text-[#8A5E56] rounded-lg"
                    title="حذف المدرسة"
                    aria-label="حذف المدرسة"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#454943]">{school.name}</h3>
                  <p className="text-xs text-[#666560] mt-1">
                    {school.stage} · {school.city} · رمز {school.code}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#D9C9B5]/40 text-xs space-y-1.5 text-[#666560]">
                  <p>
                    مدير العمل:{' '}
                    <span className="font-medium text-[#454943]">
                      {mgr?.fullName ?? 'غير معين'}
                    </span>
                  </p>
                  <p className="tabular-nums">
                    المعلمون المسجلون:{' '}
                    <span className="font-semibold text-[#454943]">{teacherCount}</span>
                  </p>
                </div>
              </div>

              {schoolGroups.length > 0 && (
                <div className="pt-3 border-t border-[#D9C9B5]/40 space-y-2">
                  <p className="text-xs font-medium text-[#666560]">المجموعات ({schoolGroups.length})</p>
                  <div className="space-y-1.5">
                    {schoolGroups.map((grp) => (
                      <div
                        key={grp.id}
                        className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-[#F7F5F0]"
                      >
                        <span className="flex items-center gap-1.5 text-[#454943] truncate">
                          <Users size={13} className="text-[#556952] shrink-0" />
                          <span className="truncate">{grp.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteGroup(grp.id)}
                          className="text-[#85847E] hover:text-[#8A5E56] shrink-0"
                          aria-label="حذف المجموعة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add School Modal */}
      <Modal isOpen={schoolModal} onClose={() => setSchoolModal(false)} title="إضافة مدرسة جديدة">
        <form onSubmit={handleCreateSchool} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">اسم المدرسة</label>
            <input
              type="text"
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              required
              placeholder="مثال: ابتدائية الريادة الأهلية"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">المرحلة</label>
              <select
                value={sStage}
                onChange={(e) => setSStage(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              >
                <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
                <option value="المرحلة المتوسطة">المرحلة المتوسطة</option>
                <option value="المرحلة الثانوية">المرحلة الثانوية</option>
                <option value="مجمع تعليمي">مجمع تعليمي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">المدينة</label>
              <input
                type="text"
                value={sCity}
                onChange={(e) => setSCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">الرمز الوزاري/الداخلي</label>
              <input
                type="text"
                value={sCode}
                onChange={(e) => setSCode(e.target.value)}
                placeholder="SCH-104"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">مدير العمل المسؤول</label>
              <select
                value={sManagerId}
                onChange={(e) => setSManagerId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              >
                <option value="">غير معين</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9C9B5]/50">
            <button
              type="button"
              onClick={() => setSchoolModal(false)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
            >
              حفظ المدرسة
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Group Modal */}
      <Modal isOpen={groupModal} onClose={() => setGroupModal(false)} title="إضافة مجموعة تخصصية">
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">المدرسة</label>
            <select
              value={gSchoolId}
              onChange={(e) => setGSchoolId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              required
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">اسم المجموعة</label>
            <input
              type="text"
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              required
              placeholder="مثال: مجموعة الدراسات الإسلامية"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">التخصص</label>
            <input
              type="text"
              value={gSpecialty}
              onChange={(e) => setGSpecialty(e.target.value)}
              placeholder="مثال: العلوم الشرعية"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#D9C9B5]/50">
            <button
              type="button"
              onClick={() => setGroupModal(false)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
            >
              حفظ المجموعة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
