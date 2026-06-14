import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3000;

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
