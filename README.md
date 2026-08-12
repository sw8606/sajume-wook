# 사주미

이름·생년월일·시간·성별·양력/음력을 입력하면 Gemini AI가 사주 기본 차트를 추정하고 해석해 주는 웹 서비스입니다.

## 주요 기능

- 사주 정보 입력 폼 (이름, 생년월일, 태어난 시간, 성별, 양력/음력)
- Gemini (`gemini-3.6-flash`) 기반 사주 해석
- 응답 스트리밍: 글자가 생성되는 대로 실시간 표시
- 로딩 스켈레톤 UI
- 마크다운 렌더링으로 해석 결과 가독성 향상

## 기술 스택

- React 19 + Vite 8
- `@google/genai` (Interactions API)
- `react-markdown`

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고해 프로젝트 루트에 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

`.env`에 Gemini API 키를 입력합니다.

```env
VITE_GEMINI_API_KEY=발급받은_API_키
```

API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급받을 수 있습니다.

### Google 로그인 (Supabase Auth)

1. Supabase Dashboard → **Authentication → Sign In / Providers**에서 Google을 활성화합니다.
2. Google Cloud Console OAuth 클라이언트의 **Authorized redirect URI**에 아래를 등록합니다.
   - `https://<프로젝트-ref>.supabase.co/auth/v1/callback`
3. Supabase Dashboard → **Authentication → URL Configuration**에서 다음을 설정합니다.
   - **Site URL**: `http://localhost:5173` (로컬 개발)
   - **Redirect URLs**: `http://localhost:5173`, `http://localhost:5173/**`
4. 배포 도메인이 있으면 Site URL·Redirect URLs에 배포 URL도 추가합니다.

> `.env`는 Git에 포함되지 않습니다. 키를 절대 커밋하지 마세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 안내된 주소(기본 `http://localhost:5173`)로 접속합니다.

`.env`를 수정했다면 개발 서버를 재시작해야 키가 반영됩니다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | Oxlint 검사 |

## 폴더 구조

```
sajume-wook/
├── public/           # 정적 파일 (favicon 등)
├── src/
│   ├── App.jsx       # 입력 폼 · 결과 화면
│   ├── App.css       # 스타일
│   ├── gemini.js     # Gemini API 호출 (스트리밍)
│   ├── sajuPrompt.js # 사주 해석 시스템 프롬프트
│   ├── main.jsx      # 앱 진입점
│   └── index.css
├── .env.example
└── index.html
```

## 사용 방법

1. 이름, 생년월일, 성별을 입력합니다. (시간은 선택)
2. 양력/음력을 선택합니다.
3. **사주 보기**를 누릅니다.
4. 스켈레톤 이후 해석 텍스트가 실시간으로 채워집니다.

## 참고

- 해석은 AI가 입력값을 바탕으로 **추정**한 결과이며, 전문 명리학 상담을 대체하지 않습니다.
- `VITE_` 환경 변수는 브라우저에 노출됩니다. 공개 배포 시에는 서버에서 API를 호출하는 방식을 권장합니다.
