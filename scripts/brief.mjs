import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// ES 모듈에서 __dirname 구하기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// .env.local 로드
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY를 찾을 수 없습니다.');
  console.error('\n설정 방법:');
  console.error('1. https://aistudio.google.com 방문');
  console.error('2. "API 키 만들기" 클릭하여 키 발급');
  console.error('3. .env.local 파일에 다음 추가:');
  console.error('   GEMINI_API_KEY=your_api_key_here');
  process.exit(1);
}

// 데이터 폴더 경로
const dataFolder = path.join(projectRoot, '김비서-데이터');

function readDataFiles() {
  const files = [];

  if (!fs.existsSync(dataFolder)) {
    console.warn('⚠️ 데이터 폴더가 없습니다:', dataFolder);
    return '데이터가 없습니다.';
  }

  try {
    const fileList = fs.readdirSync(dataFolder);
    fileList.forEach(file => {
      const filePath = path.join(dataFolder, file);
      if (fs.statSync(filePath).isFile() && (file.endsWith('.csv') || file.endsWith('.txt'))) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          files.push(`\n📄 파일: ${file}\n${content}`);
        } catch (err) {
          console.warn(`⚠️ 파일 읽기 실패: ${file}`, err.message);
        }
      }
    });
  } catch (err) {
    console.warn('⚠️ 데이터 폴더 읽기 실패:', err.message);
  }

  return files.length > 0 ? files.join('\n---\n') : '데이터가 없습니다.';
}

async function generateBriefing() {
  try {
    console.log('🔄 Google Gemini API 호출 중...');

    const ai = new GoogleGenAI({ apiKey });
    const userData = readDataFiles();

    const prompt = `다음은 나의 업무 데이터입니다. 이를 바탕으로 AI 아침 브리핑을 작성해줘.

형식:
① 📌 오늘의 브리핑: 3~5줄의 짧은 요약
② ⭐ 우선순위 TOP 3: 오늘 꼭 해야 할 일 3가지
③ ⚠️ 주의할 점: 놓치면 안 될 중요 사항

데이터:
${userData}

한국어로 정성있게 작성해줘.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const briefingText = res.text;

    const briefingData = {
      updated_at: new Date().toISOString(),
      summary: briefingText
    };

    const outputPath = path.join(projectRoot, 'brief.json');
    fs.writeFileSync(outputPath, JSON.stringify(briefingData, null, 2), 'utf-8');

    // 히스토리 저장 (최대 20개 유지)
    const historyPath = path.join(projectRoot, 'brief-history.json');
    let briefHistory = [];
    try {
      if (fs.existsSync(historyPath)) {
        briefHistory = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      }
    } catch (e) {}
    briefHistory.unshift({ updated_at: briefingData.updated_at, summary: briefingData.summary });
    if (briefHistory.length > 20) briefHistory.length = 20;
    fs.writeFileSync(historyPath, JSON.stringify(briefHistory, null, 2), 'utf-8');

    console.log('✅ 브리핑 생성 완료!');
    console.log('\n📋 생성된 브리핑:\n');
    console.log(briefingText);
    console.log('\n💾 저장 위치:', outputPath);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

generateBriefing();
