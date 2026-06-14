/**
 * 김비서 Google 로그인 공용 인증 모듈
 * 모든 페이지에서 <script src="./auth.js"></script> 로 포함
 */

const GOOGLE_CLIENT_ID = '494325689417-hdf7oo70fg9mmdv0i6nkd878ct9kca1a.apps.googleusercontent.com';
const AUTH_KEY = 'kimbi_user';
const LOGIN_PAGE = './login.html';

/** JWT payload 파싱 (검증 없이 클라이언트 표시용) */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) { return null; }
}

/** 저장된 로그인 정보 반환 (없으면 null) */
function getUser() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY)); } catch (e) { return null; }
}

/** 로그인 정보 저장 */
function saveUser(payload) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({
    name:    payload.name,
    email:   payload.email,
    picture: payload.picture,
    exp:     payload.exp,
  }));
}

/** 로그아웃 */
function signOut() {
  sessionStorage.removeItem(AUTH_KEY);
  if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  location.href = LOGIN_PAGE;
}

/**
 * 인증 필요 페이지에서 호출
 * - 로그인 안 돼있으면 → login.html 로 이동
 * - 돼 있으면 → 헤더에 프로필 렌더
 */
function requireAuth() {
  const user = getUser();
  if (!user || user.exp * 1000 < Date.now()) {
    sessionStorage.removeItem(AUTH_KEY);
    location.href = LOGIN_PAGE;
    return null;
  }
  renderProfile(user);
  return user;
}

/** 상단에 프로필 + 로그아웃 버튼 삽입 */
function renderProfile(user) {
  // 이미 있으면 스킵
  if (document.getElementById('kimbi-profile')) return;

  const bar = document.createElement('div');
  bar.id = 'kimbi-profile';
  bar.style.cssText = `
    position: fixed; top: 12px; right: 70px; z-index: 9999;
    display: flex; align-items: center; gap: 8px;
    background: var(--card-bg, rgba(255,255,255,0.85));
    backdrop-filter: blur(10px);
    border: 1px solid var(--card-border, rgba(0,0,0,0.08));
    border-radius: 50px;
    padding: 5px 14px 5px 6px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    font-family: inherit;
  `;
  bar.innerHTML = `
    <img src="${user.picture}" width="28" height="28"
         style="border-radius:50%; object-fit:cover;"
         onerror="this.style.display='none'">
    <span style="font-size:0.82em; font-weight:600; color:var(--text-primary, #1a1a2e); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
      ${user.name}
    </span>
    <button onclick="signOut()" style="
      margin-left:4px; padding:3px 10px;
      background: rgba(239,68,68,0.1); color:#ef4444;
      border: 1px solid rgba(239,68,68,0.2); border-radius:50px;
      font-size:0.75em; font-weight:600; cursor:pointer;
    ">로그아웃</button>
  `;
  document.body.appendChild(bar);
}

/** login.html 전용: GSI 초기화 + 버튼 렌더 */
function initLoginPage(buttonElementId) {
  // 이미 로그인돼 있으면 대시보드로
  if (getUser()) { location.href = './dashboard.html'; return; }

  window.handleCredentialResponse = function(response) {
    const payload = parseJwt(response.credential);
    if (!payload) { alert('로그인 실패: 토큰 파싱 오류'); return; }
    saveUser(payload);
    location.href = './dashboard.html';
  };

  // GSI 스크립트 로드 후 초기화
  function setupGsi() {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: false,
    });
    google.accounts.id.renderButton(
      document.getElementById(buttonElementId),
      { theme: 'outline', size: 'large', width: 280, text: 'signin_with', locale: 'ko' }
    );
    google.accounts.id.prompt(); // One Tap
  }

  // GSI가 이미 로드됐으면 바로, 아니면 onload
  if (window.google?.accounts?.id) { setupGsi(); }
  else { window.onGoogleLibraryLoad = setupGsi; }
}
