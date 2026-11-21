import React, { useMemo, useState } from 'react';
import { UserPlus, Search, Edit2, Power } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type { UserAccount, UserRole } from '../../../types/platform';
import { formatDateArabic, getRoleLabelArabic } from '../../../utils/formatters';
import { Modal } from '../../common/Modal';

interface UserManagementViewProps {
  mode: 'all' | 'teachers' | 'managers';
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ mode }) => {
  const {
    users,
    schools,
    groups,
    createUser,
    updateUser,
    toggleUserActive,
    getTeacherCompletionPercent,
  } = usePlatform();

  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>(
    mode === 'teachers' ? 'teacher' : mode === 'managers' ? 'manager' : 'all'
  );
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(
    mode === 'managers' ? 'manager' : 'teacher'
  );
  const [jobTitle, setJobTitle] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [assignedSchoolIds, setAssignedSchoolIds] = useState<string[]>([]);

  const managersList = useMemo(() => users.filter((u) => u.role === 'manager'), [users]);
  const scopedGroups = useMemo(
    () => (schoolId ? groups.filter((g) => g.schoolId === schoolId) : []),
    [groups, schoolId]
  );

  const effectiveRoleFilter =
    mode === 'teachers' ? 'teacher' : mode === 'managers' ? 'manager' : roleFilter;

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => (effectiveRoleFilter === 'all' ? true : u.role === effectiveRoleFilter))
      .filter((u) => {
        if (schoolFilter === 'all') return true;
        if (schoolFilter === 'unassigned') {
          return u.role === 'teacher' && !u.schoolId;
        }
        if (u.role === 'teacher') return u.schoolId === schoolFilter;
        if (u.role === 'manager') {
          const managesViaSchool = schools.some(
            (s) => s.id === schoolFilter && s.managerId === u.id
          );
          return managesViaSchool || (u.assignedSchoolIds?.includes(schoolFilter) ?? false);
        }
        return false;
      })
      .filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.jobTitle.toLowerCase().includes(q)
        );
      });
  }, [users, effectiveRoleFilter, schoolFilter, schools, search]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setRole(mode === 'managers' ? 'manager' : 'teacher');
    setJobTitle(mode === 'managers' ? 'مدير عمل' : 'معلم');
    setSpecialty('');
    setSchoolId(schools[0]?.id ?? '');
    setGroupId(groups[0]?.id ?? '');
    setManagerId(managersList[0]?.id ?? '');
    setAssignedSchoolIds([]);
    setModalOpen(true);
  };

  const openEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setFullName(u.fullName);
    setEmail(u.email);
    setRole(u.role);
    setJobTitle(u.jobTitle);
    setSpecialty(u.specialty ?? '');
    setSchoolId(u.schoolId ?? '');
    setGroupId(u.groupId ?? '');
    setManagerId(u.managerId ?? '');
    setAssignedSchoolIds(u.assignedSchoolIds ?? []);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    const payload: Partial<UserAccount> = {
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      jobTitle: jobTitle.trim() || getRoleLabelArabic(role),
      specialty: specialty.trim(),
      schoolId: role === 'teacher' ? schoolId || undefined : undefined,
      groupId: role === 'teacher' ? groupId || undefined : undefined,
      managerId: role === 'teacher' ? managerId || undefined : undefined,
      assignedSchoolIds: role === 'manager' ? assignedSchoolIds : undefined,
    };

    if (editingUser) {
      updateUser(editingUser.id, payload);
    } else {
      createUser({
        fullName: payload.fullName!,
        email: payload.email!,
        role,
        jobTitle: payload.jobTitle!,
        specialty: payload.specialty,
        schoolId: payload.schoolId,
        groupId: payload.groupId,
        managerId: payload.managerId,
        assignedSchoolIds: payload.assignedSchoolIds,
        isActive: true,
        storageQuotaMb: role === 'teacher' ? 500 : 1000,
      });
    }
    setModalOpen(false);
  };

  const toggleManagerSchool = (sId: string) => {
    setAssignedSchoolIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={15}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#85847E] pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو البريد..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-[#F7F5F0]/80 border border-[#D9C9B5]/70 rounded-xl text-[#454943]"
            />
          </div>

          {mode === 'all' && (
            <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-xl">
              {(['all', 'teacher', 'manager', 'super_admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    roleFilter === r ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
                  }`}
                >
                  {r === 'all' ? 'الكل' : getRoleLabelArabic(r)}
                </button>
              ))}
            </div>
          )}

          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            aria-label="تصفية حسب المدرسة"
            className="px-3 py-2 text-xs bg-[#F7F5F0]/80 border border-[#D9C9B5]/70 rounded-xl text-[#454943]"
          >
            <option value="all">جميع المدارس</option>
            <option value="unassigned">معلمون بدون مدرسة بعد</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors whitespace-nowrap"
        >
          <UserPlus size={16} />
          <span>
            {mode === 'teachers'
              ? 'إضافة معلم جديد'
              : mode === 'managers'
                ? 'إضافة مدير عمل'
                : 'إضافة مستخدم'}
          </span>
        </button>
      </div>

      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#F7F5F0]/70 border-b border-[#D9C9B5]/60 text-xs font-semibold text-[#666560]">
                <th className="py-3.5 px-4">الاسم والبريد</th>
                <th className="py-3.5 px-4">الدور الوظيفي</th>
                <th className="py-3.5 px-4">المدرسة / النطاق</th>
                {mode === 'teachers' && <th className="py-3.5 px-4">اكتمال الملف</th>}
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">تاريخ الانضمام</th>
                <th className="py-3.5 px-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9C9B5]/40 text-sm">
              {filteredUsers.map((u) => {
                const managerSchoolCount = schools.filter(
                  (s) => s.managerId === u.id || (u.assignedSchoolIds?.includes(s.id) ?? false)
                ).length;
                const schoolName =
                  u.role === 'teacher'
                    ? schools.find((s) => s.id === u.schoolId)?.name ?? 'غير مسند'
                    : u.role === 'manager'
                      ? `${managerSchoolCount} مدارس مسندة`
                      : 'كامل المنصة';
                const completion = u.role === 'teacher' ? getTeacherCompletionPercent(u.id) : null;

                return (
                  <tr key={u.id} className="hover:bg-[#F7F5F0]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#A8B9A5]/30 text-[#454943] flex items-center justify-center font-semibold text-sm shrink-0">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#454943]">{u.fullName}</p>
                          <p className="text-xs text-[#666560]" dir="ltr">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold text-[#454943]">
                        {getRoleLabelArabic(u.role)}
                      </p>
                      <p className="text-xs text-[#666560]">{u.jobTitle}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#454943]">
                      <p>{schoolName}</p>
                      {u.role === 'teacher' && (
                        <p
                          className={`text-[11px] mt-0.5 ${
                            u.allowManagerView === false ? 'text-[#8A5E56]' : 'text-[#556952]'
                          }`}
                        >
                          {u.allowManagerView === false ? 'مخفي عن المدير' : 'متاح للمدير'}
                        </p>
                      )}
                    </td>
                    {mode === 'teachers' && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-[#F7F5F0] overflow-hidden">
                            <div
                              className="h-full bg-[#A8B9A5]"
                              style={{ width: `${completion ?? 0}%` }}
                            />
                          </div>
                          <span className="font-mono-num text-xs tabular-nums text-[#454943]">
                            {completion}%
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-xs">
                      <span
                        className={`font-medium ${
                          u.isActive ? 'text-[#466143]' : 'text-[#8A5E56]'
                        }`}
                      >
                        {u.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#666560] tabular-nums">
                      {formatDateArabic(u.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-lg text-[#666560] hover:text-[#454943] hover:bg-[#F7F5F0]"
                          title="تعديل البيانات"
                          aria-label="تعديل البيانات"
                        >
                          <Edit2 size={15} />
                        </button>
                        {u.role !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => toggleUserActive(u.id)}
                            className={`p-2 rounded-lg ${
                              u.isActive
                                ? 'text-[#85847E] hover:text-[#8A5E56]'
                                : 'text-[#556952]'
                            } hover:bg-[#F7F5F0]`}
                            title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            aria-label="تغيير حالة الحساب"
                          >
                            <Power size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">الاسم الكامل</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">الدور في المنصة</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              >
                <option value="teacher">المعلم</option>
                <option value="manager">مدير العمل</option>
                <option value="super_admin">مديرة المنصة</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">المسمى الوظيفي</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
          </div>

          {role === 'teacher' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#D9C9B5]/50">
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">المدرسة</label>
                <select
                  value={schoolId}
                  onChange={(e) => {
                    const nextSchoolId = e.target.value;
                    setSchoolId(nextSchoolId);
                    const validGroup = groups.some(
                      (g) => g.id === groupId && g.schoolId === nextSchoolId
                    );
                    if (!validGroup) setGroupId('');
                    const schoolMgr = schools.find((s) => s.id === nextSchoolId)?.managerId;
                    if (schoolMgr) setManagerId(schoolMgr);
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                >
                  <option value="">بدون مدرسة</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">المجموعة</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  disabled={!schoolId}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl disabled:opacity-60"
                >
                  <option value="">
                    {schoolId ? 'بدون مجموعة' : 'اختر المدرسة أولاً'}
                  </option>
                  {scopedGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">مدير العمل المسؤول</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                >
                  <option value="">غير معين</option>
                  {managersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {role === 'manager' && (
            <div className="pt-2 border-t border-[#D9C9B5]/50 space-y-2">
              <label className="block text-xs font-medium text-[#454943]">
                المدارس المسندة لمدير العمل
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {schools.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-[#D9C9B5]/70 bg-[#F7F5F0]/50 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={assignedSchoolIds.includes(s.id)}
                      onChange={() => toggleManagerSchool(s.id)}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9C9B5]/50">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm bg-[#F7F5F0] text-[#454943] rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-lg hover:bg-[#353833]"
            >
              {editingUser ? 'حفظ التغييرات' : 'إنشاء الحساب'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
