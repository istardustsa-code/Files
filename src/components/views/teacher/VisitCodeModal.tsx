import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Eye,
  Power,
  RefreshCw,
  Share2,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { usePlatform } from '../../../context/PlatformContext';
import { formatDateTimeArabic } from '../../../utils/formatters';

interface VisitCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function isVisitLogActiveNow(lastSeenAt: string, isLive: boolean): boolean {
  if (!isLive) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs >= -5000 && diffMs <= 45000;
}

export const VisitCodeModal: React.FC<VisitCodeModalProps> = ({ isOpen, onClose }) => {
  const {
    myVisitCode,
    myVisitLogs,
    visitCodeLoading,
    loadMyVisitData,
    toggleMyVisitCode,
    regenerateMyVisitCode,
    pushToast,
  } = usePlatform();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void loadMyVisitData(false);

    const intervalId = window.setInterval(() => {
      void loadMyVisitData(true);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [isOpen, loadMyVisitData]);

  const activeNowCount = myVisitLogs.filter((l) => isVisitLogActiveNow(l.lastSeenAt, l.isLive)).length;
  const isCodeActive = Boolean(myVisitCode?.isActive);
  const codeValue = myVisitCode?.code ?? '---';

  const handleCopyCode = async () => {
    if (!myVisitCode?.code) return;
    try {
      await navigator.clipboard.writeText(myVisitCode.code);
      setCopiedCode(true);
      pushToast('تم نسخ كود الزيارة المؤقتة');
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      pushToast('تعذر النسخ التلقائي، يمكنكِ تحديد الكود ونسخه يدوياً', 'warning');
    }
  };

  const handleCopyInviteMessage = async () => {
    if (!myVisitCode?.code) return;
    const shareText = `السلام عليكم، تفضلي بالاطلاع على ملف الإنجاز الخاص بي عبر منصة ملفاتي:\nالرابط: ${window.location.origin}\nمن صفحة الدخول اختاري تبويب «كود الزيارة المؤقتة» وأدخلي الكود التالي:\n${myVisitCode.code}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedMessage(true);
      pushToast('تم نسخ رسالة الدعوة والرابط والكود جاهزة للإرسال للمديرة');
      window.setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      pushToast('تعذر النسخ التلقائي للرسالة', 'warning');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="كود الزيارة المؤقتة للمديرة"
      subtitle="أرسلي هذا الكود لمديرتكِ للاطلاع على ملفك وشواهدك فقط دون صلاحية تعديل أو حذف، وتحكمي في تفعيله ومتابعة الزيارات متى شئتِ."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Activation Status & Toggle Card */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${
            isCodeActive
              ? 'bg-[#A8B9A5]/18 border-[#A8B9A5]/70'
              : 'bg-[#F7F5F0]/80 border-[#D9C9B5]/80'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCodeActive ? 'bg-[#3F573C]' : 'bg-[#85847E]'
                }`}
              />
              <h3 className="text-sm font-semibold text-[#454943]">
                {isCodeActive
                  ? 'الكود مفعل حالياً — يُسمح بالدخول للاطلاع فقط'
                  : 'الكود متوقف حالياً — لا يمكن لأحد الدخول به'}
              </h3>
            </div>
            <p className="text-xs text-[#666560]">
              {isCodeActive
                ? 'عند إيقاف الكود، يُغلق العرض فوراً لدى أي زائرة متواجدة الآن.'
                : 'فعّلي الكود عندما ترغبين في السماح للمديرة بالدخول، وأوقفيه متى انتهت.'}
            </p>
          </div>

          <button
            type="button"
            disabled={visitCodeLoading}
            onClick={() => void toggleMyVisitCode(!isCodeActive)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors whitespace-nowrap disabled:opacity-60 ${
              isCodeActive
                ? 'bg-[#8A5E56] text-white hover:bg-[#744D46]'
                : 'bg-[#556952] text-white hover:bg-[#455742]'
            }`}
          >
            <Power size={15} />
            <span>{isCodeActive ? 'إيقاف الدخول بالكود' : 'تفعيل الدخول بالكود'}</span>
          </button>
        </div>

        {/* Unique Visit Code Box + Copy/Share/Regenerate */}
        <div className="bg-white border border-[#D9C9B5]/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs text-[#666560] block mb-1">
                كود الزيارة المؤقتة الخاص بكِ
              </span>
              <div className="flex items-center gap-2.5">
                <Ticket size={18} className="text-[#556952] shrink-0" />
                <span
                  dir="ltr"
                  className="text-xl sm:text-2xl font-bold tracking-widest font-mono-num text-[#454943] select-all"
                >
                  {codeValue}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F7F5F0] border border-[#D9C9B5] text-[#454943] hover:bg-[#EFECE4] rounded-xl"
              >
                {copiedCode ? <Check size={14} className="text-[#3F573C]" /> : <Copy size={14} />}
                <span>{copiedCode ? 'تم النسخ' : 'نسخ الكود'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyInviteMessage}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl"
              >
                {copiedMessage ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copiedMessage ? 'تم نسخ الدعوة' : 'نسخ رسالة للمديرة'}</span>
              </button>
              <button
                type="button"
                disabled={visitCodeLoading}
                onClick={() => void regenerateMyVisitCode()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#D9C9B5] text-[#666560] hover:text-[#454943] rounded-xl disabled:opacity-60"
                title="إصدار كود جديد وإلغاء القديم"
              >
                <RefreshCw size={13} />
                <span>تغيير الكود</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#556952] bg-[#F7F5F0]/70 px-3 py-2 rounded-xl">
            <ShieldCheck size={14} className="shrink-0" />
            <span>
              الشخص الذي يدخل بالكود لا يرى إلا ملفكِ أنتِ، ولا يستطيع تعديل أو حذف أو إضافة أي ملف أو صورة إطلاقاً.
            </span>
          </div>
        </div>

        {/* Real-Time Stats: Live Presence & Visit Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className={`rounded-2xl border p-4 flex items-center gap-3 ${
              activeNowCount > 0
                ? 'bg-[#A8B9A5]/15 border-[#A8B9A5]/70'
                : 'bg-white border-[#D9C9B5]/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeNowCount > 0
                  ? 'bg-[#3F573C] text-white'
                  : 'bg-[#F7F5F0] text-[#666560]'
              }`}
            >
              <Eye size={18} />
            </div>
            <div>
              <span className="text-[11px] text-[#666560] block">التواجد والمشاهدة الآن</span>
              <p className="text-sm font-semibold text-[#454943]">
                {activeNowCount > 0
                  ? `متواجدة الآن وتشاهد الملف (${activeNowCount})`
                  : 'لا يوجد زائر متصل حالياً'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9C9B5]/80 bg-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] text-[#556952] flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[11px] text-[#666560] block">إجمالي مرات الدخول بالكود</span>
              <p className="text-sm font-semibold text-[#454943] tabular-nums">
                {myVisitCode?.totalVisits ?? 0} مرة
              </p>
            </div>
          </div>
        </div>

        {/* Visit Logs History */}
        <div className="bg-white border border-[#D9C9B5]/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-[#454943] flex items-center gap-1.5">
              <Clock size={14} className="text-[#556952]" />
              <span>سجل الزيارات والأوقات ({myVisitLogs.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => void loadMyVisitData(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#F7F5F0] text-[#454943] hover:bg-[#D9C9B5]/40 rounded-lg"
            >
              <RefreshCw size={12} />
              <span>تحديث السجل</span>
            </button>
          </div>

          {myVisitLogs.length === 0 ? (
            <p className="text-xs text-[#666560] text-center py-6">
              لم يدخل أحد باستخدام كود الزيارة المؤقتة بعد.
            </p>
          ) : (
            <div className="divide-y divide-[#D9C9B5]/50 max-h-60 overflow-y-auto">
              {myVisitLogs.map((log) => {
                const liveNow = isVisitLogActiveNow(log.lastSeenAt, log.isLive);
                return (
                  <div
                    key={log.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-medium text-[#454943]">
                        {log.visitorLabel}
                      </p>
                      <p className="text-[11px] text-[#666560] tabular-nums">
                        وقت الدخول: {formatDateTimeArabic(log.enteredAt)}
                        {!liveNow && ` · آخر تواجد: ${formatDateTimeArabic(log.endedAt ?? log.lastSeenAt)}`}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                        liveNow
                          ? 'bg-[#A8B9A5]/30 text-[#3F573C]'
                          : 'bg-[#F7F5F0] text-[#666560]'
                      }`}
                    >
                      {liveNow ? 'متواجدة تشاهد الآن' : 'غادرت الجلسة'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
