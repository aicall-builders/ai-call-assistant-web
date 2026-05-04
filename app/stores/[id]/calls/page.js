'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { storeApi, callApi } from '@/lib/api';
import { watchAuthState } from '@/lib/firebase';

// 상태별 한국어 라벨 + 색상
const STATUS_INFO = {
  uploaded: { label: '업로드 완료', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'STT 처리 중', color: 'bg-yellow-100 text-yellow-800' },
  transcribed: { label: '변환 완료', color: 'bg-purple-100 text-purple-800' },
  summarized: { label: '요약 완료 ✨', color: 'bg-green-100 text-green-800' },
  error: { label: '오류', color: 'bg-red-100 text-red-800' },
};

export default function StoreCallsPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const storeId = params.id;
  const [storeName, setStoreName] = useState('');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 로그인 확인 + 초기 데이터 로드
  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      await loadData();
    });
    return () => unsubscribe();
  }, [router, storeId]);

  // 가게 정보 + 통화 목록 불러오기
  const loadData = async () => {
    setLoading(true);
    try {
      // 가게 목록에서 현재 가게 찾기
      const storesRes = await storeApi.list();
      const currentStore = storesRes.data.stores?.find((s) => s.id === storeId);
      if (currentStore) {
        setStoreName(currentStore.name);
      }

      // 이 가게의 통화 목록
      const callsRes = await callApi.list({ storeId, limit: 50 });
      setCalls(callsRes.data.calls || []);
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError(err.response?.data?.message || '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 파일 선택 → 업로드 + STT 시작
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 검증
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/ogg'];
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.mp4'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError(`지원하지 않는 파일 형식입니다 (${file.type || ext}). m4a, mp3, wav만 가능해요.`);
      e.target.value = ''; // 선택 초기화
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
      // [1단계] Presigned URL 발급
      console.log('1️⃣ 업로드 URL 요청...');
      setUploadProgress(10);
      const fileFormat = ext.replace('.', '') || 'm4a';

      // 디버깅: 파일 정보 출력
      console.log('📄 파일 정보:', {
        name: file.name,
        type: file.type,
        size: file.size,
        fileFormat: fileFormat,
      });

      const uploadRes = await callApi.requestUpload({
        storeId,
        fileName: file.name,
        fileFormat,
      });
      const { call_id, upload_url } = uploadRes.data;
      console.log('✅ Presigned URL 발급:', call_id);
      console.log('📍 Upload URL (앞 100자):', upload_url.substring(0, 100));

      // [2단계] S3에 직접 업로드 (fetch 사용)
      console.log('2️⃣ S3에 파일 업로드 중...');
      setUploadProgress(30);

      // 백엔드가 발급한 URL의 Content-Type과 정확히 맞춰야 함
      const contentType = `audio/${fileFormat}`;
      console.log('   Content-Type:', contentType);

      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ S3 응답:', uploadResponse.status, errorText);
        throw new Error(`S3 업로드 실패 (${uploadResponse.status}): ${errorText.substring(0, 200)}`);
      }

      console.log('✅ S3 업로드 완료');
      setUploadProgress(70);

      // [3단계] STT 처리 시작
      console.log('3️⃣ STT 처리 시작...');
      await callApi.startProcessing(call_id);
      console.log('✅ STT 처리 시작됨');
      setUploadProgress(100);

      setSuccessMsg(`✅ "${file.name}" 업로드 완료! AI가 분석 중이에요 (1~3분 소요)`);

      // 목록 새로고침
      await loadData();
    } catch (err) {
      console.error('업로드 실패:', err);
      setError(err.response?.data?.message || err.message || '업로드 실패');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = ''; // 같은 파일 다시 선택 가능하도록
    }
  };

  // 시간 포맷팅
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 통화 길이 포맷
  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 뒤로가기 */}
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          ← 대시보드로
        </Link>

        {/* 가게 헤더 */}
        <header className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <div className="text-2xl mb-1">🏪</div>
          <h1 className="text-xl font-bold text-gray-900">{storeName}</h1>
          <p className="text-sm text-gray-500">
            통화 {calls.length}건 · 가게 ID: {storeId?.slice(0, 8)}...
          </p>
        </header>

        {/* 업로드 영역 */}
        <section className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🎙️ 통화 녹음 업로드
          </h2>

          {/* 숨겨진 파일 인풋 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />

          {/* 업로드 영역 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 hover:border-yellow-400 rounded-xl p-8 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <div className="space-y-2">
                <div className="text-2xl">⏳</div>
                <p className="text-sm text-gray-600 font-semibold">
                  업로드 중... {uploadProgress}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-3xl">📁</div>
                <p className="text-sm font-semibold text-gray-900">
                  녹음 파일을 선택하세요
                </p>
                <p className="text-xs text-gray-500">
                  m4a, mp3, wav (최대 50MB)
                </p>
              </div>
            )}
          </button>

          {/* 메시지 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {successMsg}
            </div>
          )}
        </section>

        {/* 통화 목록 */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">📞 통화 목록</h2>
            <button
              onClick={loadData}
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              🔄 새로고침
            </button>
          </div>

          {calls.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-gray-600 mb-1">아직 통화가 없습니다</p>
              <p className="text-sm text-gray-400">
                위에서 녹음 파일을 업로드해보세요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => {
                const status = STATUS_INFO[call.status] || {
                  label: call.status,
                  color: 'bg-gray-100 text-gray-800',
                };
                return (
                  <Link
                    key={call.id}
                    href={`/calls/${call.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-yellow-400 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${status.color}`}>
                            {status.label}
                          </span>
                          {call.is_read === 0 && call.status === 'summarized' && (
                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 font-semibold">
                          {call.caller_number || '발신번호 없음'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(call.created_at)} · {formatDuration(call.duration)}
                        </p>
                      </div>
                    </div>

                    {/* 요약 미리보기 */}
                    {call.summary && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          📝 AI 요약
                          {call.category && (
                            <span className="ml-2 text-blue-700">[{call.category}]</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-800">{call.summary}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 안내 */}
        <p className="text-center text-xs text-gray-400 mt-6">
          AI 분석은 1~3분 정도 걸립니다. 새로고침으로 진행 상황을 확인하세요.
        </p>
      </div>
    </main>
  );
}