import React, { useState } from 'react';
import { Building2, Copy, Edit2, Plus, Trash2, Users, GraduationCap, EyeOff } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { Modal } from '../../common/Modal';
import type { School } from '../../../types/platform';

export const SchoolsGroupsView: React.FC = () => {
  const {
    schools,
    groups,
    users,
    createSchool,
    updateSchool,
    deleteSchool,
    createGroup,
    deleteGroup,
    pushToast,
  } = usePlatform();

  const [schoolModal, setSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [groupModal, setGroupModal] = useState(false);
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);

  const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');
  const [sStage, setSStage] = useState('المرحلة الابتدائية');
  const [sCity, setSCity] = useState('الرياض');
  const [sManagerId, setSManagerId] = useState('');

  const [gName, setGName] = useState('');
  const [gSchoolId, setGSchoolId] = useState(schools[0]?.id ?? '');
  const [gSpecialty, setGSpecialty] = useState('');

  const managers = users.filter((u) => u.role === 'manager');

  const openAddSchoolModal = () => {
    setEditingSchool(null);
    setSName('');
    setSCode('');
    setSStage('المرحلة الابتدائية');
    setSCity('الرياض');
    setSManagerId('');
    setSchoolModal(true);
  };

  const openEditSchoolModal = (school: School) => {
    setEditingSchool(school);
    setSName(school.name);
    setSCode(school.code);
    setSStage(school.stage);
    setSCity(school.city);
    setSManagerId(school.managerId ?? '');
    setSchoolModal(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim()) return;
    if (editingSchool) {
      updateSchool(editingSchool.id, {
        name: sName.trim(),
        code: (sCode.trim() || editingSchool.code).toUpperCase(),
        stage: sStage,
        city: sCity.trim() || 'الرياض',
        managerId: sManagerId || undefined,
      });
    } else {
      createSchool({
        name: sName.trim(),
        code: (sCode.trim() || `SCH-${Math.floor(200 + Math.random() * 700)}`).toUpperCase(),
        stage: sStage,
        city: sCity.trim() || 'الرياض',
        managerId: sManagerId || undefined,
      });
    }
    setSchoolModal(false);
    setEditingSchool(null);
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

  const copySchoolCode = (code: string, schoolName: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => undefined);
    }
    pushToast(`تم نسخ رمز الانضمام (${code}) لمدرسة ${schoolName}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#454943]">المدارس والمجموعات التعليمية</h2>
          <p className="text-xs text-[#666560]">
            كل مدرسة مستقلة برمز انضمام ومدير عمل ومعلمين خاصين بها دون أي اختلاط بين المدارس
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setGSchoolId(schools[0]?.id ?? '');
              setGroupModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-white border border-[#D9C9B5] text-[#454943] hover:bg-[#F7F5F0] rounded-xl transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            <span>إضافة مجموعة</span>
          </button>
          <button
            type="button"
            onClick={openAddSchoolModal}
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
          const mgr = managers.find(
            (m) => m.id === school.managerId || m.assignedSchoolIds?.includes(school.id)
          );
          const schoolGroups = groups.filter((g) => g.schoolId === school.id);
          const schoolTeachers = users.filter(
            (u) => u.role === 'teacher' && u.schoolId === school.id
          );
          const isExpanded = expandedSchoolId === school.id;

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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditSchoolModal(school)}
                      className="p-1.5 text-[#85847E] hover:text-[#454943] rounded-lg"
                      title="تعديل المدرسة"
                      aria-label="تعديل المدرسة"
                    >
                      <Edit2 size={15} />
                    </button>
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
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#454943]">{school.name}</h3>
                  <p className="text-xs text-[#666560] mt-1">
                    {school.stage} · {school.city}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/60">
                  <div className="text-xs">
                    <span className="text-[#666560]">رمز الانضمام: </span>
                    <span className="font-mono-num font-bold text-[#454943]" dir="ltr">
                      {school.code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copySchoolCode(school.code, school.name)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#556952] hover:underline"
                  >
                    <Copy size={12} />
                    <span>نسخ</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#D9C9B5]/40 text-xs space-y-1.5 text-[#666560]">
                  <p>
                    مدير العمل:{' '}
                    <span className="font-medium text-[#454943]">
                      {mgr?.fullName ?? 'غير معين'}
                    </span>
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="tabular-nums">
                      المعلمون المسجلون:{' '}
                      <span className="font-semibold text-[#454943]">{schoolTeachers.length}</span>
                    </p>
                    {schoolTeachers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedSchoolId(isExpanded ? null : school.id)}
                        className="text-[#556952] font-medium hover:underline"
                      >
                        {isExpanded ? 'إخفاء القائمة' : 'عرض معلمي المدرسة'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && schoolTeachers.length > 0 && (
                <div className="pt-3 border-t border-[#D9C9B5]/40 space-y-2">
                  <p className="text-xs font-medium text-[#666560]">معلمو {school.name}</p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {schoolTeachers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-[#F7F5F0]"
                      >
                        <span className="flex items-center gap-1.5 text-[#454943] truncate">
                          <GraduationCap size={13} className="text-[#556952] shrink-0" />
                          <span className="truncate">{t.fullName}</span>
                        </span>
                        {t.allowManagerView === false && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-[#8A5E56] shrink-0"
                            title="أخفى ملفه عن مدير المدرسة"
                          >
                            <EyeOff size={12} />
                            <span>خاص</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Add / Edit School Modal */}
      <Modal
        isOpen={schoolModal}
        onClose={() => {
          setSchoolModal(false);
          setEditingSchool(null);
        }}
        title={editingSchool ? `تعديل بيانات: ${editingSchool.name}` : 'إضافة مدرسة جديدة'}
      >
        <form onSubmit={handleSaveSchool} className="space-y-4">
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
              <label className="block text-xs font-medium text-[#454943] mb-1">
                رمز الانضمام للمدرسة
              </label>
              <input
                type="text"
                dir="ltr"
                value={sCode}
                onChange={(e) => setSCode(e.target.value.toUpperCase())}
                placeholder="SCH-104"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left uppercase"
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
              onClick={() => {
                setSchoolModal(false);
                setEditingSchool(null);
              }}
              className="px-4 py-2 text-sm bg-[#F7F5F0] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg"
            >
              {editingSchool ? 'حفظ التعديلات' : 'حفظ المدرسة'}
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
