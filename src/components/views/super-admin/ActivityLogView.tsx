import React, { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import { formatDateTimeArabic, getRoleLabelArabic } from '../../../utils/formatters';
import type { ActivityLogEntry } from '../../../types/platform';

export const ActivityLogView: React.FC = () => {
  const { activityLogs } = usePlatform();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActivityLogEntry['actionType'] | 'all'>('all');

  const filtered = useMemo(() => {
    return activityLogs
      .filter((log) => (actionFilter === 'all' ? true : log.actionType === actionFilter))
      .filter((log) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          log.actorName.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          (log.targetName ?? '').toLowerCase().includes(q)
        );
      });
  }, [activityLogs, actionFilter, search]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#85847E] pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في سجل النشاطات..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) =>
            setActionFilter(e.target.value as ActivityLogEntry['actionType'] | 'all')
          }
          className="px-3.5 py-2 text-sm bg-[#F7F5F0]/70 border border-[#D9C9B5]/70 rounded-xl text-[#454943]"
        >
          <option value="all">جميع الإجراءات</option>
          <option value="file_upload">رفع ملفات</option>
          <option value="file_update">تحديث ملفات</option>
          <option value="file_delete">حذف ملفات</option>
          <option value="review_submit">مراجعات واعتماد</option>
          <option value="section_update">تعديل الأقسام</option>
          <option value="user_create">إدارة المستخدمين</option>
          <option value="branding_update">الهوية البصرية</option>
        </select>
      </div>

      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl divide-y divide-[#D9C9B5]/40">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F7F5F0] border border-[#D9C9B5]/60 flex items-center justify-center text-[#556952] shrink-0">
                <History size={16} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm text-[#454943]">
                  <span className="font-semibold">{entry.actorName}</span>{' '}
                  <span className="text-xs text-[#666560]">
                    ({getRoleLabelArabic(entry.actorRole)})
                  </span>{' '}
                  — {entry.description}
                </p>
                {entry.targetName && (
                  <p className="text-xs text-[#556952] font-medium">{entry.targetName}</p>
                )}
              </div>
            </div>

            <span className="text-xs text-[#666560] tabular-nums shrink-0">
              {formatDateTimeArabic(entry.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
