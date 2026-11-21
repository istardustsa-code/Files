import React, { useState } from 'react';
import { Bell, CheckCheck, Send } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { formatDateTimeArabic } from '../../../utils/formatters';
import type { NotificationItem, UserRole } from '../../../types/platform';
import { EmptyState } from '../../common/EmptyState';

export const NotificationsView: React.FC = () => {
  const {
    currentRole,
    visibleNotifications,
    schools,
    groups,
    assignedSchools,
    assignedGroups,
    markNotificationRead,
    markAllNotificationsRead,
    sendNotification,
  } = usePlatform();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole | 'all'>('teacher');
  const [targetSchoolId, setTargetSchoolId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [category, setCategory] = useState<NotificationItem['category']>('إعلان');

  const canSend = currentRole === 'super_admin' || currentRole === 'manager';
  const availableSchools = currentRole === 'super_admin' ? schools : assignedSchools;
  const availableGroups = (currentRole === 'super_admin' ? groups : assignedGroups).filter(
    (g) => !targetSchoolId || g.schoolId === targetSchoolId
  );

  const effectiveSchoolId =
    currentRole === 'manager' && !targetSchoolId && !targetGroupId
      ? availableSchools[0]?.id || ''
      : targetSchoolId;

  const filtered = visibleNotifications.filter((n) =>
    filter === 'unread' ? !n.isRead : true
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    sendNotification({
      title: title.trim(),
      message: message.trim(),
      targetRole: currentRole === 'manager' && targetRole === 'manager' ? 'teacher' : targetRole,
      targetSchoolId: effectiveSchoolId || undefined,
      targetGroupId: targetGroupId || undefined,
      category,
    });
    setTitle('');
    setMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className={`${canSend ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
        <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === 'all' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
              }`}
            >
              الكل ({visibleNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === 'unread' ? 'bg-white text-[#454943] shadow-xs' : 'text-[#666560]'
              }`}
            >
              غير المقروءة ({visibleNotifications.filter((n) => !n.isRead).length})
            </button>
          </div>

          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#556952] hover:bg-[#A8B9A5]/20 rounded-lg transition-colors whitespace-nowrap"
          >
            <CheckCheck size={15} />
            <span>تحديد الكل كمقروء</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="لا توجد إشعارات حالياً"
            description="ستظهر هنا التنبيهات الإدارية وملاحظات المراجعة فور صدورها."
          />
        ) : (
          <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl divide-y divide-[#D9C9B5]/50">
            {filtered.map((item) => {
              const scopeSchool = schools.find((s) => s.id === item.targetSchoolId);
              const scopeGroup = groups.find((g) => g.id === item.targetGroupId);
              return (
                <div
                  key={item.id}
                  className={`p-5 transition-colors ${!item.isRead ? 'bg-[#A8B9A5]/10' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#666560]">
                        <span className="font-semibold text-[#556952]">{item.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.senderName}</span>
                        {(scopeSchool || scopeGroup) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {scopeSchool?.name}
                              {scopeGroup ? ` — ${scopeGroup.name}` : ''}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTimeArabic(item.createdAt)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#454943]">{item.title}</h3>
                      <p className="text-sm text-[#666560] leading-relaxed">{item.message}</p>
                    </div>

                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(item.id)}
                        className="px-3 py-1.5 text-xs font-medium text-[#454943] bg-white border border-[#D9C9B5] rounded-lg hover:bg-[#F7F5F0] whitespace-nowrap shrink-0"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canSend && (
        <form
          onSubmit={handleSend}
          className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-6 space-y-4"
        >
          <h3 className="text-base font-semibold text-[#454943]">إرسال إشعار جديد</h3>
          <p className="text-xs text-[#666560]">
            {currentRole === 'super_admin'
              ? 'أرسل تعميماً عاماً على مستوى المنصة أو خصّصه لمدرسة أو مجموعة محددة.'
              : 'أرسل تنبيهاً للمعلمات داخل المدارس والمجموعات المسندة إليك فقط.'}
          </p>

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">الفئة المستهدفة</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as UserRole | 'all')}
              className="w-full px-3 py-2 text-sm bg-[#F7F5F0]/60 border border-[#D9C9B5] rounded-xl text-[#454943]"
            >
              {currentRole === 'super_admin' && <option value="all">جميع المستخدمين</option>}
              <option value="teacher">المعلمون فقط</option>
              {currentRole === 'super_admin' && <option value="manager">مديرو العمل فقط</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">نطاق المدرسة</label>
            <select
              value={effectiveSchoolId}
              onChange={(e) => {
                setTargetSchoolId(e.target.value);
                setTargetGroupId('');
              }}
              className="w-full px-3 py-2 text-sm bg-[#F7F5F0]/60 border border-[#D9C9B5] rounded-xl text-[#454943]"
              required={currentRole === 'manager' && !targetGroupId}
            >
              {currentRole === 'super_admin' && <option value="">جميع المدارس (تعميم عام)</option>}
              {availableSchools.length === 0 && currentRole === 'manager' && (
                <option value="">لا توجد مدرسة مسندة</option>
              )}
              {availableSchools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {availableGroups.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#454943] mb-1">
                المجموعة التعليمية (اختياري)
              </label>
              <select
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F7F5F0]/60 border border-[#D9C9B5] rounded-xl text-[#454943]"
              >
                <option value="">كل مجموعات المدرسة المحددة</option>
                {availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">التصنيف</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as NotificationItem['category'])}
              className="w-full px-3 py-2 text-sm bg-[#F7F5F0]/60 border border-[#D9C9B5] rounded-xl text-[#454943]"
            >
              <option value="إعلان">إعلان</option>
              <option value="تذكير">تذكير</option>
              <option value="مراجعة">مراجعة</option>
              <option value="نظام">نظام</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">عنوان الإشعار</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: موعد تسليم شواهد الفصل"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#454943] mb-1">نص الرسالة</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب محتوى التنبيه بوضوح..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#D9C9B5] rounded-xl text-[#454943]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={
              currentRole === 'manager' && availableSchools.length === 0 && availableGroups.length === 0
            }
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#454943] text-white hover:bg-[#353833] rounded-xl transition-colors disabled:opacity-50"
          >
            <Send size={15} />
            <span>إرسال الإشعار</span>
          </button>
        </form>
      )}
    </div>
  );
};
