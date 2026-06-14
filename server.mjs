import express from 'express';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 정적 파일 서빙 (HTML, CSS, JS, JSON 등)
app.use(express.static(__dirname));

// API: AI 아침 브리핑 생성
app.post('/api/brief', (req, res) => {
  console.log('🤖 브리핑 생성 요청...');
  execFile('node', ['scripts/brief.mjs'], { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ 브리핑 오류:', stderr);
      return res.status(500).json({ error: '브리핑 생성 실패', detail: stderr });
    }
    console.log('✅ 브리핑 완료');
    res.json({ ok: true });
  });
});

// API: 회의록 분석 생성
app.post('/api/meeting', (req, res) => {
  console.log('📝 회의록 분석 요청...');
  execFile('node', ['scripts/meeting.mjs'], { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ 분석 오류:', stderr);
      return res.status(500).json({ error: '회의록 분석 실패', detail: stderr });
    }
    console.log('✅ 분석 완료');
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 김비서 서버 실행 중!`);
  console.log(`   👉 http://localhost:${PORT}/dashboard.html\n`);
});
