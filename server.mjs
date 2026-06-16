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

// ===== 여행 일정 =====
const TRAVEL_PLAN_PATH = path.join(__dirname, 'travel-plan.json');

function loadTravelPlan() {
  try {
    return JSON.parse(fs.readFileSync(TRAVEL_PLAN_PATH, 'utf-8'));
  } catch (e) {
    return { title: '여행 일정', subtitle: '', days: [] };
  }
}

function saveTravelPlan(plan) {
  plan.updated_at = new Date().toISOString();
  fs.writeFileSync(TRAVEL_PLAN_PATH, JSON.stringify(plan, null, 2), 'utf-8');
}

// 모델 응답에서 JSON 객체만 안전하게 추출
function extractJson(text) {
  if (!text) throw new Error('빈 응답');
  let t = text.trim();
  // ```json ... ``` 코드펜스 제거
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // 첫 { 부터 마지막 } 까지
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSON 형식을 찾을 수 없음');
  return JSON.parse(t.slice(start, end + 1));
}

// API: 저장된 여행 일정 조회
app.get('/api/travel-plan', (req, res) => {
  res.json(loadTravelPlan());
});

// API: AI 여행지 조사 → 일정에 추가 (GEMINI_API_KEY는 서버에서만 사용)
app.post('/api/travel-research', async (req, res) => {
  const { query, day } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error: '여행지/음식점 이름이 없습니다' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });

  const plan = loadTravelPlan();
  const dayNum = parseInt(day, 10);
  const dayObj = plan.days.find(d => d.day === dayNum);
  if (!dayObj) return res.status(400).json({ error: '해당 일자를 찾을 수 없습니다' });

  try {
    console.log(`🧳 여행지 조사 요청: "${query}" → Day ${dayNum}`);
    const ai = new GoogleGenAI({ apiKey });

    const tripCity = plan.title || '여행지';
    const prompt = `당신은 여행 플래너입니다. "${tripCity}" 일정에 추가할 장소 "${query}"에 대해 최신 정보를 조사해서 아래 JSON 형식으로만 답하세요. 다른 설명·코드펜스 없이 순수 JSON만 출력하세요. 모르는 항목은 빈 문자열로 두세요. 비용은 원화(₩) 기준 근사값으로, 교통은 도심/주요역 기준 이동 방법으로 작성하세요.

{
  "name": "장소 정식 명칭(한국어)",
  "category": "관광지 | 맛집 | 쇼핑 | 전망대 | 카페 등 한 단어",
  "summary": "2~3문장의 간단한 소개와 분위기",
  "bestVisitTime": "방문하기 좋은 시간대",
  "openingHours": "영업/운영 시간",
  "cost": "이용/입장 비용(₩ 근사)",
  "howToGet": "주요 역/도심에서 가는 방법",
  "transportCost": "예상 교통비(₩ 근사)",
  "location": "주소 또는 지역",
  "imageKeyword": "사진 검색용 영어 키워드",
  "sources": ["참고한 URL들"]
}`;

    let result;
    try {
      // 구글 검색 그라운딩으로 최신 정보 확보
      result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });
    } catch (e) {
      console.warn('⚠️ 검색 그라운딩 실패, 일반 호출로 재시도:', e.message);
      result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    }

    const info = extractJson(result.text);

    // 그라운딩 출처 보강
    try {
      const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = chunks.map(c => c.web?.uri).filter(Boolean);
      if (urls.length) info.sources = Array.from(new Set([...(info.sources || []), ...urls])).slice(0, 5);
    } catch (e) {}

    const item = {
      id: 'ai-' + Date.now().toString(36),
      name: info.name || query,
      category: info.category || '여행지',
      time: '',
      summary: info.summary || '',
      bestVisitTime: info.bestVisitTime || '',
      openingHours: info.openingHours || '',
      cost: info.cost || '',
      howToGet: info.howToGet || '',
      transportCost: info.transportCost || '',
      location: info.location || '',
      imageKeyword: info.imageKeyword || info.name || query,
      sources: info.sources || []
    };

    dayObj.items = dayObj.items || [];
    dayObj.items.push(item);
    saveTravelPlan(plan);

    console.log(`✅ "${item.name}" Day ${dayNum}에 추가 완료`);
    res.json({ item, plan });

  } catch (err) {
    console.error('❌ 여행지 조사 오류:', err.message);
    res.status(500).json({ error: 'AI 조사 실패: ' + err.message });
  }
});

// API: 일정 항목 삭제
app.delete('/api/travel-item', (req, res) => {
  const dayNum = parseInt(req.query.day, 10);
  const id = req.query.id;
  const plan = loadTravelPlan();
  const dayObj = plan.days.find(d => d.day === dayNum);
  if (!dayObj) return res.status(404).json({ error: '일자를 찾을 수 없습니다' });
  dayObj.items = (dayObj.items || []).filter(i => i.id !== id);
  saveTravelPlan(plan);
  res.json({ plan });
});

app.listen(PORT, () => {
  console.log(`\n🚀 김비서 서버 실행 중!`);
  console.log(`   👉 http://localhost:${PORT}/dashboard.html\n`);
});
