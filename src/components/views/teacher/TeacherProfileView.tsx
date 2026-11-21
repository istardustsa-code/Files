import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';

export const TeacherProfileView: React.FC = () => {
  const { currentUser, schools, groups, users, updateUser } = usePlatform();

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle);
  const [specialty, setSpecialty] = useState(currentUser.specialty ?? '');
  const [qualification, setQualification] = useState(currentUser.qualification ?? '');
  const [phone, setPhone] = useState(currentUser.phone ?? '');
  const [bio, setBio] = useState(currentUser.bio ?? '');

  const schoolName = schools.find((s) => s.id === currentUser.schoolId)?.name ?? 'غير مسند';
  const groupName = groups.find((g) => g.id === currentUser.groupId)?.name ?? 'غير مسند';
  const managerName = users.find((u) => u.id === currentUser.managerId)?.fullName ?? 'غير معين';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(currentUser.id, {
      fullName: fullName.trim() || currentUser.fullName,
      jobTitle: jobTitle.trim(),
      specialty: specialty.trim(),
      qualification: qualification.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#D8BDB7]/45 text-[#454943] flex items-center justify-center font-display text-xl font-bold shrink-0">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#454943]">{currentUser.fullName}</h2>
            <p className="text-xs text-[#666560]">{currentUser.jobTitle}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#D9C9B5]/50 space-y-2.5 text-xs text-[#666560]">
          <p>
            البريد الإلكتروني:{' '}
            <span className="text-[#454943] font-medium" dir="ltr">
              {currentUser.email}
            </span>
          </p>
          <p>
            المدرسة: <span className="text-[#454943] font-medium">{schoolName}</span>
          </p>
          <p>
            المجموعة: <span className="text-[#454943] font-medium">{groupName}</span>
          </p>
          <p>
            مدير العمل المشرف: <span className="text-[#454943] font-medium">{managerName}</span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="lg:col-span-2 bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4"
      >
        <h3 className="text-base font-semibold text-[#454943]">تحديث البيانات المهنية</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">المسمى الوظيفي</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">التخصص</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">المؤهل العلمي</label>
            <input
              type="text"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#454943] mb-1">رقم التواصل</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#454943] mb-1">نبذة مهنية</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[#454943] text-white rounded-xl hover:bg-[#353833]"
          >
            <Save size={15} />
            <span>حفظ التغييرات</span>
          </button>
        </div>
      </form>
    </div>
  );
};
