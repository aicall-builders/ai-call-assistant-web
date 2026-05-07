'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi, callApi } from '@/lib/api';
import Logo from '../../app/components/Logo';

// ──────────────────────────────────────────────────────
// 상수 (안드와 동일한 분류)
// ──────────────────────────────────────────────────────
const CALLER_CATEGORIES = [
  { value: 'UNCLASSIFIED', label: '미분류', emoji: '📋' },
  { value: 'BUSINESS',     label: '업무',   emoji: '💼' },
  { value: 'PERSONAL',     label: '개인',   emoji: '👤' },
];

const STATUS_INFO = {
  uploaded:    { label: '업로드 완료', cls: 'bg-status-uploaded-bg text-status-uploaded-text' },
  processing:  { label: '처리 중',     cls: 'bg-status-processing-bg text-status-processing-text' },
  transcribed: { label: '변환 완료',   cls: 'bg-status-transcribed-bg text-status-transcribed-text' },
  summarized:  { label: '요약 완료 ✨', cls: 'bg-status-summarized-bg text-status-summarized-text' },
  error:       { label: '오류',        cls: 'bg-status-error-bg text-status-error-text' },
};

// 가게 이모지 자동 매핑 (이름에 따라)
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

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // 인증/사용자
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // 데이터
  const [stores, setStores] = useState([]);
  const [calls, setCalls] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // UI 상태
  const [selectedCategory, setSelectedCategory] = useState('UNCLASSIFIED');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ──────────────────────────────────────────────────────
  // 🔒 인증 + 데이터 로드 (기존 로직 유지)
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = watchAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const savedNickname = localStorage.getItem('user_nickname') || '사장님';
        setNickname(savedNickname);
        await loadData();
      } else {
        router.push('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    setDataLoading(true);
    setError('');
    try {
      // 가게 목록 + 통화 목록 동시 호출
      const [storesRes, callsRes] = await Promise.all([
        storeApi.list(),
        callApi.list({ limit: 200 }), // storeId 없이 → 모든 가게 통화
      ]);
      setStores(storesRes.data.stores || []);
      setCalls(callsRes.data.calls || []);
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError(err.response?.data?.message || '데이터를 불러오지 못했습니다');
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 분류 변경 (기존 로직 유지)
  const handleChangeCategory = async (callId, newCategory, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await callApi.updateCategory(callId, newCategory);
      setCalls((prev) =>
        prev.map((c) =>
          c.id === callId ? { ...c, caller_category: newCategory } : c
        )
      );
    } catch (err) {
      console.error('분류 변경 실패:', err);
      alert('분류 변경에 실패했습니다');
    }
  };

  // 통화 삭제 (기존 로직 유지)
  const handleDelete = async (callId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('이 통화를 삭제하시겠어요? 되돌릴 수 없습니다.')) return;
    try {
      await callApi.delete(callId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다');
    }
  };

  // 파일 업로드 (기존 로직 유지) — 첫 번째 가게에 업로드
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (stores.length === 0) {
      setError('먼저 가게를 등록해주세요');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/ogg'];
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.mp4'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError(`지원하지 않는 파일 형식입니다 (${file.type || ext}). m4a, mp3, wav만 가능해요.`);
      e.target.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('파일이 너무 큽니다. 50MB 이하만 가능해요.');
      e.target.value = '';
      return;
    }

    setError('');
    setSuccessMsg('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const fileFormat = ext.replace('.', '') || 'm4a';
      const storeId = stores[0].id; // 첫 가게에 업로드

      setUploadProgress(10);
      const uploadRes = await callApi.requestUpload({
        storeId,
        fileName: file.name,
        fileFormat,
      });
      const { call_id, upload_url } = uploadRes.data;

      setUploadProgress(30);
      const contentType = `audio/${fileFormat}`;
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`S3 업로드 실패 (${uploadResponse.status}): ${errorText.substring(0, 200)}`);
      }

      setUploadProgress(70);
      await callApi.startProcessing(call_id);
      setUploadProgress(100);

      setSuccessMsg(`✅ "${file.name}" 업로드 완료! AI가 분석 중이에요 (1~3분)`);
      await loadData();
    } catch (err) {
      console.error('업로드 실패:', err);
      setError(err.response?.data?.message || err.message || '업로드 실패');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // ──────────────────────────────────────────────────────
  // 🧮 가공 데이터 (메모이제이션)
  // ──────────────────────────────────────────────────────
  const storeMap = useMemo(() => {
    const m = {};
    stores.forEach((s) => { m[s.id] = s; });
    return m;
  }, [stores]);

  // 오늘의 통계 (당일 통화)
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCalls = calls.filter((c) => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= today;
    });
    return {
      total: todayCalls.length,
      summarized: todayCalls.filter((c) => c.status === 'summarized').length,
      newCount: todayCalls.filter((c) => c.is_read === 0 && c.status === 'summarized').length,
    };
  }, [calls]);

  // 카테고리별 카운트 (탭 배지용)
  const categoryCounts = useMemo(() => {
    const counts = { UNCLASSIFIED: 0, BUSINESS: 0, PERSONAL: 0 };
    calls.forEach((c) => {
      const cat = c.caller_category || 'UNCLASSIFIED';
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [calls]);

  // 선택된 카테고리의 통화만
  const filteredCalls = useMemo(() => {
    return calls.filter(
      (c) => (c.caller_category || 'UNCLASSIFIED') === selectedCategory
    );
  }, [calls, selectedCategory]);

  // ──────────────────────────────────────────────────────
  // 포맷 헬퍼
  // ──────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }, []);

  // ──────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="text-ink-tertiary text-sm">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-page">
      {/* ───────── 상단바 ───────── */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-surface-page/85 border-b border-line">
        <div className="max-w-[900px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-brand-blue font-bold text-[15px] tracking-tight">
            <Logo size={22} />
            AI 통화 비서
          </Link>
          <div className="flex-1" />
          <Link
            href="/stores/new"
            className="inline-flex items-center justify-center w-9 h-9 text-ink-secondary border border-line rounded-[10px] hover:bg-white hover:text-ink-primary transition-all"
            title="가게 관리"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-ink-secondary border border-line px-3 py-2 rounded-[10px] text-[13px] font-medium hover:bg-white hover:text-ink-primary transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 pt-7 pb-16">
        {/* ───────── 환영 ───────── */}
        <div className="mb-6 animate-fade-up">
          <h1 className="text-[26px] font-bold text-ink-primary tracking-tight mb-1">
            안녕하세요, {nickname}님 <span className="inline-block animate-[wave_2.5s_ease-in-out_0.4s_2] origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-ink-secondary text-sm">오늘도 좋은 하루 되세요</p>
        </div>

        {/* ───────── 오늘의 통계 ───────── */}
        <section
          className="rounded-[20px] p-6 sm:p-7 text-white mb-6 relative overflow-hidden animate-fade-up anim-delay-100"
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' }}
        >
          <div
            className="absolute -top-10 -right-10 w-[200px] h-[200px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
          />
          <div className="flex items-center justify-between mb-4 relative">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/85 tracking-wide">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              오늘의 통화
            </span>
            <span className="text-[12px] text-white/60">{todayDateStr}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 relative">
            <StatItem num={todayStats.total} name="총 통화" />
            <StatItem num={todayStats.summarized} name="요약 완료" />
            <StatItem num={todayStats.newCount} name="새 통화" />
          </div>
        </section>

        {/* ───────── 탭 ───────── */}
        <div className="bg-white rounded-[14px] p-1 mb-4 flex gap-1 border border-line animate-fade-up anim-delay-200">
          {CALLER_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.value];
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex-1 py-3 px-4 text-sm font-semibold rounded-[10px] transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-brand-blue text-white'
                    : 'bg-transparent text-ink-tertiary hover:text-ink-secondary'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/25 text-white' : 'bg-surface-muted text-ink-secondary'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ───────── 업로드 영역 ───────── */}
        <div className="mb-4 animate-fade-up anim-delay-300">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || stores.length === 0}
            className="w-full bg-white border-2 border-dashed border-line rounded-[14px] p-4 sm:p-5 flex items-center gap-3 text-left transition-all hover:border-brand-blue hover:bg-brand-blue-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex-none w-11 h-11 bg-brand-blue-light text-brand-blue rounded-[12px] flex items-center justify-center">
              {uploading ? (
                <span className="text-xl">⏳</span>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {uploading ? (
                <>
                  <div className="text-[14px] font-semibold text-ink-primary mb-1">업로드 중... {uploadProgress}%</div>
                  <div className="w-full bg-surface-muted rounded-full h-1.5">
                    <div
                      className="bg-brand-blue h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[14px] font-semibold text-ink-primary mb-0.5">통화 녹음 파일 업로드</div>
                  <div className="text-[12px] text-ink-tertiary">m4a, mp3, wav (최대 50MB)</div>
                </>
              )}
            </div>
          </button>
        </div>

        {/* 메시지 */}
        {error && (
          <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-3.5 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">
            {successMsg}
          </div>
        )}

        {/* ───────── 통화 카드 리스트 ───────── */}
        <div className="animate-fade-up anim-delay-400">
          {dataLoading && calls.length === 0 ? (
            <div className="text-center py-12 text-ink-tertiary text-sm">불러오는 중...</div>
          ) : calls.length === 0 ? (
            <EmptyState />
          ) : filteredCalls.length === 0 ? (
            <EmptyTab category={selectedCategory} />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredCalls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  store={storeMap[call.store_id]}
                  onChangeCategory={handleChangeCategory}
                  onDelete={handleDelete}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              ))}
            </div>
          )}
        </div>

        {/* 새로고침 버튼 (작게) */}
        {calls.length > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={loadData}
              disabled={dataLoading}
              className="text-[12px] text-ink-tertiary hover:text-ink-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={dataLoading ? 'animate-spin' : ''}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              새로고침
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0); }
          20% { transform: rotate(14deg); }
          40% { transform: rotate(-8deg); }
        }
      `}</style>
    </main>
  );
}

// ──────────────────────────────────────────────────────
// 통계 아이템
// ──────────────────────────────────────────────────────
function StatItem({ num, name }) {
  return (
    <div>
      <div className="text-[28px] sm:text-[30px] font-extrabold tracking-tight leading-none mb-1.5 tabular-nums">
        {num}
        <span className="text-[14px] sm:text-[15px] font-semibold text-white/70 ml-0.5">건</span>
      </div>
      <div className="text-[12px] text-white/70">{name}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 통화 카드
// ──────────────────────────────────────────────────────
function CallCard({ call, store, onChangeCategory, onDelete, formatDate, formatDuration }) {
  const status = STATUS_INFO[call.status] || { label: call.status, cls: 'bg-surface-muted text-ink-secondary' };
  const cat = call.caller_category || 'UNCLASSIFIED';

  // 발신번호 표시 (안드 정책: BUSINESS만 전체, 나머지 마스킹)
  const displayNumber = (() => {
    if (cat === 'BUSINESS') return call.caller_number || '발신번호 없음';
    return call.caller_number ? '*** ' + call.caller_number.slice(-4) : '통화 녹음 ***';
  })();

  const storeName = store?.name || '';
  const storeEmoji = guessStoreEmoji(storeName);

  return (
    <Link
      href={`/calls/${call.id}`}
      className="block bg-white border border-line rounded-[14px] p-4 sm:p-[18px] cursor-pointer transition-all hover:border-brand-blue hover:translate-x-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* 상단 배지들 */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-[3px] rounded-md tracking-wide ${status.cls}`}>
              {status.label}
            </span>
            {call.is_read === 0 && call.status === 'summarized' && (
              <span className="text-[10px] font-bold px-[7px] py-[3px] rounded-full bg-status-new-bg text-status-new-text tracking-wide">
                NEW
              </span>
            )}
            {call.action_required === 1 && (
              <span className="text-[10px] font-bold px-[7px] py-[3px] rounded-full bg-status-processing-bg text-status-processing-text">
                ⚠️ 조치 필요
              </span>
            )}
            {storeName && (
              <span className="text-[10px] font-semibold px-2 py-[3px] rounded-md bg-surface-muted text-ink-secondary">
                {storeEmoji} {storeName}
              </span>
            )}
          </div>

          {/* 발신번호 */}
          <div className="text-[15px] font-semibold text-ink-primary mb-0.5">
            {displayNumber}
          </div>

          {/* 메타 */}
          <div className="text-[12px] text-ink-tertiary mb-2">
            {formatDate(call.created_at)} · {formatDuration(call.duration)}
          </div>

          {/* 요약 (BUSINESS만 표시) */}
          {call.summary && (
            <div className="bg-brand-blue-light rounded-[10px] px-3 py-2.5 mt-2">
              <div className="text-[10px] font-bold text-brand-blue mb-1 flex items-center gap-1">
                📝 AI 요약
                {cat === 'BUSINESS' && call.category && (
                  <span className="text-brand-blue-dark">[{call.category}]</span>
                )}
              </div>
              <div className="text-[13px] text-ink-secondary leading-snug line-clamp-2">
                {cat === 'BUSINESS'
                  ? call.summary
                  : '🔒 개인정보 보호를 위해 내용이 가려졌습니다'}
              </div>
            </div>
          )}

          {/* 분류 버튼 (안드와 동일 패턴) */}
          {cat === 'UNCLASSIFIED' && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={(e) => onChangeCategory(call.id, 'BUSINESS', e)}
                className="flex-1 py-2 px-3 bg-brand-blue text-white border border-brand-blue rounded-[9px] text-[12px] font-semibold hover:bg-brand-blue-hover transition-all"
              >
                💼 업무
              </button>
              <button
                onClick={(e) => onChangeCategory(call.id, 'PERSONAL', e)}
                className="flex-1 py-2 px-3 bg-white text-ink-secondary border border-line rounded-[9px] text-[12px] font-semibold hover:bg-surface-muted transition-all"
              >
                👤 개인
              </button>
            </div>
          )}
          {cat === 'BUSINESS' && (
            <button
              onClick={(e) => onChangeCategory(call.id, 'PERSONAL', e)}
              className="mt-2.5 w-full py-2 px-3 bg-white text-ink-secondary border border-line rounded-[9px] text-[12px] font-semibold hover:bg-surface-muted transition-all"
            >
              👤 개인으로 변경
            </button>
          )}
          {cat === 'PERSONAL' && (
            <button
              onClick={(e) => onChangeCategory(call.id, 'BUSINESS', e)}
              className="mt-2.5 w-full py-2 px-3 bg-white text-ink-secondary border border-line rounded-[9px] text-[12px] font-semibold hover:bg-surface-muted transition-all"
            >
              💼 업무로 변경
            </button>
          )}
        </div>

        {/* 우측 액션 */}
        <button
          onClick={(e) => onDelete(call.id, e)}
          className="flex-none w-7 h-7 rounded-[8px] text-ink-tertiary hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all"
          title="삭제"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────
// 빈 상태 (통화 0건)
// ──────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center py-16 px-5 bg-white rounded-[14px] border border-dashed border-line">
      <div className="w-16 h-16 mx-auto mb-3.5 bg-surface-page rounded-[18px] flex items-center justify-center text-3xl">
        📭
      </div>
      <h3 className="text-[16px] font-bold text-ink-primary mb-1">아직 통화가 없어요</h3>
      <p className="text-[13px] text-ink-secondary leading-snug">
        위에서 녹음 파일을 업로드하거나<br />
        안드로이드 앱을 설치해 자동 동기화를 시작해보세요
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// 빈 탭 (해당 카테고리에 통화 없음)
// ──────────────────────────────────────────────────────
function EmptyTab({ category }) {
  const cat = CALLER_CATEGORIES.find((c) => c.value === category);
  return (
    <div className="text-center py-12 text-ink-tertiary">
      <div className="text-4xl mb-2">{cat?.emoji}</div>
      <p className="text-[13px]">{cat?.label} 통화가 없어요</p>
    </div>
  );
}