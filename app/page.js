'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 로고 영역 */}
        <div className="text-center mb-12">
          <div className="inline-block bg-yellow-400 text-4xl px-6 py-3 rounded-2xl mb-6">
            📞
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            소상공인 AI 통화 비서
          </h1>
          <p className="text-lg text-gray-600">
            바쁘실 때 놓친 전화, AI가 요약해드려요
          </p>
        </div>

        {/* 기능 소개 카드 3개 */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">🎙️</div>
            <h3 className="font-semibold text-gray-900 mb-1">자동 녹음</h3>
            <p className="text-sm text-gray-600">통화를 자동으로 녹음</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">✍️</div>
            <h3 className="font-semibold text-gray-900 mb-1">AI 요약</h3>
            <p className="text-sm text-gray-600">3줄로 깔끔하게 정리</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-1">키워드 분석</h3>
            <p className="text-sm text-gray-600">예약·주문·문의 자동 분류</p>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-4 rounded-xl text-center transition shadow-sm"
          >
            카카오로 시작하기
          </Link>
          <Link
            href="/dashboard"
            className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-xl text-center border border-gray-200 transition"
          >
            대시보드 (테스트용)
          </Link>
        </div>

        {/* 풋터 - 백엔드 연결 상태 */}
        <p className="text-center text-xs text-gray-400 mt-12">
          API 상태: {process.env.NEXT_PUBLIC_API_BASE_URL ? '✅ 연결됨' : '❌ 미설정'}
        </p>
      </div>
    </main>
  );
}