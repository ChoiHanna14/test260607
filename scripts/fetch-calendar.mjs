/**
 * Google Calendar 이벤트 가져오기
 * 실행: npm run fetch:calendar
 *
 * 오늘부터 7일간 이벤트 최대 20개 → calendar-data.json 저장
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env.local') });

const CLIENT_ID     = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
const REDIRECT_URI  = 'http://localhost:3000/callback';

// ── 설정 확인
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET 가 없습니다.');
  console.error('   npm run setup:google 를 먼저 실행하세요.');
  process.exit(1);
}
if (!REFRESH_TOKEN) {
  console.error('❌ GOOGLE_OAUTH_REFRESH_TOKEN 이 없습니다.');
  console.error('   npm run setup:google 를 먼저 실행하세요.');
  process.exit(1);
}

// ── OAuth 클라이언트 초기화
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// access_token 갱신 시 .env.local 자동 업데이트
const envPath = path.join(projectRoot, '.env.local');
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    let content = fs.readFileSync(envPath, 'utf-8');
    const line = `GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`;
    content = content.includes('GOOGLE_OAUTH_REFRESH_TOKEN=')
      ? content.replace(/GOOGLE_OAUTH_REFRESH_TOKEN=.+/, line)
      : content.trimEnd() + '\n' + line + '\n';
    fs.writeFileSync(envPath, content, 'utf-8');
  }
});

// ── 캘린더 이벤트 가져오기
console.log('📅 Google Calendar 이벤트 가져오는 중...');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const now = new Date();
const sevenDaysLater = new Date();
sevenDaysLater.setDate(now.getDate() + 7);

// 보유한 모든 캘린더 목록 가져오기
let calendarList;
try {
  calendarList = await calendar.calendarList.list();
} catch (err) {
  console.error('❌ Calendar API 오류:', err.message);
  if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
    console.error('\n   refresh_token이 만료됐습니다. 아래 명령어로 재인증하세요:');
    console.error('   npm run setup:google');
  }
  process.exit(1);
}

// 공휴일 캘린더 제외하고 전체 캘린더에서 이벤트 수집
const allEvents = [];
for (const cal of calendarList.data.items) {
  if (cal.id.includes('holiday')) continue; // 공휴일 제외
  try {
    const res = await calendar.events.list({
      calendarId: cal.id,
      timeMin: now.toISOString(),
      timeMax: sevenDaysLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 20,
    });
    for (const ev of res.data.items || []) {
      allEvents.push({
        id:          ev.id,
        title:       ev.summary  || '(제목 없음)',
        start:       ev.start.dateTime || ev.start.date,
        end:         ev.end.dateTime   || ev.end.date,
        isAllDay:    !ev.start.dateTime,
        location:    ev.location || null,
        calendarName: cal.summary,
      });
    }
  } catch (e) { /* 접근 불가 캘린더 무시 */ }
}

// 시작 시각 기준 정렬, 중복 제거
const seen = new Set();
const events = allEvents
  .filter(ev => { if (seen.has(ev.id)) return false; seen.add(ev.id); return true; })
  .sort((a, b) => new Date(a.start) - new Date(b.start))
  .slice(0, 20);

const output = {
  updated_at: new Date().toISOString(),
  events,
};

const outputPath = path.join(projectRoot, 'calendar-data.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ 이벤트 ${events.length}개 저장 완료`);
events.forEach(ev => {
  const start = new Date(ev.start);
  const dateStr = ev.isAllDay
    ? ev.start
    : `${start.getMonth()+1}/${start.getDate()} ${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}`;
  console.log(`   · ${dateStr} ${ev.title}`);
});
console.log(`\n💾 저장 위치: ${outputPath}`);
console.log('   대시보드를 새로고침하면 일정이 표시됩니다!\n');
