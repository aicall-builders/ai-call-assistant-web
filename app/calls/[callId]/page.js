'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { callApi, summaryApi } from '@/lib/api';
import { watchAuthState } from '@/lib/firebase';

// 카테고리별 이모지
const CATEGORY_EMOJI = {
  '예약': '📅',
  '주문': '📦',
  '취소': '❌',
  '환불': '💰',
  '불만': '😤',
  '문의': '❓',
  '칭찬': '🌟',
  '기타': '📌',
};

// 감성별 정보
const SENTIMENT_INFO = {
  positive: { label: '긍정', color: 'bg-green-100 text-green-800', emoji: '😊' },
  neutral: { label: '중립', color: 'bg-gray-100 text-gray-800', emoji: '😐' },
  negative: { label: '부정', color: 'bg-red-100 text-red-800', emoji: '😞' },
};

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId;

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      await loadCallDetail();
    });
    return () => unsubscribe();
  }, [router, callId]);

  const loadCallDetail = async () => {
    setLoading(true);
    try {
      const response = await callApi.get(callId);
      setCall(response.data.call);
    } catch (err) {
      console.error('통화 상세 로딩 실패:', err);
      setError(err.response?.data?.message || '통화 정보를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 시간 포맷
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 통화 길이
  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  // 키워드 파싱 (DB에서 JSON 문자열로 저장됨)
  const parseKeywords = (keywords) => {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    try {
      return JSON.parse(keywords);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </main>
    );
  }

  if (error || !call) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full">
          <p className="text-red-600 mb-4">{error || '통화를 찾을 수 없습니다'}</p>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← 뒤로 가기
          </button>
        </div>
      </main>
    );
  }

  const sentimentInfo = SENTIMENT_INFO[call.sentiment] || SENTIMENT_INFO.neutral;
  const categoryEmoji = CATEGORY_EMOJI[call.category] || '📞';
  const keywords = parseKeywords(call.keywords);

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          ← 뒤로
        </button>

        {/* 통화 정보 헤더 */}
        <header className="bg-white rounded-xl p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-3xl mb-2">{call.caller_category === 'BUSINESS' ? categoryEmoji : '📞'}</div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {call.caller_category === 'BUSINESS'
                  ? (call.caller_number || '발신번호 없음')
                  : (call.caller_number ? '*** ' + call.caller_number.slice(-4) : '통화 녹음 ***')}
              </h1>
              <p className="text-sm text-gray-500">
                {formatDateTime(call.created_at)} · {formatDuration(call.duration)}
              </p>
            </div>
            {call.action_required === 1 && (
              <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                ⚠️ 조치 필요
              </span>
            )}
          </div>

          {/* 카테고리(BUSINESS만) + 감성(항상 표시) 뱃지 */}
          <div className="flex flex-wrap gap-2">
            {call.category && call.caller_category === 'BUSINESS' && (
              <span className="bg-yellow-100 text-yellow-800 text-sm font-semibold px-3 py-1 rounded-full">
                {categoryEmoji} {call.category}
              </span>
            )}
            {call.sentiment && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${sentimentInfo.color}`}>
                {sentimentInfo.emoji} {sentimentInfo.label}
              </span>
            )}
          </div>
        
        </header>

        {/* AI 요약 (BUSINESS만 내용 표시, 나머지는 마스킹) */}
        {call.summary && (
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-4">
            <h2 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span>📝</span>
              <span>AI 요약</span>
            </h2>
            <p className="text-gray-800 leading-relaxed">
              {call.caller_category === 'BUSINESS'
                ? call.summary
                : '🔒 개인정보 보호를 위해 내용이 가려졌습니다'}
            </p>
          </section>
        )}
        {/* 키워드 (BUSINESS만 표시) */}
        {keywords.length > 0 && call.caller_category === 'BUSINESS' && (
          <section className="bg-white rounded-xl p-6 shadow-sm mb-4">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🔍</span>
              <span>핵심 키워드</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="bg-yellow-100 text-yellow-900 text-sm px-3 py-1 rounded-lg"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* STT 전체 텍스트 (BUSINESS만 내용 표시, 나머지는 마스킹) */}
        {call.stt_result && (
          <section className="bg-white rounded-xl p-6 shadow-sm mb-4">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🎙️</span>
              <span>통화 전체 내용</span>
              <span className="text-xs font-normal text-gray-400">(STT 변환)</span>
            </h2>
            {call.caller_category === 'BUSINESS' ? (
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {call.stt_result.split('\n').map((line, idx) => {
                  // [화자1]: 텍스트 형식 분리
                  const match = line.match(/^\[화자([^\]]+)\]:\s*(.*)$/);
                  if (match) {
                    const speaker = match[1];
                    const text = match[2];
                    const isCustomer = speaker === '1';
                    return (
                      <div key={idx} className={`mb-2 flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isCustomer
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-yellow-100 text-gray-900'
                        }`}>
                          <p className="text-xs text-gray-500 mb-1">
                            {isCustomer ? '👤 손님' : '🏪 사장님'}
                          </p>
                          <p className="text-sm">{text}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <p key={idx} className="text-sm text-gray-700 mb-1">
                      {line}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-4xl mb-2">🔒</div>
                <p className="text-sm text-gray-600 font-semibold mb-1">
                  통화 내용이 가려졌습니다
                </p>
                <p className="text-xs text-gray-500">
                  개인 통화는 개인정보 보호를 위해 내용을 표시하지 않습니다
                </p>
              </div>
            )}
          </section>
        )}

        {/* 메타 정보 (디버그용) */}
        <details className="bg-white rounded-xl p-4 shadow-sm">
          <summary className="text-sm text-gray-500 cursor-pointer">
            🔍 메타 정보
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">통화 ID</span>
              <span className="text-gray-900 font-mono">{call.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">상태</span>
              <span className="text-gray-900">{call.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">읽음</span>
              <span className="text-gray-900">{call.is_read === 1 ? '✓' : '안 읽음'}</span>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}