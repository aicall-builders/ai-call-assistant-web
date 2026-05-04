'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [error, setError] = useState('');

  // 로그인 상태 감시 + 가게 목록 불러오기
  useEffect(() => {
    const unsubscribe = watchAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const savedNickname = localStorage.getItem('user_nickname') || '사장님';
        setNickname(savedNickname);
        // 로그인 성공 → 가게 목록 불러오기
        await loadStores();
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // 가게 목록 API 호출
  const loadStores = async () => {
    setStoresLoading(true);
    setError('');
    try {
      const response = await storeApi.list();
      setStores(response.data.stores || []);
    } catch (err) {
      console.error('가게 목록 불러오기 실패:', err);
      setError(err.response?.data?.message || '가게 목록을 불러오지 못했습니다');
    } finally {
      setStoresLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
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
        {/* 헤더 */}
        <header className="bg-white rounded-xl p-5 shadow-sm mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              안녕하세요, {nickname}님 👋
            </h1>
            <p className="text-sm text-gray-500">AI 통화 비서</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </header>

        {/* 가게 목록 섹션 */}
        <section className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">내 가게</h2>
            <Link
              href="/stores/new"
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              + 가게 등록
            </Link>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 로딩 / 빈 상태 / 목록 */}
          {storesLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              불러오는 중...
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">🏪</div>
              <p className="text-gray-600 mb-1">등록된 가게가 없습니다</p>
              <p className="text-sm text-gray-400">
                가게를 등록하면 통화 녹음을 관리할 수 있어요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/stores/${store.id}/calls`}
                  className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-yellow-400 transition cursor-pointer"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {store.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      ID: {store.id?.slice(0, 8)}... · 등록:{' '}
                      {new Date(store.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 디버그 정보 */}
        <details className="bg-white rounded-xl p-5 shadow-sm">
          <summary className="font-semibold text-gray-900 cursor-pointer">
            🔍 디버그 정보
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Firebase UID</span>
              <span className="text-gray-900 font-mono text-xs">
                {user?.uid || '-'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">닉네임</span>
              <span className="text-gray-900">{nickname}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">가게 수</span>
              <span className="text-gray-900">{stores.length}개</span>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}