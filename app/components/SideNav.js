'use client';

import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { id: 'home', label: '홈', href: '/dashboard' },
  { id: 'calls', label: '통화관리', href: '/calls' },
  { id: 'customers', label: '고객관리', href: '/customers' },
  { id: 'calendar', label: '일정관리', href: '/calendar' },
  { id: 'settings', label: '설정', href: '/settings' },
];

export default function SideNav({ active }) {
  const router = useRouter();
  return (
    <nav className="absolute right-full top-[23px] flex flex-col gap-[16px] items-end w-[88px]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            onClick={() => !isActive && router.push(item.href)}
            className={`w-full rounded-l-[24px] flex flex-col items-center justify-center gap-[8px] pl-[16px] pr-[8px] py-[16px] transition-colors ${
              isActive ? 'bg-white text-black cursor-default' : 'bg-[#e4e4e4] text-[#7e7e7e] hover:bg-[#d9d9d9]'
            }`}
          >
            <NavIcon id={item.id} />
            <span className="text-[14px] font-medium text-center">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NavIcon({ id }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 'home': return <svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></svg>;
    case 'calls': return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
    case 'customers': return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case 'calendar': return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'settings': return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    default: return null;
  }
}