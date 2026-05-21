import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';

// .env.local에서 Firebase 설정 읽기
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 앱 초기화 (이미 초기화되어 있으면 기존 거 사용)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth 인스턴스
export const auth = getAuth(app);

// ============ 유틸리티 함수들 ============

// Custom Token으로 로그인 → ID Token 받아서 localStorage에 저장
export async function loginWithFirebaseCustomToken(customToken) {
  // Firebase에 Custom Token으로 로그인
  const userCredential = await signInWithCustomToken(auth, customToken);
  
  // ID Token 추출 (백엔드 API에 보낼 토큰)
  const idToken = await userCredential.user.getIdToken();
  
  // 브라우저 저장소에 저장 (api.js가 자동으로 헤더에 붙임)
  localStorage.setItem('firebase_id_token', idToken);
  localStorage.setItem('firebase_uid', userCredential.user.uid);
  
  return userCredential.user;
}

// 로그아웃
export async function logout() {
  await signOut(auth);
  localStorage.removeItem('firebase_id_token');
  localStorage.removeItem('firebase_uid');
}

// 로그인 상태 확인 (페이지 진입 시 호출)
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const idToken = await user.getIdToken();
      localStorage.setItem('firebase_id_token', idToken);
      localStorage.setItem('firebase_uid', user.uid);
      callback(user);
    } else {
      callback(null);
    }
  });
}

export default app;