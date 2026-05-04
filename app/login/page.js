'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { initKakao, loginWithKakao } from '@/lib/kakao';
import { authApi } from '@/lib/api';
import { loginWithFirebaseCustomToken } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkStatus, setSdkStatus] = useState('⏳ 로딩 중');

  // 페이지 진입 시 카카오 SDK 초기화
  useEffect(() => {
    // SDK 로드 완료까지 잠시 기다림
    const timer = setTimeout(() => {
      initKakao();
      if (window.Kakao && window.Kakao.isInitialized()) {
        setSdkStatus('✅ 로드됨');
      } else {
        setSdkStatus('❌ 로드 실패');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  // 카카오 로그인 버튼 클릭 처리
  const handleKakaoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      // 1단계: 카카오 SDK로 로그인 → 카카오 access_token 받기
      console.log('1️⃣ 카카오 로그인 시작...');
      const kakaoAccessToken = await loginWithKakao();
      console.log('✅ 카카오 access_token 받음');

      // 2단계: 백엔드에 access_token 전송 → Firebase Custom Token 받기
      console.log('2️⃣ 백엔드에 인증 요청...');
      const response = await authApi.kakaoLogin(kakaoAccessToken);
      const { custom_token, uid, nickname } = response.data;
      console.log('✅ Firebase Custom Token 받음:', { uid, nickname });

      // 3단계: Firebase Custom Token으로 Firebase 로그인 → ID Token 저장
      console.log('3️⃣ Firebase 로그인 중...');
      await loginWithFirebaseCustomToken(custom_token);
      console.log('✅ Firebase 로그인 완료');

      // 닉네임도 저장 (대시보드에서 환영 메시지용)
      if (nickname) {
        localStorage.setItem('user_nickname', nickname);
      }

      // 4단계: 대시보드로 이동
      console.log('🎉 로그인 성공! 대시보드로 이동');
      router.push('/dashboard');
    } catch (err) {
      console.error('로그인 실패:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          '로그인에 실패했습니다. 다시 시도해주세요.'
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 뒤로가기 */}
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 mb-8 inline-block"
        >
          ← 홈으로
        </Link>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="inline-block bg-yellow-400 text-3xl px-5 py-2 rounded-xl mb-4">
              📞
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              로그인
            </h1>
            <p className="text-sm text-gray-600">
              카카오 계정으로 간편하게 시작하세요
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 카카오 로그인 버튼 */}
          <button
            onClick={handleKakaoLogin}
            disabled={isLoading}
            className="w-full bg-[#FEE500] hover:bg-[#FDD835] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                <span>로그인 중...</span>
              </>
            ) : (
              <>
                <span className="text-xl">💬</span>
                <span>카카오로 시작하기</span>
              </>
            )}
          </button>

          {/* 안내 */}
          <p className="text-center text-xs text-gray-400 mt-6">
            로그인 시 서비스 이용약관에 동의한 것으로 간주됩니다
          </p>
        </div>

        {/* 디버그 정보 (개발 중에만) */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            카카오 SDK: {sdkStatus}
          </p>
        </div>
      </div>
    </main>
  );
}