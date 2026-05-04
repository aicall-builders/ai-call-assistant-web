'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { storeApi } from '@/lib/api';

const INDUSTRIES = [
  { value: 'food', label: '🍽️ 음식점/카페' },
  { value: 'beauty', label: '💄 미용/뷰티' },
  { value: 'retail', label: '🛍️ 소매/판매' },
  { value: 'service', label: '🔧 서비스업' },
  { value: 'other', label: '📌 기타' },
];

export default function NewStorePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('food');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 입력값 검증
    if (!name.trim()) {
      setError('가게 이름을 입력해주세요');
      return;
    }
    if (name.trim().length < 2) {
      setError('가게 이름은 2자 이상이어야 합니다');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('가게 등록 요청:', { name, industry });
      const response = await storeApi.create(name.trim(), industry);
      console.log('✅ 가게 등록 성공:', response.data);

      // 성공 → 대시보드로 이동
      router.push('/dashboard');
    } catch (err) {
      console.error('가게 등록 실패:', err);
      setError(
        err.response?.data?.message || '가게 등록에 실패했습니다. 다시 시도해주세요'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 뒤로가기 */}
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block"
        >
          ← 대시보드로
        </Link>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="inline-block bg-yellow-100 text-3xl px-5 py-2 rounded-xl mb-3">
              🏪
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              가게 등록
            </h1>
            <p className="text-sm text-gray-500">
              통화를 관리할 가게 정보를 입력하세요
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 가게 이름 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                가게 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 명동 칼국수"
                maxLength={50}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">
                {name.length}/50자
              </p>
            </div>

            {/* 업종 선택 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                업종
              </label>
              <div className="space-y-2">
                {INDUSTRIES.map((ind) => (
                  <label
                    key={ind.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                      industry === ind.value
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="industry"
                      value={ind.value}
                      checked={industry === ind.value}
                      onChange={(e) => setIndustry(e.target.value)}
                      disabled={isSubmitting}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-900">{ind.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 에러 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 등록 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>등록 중...</span>
                </>
              ) : (
                <span>가게 등록하기</span>
              )}
            </button>
          </form>

          {/* 안내 */}
          <p className="text-center text-xs text-gray-400 mt-6">
            등록 후에도 가게 정보를 수정할 수 있습니다
          </p>
        </div>
      </div>
    </main>
  );
}