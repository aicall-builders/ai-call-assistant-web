"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export default function ConsentPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setToken(searchParams.get("token") || "");
  }, []);


  const submitConsent = async (agreed) => {
    if (!token) {
      setStatus("error");
      setMessage("동의 토큰이 없습니다.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      if (API_BASE_URL) {
        const res = await fetch(`${API_BASE_URL}/consent/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            agreed,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "동의 처리 실패");
        }
      } else {
        window.localStorage.setItem(
          `ai-call-consent:${token}`,
          agreed ? "accepted" : "declined"
        );
      }

      setStatus(agreed ? "accepted" : "declined");
      setMessage(agreed ? "동의가 완료되었습니다." : "동의가 거절되었습니다.");
    } catch (err) {
      setStatus("error");
      setMessage(err?.message || "처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm font-semibold text-slate-500">
            AI 통화비서
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            통화 녹음 분석 동의
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            통화 녹음 파일을 텍스트로 변환하고, 예약·주문·문의 내용을 구조화하기 위한 동의 화면입니다.
          </p>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            동의 요청 정보가 확인되었습니다.
          </div>
        </section>

        <Section title="수집·이용 항목">
          통화 녹음 파일, 통화 일시, 발신자 번호, STT 변환 텍스트, AI 요약 결과, 예약·주문·문의 등 구조화 정보
        </Section>

        <Section title="이용 목적">
          통화 내용 텍스트 변환, 핵심 내용 요약, 예약·주문·변경·클레임 분류, 일정·후속 조치 정보 추출
        </Section>

        <Section title="보관 기간">
          원본 오디오는 기본 30일, STT 텍스트와 요약 정보는 기본 1년 보관 후 삭제됩니다. 사용자가 직접 삭제하면 즉시 삭제됩니다.
        </Section>

        <Section title="처리 위탁">
          AWS, 네이버 CLOVA Speech, OpenAI API, Firebase 등 외부 서비스를 이용할 수 있습니다. 데이터는 서비스 제공 목적 외 AI 학습에 사용하지 않습니다.
        </Section>

        <Section title="동의 철회">
          사용자는 언제든지 통화 데이터 삭제 및 AI 분석 동의 철회를 요청할 수 있습니다.
        </Section>

        {message && (
          <div
            className={[
              "rounded-xl border p-4 text-sm",
              status === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-slate-200 bg-slate-50 text-slate-700",
            ].join(" ")}
          >
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => submitConsent(false)}
            disabled={status === "loading"}
            className="h-12 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            거절
          </button>

          <button
            type="button"
            onClick={() => submitConsent(true)}
            disabled={status === "loading"}
            className="h-12 flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === "loading" ? "처리 중..." : "동의"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-card rounded-2xl border border-line border-slate-200 p-4 text-sm leading-6 text-slate-700">
      <div className="mb-1 font-semibold text-ink-primary text-slate-900">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
