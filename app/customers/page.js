'use client';

import PageShell from '@/app/components/PageShell';

export default function Page() {
  return (
    <PageShell title="고객관리" active="customers">
      <div className="p-[48px] flex flex-col items-center justify-center gap-[12px] min-h-[360px] text-center">
        <div className="text-[40px]">🚧</div>
        <p className="text-[16px] font-bold text-[#343659]">고객관리 화면 준비 중</p>
        <p className="text-[12px] text-[#99a1b0]">디자인 확정되면 이어서 만들 예정이에요.</p>
      </div>
    </PageShell>
  );
}