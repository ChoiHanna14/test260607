# 🤖 김비서 프로젝트 세팅 가이드 (완전 자동화 버전)

이 문서는 **윈도우 또는 맥**에서 Claude Desktop을 이용해 "김비서" 프로젝트를 처음부터 끝까지 구축하는 전체 과정을 담고 있습니다.

---

## 📋 사전 준비 사항

### 필수 설치 프로그램
- **Git** (https://git-scm.com/download/win 또는 맥 버전)
- **Node.js** (선택사항, PWA 테스트 시 필요)
- **Claude Desktop** (최신 버전)

### 필수 계정
- **GitHub 계정** (코드 저장소용)
- **Vercel 계정** (자동 배포용, GitHub으로 가입 가능)
- **Supabase 계정** (데이터베이스용, GitHub으로 가입 가능)

---

## 🚀 Step 1: 프로젝트 초기화 (5분)

### 1.1 프로젝트 폴더 생성
```bash
mkdir 김비서-프로젝트
cd 김비서-프로젝트
```

### 1.2 Git 초기화
```bash
git init
git config user.name "Your Name"
git config user.email "your@email.com"
```

### 1.3 README.md 생성
```bash
echo "# 김비서 - Smart Subscription & Task Management Platform" > README.md
```

### 1.4 GitHub에 저장소 생성
1. https://github.com/new 방문
2. Repository name: `test260607` (또는 원하는 이름)
3. Public 선택
4. "Create repository" 클릭

### 1.5 원격 저장소 연결
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

---

## 🎨 Step 2: HTML 페이지 생성 (10분)

### 2.1 메인 페이지 (index.html)
**파일 위치**: `프로젝트폴더/index.html`

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#667eea">
    <link rel="manifest" href="./manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="김비서">
    <title>김비서 - 스마트 업무 관리</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f5;
            --card-bg: rgba(255, 255, 255, 0.7);
            --card-border: rgba(255, 255, 255, 0.3);
            --text-primary: #1a1a2e;
            --text-secondary: #666666;
            --accent: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        html.dark-mode {
            --bg-primary: #0f0f23;
            --bg-secondary: #1a1a3e;
            --card-bg: rgba(255, 255, 255, 0.05);
            --card-border: rgba(255, 255, 255, 0.1);
            --text-primary: #e0e0e0;
            --text-secondary: #b0b0b0;
            --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 40px 20px;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }

        .theme-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            backdrop-filter: blur(10px);
            padding: 10px 15px;
            border-radius: 50px;
            cursor: pointer;
            font-size: 1.3em;
            z-index: 100;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }

        .header {
            text-align: center;
            margin-bottom: 60px;
        }

        .header h1 {
            font-size: 3em;
            background: var(--accent);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }

        .header p {
            font-size: 1.2em;
            color: var(--text-secondary);
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
        }

        .feature-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: var(--shadow);
            transition: transform 0.3s ease;
        }

        .feature-card:hover {
            transform: translateY(-5px);
        }

        .feature-card h3 {
            font-size: 1.5em;
            margin-bottom: 15px;
            color: #667eea;
        }

        .feature-card p {
            color: var(--text-secondary);
            line-height: 1.6;
        }

        .cta-section {
            text-align: center;
        }

        .cta-button {
            background: var(--accent);
            color: white;
            border: none;
            padding: 16px 50px;
            font-size: 1.1em;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.3s ease;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
        }

        .cta-button:hover {
            transform: translateY(-3px);
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2em;
            }

            .header p {
                font-size: 1em;
            }

            .features {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <button class="theme-toggle" id="themeToggle">🌙</button>

    <div class="container">
        <div class="header">
            <h1>🤖 김비서</h1>
            <p>스마트한 업무와 구독 관리의 시작</p>
        </div>

        <div class="features">
            <div class="feature-card">
                <h3>📊 대시보드</h3>
                <p>할 일 목록, 주간 일정, 프로젝트 진행률을 한눈에 관리하세요.</p>
            </div>
            <div class="feature-card">
                <h3>📈 매출 분석</h3>
                <p>월별 추이와 제품별 비교를 통해 데이터 기반 의사결정을 하세요.</p>
            </div>
            <div class="feature-card">
                <h3>🔄 프로세스 관리</h3>
                <p>기획부터 분석까지 업무 흐름을 시각화하고 관리하세요.</p>
            </div>
        </div>

        <div class="cta-section">
            <a href="dashboard.html" class="cta-button">대시보드 시작하기 →</a>
        </div>
    </div>

    <script>
        const html = document.documentElement;
        const themeToggle = document.getElementById('themeToggle');

        function initTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            if (savedTheme === 'dark') {
                html.classList.add('dark-mode');
                themeToggle.textContent = '☀️';
            } else {
                html.classList.remove('dark-mode');
                themeToggle.textContent = '🌙';
            }
        }

        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark-mode');
            const isDark = html.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        });

        initTheme();

        // Service Worker 등록
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .catch(error => console.error('Service Worker 등록 실패:', error));
            });
        }
    </script>
</body>
</html>
```

**주요 기능:**
- ✅ 글래스모피즘 디자인
- ✅ 다크/라이트 모드 토글
- ✅ 반응형 레이아웃
- ✅ Service Worker 자동 등록

### 2.2 대시보드 페이지 (dashboard.html)

**파일 위치**: `프로젝트폴더/dashboard.html`

> 📝 **참고**: 완전한 대시보드 코드는 현재 프로젝트의 `dashboard.html`을 참고하세요.
> 주요 섹션: 할 일 목록, 주간 일정, 프로젝트 진행률, 매출 요약

### 2.3 다른 HTML 파일들 생성
```bash
# 다음 파일들도 생성 필요:
# - chart.html (매출 분석 차트)
# - meeting-result.html (회의록)
# - diagram.html (프로세스 다이어그램)
# - report.html (사이트 분석 보고서)
```

---

## 📱 Step 3: PWA 설정 (5분)

### 3.1 manifest.json 생성

**파일 위치**: `프로젝트폴더/manifest.json`

```json
{
  "name": "김비서 - Smart Subscription & Task Management Platform",
  "short_name": "김비서",
  "description": "구독 서비스, 업무, 매출 데이터를 한눈에 관리하는 플랫폼",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "scope": "/",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%23667eea' width='192' height='192' rx='45'/><text x='50%' y='50%' font-size='80' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='middle'>김</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%23667eea' width='192' height='192' rx='45'/><text x='50%' y='50%' font-size='80' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='middle'>김</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 540 720'><rect fill='%23667eea' width='540' height='720'/><text x='50%' y='50%' font-size='100' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='middle'>김비서</text></svg>",
      "sizes": "540x720",
      "type": "image/svg+xml",
      "form_factor": "narrow"
    }
  ]
}
```

### 3.2 Service Worker 생성

**파일 위치**: `프로젝트폴더/service-worker.js`

```javascript
const CACHE_NAME = 'kim-secretary-v1';
const assets = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/chart.html',
  '/manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets).catch(() => {
        // 일부 리소스 캐시 실패 무시
      });
    })
  );
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 - Cache First 전략
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(response => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});
```

---

## 🔧 Step 4: 환경 설정 (3분)

### 4.1 .gitignore 생성

**파일 위치**: `프로젝트폴더/.gitignore`

```
# 환경 변수
.env
.env.local
.env.*.local

# 데이터 파일
김비서-데이터/
*.csv
*.xlsx
*.txt

# IDE
.vscode/
.idea/
*.swp
*~
.DS_Store

# Node modules
node_modules/
npm-debug.log

# Supabase
supabase/.branches/
supabase/generated/

# 빌드
dist/
build/
```

### 4.2 .env.local 생성

**파일 위치**: `프로젝트폴더/.env.local`

```
# GitHub Token
GITHUB_TOKEN=your_token_here
```

---

## 🌍 Step 5: GitHub 배포 (5분)

### 5.1 GitHub에 푸시
```bash
git add .
git commit -m "Initial project setup with PWA and responsive design"
git push origin main
```

### 5.2 Vercel 연결
1. https://vercel.com 접속
2. "Import Git Repository" 클릭
3. GitHub 계정 연결
4. 저장소 선택 (`test260607`)
5. Deploy 클릭

---

## 💾 Step 6: Supabase 데이터베이스 설정 (10분)

### 6.1 Supabase CLI 설치
```bash
npm install -g supabase
# 또는 homebrew (맥): brew install supabase
```

### 6.2 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. 프로젝트 이름: "ChoiHanna14's Project"
4. 지역: Tokyo (또는 선호하는 지역)

### 6.3 Supabase CLI 로그인
```bash
supabase login
# 브라우저에서 토큰 생성 후 붙여넣기
```

### 6.4 프로젝트 링크
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 6.5 마이그레이션 생성

**파일 위치**: `supabase/migrations/20260607071103_create_data_tables.sql`

```sql
-- Todos 테이블
CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  assigned_to VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedules 테이블
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  day VARCHAR(10) NOT NULL,
  time VARCHAR(10),
  event TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects 테이블
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  progress INT DEFAULT 0,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales 테이블
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  product VARCHAR(255) NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 읽기 정책
CREATE POLICY "Allow read access" ON todos FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON schedules FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON sales FOR SELECT USING (true);
```

### 6.6 마이그레이션 푸시
```bash
supabase db push
# Y 입력하여 확인
```

---

## 📝 Step 7: 최종 커밋 및 배포 (3분)

```bash
# 모든 변경사항 커밋
git add .
git commit -m "Add Supabase database schema and PWA configuration"
git push origin main

# Vercel이 자동으로 배포 시작
# 약 1-2분 후 배포 완료
```

---

## 🎉 완료! 최종 확인

### 배포 완료 후 확인사항

✅ **웹 사이트 접속**
```
메인: https://YOUR_VERCEL_URL
대시보드: https://YOUR_VERCEL_URL/dashboard.html
```

✅ **로컬 테스트**
```bash
# 간단한 HTTP 서버로 테스트
python -m http.server 8000
# http://localhost:8000 접속
```

✅ **PWA 설치**
- Chrome: 주소창 → 설치 아이콘
- 또는 메뉴 → "앱 설치"

---

## 🚨 문제 해결

### 배포가 안 될 때
1. GitHub에 모든 파일이 푸시되었는지 확인
2. Vercel 대시보드에서 빌드 로그 확인
3. .gitignore에서 중요 파일이 제외되지 않았는지 확인

### Supabase 연결 실패
1. API 키가 올바른지 확인
2. CORS 설정 확인
3. 데이터베이스 테이블이 생성되었는지 확인

### Service Worker 등록 안 됨
1. HTTPS 환경 필수 (localhost 제외)
2. 브라우저 개발자 도구 → Application → Service Workers 확인

---

## 📚 다음 단계 (선택사항)

- [ ] 자동 보고서 생성 기능 추가
- [ ] 실시간 알림 시스템 구현
- [ ] 모바일 앱 개발 (React Native)
- [ ] AI 기반 예측 분석
- [ ] 팀 협업 기능 추가

---

## 🔗 유용한 링크

- **Vercel 대시보드**: https://vercel.com/dashboard
- **Supabase 콘솔**: https://app.supabase.com
- **GitHub 저장소**: https://github.com/YOUR_USERNAME/YOUR_REPO
- **Claude AI**: https://claude.ai

---

**마지막 수정**: 2026-06-07
**버전**: 1.0
**작성자**: Claude AI Assistant
