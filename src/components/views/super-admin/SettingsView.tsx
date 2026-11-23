import React, { useState } from 'react';
import { Save, Database, Plus, X } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type { FileTypeCategory } from '../../../types/platform';
import { getFileTypeLabelArabic } from '../../../utils/formatters';
import { getSupabaseDiagnostics } from '../../../lib/supabase/client';
import { SupabaseBackend } from '../../../lib/supabase/repositories';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, pushToast } = usePlatform();

  const [maxFileSizeMb, setMaxFileSizeMb] = useState(settings.maxFileSizeMb);
  const [allowedFileTypes, setAllowedFileTypes] = useState<FileTypeCategory[]>(
    settings.allowedFileTypes
  );
  const [allowTeacherCustomSections, setAllowTeacherCustomSections] = useState(
    settings.allowTeacherCustomSections
  );
  const [requireManagerReview, setRequireManagerReview] = useState(
    settings.requireManagerReviewForCompletion
  );
  const [autoArchiveDays, setAutoArchiveDays] = useState(settings.autoArchiveDeletedDays);
  const [enableEmailDigest, setEnableEmailDigest] = useState(settings.enableEmailDigest);
  const [enableInAppNotifications, setEnableInAppNotifications] = useState(
    settings.enableInAppNotifications
  );
  const [categories, setCategories] = useState(settings.sectionCategories);
  const [newCategory, setNewCategory] = useState('');
  const [widgets, setWidgets] = useState(settings.dashboardWidgets);

  const allTypes: FileTypeCategory[] = ['pdf', 'word', 'powerpoint', 'excel', 'image'];

  const toggleFileType = (t: FileTypeCategory) => {
    setAllowedFileTypes((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const addCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    setCategories((prev) => [...prev, newCategory.trim()]);
    setNewCategory('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      maxFileSizeMb,
      allowedFileTypes,
      allowTeacherCustomSections,
      requireManagerReviewForCompletion: requireManagerReview,
      autoArchiveDeletedDays: autoArchiveDays,
      enableEmailDigest,
      enableInAppNotifications,
      sectionCategories: categories,
      dashboardWidgets: widgets,
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* File Upload & Storage Rules */}
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">إعدادات الملفات والتخزين</h2>
          <p className="text-xs text-[#666560] mt-0.5">
            تحديد الصيغ المسموحة، الحد الأقصى لحجم الرفع، وسياسة سلة المحذوفات
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              الحد الأقصى لحجم الملف الواحد (ميجابايت — يدعم الملفات الكبيرة +100 صفحة)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={maxFileSizeMb}
              onChange={(e) => setMaxFileSizeMb(Number(e.target.value) || 200)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              مدة الاحتفاظ بالملفات المحذوفة (بالأيام)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={autoArchiveDays}
              onChange={(e) => setAutoArchiveDays(Number(e.target.value) || 30)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl font-mono-num"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#454943] mb-2">صيغ الملفات المدعومة</p>
          <div className="flex flex-wrap gap-2.5">
            {allTypes.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D9C9B5]/80 bg-[#F7F5F0]/60 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={allowedFileTypes.includes(type)}
                  onChange={() => toggleFileType(type)}
                />
                <span>{getFileTypeLabelArabic(type)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Rules & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#454943]">تصنيفات الأقسام</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="إضافة تصنيف جديد..."
              className="flex-1 px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
            <button
              type="button"
              onClick={addCategory}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-[#556952] text-white rounded-xl hover:bg-[#465743]"
            >
              <Plus size={14} />
              <span>إضافة</span>
            </button>
          </div>
          <div className="divide-y divide-[#D9C9B5]/40 border border-[#D9C9B5]/60 rounded-xl max-h-56 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center justify-between px-3.5 py-2 text-xs">
                <span className="text-[#454943]">{cat}</span>
                <button
                  type="button"
                  onClick={() => setCategories((prev) => prev.filter((c) => c !== cat))}
                  className="text-[#85847E] hover:text-[#8A5E56]"
                  aria-label={`حذف تصنيف ${cat}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Widgets & Notifications */}
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-semibold text-[#454943]">تهيئة لوحة التحكم والإشعارات</h3>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0]/70 cursor-pointer">
              <span>السماح للمعلمين بإنشاء أقسام شخصية مخصصة</span>
              <input
                type="checkbox"
                checked={allowTeacherCustomSections}
                onChange={(e) => setAllowTeacherCustomSections(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0]/70 cursor-pointer">
              <span>اشتراط اعتماد مدير العمل لحساب الاكتمال الكامل</span>
              <input
                type="checkbox"
                checked={requireManagerReview}
                onChange={(e) => setRequireManagerReview(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0]/70 cursor-pointer">
              <span>إظهار بطاقة اكتمال ملفات الإنجاز في الرئيسية</span>
              <input
                type="checkbox"
                checked={widgets.showCompletionOverview}
                onChange={(e) =>
                  setWidgets((w) => ({ ...w, showCompletionOverview: e.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0]/70 cursor-pointer">
              <span>إظهار نظرة التخزين في الرئيسية</span>
              <input
                type="checkbox"
                checked={widgets.showStorageOverview}
                onChange={(e) =>
                  setWidgets((w) => ({ ...w, showStorageOverview: e.target.checked }))
                }
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0]/70 cursor-pointer">
              <span>تفعيل الإشعارات الفورية داخل المنصة</span>
              <input
                type="checkbox"
                checked={enableInAppNotifications}
                onChange={(e) => setEnableInAppNotifications(e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0]/70 cursor-pointer">
              <span>تفعيل الملخص البريدي الأسبوعي</span>
              <input
                type="checkbox"
                checked={enableEmailDigest}
                onChange={(e) => setEnableEmailDigest(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Supabase Integration Diagnostics */}
      {(() => {
        const diag = getSupabaseDiagnostics();
        return (
          <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Database size={18} className="text-[#556952]" />
                <h3 className="text-base font-semibold text-[#454943]">
                  حالة الربط مع Supabase
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await SupabaseBackend.testLiveConnection();
                    pushToast(res.message, res.ok && res.schemaReady ? 'success' : 'warning');
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] border border-[#D9C9B5] rounded-lg hover:bg-[#D9C9B5]/30 text-[#454943]"
                >
                  اختبار الاتصال الحي
                </button>
                <span
                  className={`text-xs font-semibold ${
                    diag.configured ? 'text-[#466143]' : 'text-[#8A5E56]'
                  }`}
                >
                  {diag.configured ? 'متصل' : 'في انتظار الإعداد'}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#666560]">
              المشروع المستهدف: <span className="font-mono-num" dir="ltr">{diag.projectUrl}</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/50 space-y-1">
                <p className="font-semibold text-[#454943]">حالة المصادقة (Auth)</p>
                <p className="text-[#666560]">{diag.authStatus}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/50 space-y-1">
                <p className="font-semibold text-[#454943]">التخزين الخاص (Private Storage)</p>
                <p className="text-[#666560]">{diag.storageStatus}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/50 space-y-1">
                <p className="font-semibold text-[#454943]">أمان الصفوف (Row Level Security)</p>
                <p className="text-[#666560]">{diag.rlsStatus}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors"
        >
          <Save size={16} />
          <span>حفظ جميع الإعدادات</span>
        </button>
      </div>
    </form>
  );
};
