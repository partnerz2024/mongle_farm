const CACHE_NAME = 'mongle-farm-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './audio.js',
  './온글잎 박다현체.ttf',
  './mongle_theme_long.wav',
  './manifest.json',
  
  // 게임 텍스처들
  './mongle_farm_textures/apple.png',
  './mongle_farm_textures/back_button.png',
  './mongle_farm_textures/background.png',
  './mongle_farm_textures/beatroot.png',
  './mongle_farm_textures/big cloud.png',
  './mongle_farm_textures/big_bear.png',
  './mongle_farm_textures/carrot.png',
  './mongle_farm_textures/farm.png',
  './mongle_farm_textures/game_over.png',
  './mongle_farm_textures/new title.png',
  './mongle_farm_textures/pause_button.png',
  './mongle_farm_textures/quit_button.png',
  './mongle_farm_textures/small cloud.png',
  './mongle_farm_textures/small_bear.png',
  './mongle_farm_textures/start_button.png',
  './mongle_farm_textures/volume_button.png',
  './mongle_farm_textures/water.png',
  
  // PWA 아이콘들
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('몽글팜 Service Worker 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('몽글팜 파일들 캐싱 중...');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('캐싱 실패:', error);
      })
  );
});

// 캐시에서 요청된 리소스 제공
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답인지 확인
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답을 복제하여 캐시에 저장
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 네트워크 실패 시 기본 페이지 반환
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('몽글팜 Service Worker 활성화');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 