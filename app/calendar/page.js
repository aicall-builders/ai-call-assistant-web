'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/app/components/PageShell';
import { calendarApi } from '@/lib/api';
import { startCalendarConnect } from '@/lib/calendarOAuth';

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
function eventYMD(ev) {
  const s = ev.start_at; if (!s) return null;
  const [y, m, d] = String(s).split('T')[0].split(' ')[0].split('-').map(Number);
  return { y, m, d };
}
function fmtMonthDay(s) {
  const p = eventYMD({ start_at: s });
  return p ? `${String(p.m).padStart(2, '0')}.${String(p.d).padStart(2, '0')}` : '';
}

const PROVIDERS = [
  { id: 'google', label: 'Google 캘린더' },
];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [calMonth, setCalMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthEvents, setMonthEvents] = useState([]);
  const [dayEvents, setDayEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [busyProvider, setBusyProvider] = useState(null);

  const calYear = calMonth.getFullYear();
  const calMon = calMonth.getMonth();
  const weeks = useMemo(() => buildMonthGrid(calYear, calMon), [calYear, calMon]);

  // 월 일정 (점 표시용)
  useEffect(() => {
    (async () => {
      try {
        const from = ymd(new Date(calYear, calMon, 1));
        const to = ymd(new Date(calYear, calMon + 1, 0));
        const res = await calendarApi.getEvents({ from, to, limit: 300 });
        setMonthEvents(res.data?.events || []);
      } catch (err) { console.error(err); setMonthEvents([]); }
    })();
  }, [calYear, calMon]);

  // 선택 날짜 일정
  useEffect(() => {
    (async () => {
      setLoadingDay(true);
      try {
        const res = await calendarApi.getEvents({ date: ymd(selectedDate) });
        setDayEvents(res.data?.events || []);
      } catch (err) { console.error(err); setDayEvents([]); }
      finally { setLoadingDay(false); }
    })();
  }, [selectedDate]);

  // 다가오는 일정 + 연결 상태
  async function loadConnections() {
    try { const c = await calendarApi.listConnections(); setConnections(c.data?.connections || []); }
    catch (err) { console.error(err); setConnections([]); }
  }
  useEffect(() => {
    (async () => {
      try {
        const t = new Date();
        const to = new Date(); to.setDate(to.getDate() + 60);
        const res = await calendarApi.getEvents({ from: ymd(t), to: ymd(to), limit: 50 });
        setUpcoming(res.data?.events || []);
      } catch (err) { console.error(err); setUpcoming([]); }
    })();
    loadConnections();
  }, []);

  const eventDaySet = useMemo(() => {
    const set = new Set();
    for (const ev of monthEvents) {
      const p = eventYMD(ev);
      if (p && p.y === calYear && p.m === calMon + 1) set.add(p.d);
    }
    return set;
  }, [monthEvents, calYear, calMon]);

  function shiftMonth(delta) { setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + delta, 1)); }
  function pickDay(d) { setSelectedDate(new Date(calYear, calMon, d)); }

  function connOf(provider) { return connections.find((c) => c.provider === provider) || null; }
  async function handleConnect(provider) {
    setBusyProvider(provider);
    try { await startCalendarConnect(provider); }
    catch (err) { console.error(err); alert(err.message || '연결을 시작하지 못했습니다.'); setBusyProvider(null); }
  }
  async function handleDisconnect(provider) {
    if (!confirm(`${provider === 'google' ? 'Google' : '카카오'} 캘린더 연결을 해제할까요?`)) return;
    setBusyProvider(provider);
    try { await calendarApi.disconnect(provider); await loadConnections(); }
    catch (err) { console.error(err); alert(err.response?.data?.error || err.message || '해제 실패'); }
    finally { setBusyProvider(null); }
  }

  const selLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${WEEKDAYS[selectedDate.getDay()]})`;
  const isSelectedInView = selectedDate.getFullYear() === calYear && selectedDate.getMonth() === calMon;

  return (
    <PageShell title="일정관리" active="calendar">
      <div className="px-[24px] pt-[24px]">
        <p className="text-[13px] text-[#99a1b0]">통화에서 등록한 일정을 달력과 목록으로 확인하세요.</p>
      </div>

      {/* 연결 상태 */}
      <div className="px-[24px] pt-[16px]">
        <div className="flex flex-wrap gap-[8px]">
          {PROVIDERS.map((p) => {
            const conn = connOf(p.id);
            const busy = busyProvider === p.id;
            return (
              <div key={p.id} className={`flex items-center gap-[10px] px-[14px] py-[10px] rounded-[12px] border ${conn ? 'border-[#cfe0ff] bg-[#f5f9ff]' : 'border-[#e5e7ef] bg-white'}`}>
                <span className={`w-[8px] h-[8px] rounded-full ${conn ? 'bg-[#1c6bd4]' : 'bg-[#cbd0db]'}`} />
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-[#343659]">{p.label}</span>
                  <span className="text-[10px] text-[#99a1b0]">{conn ? (conn.provider_email || conn.provider_nickname || '연결됨') : '연결 안 됨'}</span>
                </div>
                {conn ? (
                  <button onClick={() => handleDisconnect(p.id)} disabled={busy} className="ml-[4px] text-[11px] text-[#99a1b0] hover:text-[#d94038] disabled:opacity-50">해제</button>
                ) : (
                  <button onClick={() => handleConnect(p.id)} disabled={busy} className="ml-[4px] text-[11px] font-semibold text-[#1c6bd4] hover:underline disabled:opacity-50">{busy ? '...' : '연결'}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-[24px] pt-[20px] pb-[24px] flex gap-[24px] items-start">
        {/* 월 달력 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between px-[8px] mb-[12px]">
            <button onClick={() => shiftMonth(-1)} className="w-[32px] h-[32px] rounded-[8px] text-[20px] text-[#343659] hover:bg-[#f1f2f6]">‹</button>
            <span className="text-[18px] font-bold text-[#343659]">{calYear}년 {calMon + 1}월</span>
            <button onClick={() => shiftMonth(1)} className="w-[32px] h-[32px] rounded-[8px] text-[20px] text-[#343659] hover:bg-[#f1f2f6]">›</button>
          </div>

          <div className="flex w-full mb-[4px]">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`flex-1 text-center text-[12px] font-medium ${i === 0 ? 'text-[#d94038]' : i === 6 ? 'text-[#1c6bd4]' : 'text-[#99a1b0]'}`}>{w}</div>
            ))}
          </div>

          <div className="flex flex-col gap-[4px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex gap-[4px]">
                {week.map((d, ci) => {
                  if (!d) return <div key={ci} className="flex-1 h-[64px]" />;
                  const isSel = isSelectedInView && selectedDate.getDate() === d;
                  const isToday = today.getFullYear() === calYear && today.getMonth() === calMon && today.getDate() === d;
                  const hasEvent = eventDaySet.has(d);
                  const dow = (new Date(calYear, calMon, d)).getDay();
                  return (
                    <button
                      key={ci}
                      onClick={() => pickDay(d)}
                      className={`flex-1 h-[64px] rounded-[10px] flex flex-col items-center pt-[8px] gap-[6px] transition-colors border ${
                        isSel ? 'bg-[#343659] border-[#343659]' : 'border-transparent hover:bg-[#f7f8fb]'
                      }`}
                    >
                      <span className={`text-[13px] font-medium ${
                        isSel ? 'text-white' : isToday ? 'text-[#1c6bd4] font-bold' : dow === 0 ? 'text-[#d94038]' : dow === 6 ? 'text-[#1c6bd4]' : 'text-[#343659]'
                      }`}>{d}</span>
                      {hasEvent && <span className={`w-[5px] h-[5px] rounded-full ${isSel ? 'bg-white' : 'bg-[#1c6bd4]'}`} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 선택 날짜 일정 + 다가오는 일정 */}
        <div className="w-[260px] flex-none flex flex-col gap-[20px]">
          {/* 선택 날짜 일정 */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between pb-[8px] border-b border-[#343659]">
              <span className="text-[14px] font-bold text-[#343659]">{selLabel} 일정</span>
              <span className="text-[11px] text-[#99a1b0]">{dayEvents.length}건</span>
            </div>
            <div className="mt-[12px] flex flex-col gap-[8px]">
              {loadingDay ? (
                <p className="text-[12px] text-[#99a1b0] py-4 text-center">불러오는 중...</p>
              ) : dayEvents.length === 0 ? (
                <p className="text-[12px] text-[#99a1b0] py-4 text-center">이 날 등록된 일정이 없어요.</p>
              ) : (
                dayEvents.map((ev, i) => (
                  <div key={ev.id || i} className="rounded-[10px] border border-[#eceef3] bg-white p-[10px]">
                    <div className="flex items-center gap-[6px]">
                      <span className="text-[12px] font-bold text-[#1c6bd4]">{ev.time}</span>
                      <span className="text-[12px] font-bold text-[#343659] truncate">{ev.title}</span>
                    </div>
                    {ev.description && <p className="mt-[3px] text-[10px] text-[#99a1b0]">{ev.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 다가오는 일정 */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between pb-[8px] border-b border-[#343659]">
              <span className="text-[14px] font-bold text-[#343659]">다가오는 일정</span>
              <span className="text-[11px] text-[#99a1b0]">{upcoming.length}건</span>
            </div>
            <div className="mt-[12px] flex flex-col gap-[8px] max-h-[280px] overflow-y-auto no-scrollbar">
              {upcoming.length === 0 ? (
                <p className="text-[12px] text-[#99a1b0] py-4 text-center">예정된 일정이 없어요.</p>
              ) : (
                upcoming.map((ev, i) => (
                  <div key={ev.id || i} className="flex items-start gap-[10px]">
                    <div className="flex flex-col items-center pt-[1px] flex-none w-[36px]">
                      <span className="text-[10px] font-bold text-[#343659]">{fmtMonthDay(ev.start_at)}</span>
                      <span className="text-[10px] text-[#1c6bd4]">{ev.time}</span>
                    </div>
                    <div className="flex-1 min-w-0 pb-[8px] border-b border-[#f1f2f6]">
                      <p className="text-[12px] font-semibold text-[#343659] truncate">{ev.title}</p>
                      {ev.description && <p className="text-[10px] text-[#99a1b0] truncate">{ev.description}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}