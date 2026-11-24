import React, { useEffect, useRef, useState } from 'react';
import { LogIn, UserPlus, KeyRound, Database, Eye, Ticket } from 'lucide-react';
import { LogoMark } from '../common/LogoMark';
import { SupabaseSetupModal } from './SupabaseSetupModal';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { SupabaseBackend } from '../../lib/supabase/repositories';
import { usePlatform } from '../../context/PlatformContext';

interface AuthScreenProps {
  onEnterPreviewMode?: () => void;
}

function translateAuthError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : '';
  const lower = raw.toLowerCase();

  if (!raw) return 'تعذر إتمام العملية، يرجى التحقق من البيانات والمحاولة مرة أخرى.';
  if (lower.includes('invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (lower.includes('email not confirmed')) {
    return 'لم يتم تأكيد هذا البريد الإلكتروني بعد. افتحي رسالة التأكيد في بريدك أو اطلبي من مديرة المنصة تعطيل خيار تأكيد البريد الإلكتروني في Supabase.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'هذا البريد الإلكتروني مسجّل مسبقًا، يمكنك تسجيل الدخول مباشرة أو استعادة كلمة المرور.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'تم تجاوز حد إرسال رسائل البريد المؤقت في Supabase (رسالتان في الساعة على الخطة المجانية). لتسجيل جميع المعلمات فورًا دون انتظار، أوقفي خيار "Confirm email" في إعدادات Authentication في Supabase.';
  }
  if (lower.includes('unable to validate email') || (lower.includes('email') && lower.includes('invalid'))) {
    return 'صيغة البريد الإلكتروني غير صحيحة أو تحتوي على مسافات أو أحرف غير مدعومة (تأكدي من كتابته بالإنجليزية دون مسافات، ولا يوجد أي تقييد على نوع البريد مثل gmail أو غيره).';
  }
  if (lower.includes('password') && (lower.includes('6') || lower.includes('short') || lower.includes('weak'))) {
    return 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.';
  }
  if (lower.includes('signup') && lower.includes('disabled')) {
    return 'تسجيل الحسابات الجديدة معطّل حاليًا في إعدادات Supabase.';
  }
  return raw;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onEnterPreviewMode }) => {
  const { branding, pushToast, enterGuestVisitSession } = usePlatform();
  const configured = isSupabaseConfigured();

  const [mode, setMode] = useState<'signin' | 'signup' | 'visit' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('معلم');
  const [schoolCode, setSchoolCode] = useState('');
  const [visitCode, setVisitCode] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);
  const visitCodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (mode === 'visit') {
        visitCodeInputRef.current?.focus();
      } else if (mode === 'signup') {
        fullNameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (mode === 'visit') {
      setLoading(true);
      try {
        await enterGuestVisitSession(visitCode, visitorName);
      } catch (err) {
        setErrorMsg(translateAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!configured) {
      setErrorMsg(
        'لم يتم ربط مشروع Supabase بعد. أضف متغيرات VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY لتفعيل تسجيل الدخول الحقيقي.'
      );
      return;
    }

    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();
    setEmail(cleanEmail);

    setLoading(true);
    try {
      if (mode === 'signin') {
        await SupabaseBackend.signIn(cleanEmail, password);
        pushToast('تم تسجيل الدخول بنجاح');
      } else if (mode === 'signup') {
        const res = await SupabaseBackend.signUp(
          cleanEmail,
          password,
          fullName.trim(),
          jobTitle.trim(),
          schoolCode.trim()
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
        await SupabaseBackend.resetPassword(cleanEmail);
        setInfoMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
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
              لا يتم استخدام تسجيل دخول وهمي. أضف المفتاح العام الكامل (
              <span className="font-mono-num" dir="ltr">
                VITE_SUPABASE_PUBLISHABLE_KEY
              </span>
              ) في متغيرات البيئة أو افتح دليل الإعداد.
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
              setInfoMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              mode === 'signin' || mode === 'reset'
                ? 'bg-white text-[#454943] shadow-xs'
                : 'text-[#666560]'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setInfoMsg(null);
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
              setMode('visit');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-1 ${
              mode === 'visit'
                ? 'bg-white text-[#556952] font-semibold shadow-xs'
                : 'text-[#666560]'
            }`}
          >
            <Ticket size={13} />
            <span>كود الزيارة المؤقتة</span>
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
          {mode === 'visit' ? (
            <>
              <div className="p-3 rounded-xl bg-[#A8B9A5]/15 border border-[#A8B9A5]/45 text-xs text-[#3F573C] leading-relaxed">
                أدخلي <strong>كود الزيارة المؤقتة</strong> المرسل من المعلمة للاطلاع على ملفها وشواهدها وصورها دون الحاجة لإنشاء حساب (للقراءة والاطلاع فقط).
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">
                  كود الزيارة المؤقتة
                </label>
                <input
                  ref={visitCodeInputRef}
                  type="text"
                  required
                  dir="ltr"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={visitCode}
                  onChange={(e) => setVisitCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
                  placeholder="VST-XXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm font-mono-num tracking-wider bg-white border border-[#D9C9B5] rounded-xl text-left uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">
                  اسم الزائر / المديرة <span className="text-[#85847E] font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="مثال: أ. مها — مديرة المدرسة"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl"
                />
              </div>
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#454943] mb-1">
                      الاسم الكامل
                    </label>
                    <input
                      ref={fullNameInputRef}
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
                  <div>
                    <label className="block text-xs font-medium text-[#454943] mb-1">
                      رمز المدرسة للانضمام المباشر{' '}
                      <span className="text-[#85847E] font-normal">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                      placeholder="SCH-101"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left uppercase"
                    />
                    <p className="text-[11px] text-[#666560] mt-1">
                      إذا أعطتكِ إدارة المنصة رمز مدرستك، اكتبيه هنا ليُربط حسابكِ بمدرستكِ وحدها تلقائيًا.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-[#454943] mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D9C9B5] rounded-xl text-left"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#454943]">
                      كلمة المرور
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setErrorMsg(null);
                          setInfoMsg(null);
                        }}
                        className="text-[11px] font-medium text-[#556952] hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors disabled:opacity-60"
          >
            {mode === 'visit' ? (
              <Eye size={16} />
            ) : mode === 'signin' ? (
              <LogIn size={16} />
            ) : mode === 'signup' ? (
              <UserPlus size={16} />
            ) : (
              <KeyRound size={16} />
            )}
            <span>
              {loading
                ? 'جاري التحقق...'
                : mode === 'visit'
                  ? 'دخول بالكود المؤقت (للاطلاع فقط)'
                  : mode === 'signin'
                    ? 'دخول آمن'
                    : mode === 'signup'
                      ? 'إنشاء حساب معلم'
                      : 'إرسال رابط الاستعادة'}
            </span>
          </button>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className="w-full text-xs text-[#666560] hover:text-[#454943] text-center"
            >
              العودة إلى تسجيل الدخول
            </button>
          )}

          {mode === 'signup' && (
            <p className="text-[11px] text-[#666560] text-center leading-relaxed">
              تُنشأ الحسابات الجديدة تلقائياً بصلاحية «المعلم» لحماية البيانات، وتقوم مديرة المنصة بترقية الأدوار وإسناد المدارس.
            </p>
          )}

          {mode !== 'visit' && (
            <div className="pt-3 border-t border-[#D9C9B5]/60 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('visit');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="text-xs font-medium text-[#556952] hover:underline"
              >
                لديكِ كود زيارة مؤقتة من المعلمة؟ اضغطي هنا للاطلاع بدون حساب
              </button>
            </div>
          )}
        </form>
      </div>

      <SupabaseSetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  );
};

