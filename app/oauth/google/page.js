'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiBase, getAuthHeaders } from '@/lib/api';
import { loginWithFirebaseCustomToken, auth } from '@/lib/firebase';

function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code) { router.push('/login'); return; }

    // state가 캘린더용 JSON base64인지 확인
    let isCalendar = false;
    try {
      const stateObj = JSON.parse(atob(state));
      if (stateObj.firebase_token) isCalendar = true;
    } catch {}

    if (isCalendar) {
      handleCalendarCallback(code, state);
    } else {
      handleLoginCallback(code);
    }
  }, []);

  async function handleLoginCallback(code) {
    try {
      setMsg('구글 로그인 처리 중...');

      // 1) code → token (구글 토큰 엔드포인트)
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          redirect_uri: `${window.location.origin}/oauth/google`,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.id_token && !tokenData.access_token) {
        throw new Error('구글 토큰 발급 실패: ' + JSON.stringify(tokenData));
      }

      // 2) 백엔드 /auth/google 에 id_token 전달
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_access_token: tokenData.id_token || tokenData.access_token }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`백엔드 오류 ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const customToken = data.custom_token || data.customToken;
      if (!customToken) throw new Error('Custom token 없음');

      // 3) Firebase 로그인
      await loginWithFirebaseCustomToken(customToken);

      // 4) 닉네임 저장
      const nickname = data.user?.nickname || data.name || data.nickname || '사장님';
      localStorage.setItem('user_nickname', nickname);

      // 5) Firebase 완료 대기
      await new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged((user) => {
          if (user) { unsub(); resolve(); }
        });
        setTimeout(resolve, 5000);
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('구글 로그인 실패:', err);
      setMsg(`❌ 로그인 실패: ${err.message}`);
      setTimeout(() => router.push('/login'), 3000);
    }
  }

  async function handleCalendarCallback(code, state) {
    try {
      setMsg('구글 캘린더 연결 중...');
      let firebaseToken = null;
      let realState = state;
      try {
        const stateObj = JSON.parse(atob(state));
        firebaseToken = stateObj.firebase_token;
        realState = stateObj.state;
      } catch {}

      const headers = { 'Content-Type': 'application/json' };
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      } else {
        Object.assign(headers, await getAuthHeaders());
      }

      const res = await fetch(`${getApiBase()}/calendar/connections/oauth-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: 'google',
          code,
          redirect_uri: `${window.location.origin}/oauth/google`,
          state: realState,
        }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      setMsg('✅ Google 캘린더 연결 완료!');
      setTimeout(() => router.push('/calendar/connect'), 1500);
    } catch (err) {
      console.error(err);
      setMsg(`❌ 연결 실패: ${err.message}`);
    }
  }

  function setMsg(text) {
    const el = document.getElementById('msg');
    if (el) el.textContent = text;
  }

  return (
    <div className="text-center p-8">
      <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <div id="msg" className="text-ink-secondary text-sm">구글 처리 중...</div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-center text-sm text-ink-secondary">로딩 중...</div>}>
        <GoogleCallback />
      </Suspense>
    </main>
  );
}
