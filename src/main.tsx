import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  // Silent asset caching for smooth Play Store / WebView performance (no external install prompts)
  registerSW({
    immediate: true,
  });
} else if ('serviceWorker' in navigator) {
  // Clean up any stale dev-sw.js from earlier preview sessions so dev mode never serves stale HMR scripts
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      for (const reg of regs) {
        const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
        if (scriptUrl.includes('dev-sw.js')) {
          reg.unregister().catch(() => {});
        }
      }
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
