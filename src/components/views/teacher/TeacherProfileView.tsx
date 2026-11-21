import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Save, ShieldCheck } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';

export const TeacherProfileView: React.FC = () => {
  const {
    currentUser,
    schools,
    groups,
    users,
    updateUser,
    toggleManagerViewPermission,
    joinSchoolByCode,
  } = usePlatform();

  const [fullName, setFullName] = useState(currentUser.fullName);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle);
  const [specialty, setSpecialty] = useState(currentUser.specialty ?? '');
  const [qualification, setQualification] = useState(currentUser.qualification ?? '');
  const [phone, setPhone] = useState(currentUser.phone ?? '');
  const [bio, setBio] = useState(currentUser.bio ?? '');
  const [schoolCodeInput, setSchoolCodeInput] = useState('');
  const [joiningSchool, setJoiningSchool] = useState(false);

  const schoolName = schools.find((s) => s.id === currentUser.schoolId)?.name ?? 'غير مسند';
  const groupName = groups.find((g) => g.id === currentUser.groupId)?.name ?? 'غير مسند';
  const managerName = users.find((u) => u.id === currentUser.managerId)?.fullName ?? 'غير معين';
  const allowManagerView = currentUser.allowManagerView !== false;

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

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCodeInput.trim()) return;
    setJoiningSchool(true);
    const ok = await joinSchoolByCode(schoolCodeInput);
    setJoiningSchool(false);
    if (ok) {
      setSchoolCodeInput('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="space-y-5">
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

        {/* Join School by Code (only if not assigned yet) */}
        {!currentUser.schoolId && (
          <form
            onSubmit={handleJoinSchool}
            className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[#454943]">
              <KeyRound size={16} className="text-[#556952]" />
              <span>الانضمام إلى مدرستك عبر الرمز</span>
            </div>
            <p className="text-xs text-[#666560] leading-relaxed">
              أدخلي رمز المدرسة الذي زودتكِ به إدارة المنصة لربط حسابكِ بمدرستكِ وحدها دون اختلاط مع المدارس الأخرى.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={schoolCodeInput}
                onChange={(e) => setSchoolCodeInput(e.target.value.toUpperCase())}
                placeholder="SCH-101"
                className="flex-1 px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left uppercase"
              />
              <button
                type="submit"
                disabled={joiningSchool}
                className="px-4 py-2 text-xs font-medium bg-[#454943] text-white rounded-xl hover:bg-[#353833] disabled:opacity-60 whitespace-nowrap"
              >
                {joiningSchool ? 'جاري الربط...' : 'ربط بالمدرسة'}
              </button>
            </div>
          </form>
        )}

        {/* Teacher Privacy Control: Manager Visibility Permission */}
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  allowManagerView
                    ? 'bg-[#A8B9A5]/30 text-[#466143]'
                    : 'bg-[#D8BDB7]/35 text-[#8A5E56]'
                }`}
              >
                {allowManagerView ? <Eye size={17} /> : <EyeOff size={17} />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#454943]">
                  صلاحية اطلاع المدير على ملفي
                </h3>
                <p className="text-xs text-[#666560] mt-0.5 leading-relaxed">
                  أنتِ من يتحكم في السماح لمدير العمل بمشاهدة ومراجعة ملفاتك وإنجازاتك أو إخفائها عنه.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              allowManagerView
                ? 'bg-[#A8B9A5]/15 border-[#A8B9A5]/50 text-[#3F573C]'
                : 'bg-[#D8BDB7]/20 border-[#D8BDB7]/60 text-[#7B4B43]'
            }`}
          >
            {allowManagerView ? (
              <p className="flex items-start gap-2">
                <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                <span>
                  <strong>مفعّل:</strong> يمكن لمدير عمل مدرستك الاطلاع على ملفاتك وشواهدك ومراجعتها، ولا يطلع عليها أي معلم آخر إطلاقًا.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <Lock size={15} className="shrink-0 mt-0.5" />
                <span>
                  <strong>مخفي عن المدير:</strong> ملفاتك وشواهدك وإنجازاتك خاصة بكِ تمامًا ولا يمكن لمدير العمل مشاهدتها حتى تقومي بتفعيل الإذن مجددًا.
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void toggleManagerViewPermission(!allowManagerView)}
            className={`w-full py-2.5 px-4 text-xs font-medium rounded-xl transition-colors ${
              allowManagerView
                ? 'bg-[#F7F5F0] border border-[#D9C9B5] text-[#454943] hover:bg-[#EFECE4]'
                : 'bg-[#556952] text-white hover:bg-[#455742]'
            }`}
          >
            {allowManagerView
              ? 'إيقاف اطلاع المدير على ملفي'
              : 'السماح للمدير بالاطلاع على ملفي'}
          </button>
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
