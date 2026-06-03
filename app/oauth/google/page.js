<<<<<<< Updated upstream
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeCalendarOAuth } from '@/lib/calendarOAuth';

function GoogleCalendarCallback() {
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
      await completeCalendarOAuth({ provider: 'google', code, state });
      router.push('/dashboard?calendar=connected');
    } catch (err) {
      console.error('구글 캘린더 콜백 처리 실패:', err);
      router.push('/dashboard?calendar=failed');
    }
  }

  return (
    <div className="text-center">
      <div className="inline-block w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-ink-secondary text-sm">Google Calendar 연결 처리 중...</p>
    </div>
  );
}

export default function GoogleCalendarCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-ink-secondary text-sm">로딩 중...</div>}>
        <GoogleCalendarCallback />
      </Suspense>
    </main>
=======
import { Suspense } from 'react';
import OAuthCallbackClient from '../OAuthCallbackClient';

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center">로딩 중...</main>}>
      <OAuthCallbackClient provider="google" />
    </Suspense>
>>>>>>> Stashed changes
  );
}
