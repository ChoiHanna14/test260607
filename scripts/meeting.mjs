import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// .env.local 로드
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY를 찾을 수 없습니다.');
  console.error('   .env.local 파일에 GEMINI_API_KEY=... 를 추가해주세요.');
  process.exit(1);
}

/**
 * 프로젝트 폴더에서 회의록 파일(.txt, .md) 자동 탐색
 * node_modules, .git 제외 / 이름에 '회의' 포함 우선
 */
function findMeetingFiles() {
  const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'scripts', 'supabase']);
  const EXTENSIONS = ['.txt', '.md'];
  const found = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        // CLAUDE.md, SETUP.md, README.md 제외
        if (/^(CLAUDE|SETUP|README)/i.test(entry.name)) continue;
        found.push(path.join(dir, entry.name));
      }
    }
  }

  walk(projectRoot);

  // '회의'가 이름에 포함된 파일 맨 앞으로 정렬
  found.sort((a, b) => {
    const aHas = path.basename(a).includes('회의') ? 0 : 1;
    const bHas = path.basename(b).includes('회의') ? 0 : 1;
    return aHas - bHas;
  });

  return found;
}

/**
 * 파일들을 읽어서 하나의 텍스트로 합치기
 */
function readMeetingFiles(files) {
  const parts = [];
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (!content) continue;
      const relativePath = path.relative(projectRoot, filePath);
      parts.push(`=== 📄 ${relativePath} ===\n${content}`);
    } catch (err) {
      console.warn(`⚠️ 읽기 실패: ${filePath} -`, err.message);
    }
  }
  return parts.join('\n\n');
}

/**
 * Gemini로 회의록 분석
 */
async function analyzeMeeting() {
  console.log('🔍 회의록 파일 탐색 중...');
  const files = findMeetingFiles();

  if (files.length === 0) {
    console.error('❌ 분석할 회의록 파일(.txt, .md)을 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log(`📄 발견된 파일 ${files.length}개:`);
  files.forEach(f => console.log(`   - ${path.relative(projectRoot, f)}`));

  const meetingContent = readMeetingFiles(files);

  console.log('\n🤖 Gemini 2.5 Flash 분석 중...');

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `다음 회의록을 분석해서 아래 형식으로 한국어로 작성해줘.

① 📋 액션아이템 목록 (담당자·기한 포함, 표 형식)
② 🎯 핵심 결정사항 (불릿 포인트로 정리)
③ 📧 후속 메일 초안 (수신자·제목·본문 포함)

---

${meetingContent}`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  const analysisText = res.text;

  // meeting-result.json 저장
  const output = {
    updated_at: new Date().toISOString(),
    files_analyzed: files.map(f => path.relative(projectRoot, f)),
    analysis: analysisText
  };

  const outputPath = path.join(projectRoot, 'meeting-result.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log('\n✅ 회의록 분석 완료!');
  console.log('\n📊 분석 결과:\n');
  console.log(analysisText);
  console.log(`\n💾 저장 위치: ${outputPath}`);
}

analyzeMeeting().catch(err => {
  console.error('❌ 오류 발생:', err.message);
  process.exit(1);
});
