'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { callApi, storeApi } from '@/lib/api';
import { watchAuthState } from '@/lib/firebase';

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────
const CATEGORY_EMOJI = {
  '예약': '📅', '주문': '📦', '취소': '❌', '환불': '💰',
  '불만': '😤', '문의': '❓', '칭찬': '🌟', '기타': '📌',
};

const SENTIMENT_INFO = {
  positive: { label: '긍정', cls: 'bg-green-100 text-green-800', emoji: '😊' },
  neutral:  { label: '중립', cls: 'bg-surface-muted text-ink-secondary', emoji: '😐' },
  negative: { label: '부정', cls: 'bg-red-100 text-red-800', emoji: '😞' },
};

const STATUS_INFO = {
  uploaded:    { label: '업로드 완료', cls: 'bg-status-uploaded-bg text-status-uploaded-text' },
  processing:  { label: '처리 중',     cls: 'bg-status-processing-bg text-status-processing-text' },
  transcribed: { label: '변환 완료',   cls: 'bg-status-transcribed-bg text-status-transcribed-text' },
  summarized:  { label: '요약 완료',   cls: 'bg-green-100 text-green-700' },
  error:       { label: '오류',        cls: 'bg-status-error-bg text-status-error-text' },
};

const guessStoreEmoji = (name = '') => {
  if (/햄버거|버거/.test(name)) return '🍔';
  if (/카페|coffee|커피/.test(name)) return '☕';
  if (/치킨|닭/.test(name)) return '🍗';
  if (/피자/.test(name)) return '🍕';
  if (/김밥/.test(name)) return '🍙';
  if (/술|호프|주점/.test(name)) return '🍺';
  if (/빵|베이커리/.test(name)) return '🥐';
  if (/돼지|고기|구이/.test(name)) return '🥩';
  return '🏪';
};

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId;

  const [call, setCall] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');

  // ──────────────────────────────────────────────
  // 🔒 인증 + 데이터 로드 (기존 로직 유지)
  // ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [callRes, storesRes] = await Promise.all([
        callApi.get(callId),
        storeApi.list(),
      ]);
      setCall(callRes.data.call);
      setStores(storesRes.data.stores || []);
    } catch (err) {
      console.error('통화 상세 로딩 실패:', err);
      setError(err.response?.data?.message || '통화 정보를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      await loadData();
    });
    return () => unsubscribe();
  }, [router, loadData]);

  // 삭제
  const handleDelete = async () => {
    if (!confirm('이 통화를 삭제하시겠어요? 되돌릴 수 없습니다.')) return;
    try {
      await callApi.delete(callId);
      router.push('/dashboard');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다');
    }
  };

  // ──────────────────────────────────────────────
  // 헬퍼
  // ──────────────────────────────────────────────
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = d >= today;
    const time = d.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `오늘 ${time}`;
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  const parseKeywords = (keywords) => {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    try { return JSON.parse(keywords); } catch { return []; }
  };

  // ──────────────────────────────────────────────
  // STT 파싱 (기존 로직)
  // ──────────────────────────────────────────────
  const sttLines = useMemo(() => {
    if (!call?.stt_result) return [];
    return call.stt_result.split('\n').map((line, idx) => {
      const match = line.match(/^\[화자([^\]]+)\]:\s*(.*)$/);
      if (match) {
        const speaker = match[1];
        const text = match[2];
        return {
          idx,
          speaker,
          isCustomer: speaker === '1',
          text,
          isMatch: true,
        };
      }
      return { idx, text: line, isMatch: false };
    }).filter(x => x.text.trim());
  }, [call?.stt_result]);

  // 통화 원문 복사
  const handleCopyTranscript = async () => {
    if (!call?.stt_result) return;
    try {
      const text = sttLines
        .map(l => l.isMatch ? `${l.isCustomer ? '손님' : '사장님'}: ${l.text}` : l.text)
        .join('\n');
      await navigator.clipboard.writeText(text);
      setCopyMsg('✓ 복사 완료');
      setTimeout(() => setCopyMsg(''), 2000);
    } catch {
      setCopyMsg('복사 실패');
      setTimeout(() => setCopyMsg(''), 2000);
    }
  };

  // ──────────────────────────────────────────────
  // 로딩 / 에러
  // ──────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="text-ink-tertiary text-sm">로딩 중...</div>
      </main>
    );
  }

  if (error || !call) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-page p-4">
        <div className="bg-white rounded-[16px] p-8 max-w-md w-full border border-line">
          <p className="text-red-600 mb-4 text-sm">{error || '통화를 찾을 수 없습니다'}</p>
          <button
            onClick={() => router.back()}
            className="text-sm text-ink-secondary hover:text-ink-primary"
          >
            ← 뒤로 가기
          </button>
        </div>
      </main>
    );
  }

  // ──────────────────────────────────────────────
  // 가공 데이터
  // ──────────────────────────────────────────────
  const isBusiness = call.caller_category === 'BUSINESS';
  const status = STATUS_INFO[call.status] || { label: call.status, cls: 'bg-surface-muted text-ink-secondary' };
  const sentimentInfo = call.sentiment ? SENTIMENT_INFO[call.sentiment] : null;
  const categoryEmoji = call.category ? (CATEGORY_EMOJI[call.category] || '📌') : null;
  const keywords = parseKeywords(call.keywords);
  const store = stores.find(s => s.id === call.store_id);
  const storeName = store?.name || '';
  const storeEmoji = guessStoreEmoji(storeName);

  // 발신번호 표시
  const displayNumber = isBusiness
    ? (call.caller_number || '발신번호 없음')
    : (call.caller_number ? '*** ' + call.caller_number.slice(-4) : '통화 녹음 ***');

  return (
    <main className="min-h-screen bg-surface-page">
      {/* ───────── 상단바 ───────── */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-surface-page/85 border-b border-line">
        <div className="max-w-[720px] mx-auto px-5 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink-primary px-3 py-2 hover:bg-white rounded-[10px] transition-all"
            title="뒤로"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 text-center text-[14px] font-semibold text-ink-primary tracking-tight">
            통화 상세
          </div>
          <button
            onClick={handleDelete}
            className="w-9 h-9 inline-flex items-center justify-center text-ink-tertiary hover:bg-red-50 hover:text-red-600 rounded-[10px] transition-all"
            title="삭제"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-5 pt-6 pb-16">
        {/* ───────── 발신자 카드 ───────── */}
        <section className="bg-white rounded-[16px] p-5 border border-line mb-4 shadow-card animate-fade-up">
          <div className="flex items-center gap-3.5 mb-3.5">
            <div className="flex-none w-12 h-12 bg-brand-blue-light text-brand-blue rounded-full flex items-center justify-center text-[22px]">
              {isBusiness ? '👤' : '🔒'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-bold text-ink-primary tracking-tight mb-0.5">
                {displayNumber}
              </div>
              <div className="text-[13px] text-ink-secondary">
                통화 녹음
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${status.cls}`}>
              {call.status === 'summarized' && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-line">
            <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
              <svg className="text-ink-tertiary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {formatDateTime(call.created_at)}
            </div>
            <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
              <svg className="text-ink-tertiary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
              {formatDuration(call.duration)}
            </div>
          </div>

          {/* 배지들 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {isBusiness && call.category && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 bg-brand-blue-light text-brand-blue-dark">
                {categoryEmoji} {call.category}
              </span>
            )}
            {sentimentInfo && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${sentimentInfo.cls}`}>
                {sentimentInfo.emoji} {sentimentInfo.label}
              </span>
            )}
            {call.action_required === 1 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 bg-status-processing-bg text-status-processing-text">
                ⚠️ 조치 필요
              </span>
            )}
            {storeName && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px] inline-flex items-center gap-1 bg-surface-muted text-ink-secondary">
                {storeEmoji} {storeName}
              </span>
            )}
          </div>
        </section>

        {/* ───────── 오디오 플레이어 (자리만) ───────── */}
        <section className="bg-white rounded-[16px] p-5 border border-line mb-4 relative animate-fade-up anim-delay-100">
          {/* 비활성 오버레이 */}
          <div
            className="absolute inset-0 rounded-[16px] flex flex-col items-center justify-center gap-1 z-[5]"
            style={{ background: 'rgba(245, 246, 250, 0.6)', backdropFilter: 'blur(2px)' }}
          >
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: '#111827' }}
            >
              🎧 음성 듣기
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full ml-0.5"
                style={{ background: 'rgba(255, 217, 59, 0.25)', color: '#FFD93B' }}
              >
                곧 출시
              </span>
            </span>
            <span className="text-[11px] text-ink-tertiary">
              백엔드 준비 후 활성화됩니다
            </span>
          </div>

          {/* 자리 잡기용 UI */}
          <div className="flex items-center gap-3.5">
            <div className="flex-none w-11 h-11 bg-brand-blue text-white rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <div className="flex-1 h-9 flex items-center gap-[2px] overflow-hidden">
              {Array.from({ length: 80 }).map((_, i) => {
                const h = 8 + ((i * 17) % 28);
                const op = 0.35 + (((i * 13) % 50) / 100);
                return (
                  <div
                    key={i}
                    className="w-[2px] bg-brand-blue rounded-[2px]"
                    style={{ height: `${h}px`, opacity: op }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-ink-tertiary font-mono">
            <span>0:00</span>
            <span>{formatDuration(call.duration)}</span>
          </div>
        </section>

        {/* ───────── AI 요약 ───────── */}
        {call.summary && (
          <section className="bg-white rounded-[16px] border border-line mb-4 overflow-hidden animate-fade-up anim-delay-200">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink-primary tracking-tight inline-flex items-center gap-1.5">
                <span style={{ background: 'linear-gradient(135deg,#3B82F6,#1E40AF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>✨</span>
                AI 요약
              </h2>
            </div>
            <div className="px-5 pb-5">
              <div className="bg-brand-blue-light rounded-[12px] px-4 py-3.5 text-[14px] text-ink-primary leading-[1.65]">
                {isBusiness
                  ? call.summary
                  : '🔒 개인정보 보호를 위해 내용이 가려졌습니다'}
              </div>
              {/* 키워드 칩 (BUSINESS만) */}
              {isBusiness && keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {keywords.slice(0, 6).map((kw, idx) => (
                    <span
                      key={idx}
                      className="bg-brand-blue-light text-brand-blue-dark text-[12px] font-semibold px-3 py-1.5 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ───────── 통화 원문 (STT) ───────── */}
        {call.stt_result && (
          <section className="bg-white rounded-[16px] border border-line mb-4 overflow-hidden animate-fade-up anim-delay-300">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink-primary tracking-tight inline-flex items-center gap-1.5">
                💬 통화 원문
              </h2>
              {isBusiness && (
                <button
                  onClick={handleCopyTranscript}
                  className="text-[12px] text-ink-tertiary hover:text-ink-secondary inline-flex items-center gap-1 px-2 py-1 rounded-[8px] hover:bg-surface-muted transition-all"
                >
                  {copyMsg ? (
                    <span className="text-brand-blue">{copyMsg}</span>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      복사
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="px-5 pb-5">
              {isBusiness ? (
                <div className="bg-surface-page rounded-[12px] p-4 max-h-[480px] overflow-y-auto">
                  {sttLines.map((line) => {
                    if (!line.isMatch) {
                      return (
                        <p key={line.idx} className="text-[13px] text-ink-secondary mb-1">
                          {line.text}
                        </p>
                      );
                    }
                    return (
                      <div
                        key={line.idx}
                        className={`flex flex-col mb-3.5 ${line.isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div className={`text-[11px] text-ink-tertiary mb-1 font-mono ${line.isCustomer ? '' : 'text-right'}`}>
                          {line.isCustomer ? '👤 손님' : '🏪 사장님'}
                        </div>
                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-[1.55] rounded-[12px] border ${
                            line.isCustomer
                              ? 'bg-white border-line text-ink-primary'
                              : 'bg-brand-blue border-brand-blue text-white'
                          }`}
                        >
                          {line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-surface-page rounded-[12px] py-8 px-4 text-center">
                  <div className="text-[32px] mb-2">🔒</div>
                  <div className="text-[13px] font-semibold text-ink-secondary mb-1">
                    통화 내용이 가려졌습니다
                  </div>
                  <div className="text-[12px] text-ink-tertiary leading-[1.5]">
                    개인 통화는 개인정보 보호를 위해<br />내용을 표시하지 않습니다
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ───────── 메타 정보 (디버그) ───────── */}
        <details className="bg-white rounded-[12px] border border-line mt-6">
          <summary className="cursor-pointer px-4 py-3 text-[12px] text-ink-tertiary font-mono select-none list-none">
            🔍 메타 정보
          </summary>
          <div className="px-4 pb-3 text-[11px] font-mono text-ink-secondary">
            <div className="flex justify-between py-1.5 border-t border-line">
              <span>통화 ID</span><span>{call.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-line">
              <span>상태</span><span>{call.status}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-line">
              <span>읽음</span><span>{call.is_read === 1 ? '✓' : '안 읽음'}</span>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
