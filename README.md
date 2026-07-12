# FIANO Web

소상공인을 위한 AI 통화 요약 서비스 FIANO의 웹 관리자 화면입니다. 매장, 통화 내역, AI 요약, 고객 히스토리, 캘린더 연동 상태를 브라우저에서 관리합니다.

## 주요 기능

- 카카오 로그인 및 Firebase 인증
- 매장 등록 및 관리
- 통화 목록 검색·필터링
- 통화 상세 요약 및 음성 재생
- 고객 히스토리 관리
- 수동 파일 업로드
- Google Calendar 연동

## 기술 스택

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Firebase JS SDK
- Kakao JavaScript SDK
- Axios

## 실행 및 빌드

의존성 설치:

```bash
npm install
```

개발 서버:

```bash
npm run dev
```

빌드:

```bash
npm run build
```

## 환경변수

`.env.local`에 설정합니다.

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url/
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

`NEXT_PUBLIC_*` 값은 클라이언트 번들에 포함되는 공개 설정입니다. 서버 비밀 값은 백엔드와 AWS Secrets Manager에서 관리합니다.

## 주요 라우트

| Route | 설명 |
|---|---|
| `/` | 진입 및 로그인 상태 분기 |
| `/login` | 로그인 |
| `/dashboard` | 대시보드 |
| `/stores/new` | 매장 생성 |
| `/stores/[id]/calls` | 매장별 통화 목록 |
| `/calls/[callId]` | 통화 상세 |
| `/auth/google` | Google OAuth 콜백 |

## 배포

정적 빌드 결과물을 S3/CloudFront에 배포합니다. 배포 후 CloudFront 캐시 무효화가 필요할 수 있습니다.

## 관련 저장소

- Backend: [aicall-builders/ai-call-assistant](https://github.com/aicall-builders/ai-call-assistant)
- Web: [aicall-builders/ai-call-assistant-web](https://github.com/aicall-builders/ai-call-assistant-web)
- Android: [aicall-builders/call-recorder-android](https://github.com/aicall-builders/call-recorder-android)
