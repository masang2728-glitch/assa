import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'ASSA 창원근로자합창단 출석관리',
        short_name: 'ASSA',
        description: '창원근로자합창단 연습/공연 출석관리',
        start_url: '/',
        display: 'standalone',
        background_color: '#3730A3',
        theme_color: '#3730A3',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // jpg/webp는 참석 확인 팝업 짤 - 휴대폰에 미리 저장해둬야 누르자마자 바로 뜬다.
        globPatterns: ['**/*.{js,css,html,png,jpg,webp,svg,ico}'],
      },
    }),
  ],
})
