'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeCalendarOAuth } from '@/lib/calendarOAuth';

function NaverCalendarCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '';
    if (!code) {
      router.push('/dashboard?calendar=failed');
      return;
    }
    handleCallback(code, state);
  }, []);

  async function handleCallback(code, state) {
    try {
      await completeCalendarOAuth({ provider: 'naver', code, state });
      router.push('/dashboard?calendar=connected');
    } catch (err) {
      console.error('네이버 캘린더 콜백 처리 실패:', err);
      router.push('/dashboard?calendar=failed');
    }
  }

  return (
    <div className="text-center">
      <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-ink-secondary text-sm">Naver Calendar 연결 처리 중...</p>
    </div>
  );
}

export default function NaverCalendarCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-ink-secondary text-sm">로딩 중...</div>}>
        <NaverCalendarCallback />
      </Suspense>
    </main>
  );
}
