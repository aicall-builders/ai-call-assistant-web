'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { startSocialLogin } from '@/lib/socialOAuth';
import Logo from '../components/Logo';

const SOCIAL_LOGIN_PROVIDERS = [
  { id: 'kakao', label: '카카오로 시작하기', bg: '#FEE500', color: 'rgba(0,0,0,0.85)' },
  { id: 'google', label: 'Google로 시작하기', bg: '#FFFFFF', color: '#1f2937', border: true },
];

export default function LoginPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setError(params.get('error') || '');
  }, []);

  const handleLogin = (provider) => {
    try {
      startSocialLogin(provider);
    } catch (err) {
      alert(err.message || '로그인을 시작할 수 없습니다.');
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-6 pt-6 pb-8 lg:px-8 bg-surface-page">
      <div className="flex items-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink-primary px-3 py-2 rounded-[10px] hover:bg-surface-card transition-all">
          ← 홈으로
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-[420px] flex flex-col gap-5 lg:max-w-[920px] lg:flex-row lg:items-start lg:gap-10">
        <div className="w-full bg-surface-card rounded-[24px] px-8 py-10 border border-line/60 shadow-card lg:flex-none lg:w-[380px] lg:self-center">
          <div className="mx-auto mb-6 w-[88px] h-[88px] flex items-center justify-center bg-surface-page rounded-[22px] border border-line/60">
            <Logo size={52} />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-2">로그인하고 시작하기</h1>
            <p className="text-[14px] text-ink-secondary leading-relaxed">사용 중인 계정으로 로그인하세요.<br />캘린더 연동은 로그인 후 별도로 연결합니다.</p>
          </div>

          {error && (
            <div className="mt-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800 break-all">
              로그인 실패: {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {SOCIAL_LOGIN_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleLogin(p.id)}
                className={`w-full py-4 px-5 rounded-[14px] font-semibold text-[15px] inline-flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] ${p.border ? 'border border-line' : ''}`}
                style={{ background: p.bg, color: p.color }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="mt-5 text-center text-[12px] text-ink-tertiary leading-[1.5]">
            로그인 시 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
        <aside className="hidden lg:block flex-1 pt-2 pl-2">
          <div className="mb-6">
            <span className="inline-block text-[11px] font-semibold text-brand-blue bg-brand-blue-light px-2.5 py-1 rounded-full mb-3 tracking-wide">
              모바일 앱 권한 안내
            </span>
            <h2 className="text-[22px] font-bold text-ink-primary tracking-tight mb-2">
              이런 권한들을 사용해요
            </h2>
            <p className="text-[14px] text-ink-secondary leading-[1.55]">
              모바일 앱 설치 시 다음 권한이 필요합니다.<br />
              업무에 꼭 필요한 권한만 요청드려요.
            </p>
          </div>
          <div className="flex flex-col gap-3 mb-4">
            <PermissionCard
              title="통화 녹음 파일 접근"
              desc="삼성 통화 녹음 앱이 자동 저장한 음성 파일을 AI가 분석합니다."
            />
            <PermissionCard
              title="연락처 읽기"
              desc="저장된 연락처와 비교해 업무/개인 통화를 자동으로 분류합니다."
            />
            <PermissionCard
              title="알림 전송"
              desc="중요한 통화를 분석하면 알림으로 알려드립니다."
            />
          </div>
          <div className="mt-2 px-3.5 py-3 rounded-[12px] flex gap-2.5 items-start bg-brand-blue-light border border-dashed border-brand-blue/25">
            <p className="text-[12px] text-ink-secondary leading-[1.55]">
              권한은 <strong className="text-ink-primary font-semibold">안드로이드 앱 설치 시 별도로 요청</strong>됩니다.<br />
              웹에서는 통화 내역 조회와 관리만 가능합니다.
            </p>
          </div>
        </aside>
        </div>
      </div>
    </main>
  );
}

function PermissionCard({ title, desc }) {
  return (
    <div className="bg-surface-card border border-line/70 rounded-[16px] px-[18px] py-4 flex gap-3.5 transition-all hover:border-brand-blue/30 hover:translate-x-0.5">
      <div className="flex-none w-10 h-10 rounded-[12px] flex items-center justify-center bg-brand-blue-light text-brand-blue">
        <span className="text-[18px]">•</span>
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-ink-primary mb-1">
          {title}
        </div>
        <div className="text-[12.5px] text-ink-secondary leading-[1.55]">
          {desc}
        </div>
      </div>
    </div>
  );
}
