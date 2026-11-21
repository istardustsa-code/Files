import React, { useState } from 'react';
import { LogIn, UserPlus, KeyRound, Database, Eye } from 'lucide-react';
import { LogoMark } from '../common/LogoMark';
import { SupabaseSetupModal } from './SupabaseSetupModal';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { SupabaseBackend } from '../../lib/supabase/repositories';
import { usePlatform } from '../../context/PlatformContext';

interface AuthScreenProps {
  onEnterPreviewMode?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onEnterPreviewMode }) => {
  const { branding, pushToast } = usePlatform();
  const configured = isSupabaseConfigured();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('معلم');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!configured) {
      setErrorMsg(
        'لم يتم ربط مشروع Supabase بعد. أضف متغيرات VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY لتفعيل تسجيل الدخول الحقيقي.'
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await SupabaseBackend.signIn(email.trim(), password);
        pushToast('تم تسجيل الدخول بنجاح');
      } else if (mode === 'signup') {
        const res = await SupabaseBackend.signUp(
          email.trim(),
          password,
          fullName.trim(),
          jobTitle.trim()
        );
        if (res.session) {
          pushToast('تم إنشاء الحساب وتسجيل الدخول');
        } else {
          setInfoMsg(
            'تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل ثم تسجيل الدخول.'
          );
          setMode('signin');
        }
      } else {
        await SupabaseBackend.resetPassword(email.trim());
        setInfoMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر إتمام العملية، تحقق من البيانات.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#454943] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-[#D9C9B5]/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <LogoMark size="lg" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#454943]">
              {branding.platformName}
            </h1>
            <p className="text-xs font-medium tracking-wider text-[#666560]" dir="ltr">
              {branding.secondaryName}
            </p>
          </div>
          <p className="text-sm text-[#666560]">{branding.tagline}</p>
        </div>

        {/* Connection Notice if env vars are missing */}
        {!configured && (
          <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5] text-xs space-y-2">
            <p className="font-semibold text-[#8A5E56]">
              بانتظار ربط Supabase لتفعيل المصادقة الفعلية
            </p>
            <p className="text-[#666560] leading-relaxed">
              لا يتم استخدام تسجيل دخول وهمي. أضف المفتاح العام الكامل (<span className="font-mono-num" dir="ltr">VITE_SUPABASE_PUBLISHABLE_KEY</span>) في متغيرات البيئة أو افتح دليل الإعداد.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSetupOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-white border border-[#D9C9B5] rounded-lg text-[#454943] hover:bg-[#F7F5F0]"
              >
                <Database size={13} />
                <span>خطوات ربط Supabase</span>
              </button>
              {onEnterPreviewMode && (
                <button
                  type="button"
                  onClick={onEnterPreviewMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-[#454943] text-white rounded-lg hover:bg-[#353833]"
                >
                  <Eye size={13} />
                  <span>معاينة الواجهة فقط</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Auth Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              mode === 'signin' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              mode === 'signup' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
            }`}
          >
            حساب جديد
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              mode === 'reset' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
            }`}
          >
            استعادة المرور
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#D8BDB7]/30 border border-[#D8BDB7] text-xs text-[#7B4B43]">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="p-3 rounded-xl bg-[#A8B9A5]/25 border border-[#A8B9A5] text-xs text-[#3F573C]">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أ. نورة السبيعي"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="معلم / معلمة"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu.sa"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                minLength={6}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors disabled:opacity-60"
          >
            {mode === 'signin' ? (
              <LogIn size={16} />
            ) : mode === 'signup' ? (
              <UserPlus size={16} />
            ) : (
              <KeyRound size={16} />
            )}
            <span>
              {loading
                ? 'جاري المعالجة...'
                : mode === 'signin'
                  ? 'دخول آمن'
                  : mode === 'signup'
                    ? 'إنشاء حساب معلم'
                    : 'إرسال رابط الاستعادة'}
            </span>
          </button>

          {mode === 'signup' && (
            <p className="text-[11px] text-[#666560] text-center leading-relaxed">
              تُنشأ الحسابات الجديدة تلقائياً بصلاحية «المعلم» لحماية البيانات، وتقوم مديرة المنصة بترقية الأدوار وإسناد المدارس.
            </p>
          )}
        </form>
      </div>

      <SupabaseSetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
};
