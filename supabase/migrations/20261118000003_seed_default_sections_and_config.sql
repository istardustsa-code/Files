-- ============================================================================
-- Migration 003: Default Platform Config & Suggested Dynamic Sections Seed
-- ============================================================================

insert into public.platform_config (id, branding, permissions, settings)
values (
  'default',
  '{
    "platformName": "ملفاتي",
    "secondaryName": "FILES BY LAMA",
    "tagline": "مساحتك الخاصة لإنجازاتك وملفاتك المهنية",
    "logoDataUrl": null,
    "appIconDataUrl": null,
    "colors": {
      "ivory": "#F7F5F0",
      "white": "#FFFFFF",
      "sage": "#A8B9A5",
      "rose": "#D8BDB7",
      "sand": "#D9C9B5",
      "gray": "#85847E",
      "ink": "#454943"
    }
  }'::jsonb,
  '{
    "super_admin": {
      "canUploadFiles": true,
      "canDeleteOwnFiles": true,
      "canCreateCustomSections": true,
      "canManageAllSections": true,
      "canViewAssignedTeachers": true,
      "canReviewPortfolios": true,
      "canManageUsers": true,
      "canManageSchools": true,
      "canEditBranding": true,
      "canEditSettings": true,
      "canViewReports": true
    },
    "manager": {
      "canUploadFiles": true,
      "canDeleteOwnFiles": true,
      "canCreateCustomSections": false,
      "canManageAllSections": false,
      "canViewAssignedTeachers": true,
      "canReviewPortfolios": true,
      "canManageUsers": false,
      "canManageSchools": false,
      "canEditBranding": false,
      "canEditSettings": false,
      "canViewReports": true
    },
    "teacher": {
      "canUploadFiles": true,
      "canDeleteOwnFiles": true,
      "canCreateCustomSections": true,
      "canManageAllSections": false,
      "canViewAssignedTeachers": false,
      "canReviewPortfolios": false,
      "canManageUsers": false,
      "canManageSchools": false,
      "canEditBranding": false,
      "canEditSettings": false,
      "canViewReports": false
    }
  }'::jsonb,
  '{
    "maxFileSizeMb": 25,
    "allowedFileTypes": ["pdf", "word", "powerpoint", "excel", "image"],
    "allowTeacherCustomSections": true,
    "requireManagerReviewForCompletion": true,
    "autoArchiveDeletedDays": 30,
    "enableEmailDigest": true,
    "enableInAppNotifications": true,
    "sectionCategories": [
      "التعريف المهني",
      "الإنجاز والتميز",
      "التطوير المهني",
      "الممارسة التدريسية",
      "التخطيط",
      "التقويم والتحليل",
      "الابتكار التربوي",
      "الأنشطة المدرسية",
      "التوثيق المرئي",
      "الجودة والأداء",
      "مساحة مرنة"
    ],
    "dashboardWidgets": {
      "showCompletionOverview": true,
      "showStorageOverview": true,
      "showRecentActivities": true,
      "showQuickUpload": true
    }
  }'::jsonb
)
on conflict (id) do nothing;

-- Seed initial editable dynamic sections if table is empty
do $$
begin
  if not exists (select 1 from public.portfolio_sections) then
    insert into public.portfolio_sections
      (title, description, icon_name, accent_color, sort_order, is_active, is_required, is_system_default, category, custom_fields)
    values
      ('السيرة الذاتية', 'البيانات المهنية والمؤهلات العلمية والخبرات التدريسية المحدثة.', 'UserCheck', '#A8B9A5', 1, true, true, true, 'التعريف المهني', '[{"id":"cf-cv-1","label":"المؤهل العلمي الأعلى","type":"text","required":true},{"id":"cf-cv-2","label":"سنوات الخبرة","type":"number","required":true}]'::jsonb),
      ('الإنجازات المهنية', 'توثيق المنجزات الفردية والجماعية والجوائز التربوية.', 'Award', '#D8BDB7', 2, true, true, true, 'الإنجاز والتميز', '[{"id":"cf-ach-1","label":"نطاق الإنجاز","type":"select","required":true,"options":["مدرسة","مكتب تعليم","إدارة تعليم","وطني"]}]'::jsonb),
      ('الشهادات والدورات', 'شهادات التطوير المهني والدورات التدريبية وورش العمل المعتمدة.', 'GraduationCap', '#A8B9A5', 3, true, true, true, 'التطوير المهني', '[{"id":"cf-cert-1","label":"الجهة المانحة","type":"text","required":true},{"id":"cf-cert-2","label":"عدد الساعات التدريبية","type":"number","required":false}]'::jsonb),
      ('الشواهد التعليمية', 'نماذج من استراتيجيات التدريس وأوراق العمل ونتائج التعلم.', 'FileCheck2', '#D9C9B5', 4, true, true, true, 'الممارسة التدريسية', '[]'::jsonb),
      ('الخطط والتحضير', 'الخطط الفصلية وتوزيع المنهج ونماذج التحضير الإلكتروني.', 'CalendarRange', '#A8B9A5', 5, true, true, true, 'التخطيط', '[]'::jsonb),
      ('التقارير', 'تقارير تحليل النتائج والخطط العلاجية والإثرائية.', 'BarChart3', '#D8BDB7', 6, true, false, true, 'التقويم والتحليل', '[]'::jsonb),
      ('المبادرات والمشاريع', 'المبادرات التربوية النوعية والمشاريع الطلابية والمجتمعية.', 'Lightbulb', '#A8B9A5', 7, true, false, true, 'الابتكار التربوي', '[]'::jsonb),
      ('المشاركات والأنشطة', 'توثيق المشاركة في الأيام العالمية والإذاعة واللجان التربوية.', 'Users', '#D9C9B5', 8, true, false, true, 'الأنشطة المدرسية', '[]'::jsonb),
      ('الصور والتوثيق', 'توثيق مرئي للبيئة الصفية والمعارض التعليمية.', 'Image', '#D8BDB7', 9, true, false, true, 'التوثيق المرئي', '[]'::jsonb),
      ('التقييم والأداء', 'بطاقات الزيارات الصفية والتقييم الذاتي ومؤشرات الأداء.', 'ClipboardCheck', '#A8B9A5', 10, true, false, true, 'الجودة والأداء', '[]'::jsonb),
      ('أقسام مخصصة', 'مساحة مرنة للملفات الإضافية أو المبادرات الشخصية.', 'FolderPlus', '#D9C9B5', 11, true, false, true, 'مساحة مرنة', '[]'::jsonb);
  end if;
end $$;
