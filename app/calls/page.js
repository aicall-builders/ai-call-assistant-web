'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/app/components/PageShell';
import { callApi } from '@/lib/api';

function parseInfo(call) {
  let info = call?.extracted_info;
  if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = {}; } }
  return info && typeof info === 'object' ? info : {};
}
function displayName(c) {
  const info = parseInfo(c);
  return c.caller_name || info.customer_name || c.caller_number || '발신번호 없음';
}
function isAnalyzed(c) { return c.status === 'summarized' || !!c.summary; }
function fmtTime(createdAt) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDuration(sec) {
  const s = Number(sec) || 0;
  if (s <= 0) return '0초';
  const m = Math.floor(s / 60), r = s % 60;
  return m > 0 ? `${m}분 ${r}초` : `${r}초`;
}
function resultLabel(c) {
  if (Number(c.action_required) === 1) return '재통화 필요';
  if (c.category) return `${c.category} 처리`;
  return '분석 완료';
}
function statusLabel(c) { return Number(c.action_required) === 1 ? '재통화 필요' : '분석 완료'; }
function visitSchedule(c) {
  const info = parseInfo(c);
  const parts = [info.date, info.time].filter(Boolean);
  return parts.length ? parts.join(' ') : '-';
}
function dateKey(createdAt) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return { key: 'unknown', label: '날짜 미상' };
  const now = new Date();
  const dayDiff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (dayDiff === 0) return { key: 'today', label: '오늘' };
  if (dayDiff === 1) return { key: 'yesterday', label: '어제' };
  return { key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, label: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` };
}

const BADGE = {
  '예약': 'bg-[#edf4ff] text-[#1c6bd4]',
  '문의': 'bg-[#e5f7f0] text-[#0d8061]',
  '취소': 'bg-[#fdecec] text-[#d94038]',
  '불만': 'bg-[#fdecec] text-[#d94038]',
};
function badgeCls(cat) { return BADGE[cat] || 'bg-[#f1f2f6] text-[#343659]'; }

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('done');       // 'done' | 'waiting'
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');   // 'all' | category | '__action'
  const [selectedId, setSelectedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await callApi.list({ limit: 200 });
        setCalls(res.data?.calls || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.response?.data?.message || err.message || '통화를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDelete(e, call) {
    e.stopPropagation();
    e.preventDefault();
    const name = displayName(call);
    if (!confirm(`'${name}' 통화를 삭제할까요?\n삭제하면 복구할 수 없어요.`)) return;
    setDeletingId(call.id);
    try {
      await callApi.delete(call.id);
      setCalls((prev) => prev.filter((c) => c.id !== call.id));
      if (selectedId === call.id) setSelectedId(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.message || err.message || '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAnalyze(e, call) {
    e.stopPropagation();
    e.preventDefault();
    setProcessingId(call.id);
    try {
      await callApi.startProcessing(call.id);
      // 분석 시작됨 → 상태를 processing 으로 즉시 반영
      setCalls((prev) => prev.map((c) => (c.id === call.id ? { ...c, status: 'processing' } : c)));
      // 잠시 후 최신 상태 재조회
      setTimeout(refresh, 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.message || err.message || '분석 시작에 실패했습니다.');
    } finally {
      setProcessingId(null);
    }
  }

  async function refresh() {
    try {
      const res = await callApi.list({ limit: 200 });
      setCalls(res.data?.calls || []);
    } catch (err) {
      console.error(err);
    }
  }

  // 탭 필터 (분석 완료 / 분석 대기)
  const tabCalls = useMemo(
    () => calls.filter((c) => (tab === 'done' ? isAnalyzed(c) : !isAnalyzed(c))),
    [calls, tab]
  );

  // 카테고리 칩 + 카운트
  const chips = useMemo(() => {
    const cats = {};
    let actionCount = 0;
    for (const c of tabCalls) {
      if (c.category) cats[c.category] = (cats[c.category] || 0) + 1;
      if (Number(c.action_required) === 1) actionCount += 1;
    }
    const list = [{ key: 'all', label: '전체', count: tabCalls.length }];
    Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => list.push({ key: cat, label: cat, count: n }));
    if (actionCount > 0) list.push({ key: '__action', label: '재통화 필요', count: actionCount });
    return list;
  }, [tabCalls]);

  // 검색 + 칩 필터 적용
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tabCalls
      .filter((c) => {
        if (filter === '__action') return Number(c.action_required) === 1;
        if (filter !== 'all') return c.category === filter;
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return [c.caller_number, c.caller_name, c.summary, parseInfo(c).customer_name]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [tabCalls, filter, query]);

  // 선택 통화 보정
  useEffect(() => {
    if (!filtered.length) { setSelectedId(null); return; }
    if (!filtered.some((c) => c.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = filtered.find((c) => c.id === selectedId) || null;

  // 날짜 그룹핑
  const groups = useMemo(() => {
    const map = new Map();
    for (const c of filtered) {
      const { key, label } = dateKey(c.created_at);
      if (!map.has(key)) map.set(key, { label, calls: [] });
      map.get(key).calls.push(c);
    }
    return [...map.values()];
  }, [filtered]);

  const top = (
    <section className="w-full flex flex-col items-center pt-[16px] pb-[24px]">
      <div className="w-[332px] flex flex-col gap-[10px]">
        <div>
          <h2 className="text-[20px] font-bold text-white">통화 분석 목록</h2>
          <p className="text-[12px] text-[#dbdeeb] mt-[4px]">검색과 필터로 분석된 통화 내역을 빠르게 확인하세요.</p>
        </div>
        <div className="relative w-full">
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#99a1b0]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="전화번호 또는 요약 검색"
            className="w-full h-[44px] bg-white border border-[#d6d9e5] rounded-[14px] pl-[40px] pr-[14px] text-[12px] text-[#343659] placeholder:text-[#99a1b0] outline-none focus:border-[#1c6bd4]"
          />
        </div>
      </div>
    </section>
  );

  return (
    <PageShell title="통화관리" active="calls" top={top}>
      {/* 상태 탭 */}
      <div className="flex w-full rounded-t-[24px] overflow-hidden">
        {[{ k: 'waiting', t: '분석 대기' }, { k: 'done', t: '분석 완료' }].map((x) => (
          <button
            key={x.k}
            onClick={() => setTab(x.k)}
            className={`flex-1 h-[52px] text-[14px] font-semibold text-center transition-colors ${
              tab === x.k ? 'text-[#343659] border-b-2 border-[#343659]' : 'text-[#99a1b0] border-b border-[#e5e7ef] hover:text-[#343659]'
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>

      <div className="p-[24px] flex flex-col gap-[16px]">
        {/* 필터 칩 */}
        <div className="flex gap-[4px] flex-wrap">
          {chips.map((ch) => {
            const on = filter === ch.key;
            return (
              <button
                key={ch.key}
                onClick={() => setFilter(ch.key)}
                className={`px-[16px] py-[8px] rounded-[16px] text-[12px] whitespace-nowrap transition-colors ${
                  on ? 'bg-[#343659] text-white font-semibold' : 'bg-[#f1f2f6] border border-[#dfe2e8] text-[#343659] font-medium hover:bg-[#e9ebf1]'
                }`}
              >
                {ch.label} {ch.count}
              </button>
            );
          })}
        </div>

        <div className="flex gap-[24px] items-start">
          {/* 통화 리스트 */}
          <div className="flex-1 min-w-0 flex flex-col gap-[24px] max-h-[calc(100vh-320px)] overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-[12px] text-[#99a1b0]">불러오는 중...</div>
            ) : error ? (
              <div className="py-12 text-center text-[12px] text-red-500">{error}</div>
            ) : groups.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-[#99a1b0]">
                {tab === 'done' ? '분석된 통화가 없어요.' : '분석 대기 중인 통화가 없어요.'}
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="flex flex-col">
                  <p className="text-[14px] font-bold text-[#343659] px-[8px]">{g.label}</p>
                  <div className="h-px bg-[#343659] mt-[8px] mb-[16px]" />
                  <div className="flex flex-col gap-[16px]">
                    {g.calls.map((c) => {
                      const sel = c.id === selectedId;
                      const blueSummary = c.category === '예약';
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={`w-full text-left rounded-[14px] p-[14px] border transition-colors ${
                            sel ? 'border-[1.4px] border-[#343659] bg-[#f9f9fc]' : 'border border-[#dfe2e8] bg-white hover:bg-[#fafbfd]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-[8px] min-w-0">
                              <span className="text-[15px] font-bold text-[#343659] truncate">{displayName(c)}</span>
                              <span className="flex-none text-[11px] text-[#99a1b0]">{fmtTime(c.created_at)}</span>
                            </div>
                            <div className="flex-none flex items-center gap-[6px]">
                              <span className={`px-[12px] py-[3px] rounded-[12px] text-[11px] font-semibold ${badgeCls(c.category)}`}>{c.category || '기타'}</span>
                              <button
                                onClick={(e) => handleDelete(e, c)}
                                disabled={deletingId === c.id}
                                title="삭제"
                                className="w-[26px] h-[26px] flex items-center justify-center rounded-[8px] text-[#99a1b0] hover:text-[#d94038] hover:bg-[#fdecec] transition-colors disabled:opacity-40"
                              >
                                {deletingId === c.id ? (
                                  <span className="text-[10px]">···</span>
                                ) : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" /><path d="M10 11v6M14 11v6" /></svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="mt-[14px] flex flex-col gap-[5px]">
                            <div className="flex text-[11px]"><span className="w-[62px] text-[#99a1b0]">통화 시간</span><span className="text-[#343659] font-medium">{fmtDuration(c.duration)}</span></div>
                            <div className="flex text-[11px]"><span className="w-[62px] text-[#99a1b0]">처리 결과</span><span className="text-[#343659] font-medium">{resultLabel(c)}</span></div>
                          </div>
                          {tab === 'waiting' ? (
                            <button
                              onClick={(e) => handleAnalyze(e, c)}
                              disabled={processingId === c.id || c.status === 'processing'}
                              className="mt-[12px] w-full h-[34px] rounded-[8px] bg-[#343659] text-white text-[12px] font-bold flex items-center justify-center gap-[6px] hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                              {c.status === 'processing' ? (
                                <>분석 중...</>
                              ) : processingId === c.id ? (
                                <>시작 중...</>
                              ) : (
                                <><span className="text-[11px]">✦</span> AI 분석 시작</>
                              )}
                            </button>
                          ) : (
                            <div className={`mt-[12px] rounded-[8px] px-[12px] py-[6px] flex items-center gap-[8px] ${blueSummary ? 'bg-[#edf4ff] text-[#1c6bd4]' : 'bg-[#f1f2f6] text-[#343659]'}`}>
                              <span className="text-[9px] font-bold flex-none">✦</span>
                              <span className="text-[10px] truncate">{c.summary || '요약 준비 중'}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 선택 통화 상세 */}
          <div className="w-[216px] flex-none flex flex-col max-h-[calc(100vh-320px)] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-[10px] border-b border-[#343659]">
              <span className="text-[14px] font-bold text-[#343659]">선택 통화 요약</span>
              {selected && <Link href={`/calls/${selected.id}`} className="text-[11px] font-medium text-[#343659] hover:text-[#1c6bd4]">상세보기 →</Link>}
            </div>

            {!selected ? (
              <div className="mt-[16px] py-8 text-center text-[12px] text-[#99a1b0]">통화를 선택하세요.</div>
            ) : (
              <>
                <div className="mt-[16px] bg-[#f1f2f6] rounded-[14px] p-[16px]">
                  <div className="text-[12px] font-bold text-[#343659]">✦ AI 요약</div>
                  <p className="mt-[10px] text-[11px] leading-[1.5] text-[#343659]">{selected.summary || '요약이 아직 없어요.'}</p>
                  <div className="mt-[12px] flex items-center gap-[12px] text-[10px]">
                    <span className="text-[#99a1b0]">처리 상태</span>
                    <span className={`font-bold ${Number(selected.action_required) === 1 ? 'text-[#d94038]' : 'text-[#1c6bd4]'}`}>{statusLabel(selected)}</span>
                  </div>
                </div>

                <div className="mt-[16px] flex flex-col gap-[14px]">
                  {[
                    ['고객명', displayName(selected)],
                    ['연락처', selected.caller_number || '-'],
                    ['분류', selected.category || '-'],
                    ['방문일정', visitSchedule(selected)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start gap-[12px]">
                      <span className="w-[60px] flex-none text-[11px] text-[#99a1b0]">{k}</span>
                      <span className="text-[12px] font-semibold text-[#343659] break-all">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-[20px] flex flex-col gap-[12px]">
                  <Link href={`/calls/${selected.id}`} className="h-[44px] rounded-[12px] bg-[#343659] text-white text-[13px] font-bold flex items-center justify-center hover:opacity-90">캘린더 일정 확인</Link>
                  <Link href={`/calls/${selected.id}`} className="h-[44px] rounded-[12px] bg-[#f1f2f6] border border-[#dfe2e8] text-[#343659] text-[13px] font-semibold flex items-center justify-center hover:bg-[#e9ebf1]">고객에게 메시지 보내기</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}