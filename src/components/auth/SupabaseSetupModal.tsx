import React, { useState } from 'react';
import { Database, CheckCircle2, KeyRound, ShieldCheck, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { getSupabaseDiagnostics } from '../../lib/supabase/client';
import { SupabaseBackend } from '../../lib/supabase/repositories';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const diag = getSupabaseDiagnostics();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    schemaReady: boolean;
    message: string;
  } | null>(null);

  const handleRunTest = async () => {
    setTesting(true);
    try {
      const res = await SupabaseBackend.testLiveConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعداد وربط مشروع Supabase الخاص بك"
      subtitle="خطوات تشغيل قاعدة البيانات والمصادقة والتخزين الخاص لمنصة ملفاتي"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 text-sm text-[#454943]">
        {/* Connection Status */}
        <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold flex items-center gap-2">
              <Database size={16} className="text-[#556952]" />
              <span>حالة الربط الحالية</span>
            </span>
            <span
              className={`text-xs font-semibold ${
                diag.configured ? 'text-[#466143]' : 'text-[#8A5E56]'
              }`}
            >
              {diag.configured ? 'المفتاح العام متوفر' : 'بانتظار إضافة المفتاح العام'}
            </span>
          </div>
          <p className="text-xs text-[#666560]">
            رابط المشروع: <span className="font-mono-num" dir="ltr">{diag.projectUrl}</span>
          </p>
          <p className="text-xs text-[#666560]">{diag.authStatus}</p>

          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#D9C9B5] rounded-lg hover:bg-[#F7F5F0] disabled:opacity-60"
            >
              <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
              <span>{testing ? 'جاري الاختبار...' : 'اختبار الاتصال الفعلي الآن'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs border ${
                testResult.ok && testResult.schemaReady
                  ? 'bg-[#A8B9A5]/20 border-[#A8B9A5] text-[#3F573C]'
                  : 'bg-[#D8BDB7]/25 border-[#D8BDB7] text-[#7B4B43]'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        {/* Step-by-step instructions */}
        <ol className="space-y-4 text-xs sm:text-sm leading-relaxed">
          <li className="p-4 rounded-xl border border-[#D9C9B5]/60 bg-white space-y-1.5">
            <p className="font-semibold text-[#454943] flex items-center gap-1.5">
              <KeyRound size={15} className="text-[#556952]" />
              <span>1. إضافة متغيرات البيئة (Secrets)</span>
            </p>
            <p className="text-xs text-[#666560]">
              أضف رابط المشروع والمفتاح العام (Publishable Key) من <strong>Project Settings ← API</strong> إلى متغيرات البيئة:
            </p>
            <div className="p-2.5 rounded-lg bg-[#F7F5F0] font-mono-num text-[11px] text-[#454943]" dir="ltr">
              VITE_SUPABASE_URL=https://aritktxijbfcpmuxsxmx.supabase.co
              <br />
              VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
            </div>
            <p className="text-[11px] text-[#666560]">
              (لا تستخدم مفتاح <span className="font-mono-num" dir="ltr">service_role</span> في الواجهة نهائياً.)
            </p>
          </li>

          <li className="p-4 rounded-xl border border-[#D9C9B5]/60 bg-white space-y-1.5">
            <p className="font-semibold text-[#454943]">2. تنفيذ ترحيلات قاعدة البيانات والسياسات (SQL Editor)</p>
            <p className="text-xs text-[#666560]">
              افتح <strong>SQL Editor</strong> في مشروعك ونفّذ الملفات الثلاثة الموجودة في <span className="font-mono-num" dir="ltr">supabase/migrations/</span> بالترتيب (دون إنشاء جدول todos التجريبي):
            </p>
            <ul className="list-disc list-inside text-xs text-[#556952] font-mono-num pt-1" dir="ltr">
              <li>20261118000001_initial_schema.sql</li>
              <li>20261118000002_rls_and_storage.sql</li>
              <li>20261118000003_seed_default_sections_and_config.sql</li>
            </ul>
          </li>

          <li className="p-4 rounded-xl border border-[#D9C9B5]/60 bg-white space-y-1.5">
            <p className="font-semibold text-[#454943] flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-[#556952]" />
              <span>3. تفعيل أول حساب مديرة منصة (Super Admin)</span>
            </p>
            <p className="text-xs text-[#666560]">
              سجّل حسابك الأول عبر شاشة إنشاء حساب (يُنشأ تلقائياً بدور المعلم)، ثم نفّذ في SQL Editor:
            </p>
            <div className="p-2.5 rounded-lg bg-[#F7F5F0] font-mono-num text-[11px] text-[#454943]" dir="ltr">
              select public.bootstrap_first_super_admin(&apos;YOUR_EMAIL&apos;);
            </div>
          </li>
        </ol>

        <div className="flex items-center justify-between pt-2 border-t border-[#D9C9B5]/60">
          <span className="inline-flex items-center gap-1.5 text-xs text-[#556952]">
            <CheckCircle2 size={15} />
            <span>حاوية portfolio-files الخاصة مهيأة عبر روابط موقّعة فقط</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-[#454943] text-white rounded-lg"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};
