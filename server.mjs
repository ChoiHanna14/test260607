import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3000;

// ===== Google OAuth 설정 =====
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/callback'
);

// 토큰 파일 경로 (gitignore에 추가됨)
const TOKEN_PATH = path.join(__dirname, '.google-token.json');

function loadToken() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oauth2Client.setCredentials(token);
      return true;
    }
  } catch (e) {}
  return false;
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf-8');
}

app.use(express.json());
app.use(express.static(__dirname));

// 데이터 파일 전체 로드 (서버에서만 실행 — API 키와 함께 Gemini 호출용)
function loadDataContext() {
  const dataFolder = path.join(__dirname, '김비서-데이터');
  const parts = [];
  if (!fs.existsSync(dataFolder)) return '데이터 없음';
  for (const file of fs.readdirSync(dataFolder)) {
    if (file.endsWith('.csv') || file.endsWith('.txt')) {
      try {
        const content = fs.readFileSync(path.join(dataFolder, file), 'utf-8');
        parts.push(`=== ${file} ===\n${content}`);
      } catch (e) {}
    }
  }
  return parts.join('\n\n') || '데이터 없음';
}

// ===== Google OAuth 라우트 =====

// Step 1: Google 로그인 페이지로 이동
app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.redirect(url);
});

// Step 2: Google 인증 후 콜백
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    saveToken(tokens);
    console.log('✅ Google 로그인 완료, 토큰 저장됨');
    res.send(`
      <script>
        window.opener?.postMessage('google-auth-success', '*');
        window.close();
      </script>
      <p>✅ 로그인 완료! 이 창을 닫아주세요.</p>
    `);
  } catch (e) {
    console.error('❌ OAuth 콜백 오류:', e.message);
    res.status(500).send('인증 실패: ' + e.message);
  }
});

// Step 3: 로그인 상태 확인
app.get('/api/auth/status', (req, res) => {
  const loggedIn = loadToken();
  if (loggedIn) {
    const creds = oauth2Client.credentials;
    res.json({ loggedIn: true, expiry: creds.expiry_date });
  } else {
    res.json({ loggedIn: false });
  }
});

// Step 4: 로그아웃
app.post('/api/auth/logout', (req, res) => {
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
    oauth2Client.revokeCredentials();
  } catch (e) {}
  res.json({ ok: true });
});

// ===== Google Calendar API =====
app.get('/api/calendar', async (req, res) => {
  if (!loadToken()) {
    return res.status(401).json({ error: 'NOT_LOGGED_IN' });
  }

  try {
    // 토큰 만료 시 자동 갱신
    oauth2Client.on('tokens', (tokens) => {
      const current = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      saveToken({ ...current, ...tokens });
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 오늘부터 30일간 일정
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20
    });

    const events = (response.data.items || []).map(event => ({
      id: event.id,
      title: event.summary || '(제목 없음)',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      isAllDay: !event.start.dateTime,
      location: event.location || null,
      description: event.description || null,
      color: event.colorId || null
    }));

    console.log(`📅 캘린더 이벤트 ${events.length}개 로드`);
    res.json({ events });

  } catch (e) {
    console.error('❌ Calendar API 오류:', e.message);
    if (e.code === 401) {
      return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    }
    res.status(500).json({ error: '캘린더 로드 실패' });
  }
});

// API: 브리핑
app.post('/api/brief', (req, res) => {
  console.log('🤖 브리핑 생성 요청...');
  execFile('node', ['scripts/brief.mjs'], { cwd: __dirname }, (err, _out, stderr) => {
    if (err) { console.error('❌', stderr); return res.status(500).json({ error: '브리핑 생성 실패' }); }
    console.log('✅ 브리핑 완료');
    res.json({ ok: true });
  });
});

// API: 회의록 분석
app.post('/api/meeting', (req, res) => {
  console.log('📝 회의록 분석 요청...');
  execFile('node', ['scripts/meeting.mjs'], { cwd: __dirname }, (err, _out, stderr) => {
    if (err) { console.error('❌', stderr); return res.status(500).json({ error: '회의록 분석 실패' }); }
    console.log('✅ 회의록 분석 완료');
    res.json({ ok: true });
  });
});

// API: 데이터 분석
app.post('/api/analyze', (req, res) => {
  console.log('📊 데이터 분석 요청...');
  execFile('node', ['scripts/analyze.mjs'], { cwd: __dirname }, (err, _out, stderr) => {
    if (err) { console.error('❌', stderr); return res.status(500).json({ error: '데이터 분석 실패' }); }
    console.log('✅ 데이터 분석 완료');
    res.json({ ok: true });
  });
});

// API: AI 챗 — GEMINI_API_KEY는 여기 서버에서만 사용, 브라우저에 절대 노출 안 함
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: '메시지가 없습니다' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });

  try {
    console.log('💬 챗 요청:', message.substring(0, 40) + '...');
    const dataContext = loadDataContext();
    const ai = new GoogleGenAI({ apiKey });

    // 시스템 컨텍스트 + 대화 히스토리 구성
    const systemMsg = `당신은 '김비서'입니다. 아래 비즈니스 데이터를 바탕으로 질문에 한국어로 답해주세요. 데이터를 근거로 구체적이고 실용적인 답변을 해주세요.

=== 현재 데이터 ===
${dataContext}`;

    // 첫 메시지에 시스템 컨텍스트 포함
    const contents = [];
    if (history.length === 0) {
      contents.push({ role: 'user', parts: [{ text: systemMsg + '\n\n질문: ' + message }] });
    } else {
      contents.push({ role: 'user', parts: [{ text: systemMsg }] });
      contents.push({ role: 'model', parts: [{ text: '네, 데이터를 확인했습니다. 질문해주세요!' }] });
      for (const h of history) {
        contents.push({ role: h.role, parts: [{ text: h.text }] });
      }
      contents.push({ role: 'user', parts: [{ text: message }] });
    }

    const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents });
    console.log('✅ 챗 응답 완료');
    res.json({ reply: result.text });

  } catch (err) {
    console.error('❌ 챗 오류:', err.message);
    res.status(500).json({ error: 'AI 응답 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 김비서 서버 실행 중!`);
  console.log(`   👉 http://localhost:${PORT}/dashboard.html\n`);
});
