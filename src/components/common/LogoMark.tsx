import React from 'react';
import { Folder } from 'lucide-react';
import { usePlatform } from '../../context/PlatformContext';

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

export const LogoMark: React.FC<LogoMarkProps> = ({ size = 'md' }) => {
  const { branding } = usePlatform();

  const dimensions =
    size === 'sm' ? 'w-9 h-9 rounded-lg' : size === 'lg' ? 'w-14 h-14 rounded-xl' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 26 : 20;

  if (branding.logoDataUrl) {
    return (
      <div
        className={`${dimensions} overflow-hidden border border-[#D9C9B5]/80 bg-white flex items-center justify-center shrink-0`}
      >
        <img
          src={branding.logoDataUrl}
          alt={branding.platformName}
          className="w-full h-full object-contain p-1"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Temporary folder icon as requested until platform owner uploads a permanent logo
  return (
    <div
      className={`${dimensions} flex items-center justify-center shrink-0 border border-[#D9C9B5]/80 bg-[#A8B9A5]/25 text-[#454943]`}
      title="شعار مؤقت — يمكن رفعه أو تغييره من الهوية البصرية"
    >
      <Folder size={iconSize} strokeWidth={1.8} />
    </div>
  );
};
