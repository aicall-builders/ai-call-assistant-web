'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { keywordApi, storeApi } from '@/lib/api';
import { watchAuthState } from '@/lib/firebase';

export default function StoreKeywordsPage() {
  const params = useParams();
  const router = useRouter();

  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'stores' && pathParts[1] && pathParts[1] !== 'placeholder') {
        setStoreId(pathParts[1]);
      } else if (params.id && params.id !== 'placeholder') {
        setStoreId(params.id);
      }
    }
  }, [params.id]);

  useEffect(() => {
    if (!storeId) return;

    const unsubscribe = watchAuthState(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      await loadData();
    });

    return () => unsubscribe();
  }, [router, storeId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [storesRes, keywordsRes] = await Promise.all([
        storeApi.list(),
        keywordApi.list(storeId),
      ]);
      const currentStore = storesRes.data.stores?.find((store) => store.id === storeId);
      if (currentStore) setStoreName(currentStore.name);
      setKeywords(keywordsRes.data.keywords || []);
    } catch (err) {
      console.error('키워드 로딩 실패:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '키워드를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await keywordApi.create(storeId, { keyword: trimmed });
      const saved = res.data.keyword;
      setKeywords((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setKeyword('');
      setSuccessMsg('키워드를 추가했습니다. 다음 통화 분석부터 중요 통화 분류에 반영됩니다.');
    } catch (err) {
      console.error('키워드 추가 실패:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '키워드 추가에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (keywordId) => {
    if (!confirm('이 키워드를 삭제하시겠어요?')) return;

    setError('');
    setSuccessMsg('');
    try {
      await keywordApi.delete(storeId, keywordId);
      setKeywords((prev) => prev.filter((item) => item.id !== keywordId));
      setSuccessMsg('키워드를 삭제했습니다.');
    } catch (err) {
      console.error('키워드 삭제 실패:', err);
      setError(err.response?.data?.error || err.response?.data?.message || '키워드 삭제에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/stores/${storeId}/calls`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          ← 통화 목록으로
        </Link>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <p className="text-sm text-gray-500 mb-1">{storeName || '가게'} 설정</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">중요 통화 키워드</h1>
          <p className="text-sm text-gray-600 leading-6">
            등록한 키워드가 통화 내용에 포함되면 중요 통화 분류에 반영됩니다.
            캘린더 저장 여부는 키워드만으로 결정하지 않고 통화 맥락을 함께 분석합니다.
          </p>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">키워드 추가</label>
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="예: 노쇼, 세금계산서, 대량주문"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={saving || !keyword.trim()}
              className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:bg-gray-300"
            >
              {saving ? '추가 중' : '추가'}
            </button>
          </div>
        </form>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">등록된 키워드</h2>
            <span className="text-xs text-gray-500">{keywords.length}개</span>
          </div>

          {keywords.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-xl">
              아직 등록된 키워드가 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {keywords.map((item) => (
                <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.keyword}</p>
                    {item.label && item.label !== item.keyword && (
                      <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-600 border border-red-200 rounded-full px-3 py-1 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
