import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { usePlatform } from '../../../context/PlatformContext';
import type { RolePermissionSet, UserRole } from '../../../types/platform';
import { getRoleLabelArabic } from '../../../utils/formatters';

export const PermissionsView: React.FC = () => {
  const { permissions, updatePermissions } = usePlatform();

  const permissionRows: { key: keyof RolePermissionSet; label: string; desc: string }[] = [
    { key: 'canUploadFiles', label: 'رفع الملفات والشواهد', desc: 'إضافة مستندات وصور إلى ملف الإنجاز' },
    { key: 'canDeleteOwnFiles', label: 'حذف واستعادة الملفات الخاصة', desc: 'نقل الملفات الخاصة لسلة المحذوفات واستعادتها' },
    { key: 'canCreateCustomSections', label: 'إنشاء أقسام شخصية مخصصة', desc: 'إضافة أقسام فرعية إضافية في الملف الشخصي' },
    { key: 'canManageAllSections', label: 'إدارة الأقسام والحقول الديناميكية', desc: 'إنشاء وتعديل وترتيب أقسام المنصة للجميع' },
    { key: 'canViewAssignedTeachers', label: 'الاطلاع على المعلمين المسندين', desc: 'عرض ملفات المعلمين ضمن المدارس والمجموعات المسندة فقط' },
    { key: 'canReviewPortfolios', label: 'مراجعة واعتماد ملفات الإنجاز', desc: 'كتابة الملاحظات والاعتماد أو طلب الاستكمال' },
    { key: 'canManageUsers', label: 'إدارة حسابات المستخدمين', desc: 'إضافة وتعديل وتفعيل حسابات المعلمين والمديرين' },
    { key: 'canManageSchools', label: 'إدارة المدارس والمجموعات', desc: 'إنشاء وتنظيم المدارس والمجموعات التعليمية' },
    { key: 'canViewReports', label: 'عرض وتصدير التقارير', desc: 'الاطلاع على نسب الإنجاز وتصدير تقارير CSV' },
    { key: 'canEditBranding', label: 'تخصيص الهوية البصرية', desc: 'رفع الشعار وتعديل اسم المنصة وألوانها' },
    { key: 'canEditSettings', label: 'تعديل الإعدادات العامة', desc: 'ضبط أحجام الملفات، الصيغ، وقواعد المنصة' },
  ];

  const roles: UserRole[] = ['super_admin', 'manager', 'teacher'];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#A8B9A5]/25 text-[#556952] flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-[#454943]">مصفوفة الصلاحيات والخصوصية</h2>
          <p className="text-xs text-[#666560] leading-relaxed">
            ضبط صلاحيات الأدوار الثلاثة (مديرة المنصة، مدير العمل، المعلم). عزل ملفات المعلمين يضمن عدم اطلاع أي معلم على ملفات معلم آخر، وسيتم فرض هذه القواعد على مستوى قاعدة البيانات عبر Row Level Security في المرحلة الثانية.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#D9C9B5]/70 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#F7F5F0]/70 border-b border-[#D9C9B5]/60 text-xs font-semibold text-[#666560]">
                <th className="py-3.5 px-5">الصلاحية</th>
                {roles.map((r) => (
                  <th key={r} className="py-3.5 px-5 text-center whitespace-nowrap">
                    {getRoleLabelArabic(r)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9C9B5]/40 text-sm">
              {permissionRows.map((row) => (
                <tr key={row.key} className="hover:bg-[#F7F5F0]/40">
                  <td className="py-3.5 px-5">
                    <p className="font-medium text-[#454943]">{row.label}</p>
                    <p className="text-xs text-[#666560]">{row.desc}</p>
                  </td>
                  {roles.map((role) => {
                    const checked = permissions[role][row.key];
                    const lockedAdmin = role === 'super_admin';
                    return (
                      <td key={role} className="py-3.5 px-5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={lockedAdmin}
                          onChange={(e) =>
                            updatePermissions(role, { [row.key]: e.target.checked })
                          }
                          aria-label={`${row.label} — ${getRoleLabelArabic(role)}`}
                          className="w-4 h-4 accent-[#556952] cursor-pointer disabled:opacity-60"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
