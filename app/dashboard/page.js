'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi, callApi, calendarApi } from '@/lib/api';
<<<<<<< Updated upstream
=======
import { startCalendarConnect } from '@/lib/calendarOAuth';
>>>>>>> Stashed changes
import Logo from '../../app/components/Logo';

const CALENDAR_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'naver', label: 'Naver' },
  { id: 'kakao', label: 'Kakao' },
];

const CATEGORY_LABELS = {
  reservation: '예약',
  order: '주문',
  cancel_refund: '취소/환불',
  complaint: '불만',
  hours_location: '문의',
  price: '가격',
  ingredients_allergy: '알레르기',
  catering_bulk: '단체',
  positive: '칭찬',
  other: '기타',
};

function parseInfo(call) {
  let info = call?.extracted_info;
  if (typeof info === 'string') {
    try { info = JSON.parse(info); } catch { info = {}; }
  }
  return info && typeof info === 'object' ? info : {};
}

function isReservation(call) {
  const info = parseInfo(call);
  const code = info.category_code || call.category;
  return code === 'reservation' || call.category === '예약' || Boolean(info.date && info.time);
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  if (!sec) return '-';
  const n = Number(sec);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatMenu(menu) {
  if (!menu) return '';
  if (Array.isArray(menu)) {
    return menu.map((item) => {
      if (typeof item === 'object' && item) {
        return [item.name, item.qty ? `${item.qty}` : null].filter(Boolean).join(' ');
      }
      return String(item);
    }).join(', ');
  }
  return String(menu);
}

const CALENDAR_PROVIDERS = {
  google: { label: 'Google', shortLabel: 'Google' },
  kakao: { label: '카카오', shortLabel: 'Kakao' },
  naver: { label: '네이버', shortLabel: 'Naver' },
};

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('사장님');
  const [stores, setStores] = useState([]);
  const [calls, setCalls] = useState([]);
<<<<<<< Updated upstream
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [calendarConnections, setCalendarConnections] = useState([]);
  const [calendarBusy, setCalendarBusy] = useState(false);

=======
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
>>>>>>> Stashed changes
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get('calendar');
    const calendarError = params.get('calendar_error');
    if (calendarStatus === 'connected') setMessage('캘린더 연결 완료');
    if (calendarError) setError(`캘린더 연결 실패: ${calendarError}`);
  }, []);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthLoading(false);
        router.replace('/login');
        return;
      }
      setUser(firebaseUser);
      setNickname(localStorage.getItem('user_nickname') || '사장님');
      setAuthLoading(false);
      await loadAll();
    });
    return () => unsubscribe();
  }, [router]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
<<<<<<< Updated upstream
      const [storesRes, callsRes, calendarRes] = await Promise.all([
=======
      const [storesRes, callsRes, calRes] = await Promise.all([
>>>>>>> Stashed changes
        storeApi.list(),
        callApi.list({ limit: 200 }),
        calendarApi.listConnections().catch(() => ({ data: { connections: [] } })),
      ]);
<<<<<<< Updated upstream
      setStores(storesRes.data.stores || []);
      setCalls(callsRes.data.calls || []);
      setCalendarConnections(calendarRes.data.connections || []);
=======
      setStores(storesRes.data?.stores || []);
      setCalls(callsRes.data?.calls || []);
      setConnections(calRes.data?.connections || []);
>>>>>>> Stashed changes
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  async function handleConnect(provider) {
    setError('');
    try {
      await startCalendarConnect(provider);
    } catch (err) {
      setError(err.response?.data?.error || err.message || '캘린더 연결을 시작하지 못했습니다.');
    }
  }

  async function handleSetDefault(provider) {
    try {
      await calendarApi.setDefault(provider);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.message || '기본 캘린더 설정 실패');
    }
  }

  async function handleDisconnect(provider) {
    if (!confirm(`${provider} 캘린더 연결을 해제할까요?`)) return;
    try {
      await calendarApi.disconnect(provider);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.message || '캘린더 연결 해제 실패');
    }
  }

  async function handleCreateCalendarEvent(callId, provider = null) {
    setError('');
    setMessage('');
    try {
      const res = await callApi.createCalendarEvent(callId, provider);
      setMessage(`${res.data?.provider || provider || '기본'} 캘린더에 일정 등록 완료`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || '캘린더 일정 등록 실패');
    }
  }

  async function handleDelete(callId) {
    if (!confirm('이 통화를 삭제할까요?')) return;
    try {
      await callApi.delete(callId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch (err) {
      setError(err.response?.data?.error || err.message || '삭제 실패');
    }
  }

<<<<<<< Updated upstream

  const buildCalendarState = (provider) => {
    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `calendar:${provider}:${randomPart}`;
  };

  const handleCalendarConnect = async (provider) => {
    setCalendarBusy(true);
    setError('');
    try {
      const redirectUri = `${window.location.origin}/oauth/${provider}`;
      const state = buildCalendarState(provider);
      localStorage.setItem(`calendar_oauth_state_${provider}`, state);
      const res = await calendarApi.getAuthorizeUrl(provider, redirectUri, state);
      window.location.href = res.data.authorize_url;
    } catch (err) {
      console.error('캘린더 연결 URL 생성 실패:', err);
      setError(err.response?.data?.error || '캘린더 연결을 시작하지 못했습니다');
      setCalendarBusy(false);
    }
  };

  const handleCalendarDisconnect = async (provider) => {
    if (!confirm(`${CALENDAR_PROVIDERS[provider]?.label || provider} 연결을 해제할까요?`)) return;
    setCalendarBusy(true);
    setError('');
    try {
      await calendarApi.disconnect(provider);
      await loadData();
      setSuccessMsg('캘린더 연결을 해제했습니다');
    } catch (err) {
      console.error('캘린더 연결 해제 실패:', err);
      setError(err.response?.data?.error || '캘린더 연결 해제에 실패했습니다');
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleCalendarDefault = async (provider) => {
    setCalendarBusy(true);
    setError('');
    try {
      await calendarApi.setDefault(provider);
      await loadData();
      setSuccessMsg(`${CALENDAR_PROVIDERS[provider]?.label || provider}을 기본 캘린더로 설정했습니다`);
    } catch (err) {
      console.error('기본 캘린더 설정 실패:', err);
      setError(err.response?.data?.error || '기본 캘린더 설정에 실패했습니다');
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleCalendarCreate = async (callId, provider, e) => {
    e.preventDefault();
    e.stopPropagation();
    setCalendarBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = provider ? { provider } : {};
      const res = await calendarApi.createEventForCall(callId, payload);
      const label = CALENDAR_PROVIDERS[res.data.provider || provider]?.label || '캘린더';
      setSuccessMsg(res.data.already_created ? `${label}에 이미 등록된 예약입니다` : `${label}에 예약을 등록했습니다`);
    } catch (err) {
      console.error('캘린더 등록 실패:', err);
      const status = err.response?.status;
      const message = err.response?.data?.error || '캘린더 등록에 실패했습니다';
      setError(status === 409 ? '먼저 캘린더를 연동해야 합니다' : message);
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleFileSelect = async (e) => {
=======
  async function handleFileSelect(e) {
>>>>>>> Stashed changes
    const file = e.target.files?.[0];
    if (!file) return;
    if (!stores.length) {
      setError('먼저 가게를 등록해주세요.');
      e.target.value = '';
      return;
    }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.mp4'];
    if (!allowedExtensions.includes(ext)) {
      setError('지원하지 않는 파일 형식입니다. m4a, mp3, wav, ogg, mp4만 가능해요.');
      e.target.value = '';
      return;
    }

    const MIME_BY_EXT = { m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg' };
    const fileFormat = ext.slice(1);
    const mimeType = MIME_BY_EXT[fileFormat] || file.type || 'audio/mp4';

    setUploading(true);
    setError('');
    setMessage('');
    try {
      const uploadRes = await callApi.requestUpload({
        storeId: stores[0].id,
        fileName: file.name,
        fileFormat,
        mimeType,
      });
      const { call_id, upload_url, upload_headers } = uploadRes.data;
      await callApi.uploadToS3(upload_url, file, upload_headers || { 'Content-Type': mimeType });
      await callApi.startProcessing(call_id);
      setMessage(`업로드 완료: ${file.name}. AI 분석 중입니다.`);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const defaultProvider = connections.find((c) => c.is_default)?.provider || connections[0]?.provider || null;
  const stats = useMemo(() => ({
    total: calls.length,
    summarized: calls.filter((c) => c.status === 'summarized').length,
    reservations: calls.filter(isReservation).length,
  }), [calls]);

  if (authLoading) {
    return <main className="min-h-screen flex items-center justify-center bg-surface-page text-sm text-ink-tertiary">로딩 중...</main>;
  }

  return (
    <main className="min-h-screen bg-surface-page">
      <header className="sticky top-0 z-10 bg-surface-page/90 backdrop-blur border-b border-line">
        <div className="max-w-[1000px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-brand-blue font-bold text-[15px]">
            <Logo size={22} /> AI 통화 비서
          </Link>
          <div className="flex-1" />
          <Link href="/stores/new" className="text-[13px] border border-line rounded-[10px] px-3 py-2 hover:bg-white">가게 등록</Link>
          <button onClick={handleLogout} className="text-[13px] border border-line rounded-[10px] px-3 py-2 hover:bg-white">로그아웃</button>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-6 pt-7 pb-16">
        <section className="mb-6">
          <h1 className="text-[26px] font-bold text-ink-primary mb-1">안녕하세요, {nickname}님</h1>
          <p className="text-sm text-ink-secondary">소셜 로그인과 캘린더 연동 상태를 여기서 확인합니다.</p>
        </section>

        <section className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="전체 통화" value={stats.total} />
          <StatCard label="요약 완료" value={stats.summarized} />
          <StatCard label="예약 카드" value={stats.reservations} />
        </section>

        <section className="bg-white border border-line rounded-[16px] p-5 mb-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[17px] font-bold text-ink-primary">캘린더 연동</h2>
              <p className="text-[13px] text-ink-secondary">Google / Naver / Kakao 캘린더를 연결한 뒤 예약 카드를 일정으로 등록합니다.</p>
            </div>
            <button onClick={loadAll} disabled={loading} className="text-[12px] border border-line rounded-[8px] px-3 py-2">새로고침</button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {CALENDAR_PROVIDERS.map((p) => {
              const conn = connections.find((c) => c.provider === p.id);
              return (
                <div key={p.id} className="border border-line rounded-[12px] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-ink-primary">{p.label}</span>
                    {conn ? <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">연결됨</span> : <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-2 py-1">미연결</span>}
                  </div>
                  {conn && <p className="text-[12px] text-ink-tertiary mb-3 truncate">{conn.provider_email || conn.provider_nickname || '-'}</p>}
                  <div className="flex flex-wrap gap-2">
                    {!conn ? (
                      <button onClick={() => handleConnect(p.id)} className="text-[12px] bg-brand-blue text-white rounded-[8px] px-3 py-2">연결</button>
                    ) : (
                      <>
                        <button onClick={() => handleSetDefault(p.id)} disabled={conn.is_default} className="text-[12px] border border-line rounded-[8px] px-3 py-2 disabled:opacity-50">{conn.is_default ? '기본' : '기본 설정'}</button>
                        <button onClick={() => handleDisconnect(p.id)} className="text-[12px] border border-red-200 text-red-600 rounded-[8px] px-3 py-2">해제</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

<<<<<<< Updated upstream

        {/* ───────── 캘린더 연동 ───────── */}
        <section className="bg-white border border-line rounded-[14px] p-4 sm:p-5 mb-4 animate-fade-up anim-delay-150">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-[14px] font-bold text-ink-primary">캘린더 연동</h2>
              <p className="text-[12px] text-ink-tertiary mt-0.5">예약 카드의 날짜와 시간을 연결된 캘린더에 바로 등록합니다.</p>
            </div>
            <button
              onClick={loadData}
              disabled={dataLoading || calendarBusy}
              className="text-[12px] text-ink-tertiary hover:text-ink-secondary disabled:opacity-50"
            >
              새로고침
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(CALENDAR_PROVIDERS).map(([provider, meta]) => {
              const connection = calendarConnections.find((item) => item.provider === provider);
              return (
                <div key={provider} className="border border-line rounded-[12px] p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink-primary">{meta.label}</span>
                    {connection ? (
                      <span className="text-[10px] font-bold px-2 py-[2px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {connection.is_default ? '기본' : '연동됨'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-[2px] rounded-full bg-gray-50 text-gray-500 border border-gray-100">미연동</span>
                    )}
                  </div>
                  {connection ? (
                    <div className="flex gap-1.5">
                      {!connection.is_default && (
                        <button
                          onClick={() => handleCalendarDefault(provider)}
                          disabled={calendarBusy}
                          className="flex-1 text-[11px] font-semibold px-2 py-2 rounded-[8px] bg-surface-page text-ink-secondary hover:bg-brand-blue-light hover:text-brand-blue disabled:opacity-50"
                        >
                          기본 설정
                        </button>
                      )}
                      <button
                        onClick={() => handleCalendarDisconnect(provider)}
                        disabled={calendarBusy}
                        className="flex-1 text-[11px] font-semibold px-2 py-2 rounded-[8px] bg-surface-page text-ink-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        해제
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCalendarConnect(provider)}
                      disabled={calendarBusy}
                      className="text-[11px] font-semibold px-2 py-2 rounded-[8px] bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      OAuth 연결
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ───────── 업로드 영역 ───────── */}
        <div className="mb-4 animate-fade-up anim-delay-200">
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
=======
        <section className="bg-white border border-line rounded-[16px] p-5 mb-5">
          <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.mp4" onChange={handleFileSelect} disabled={uploading} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !stores.length} className="w-full border-2 border-dashed border-line rounded-[12px] p-5 text-left hover:border-brand-blue disabled:opacity-50">
            <div className="font-bold text-ink-primary">{uploading ? '업로드 중...' : '통화 녹음 파일 업로드'}</div>
            <div className="text-[13px] text-ink-tertiary">m4a, mp3, wav, ogg, mp4</div>
>>>>>>> Stashed changes
          </button>
        </section>

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800 break-all">{error}</div>}
        {message && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">{message}</div>}

        <section className="flex flex-col gap-3">
          {loading && !calls.length ? (
            <div className="text-center py-12 text-sm text-ink-tertiary">불러오는 중...</div>
          ) : calls.length === 0 ? (
<<<<<<< Updated upstream
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {calls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  store={storeMap[call.store_id]}
                  onDelete={handleDelete}
                  onCalendarCreate={handleCalendarCreate}
                  calendarConnections={calendarConnections}
                  calendarBusy={calendarBusy}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              ))}
=======
            <div className="text-center py-16 px-5 bg-white rounded-[14px] border border-dashed border-line">
              <div className="text-3xl mb-3">📭</div>
              <h3 className="text-[16px] font-bold text-ink-primary mb-1">아직 통화가 없어요</h3>
              <p className="text-[13px] text-ink-secondary">녹음 파일을 업로드하거나 앱에서 자동 동기화를 시작하세요.</p>
>>>>>>> Stashed changes
            </div>
          ) : calls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              connections={connections}
              defaultProvider={defaultProvider}
              onCreateCalendarEvent={handleCreateCalendarEvent}
              onDelete={handleDelete}
            />
          ))}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-[14px] p-4">
      <div className="text-[26px] font-extrabold text-ink-primary">{value}<span className="text-[13px] ml-1 text-ink-tertiary">건</span></div>
      <div className="text-[12px] text-ink-secondary">{label}</div>
    </div>
  );
}

<<<<<<< Updated upstream
// ══════════════════════════════════════════════════════
// 🆕 통화 카드 (라벨식 정돈된 레이아웃)
// ══════════════════════════════════════════════════════
function CallCard({ call, store, onDelete, onCalendarCreate, calendarConnections, calendarBusy, formatDate, formatDuration }) {
  // extracted_info 파싱
  let info = call.extracted_info;
  if (typeof info === 'string') {
    try { info = JSON.parse(info); } catch { info = null; }
  }

  const categoryCode =
    info?.category_code ||
    KO_CATEGORY_MAP[call.category] ||
    'other';

  const catInfo = CATEGORY_INFO[categoryCode] || CATEGORY_INFO.other;
  const badgeStyle = COLOR_STYLES[catInfo.color];

  const phone = call.caller_number || '발신번호 없음';
  const defaultConnection = calendarConnections.find((item) => item.is_default) || calendarConnections[0];
  const canCreateCalendarEvent = categoryCode === 'reservation' && info?.date && info?.time;

// 라벨식 정보 행 만들기 (값 있는 것만)
const rows = [];
if (info?.customer_name) rows.push(['👤 성명', info.customer_name]);
if (info?.date)          rows.push(['📅 날짜', formatNiceDate(info.date)]);
if (info?.time)          rows.push(['🕐 시간', info.time]);
if (info?.party_size)    rows.push(['👥 인원', `${info.party_size}명`]);
if (info?.menu && info.menu.length > 0) rows.push(['🍽️ 메뉴', info.menu.join(', ')]);
if (info?.special_notes) rows.push(['⚠️ 특이사항', info.special_notes]);
=======
function CallCard({ call, connections, defaultProvider, onCreateCalendarEvent, onDelete }) {
  const info = parseInfo(call);
  const category = info.category_code || call.category || 'other';
  const label = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
  const reservation = isReservation(call);
  const menuText = formatMenu(info.menu || info.items);
>>>>>>> Stashed changes

  return (
    <article className="bg-white border border-line rounded-[14px] p-5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center text-[11px] font-bold px-2 py-[3px] rounded-md border bg-blue-50 text-blue-700 border-blue-100">{label}</span>
          <span className="text-[12px] text-ink-tertiary">{formatDateTime(call.created_at)}</span>
          <span className="text-[12px] text-ink-tertiary">· {formatDuration(call.duration)}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/calls/${call.id}`} className="text-[12px] border border-line rounded-[8px] px-3 py-2 hover:bg-surface-page">상세</Link>
          <button onClick={() => onDelete(call.id)} className="text-[12px] border border-red-200 text-red-600 rounded-[8px] px-3 py-2">삭제</button>
        </div>
      </div>

      <div className="text-[20px] font-bold text-ink-primary mb-3 tabular-nums">{call.caller_number || '발신번호 없음'}</div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] mb-3">
        {info.customer_name && <Info label="성명" value={info.customer_name} />}
        {info.date && <Info label="날짜" value={info.date} />}
        {info.time && <Info label="시간" value={info.time} />}
        {info.party_size && <Info label="인원" value={`${info.party_size}명`} />}
        {menuText && <Info label="메뉴/항목" value={menuText} />}
        {info.special_notes && <Info label="특이사항" value={info.special_notes} />}
      </div>

<<<<<<< Updated upstream
      {/* ─── 라벨-값 정보 리스트 ─── */}
      {rows.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start gap-3 text-[13px]">
              <span className="flex-none w-20 text-ink-tertiary">{label}</span>
              <span className="flex-1 text-ink-primary font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}



      {canCreateCalendarEvent && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={(e) => onCalendarCreate(call.id, defaultConnection?.provider, e)}
            disabled={calendarBusy || !defaultConnection}
            className="inline-flex items-center justify-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-[9px] bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={defaultConnection ? `${CALENDAR_PROVIDERS[defaultConnection.provider]?.label || defaultConnection.provider} 캘린더에 등록` : '먼저 캘린더를 연동하세요'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="12" y1="14" x2="12" y2="18"/>
              <line x1="10" y1="16" x2="14" y2="16"/>
            </svg>
            {defaultConnection ? `${CALENDAR_PROVIDERS[defaultConnection.provider]?.shortLabel || defaultConnection.provider} 등록` : '캘린더 연동 필요'}
          </button>
          <span className="text-[11px] text-ink-tertiary">{formatNiceDate(info.date)} {info.time}</span>
        </div>
      )}

      {/* ─── 초록색 AI 요약 박스 ─── */}
=======
>>>>>>> Stashed changes
      {call.summary && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[10px] px-3.5 py-3 mb-3">
          <div className="text-[11px] font-bold text-emerald-700 mb-1">AI 요약</div>
          <div className="text-[13px] text-emerald-900 leading-relaxed">{call.summary}</div>
        </div>
      )}

      {reservation && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/60">
          <span className="text-[12px] text-ink-secondary">캘린더 등록:</span>
          <button
            onClick={() => onCreateCalendarEvent(call.id, defaultProvider)}
            disabled={!connections.length}
            className="text-[12px] bg-brand-blue text-white rounded-[8px] px-3 py-2 disabled:opacity-50"
          >
            기본 캘린더
          </button>
          {connections.map((conn) => (
            <button key={conn.provider} onClick={() => onCreateCalendarEvent(call.id, conn.provider)} className="text-[12px] border border-line rounded-[8px] px-3 py-2 hover:bg-surface-page">
              {conn.provider}
            </button>
          ))}
          {!connections.length && <span className="text-[12px] text-red-600">먼저 캘린더를 연결하세요.</span>}
        </div>
      )}
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 flex-none text-ink-tertiary">{label}</span>
      <span className="font-medium text-ink-primary break-all">{value}</span>
    </div>
  );
}
