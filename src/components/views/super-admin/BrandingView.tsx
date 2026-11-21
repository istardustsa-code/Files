import React, { useRef, useState } from 'react';
import { Upload, Trash2, RotateCcw, Folder, Check } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { LogoMark } from '../../common/LogoMark';

export const BrandingView: React.FC = () => {
  const { branding, uploadBrandingAsset, updateBranding, resetBranding, pushToast } = usePlatform();

  const [platformName, setPlatformName] = useState(branding.platformName);
  const [secondaryName, setSecondaryName] = useState(branding.secondaryName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [colors, setColors] = useState(branding.colors);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoDataUrl' | 'appIconDataUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG)', 'warning');
      return;
    }
    uploadBrandingAsset(file, field === 'logoDataUrl' ? 'logo' : 'app_icon');
  };

  const handleSaveTextAndColors = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding({
      platformName: platformName.trim() || 'ملفاتي',
      secondaryName: secondaryName.trim() || 'FILES BY LAMA',
      tagline: tagline.trim(),
      colors,
    });
  };

  const handleReset = () => {
    resetBranding();
    setPlatformName('ملفاتي');
    setSecondaryName('FILES BY LAMA');
    setTagline('مساحتك الخاصة لإنجازاتك وملفاتك المهنية');
    setColors({
      ivory: '#F7F5F0',
      white: '#FFFFFF',
      sage: '#A8B9A5',
      rose: '#D8BDB7',
      sand: '#D9C9B5',
      gray: '#85847E',
      ink: '#454943',
    });
  };

  const colorLabels: { key: keyof typeof colors; label: string }[] = [
    { key: 'ivory', label: 'العاجي الدافئ (الخلفية)' },
    { key: 'white', label: 'الأبيض النقي (البطاقات)' },
    { key: 'sage', label: 'الأخضر المريمي الناعم' },
    { key: 'rose', label: 'الوردي الترابي' },
    { key: 'sand', label: 'الرملي البيج' },
    { key: 'gray', label: 'الرمادي الدافئ' },
    { key: 'ink', label: 'النص الأساسي الداكن' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#454943]">الهوية البصرية والشعار</h2>
          <p className="text-xs text-[#666560] mt-0.5">
            تخصيص شعار المنصة (يعرض أيقونة مجلد مؤقتة لحين رفع الشعار الرسمي)، اسم المنصة، وأيقونة التطبيق والألوان
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-xl transition-colors whitespace-nowrap"
        >
          <RotateCcw size={15} />
          <span>استعادة الافتراضي</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo & App Icon Upload Area */}
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#454943]">شعار المنصة الرئيسي</h3>
            <div className="flex flex-wrap items-center gap-5 p-4 rounded-2xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/60">
              <LogoMark size="lg" />
              <div className="flex-1 min-w-[200px] space-y-2">
                <p className="text-xs text-[#666560]">
                  {branding.logoDataUrl
                    ? 'تم رفع شعار مخصص للمنصة ويظهر الآن في الشريط الجانبي.'
                    : 'يتم حالياً استخدام أيقونة مجلد مؤقتة. يمكنك رفع شعار المنصة الرسمي في أي وقت.'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#454943] text-white rounded-lg hover:bg-[#353833] whitespace-nowrap"
                  >
                    <Upload size={14} />
                    <span>{branding.logoDataUrl ? 'استبدال الشعار' : 'رفع شعار'}</span>
                  </button>
                  {branding.logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => updateBranding({ logoDataUrl: null })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#8A5E56] bg-white border border-[#D8BDB7] rounded-lg hover:bg-[#D8BDB7]/20 whitespace-nowrap"
                    >
                      <Trash2 size={14} />
                      <span>إزالة والعودة للأيقونة المؤقتة</span>
                    </button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logoDataUrl')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#D9C9B5]/50">
            <h3 className="text-sm font-semibold text-[#454943]">أيقونة التطبيق (Favicon / App Icon)</h3>
            <div className="flex flex-wrap items-center gap-5 p-4 rounded-2xl bg-[#F7F5F0]/70 border border-[#D9C9B5]/60">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#D9C9B5] flex items-center justify-center overflow-hidden shrink-0">
                {branding.appIconDataUrl ? (
                  <img
                    src={branding.appIconDataUrl}
                    alt="أيقونة التطبيق"
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Folder size={20} className="text-[#85847E]" />
                )}
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <p className="text-xs text-[#666560]">
                  أيقونة مصغرة مربعة للمتصفح والاختصارات (يفضل مقاس 512×512 PNG).
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] text-[#454943] rounded-lg hover:bg-[#F7F5F0]"
                  >
                    <Upload size={14} />
                    <span>{branding.appIconDataUrl ? 'تغيير الأيقونة' : 'رفع أيقونة'}</span>
                  </button>
                  {branding.appIconDataUrl && (
                    <button
                      type="button"
                      onClick={() => updateBranding({ appIconDataUrl: null })}
                      className="px-3 py-1.5 text-xs text-[#8A5E56] hover:underline"
                    >
                      حذف
                    </button>
                  )}
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'appIconDataUrl')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Name, Tagline & Colors */}
        <form
          onSubmit={handleSaveTextAndColors}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-5"
        >
          <h3 className="text-sm font-semibold text-[#454943]">النصوص والألوان المعتمدة</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">اسم المنصة</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">الاسم الإنجليزي المساعد</label>
              <input
                type="text"
                value={secondaryName}
                onChange={(e) => setSecondaryName(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">الشعار اللفظي (Tagline)</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-[#D9C9B5]/50">
            <p className="text-xs font-medium text-[#454943]">لوحة الألوان</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {colorLabels.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-[#D9C9B5]/70 bg-[#F7F5F0]/50 text-xs"
                >
                  <span className="text-[#454943]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-[11px] text-[#666560]" dir="ltr">
                      {colors[item.key]}
                    </span>
                    <input
                      type="color"
                      value={colors[item.key]}
                      onChange={(e) =>
                        setColors((prev) => ({ ...prev, [item.key]: e.target.value }))
                      }
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors"
            >
              <Check size={15} />
              <span>حفظ الهوية البصرية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
