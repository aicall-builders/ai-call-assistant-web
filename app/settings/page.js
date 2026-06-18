'use client';

import { useRouter } from 'next/navigation';
import PageShell from '@/app/components/PageShell';
import { logout } from '@/lib/firebase';

export default function Page() {
  const router = useRouter();
  async function handleLogout() {
    if (!confirm('로그아웃 할까요?')) return;
    await logout();
    router.replace('/');
  }
  return (
    <PageShell title="설정" active="settings">
      <div className="p-[48px] flex flex-col items-center justify-center gap-[16px] min-h-[360px] text-center">
        <div className="text-[40px]">🚧</div>
        <p className="text-[16px] font-bold text-[#343659]">설정 화면 준비 중</p>
        <p className="text-[12px] text-[#99a1b0]">디자인 확정되면 이어서 만들 예정이에요.</p>
        <button onClick={handleLogout} className="mt-[12px] h-[44px] px-[24px] rounded-[12px] bg-[#343659] text-white text-[13px] font-bold hover:opacity-90">로그아웃</button>
      </div>
    </PageShell>
  );
}