  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(r => console.log('SW registered'))
        .catch(e => console.log('SW failed:', e));
    });
  }

  // Show "Add to Home Screen" prompt on iOS after 3s
  setTimeout(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    if (isIOS && !isStandalone) {
      const banner = document.createElement('div');
      banner.innerHTML = `
        <div style="
          position:fixed;bottom:24px;left:16px;right:16px;
          background:#1B3FA0;color:white;
          border-radius:16px;padding:14px 16px;
          display:flex;align-items:center;gap:12px;
          box-shadow:0 8px 32px rgba(0,0,0,0.4);
          z-index:9999;font-family:'DM Sans',sans-serif;
          animation:fadeUp 0.4s ease;
        ">
          <div style="font-size:28px;">ðŸ“²</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;margin-bottom:2px;">Install MIDI App</div>
            <div style="font-size:11px;opacity:0.8;">Tap <b>Share</b> â†’ <b>Add to Home Screen</b></div>
          </div>
          <div onclick="this.parentElement.parentElement.remove()"
            style="font-size:18px;opacity:0.6;cursor:pointer;padding:4px;">âœ•</div>
        </div>`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 8000);
    }
  }, 3500);
