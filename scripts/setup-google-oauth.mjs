/**
 * Google OAuth 초기 설정 스크립트
 * 실행: npm run setup:google
 *
 * 1. .env.local에서 GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET 읽기
 * 2. 없으면 GCP 콘솔 설정 방법 안내 후 종료
 * 3. 있으면 브라우저 동의 화면 → refresh_token → .env.local 저장
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');

dotenv.config({ path: envPath });

const CLIENT_ID     = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT          = 3000;
const REDIRECT_URI  = `http://localhost:${PORT}/callback`;

// 스코프 목록 — 나중에 여기에 추가
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
];

// ── 1. 자격증명 없으면 안내 후 종료
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Google OAuth 클라이언트 ID가 없습니다.
  아래 순서대로 발급 후 .env.local에 추가해주세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1단계] 동의 화면 설정
  → https://console.cloud.google.com/apis/credentials/consent
  · User Type: 외부(External)
  · 앱 이름, 이메일 입력
  · 테스트 사용자에 본인 Gmail 주소 추가

[2단계] OAuth 클라이언트 ID 발급
  → https://console.cloud.google.com/apis/credentials
  · "+ 자격증명 만들기" → "OAuth 클라이언트 ID"
  · 애플리케이션 유형: 데스크톱 앱
  · 이름: 김비서 (자유)

[3단계] .env.local에 추가
  GOOGLE_OAUTH_CLIENT_ID=발급받은_클라이언트_ID
  GOOGLE_OAUTH_CLIENT_SECRET=발급받은_클라이언트_보안비밀

[4단계] 다시 실행
  npm run setup:google

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  process.exit(0);
}

// ── 2. OAuth 흐름 시작
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',      // refresh_token 매번 발급 보장
  scope: SCOPES,
});

// ── 3. 임시 HTTP 서버로 콜백 수신 (포트 3001)
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) return;

  const url = new URL(req.url, `http://localhost:${PORT}/callback`);
  const error = url.searchParams.get('error');
  const code  = url.searchParams.get('code');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>❌ 인증이 취소됐습니다. 창을 닫아주세요.</h2>');
    server.close();
    console.error('\n❌ 인증 취소:', error);
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>⚠️ refresh_token을 받지 못했습니다. 창을 닫고 다시 시도해주세요.</h2>');
      server.close();
      console.error('\n⚠️  refresh_token 없음 — Google 계정 앱 권한을 해제 후 재시도하세요:');
      console.error('   https://myaccount.google.com/permissions');
      process.exit(1);
    }

    // .env.local에 refresh_token 저장 (비밀값은 로그에 출력 안 함)
    let envContent = fs.readFileSync(envPath, 'utf-8');
    const tokenLine = `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`;
    if (envContent.includes('GOOGLE_OAUTH_REFRESH_TOKEN=')) {
      envContent = envContent.replace(/GOOGLE_OAUTH_REFRESH_TOKEN=.+/, tokenLine);
    } else {
      envContent = envContent.trimEnd() + '\n' + tokenLine + '\n';
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>✅ Google 인증 완료!</h2>
        <p>이 창을 닫고 터미널로 돌아가세요.</p>
      </body></html>
    `);
    server.close();

    console.log('\n✅ refresh_token 저장 완료 (.env.local)');
    console.log('\n다음 단계:');
    console.log('  npm run fetch:calendar   ← 캘린더 데이터 가져오기');
    process.exit(0);

  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>❌ 토큰 교환 실패. 창을 닫고 다시 시도해주세요.</h2>');
    server.close();
    console.error('\n❌ 토큰 교환 오류:', err.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`\n🔐 Google OAuth 설정 시작`);
  console.log(`   브라우저 동의 화면이 열립니다...`);
  console.log(`   (자동으로 열리지 않으면 아래 URL을 브라우저에 붙여넣으세요)\n`);
  console.log(`   ${authUrl}\n`);
  exec(`open "${authUrl}"`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ 포트 ${PORT}가 이미 사용 중입니다.`);
    console.error(`   npm start(로컬 서버)가 실행 중이라면 먼저 종료해주세요.`);
    console.error(`   터미널에서 Ctrl+C 로 서버를 끈 뒤 다시 실행하세요:\n`);
    console.error(`   npm run setup:google\n`);
  } else {
    console.error('\n❌ 서버 오류:', err.message);
  }
  process.exit(1);
});
