# 명운당

[https://sajume-wook.vercel.app](https://sajume-wook.vercel.app) · 오늘의 운을 풀어주는 곳

이름·생년월일·시간·성별·양력/음력을 입력하면 Gemini AI가 사주 기본 차트를 추정하고 해석해 주는 웹 서비스입니다.  
게스트는 미리보기로 바로 체험하고, Google 로그인 후 전체 해석 저장·기록 관리·공유가 가능합니다.

## 주요 기능

- **게스트 사주 보기** — 로그인 없이 입력 후 해석. 결과는 미리보기(잠금), 전체 열람·저장은 로그인 유도
- **Google 로그인** — Supabase Auth OAuth. 게스트 결과는 로그인·프로필 등록 후 자동 저장
- **회원 기록** — 프로필 기반 재풀이, 사이드바에서 기록 목록·선택·삭제
- **해석 편집** — 저장된 해석 수정·재해석(Gemini 재호출)
- **공유 링크** — `/result/:shareToken`로 결과 공유 (Web Share / 클립보드)
- **스트리밍 UI** — Gemini 응답을 실시간 표시, 마크다운 렌더링, 로딩 스켈레톤
- **GA4** — 페이지뷰·주요 전환 이벤트(로그인, 사주 제출, 공유 등) 추적

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI | React 19, Vite 8, react-router-dom 7 |
| AI | `@google/genai` (Gemini `gemini-3.6-flash`, Interactions API) |
| 백엔드 | Supabase (Auth, Postgres, RPC) |
| 기타 | react-markdown, Oxlint, Vercel, Google Analytics 4 |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.example`을 복사해 `.env`를 만듭니다.

```bash
cp .env.example .env
```

```env
VITE_GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

| 변수 | 설명 |
|------|------|
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) API 키 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable(anon) 키 |

> `.env`는 Git에 포함되지 않습니다. 키를 커밋하지 마세요.  
> `VITE_` 변수는 브라우저에 노출됩니다. 공개 배포 시에는 서버에서 API를 호출하는 방식을 권장합니다.

### Google 로그인 (Supabase Auth)

1. Supabase Dashboard → **Authentication → Sign In / Providers**에서 Google을 활성화합니다.
2. Google Cloud Console OAuth 클라이언트의 **Authorized redirect URI**에 등록합니다.
   - `https://<프로젝트-ref>.supabase.co/auth/v1/callback`
3. Supabase Dashboard → **Authentication → URL Configuration**
   - **Site URL**: `http://localhost:5173` (로컬) / 배포 URL
   - **Redirect URLs**: `http://localhost:5173`, `http://localhost:5173/**`, 배포 URL

### 3. 개발 서버

```bash
npm run dev
```

기본 주소: `http://localhost:5173`  
`.env`를 수정했다면 개발 서버를 재시작하세요.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |
| `npm run lint` | Oxlint 검사 |

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 메인 앱 (게스트 / 회원 플로우) |
| `/result/:shareToken` | 공유된 사주 결과 |
| `*` | `/`로 리다이렉트 |

## 사용 흐름

1. 이름, 생년월일, 성별을 입력합니다. (시간은 선택)
2. 양력/음력을 선택하고 **사주 보기**를 누릅니다.
3. 해석이 스트리밍으로 표시됩니다. 게스트는 미리보기만 볼 수 있습니다.
4. Google로 로그인하면 전체 해석을 보고 기록으로 저장할 수 있습니다.
5. 저장된 결과는 사이드바에서 다시 보거나, **공유하기**로 링크를 보낼 수 있습니다.

## 폴더 구조

```
sajume-wook/
├── public/                 # favicon, 캐릭터 이미지, robots/sitemap
├── src/
│   ├── App.jsx             # 메인 UI 조합
│   ├── main.jsx            # Router 진입
│   ├── pages/
│   │   └── SharedResultPage.jsx
│   ├── hooks/
│   │   ├── useSajuApp.js   # 인증·프로필·기록·해석
│   │   └── useToast.js
│   ├── lib/
│   │   ├── gemini.js
│   │   ├── supabase.js
│   │   ├── sajuPrompt.js
│   │   └── analytics.js
│   ├── components/
│   │   ├── auth/           # LoginModal, ProfileModal
│   │   ├── saju/           # 게스트/회원 폼, 결과, 수정
│   │   ├── sidebar/
│   │   ├── hero/
│   │   ├── profile/
│   │   └── common/         # Toast, AnalyticsRouteTracker
│   ├── utils/              # share, profileForm, pendingReading, format
│   ├── styles/app.css
│   └── constants/
├── vercel.json
├── .env.example
└── index.html
```

## 배포

Vercel에 연결되어 있으며, SPA 라우팅은 `vercel.json` rewrite로 처리합니다.

- 라이브: [https://sajume-wook.vercel.app](https://sajume-wook.vercel.app)
- 저장소: [https://github.com/sw8606/sajume-wook](https://github.com/sw8606/sajume-wook)

배포 환경에도 위 `VITE_*` 환경 변수를 설정하세요.

## 참고

해석은 AI가 입력값을 바탕으로 **추정**한 결과이며, 전문 명리학 상담을 대체하지 않습니다.
