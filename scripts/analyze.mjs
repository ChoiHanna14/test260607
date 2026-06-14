import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY 없음. .env.local에 추가해주세요.');
  process.exit(1);
}

const DATA_FOLDER = path.join(projectRoot, '김비서-데이터');

function readAllData() {
  const parts = [];
  if (!fs.existsSync(DATA_FOLDER)) return '데이터 없음';
  for (const file of fs.readdirSync(DATA_FOLDER)) {
    if (file.endsWith('.csv') || file.endsWith('.txt')) {
      try {
        const content = fs.readFileSync(path.join(DATA_FOLDER, file), 'utf-8');
        parts.push(`=== ${file} ===\n${content}`);
      } catch (e) { console.warn(`⚠️ ${file} 읽기 실패`); }
    }
  }
  return parts.join('\n\n') || '데이터 없음';
}

async function analyze() {
  console.log('📊 데이터 분석 중...');
  const data = readAllData();

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `다음 비즈니스 데이터를 분석해서 아래 형식으로 한국어로 작성해줘:

① 💡 핵심 인사이트 3가지 (데이터에서 발견한 중요한 패턴이나 사실)
② ⚠️ 이번 주 주의할 점 (리스크나 주목해야 할 변화)
③ 🚀 추천 액션 3가지 (구체적인 실행 방안)

데이터:
${data}`;

  const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });

  const output = { updated_at: new Date().toISOString(), analysis: res.text };
  const outputPath = path.join(projectRoot, 'analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log('✅ 분석 완료!\n');
  console.log(res.text);
  console.log('\n💾 저장:', outputPath);
}

analyze().catch(err => { console.error('❌ 오류:', err.message); process.exit(1); });
