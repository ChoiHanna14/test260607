// 실시간 번역앱 - 번역 API (Vercel Serverless Function)
//
// Google Gemini API를 호출해 일본어를 한국어로 번역합니다.
// - 텍스트 모드: { text } → { original, translation }
// - 이미지 모드: { image(base64), mediaType } → { blocks: [{ original, translation, box }] }
//
// API 키는 서버 환경변수 GEMINI_API_KEY 로 관리합니다(클라이언트 노출 방지).
// 모델은 GEMINI_MODEL 환경변수로 바꿀 수 있고, 기본값은 gemini-2.5-flash 입니다.

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// 텍스트 번역 결과 스키마 (Gemini responseSchema 형식 - 타입은 대문자)
const TEXT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    original: { type: 'STRING' },
    translation: { type: 'STRING' },
  },
  required: ['original', 'translation'],
};

// 이미지 번역 결과 스키마 (블록별 + 정규화 좌표)
const IMAGE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    blocks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          translation: { type: 'STRING' },
          box: {
            type: 'OBJECT',
            properties: {
              x: { type: 'NUMBER' },
              y: { type: 'NUMBER' },
              w: { type: 'NUMBER' },
              h: { type: 'NUMBER' },
            },
            required: ['x', 'y', 'w', 'h'],
          },
        },
        required: ['original', 'translation', 'box'],
      },
    },
  },
  required: ['blocks'],
};

async function callGemini(apiKey, body) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    const err = new Error(`Gemini API ${res.status}`);
    err.status = res.status;
    err.detail = detail;
    throw err;
  }
  return res.json();
}

// 응답에서 첫 번째 텍스트 파트(구조화 출력 JSON)를 파싱
function parseStructured(data) {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('번역 결과가 비어 있습니다.');
  return JSON.parse(text);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 추가해 주세요.',
    });
  }

  const body = req.body || {};

  try {
    // ─── 이미지 모드 ───
    if (body.image) {
      const mediaType = body.mediaType || 'image/png';
      const data = await callGemini(apiKey, {
        systemInstruction: {
          parts: [
            {
              text:
                '너는 이미지 속 일본어를 한국어로 번역하는 엔진이다. ' +
                '이미지에서 일본어 텍스트 블록을 모두 찾아 각각 자연스러운 한국어로 번역하라. ' +
                '각 블록의 위치는 이미지 기준 정규화 좌표(좌상단 0,0 ~ 우하단 1,1)로 box(x,y,w,h)에 담아라. ' +
                '일본어가 없으면 blocks 를 빈 배열로 반환하라.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: '이 이미지의 일본어를 모두 한국어로 번역해줘.' },
              { inline_data: { mime_type: mediaType, data: body.image } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: IMAGE_SCHEMA,
        },
      });
      return res.status(200).json(parseStructured(data));
    }

    // ─── 텍스트 모드 ───
    const text = (body.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: '번역할 텍스트나 이미지가 없습니다.' });
    }

    const data = await callGemini(apiKey, {
      systemInstruction: {
        parts: [
          {
            text:
              '너는 일본어를 한국어로 번역하는 엔진이다. ' +
              '입력된 일본어를 자연스럽고 정확한 한국어로 번역하라. ' +
              'original 에는 입력 원문을, translation 에는 한국어 번역만 담아라. 설명은 넣지 마라.',
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: TEXT_SCHEMA,
      },
    });
    return res.status(200).json(parseStructured(data));
  } catch (err) {
    console.error('번역 실패:', err.status, err.detail || err.message);
    return res.status(502).json({
      error: '번역에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
}
