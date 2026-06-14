const CACHE_NAME = 'kimsecretary-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './meeting-result.html',
  './chart.html',
  './diagram.html',
  './diagram.svg',
  './report.html',
  './manifest.json',
  './service-worker.js',
  './translator/index.html',
  './translator/screenshot.html',
  './translator/history.html',
  './translator/settings.html',
  './translator/styles.css',
  './translator/app.js'
];

// Service Worker 설치
self.addEventListener('install', event => {
  console.log('📦 Service Worker 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ 캐시에 파일 저장 중...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.error('❌ 캐시 저장 실패:', err);
    })
  );
});

// Service Worker 활성화
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker 활성화 중...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️  이전 캐시 제거: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 네트워크 요청 처리 (Cache First 전략)
self.addEventListener('fetch', event => {
  // GET 요청만 캐시
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 반환
        if (response) {
          console.log(`📦 캐시에서 로드: ${event.request.url}`);
          return response;
        }

        // 캐시에 없으면 네트워크에서 요청
        return fetch(event.request)
          .then(response => {
            // 네트워크 응답이 유효하면 캐시에 저장
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(err => {
            console.error('🔌 오프라인 상태:', event.request.url);
            // 오프라인일 때 캐시된 페이지 반환
            return caches.match('./index.html');
          });
      })
  );
});

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', event => {
  if (event.tag === '데이터_동기화') {
    event.waitUntil(
      // 온라인 복귀 시 데이터 동기화
      Promise.resolve()
        .then(() => {
          console.log('🔄 데이터 동기화 중...');
          return fetch('./dashboard.html');
        })
        .catch(err => {
          console.error('❌ 동기화 실패:', err);
        })
    );
  }
});

// 메시지 수신 (클라이언트와 통신)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker 로드됨!');