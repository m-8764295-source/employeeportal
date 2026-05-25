  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  MAD DRINK LAB â€” JAVASCRIPT
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, increment }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

  // We reuse the already-initialized db from the main module via window
  // State
  let madCart = [];
  window._madCart = madCart; // expose for cross-module access
  let madOrderType = 'pickup';
  let madPayMethod = 'tng';
  let madPendingOrderType = null;
  let madCurrentOrderId = null;

  // â”€â”€ Navigation helpers â”€â”€
  function goToMadMenu(type) {
    madOrderType = type;
    const co = document.getElementById('mad-checkout-method');
    const ci = document.getElementById('mad-checkout-icon');
    if (co) co.textContent = type === 'pickup' ? 'Pick Up' : 'Delivery';
    if (ci) ci.textContent = type === 'pickup' ? 'ðŸ›' : 'ðŸ›µ';
    const cashBtn = document.getElementById('mad-pay-cash-btn');
    const cashNote = document.getElementById('mad-cash-note');
    if (type === 'delivery') {
      if (cashBtn) cashBtn.style.display = 'none';
      if (cashNote) cashNote.style.display = 'none';
      madPayMethod = 'tng';
    } else {
      if (cashBtn) cashBtn.style.display = 'flex';
      if (cashNote) cashNote.style.display = 'block';
    }
    window.goTo('menu-mad');
  }
  window.goToMadMenu = goToMadMenu;

  // â”€â”€ Quick Add â”€â”€
  function madQuickAdd(e, name, price, emoji) {
    e.stopPropagation();
    const existing = madCart.find(i => i.name === name);
    if (existing) { existing.qty++; }
    else { madCart.push({ name, price, emoji, qty: 1, custom: 'Standard', note: '' }); }
    window._madCart = madCart;
    updateMadCartUI();
    // Bounce animation
    const btn = e.currentTarget;
    btn.style.transform = 'scale(1.4)';
    setTimeout(() => btn.style.transform = '', 200);
  }
  window.madQuickAdd = madQuickAdd;

  function updateMadCartUI() {
    window._madCart = madCart; // keep window ref in sync
    const total = madCart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = madCart.reduce((s, i) => s + i.qty, 0);
    const fc = document.getElementById('mad-floating-cart');
    const badge = document.getElementById('mad-cart-badge');
    const totalEl = document.getElementById('mad-cart-total-display');
    if (fc) fc.style.display = count > 0 ? 'flex' : 'none';
    if (badge) badge.textContent = count;
    if (totalEl) totalEl.textContent = 'RM ' + total.toFixed(2);
  }
  window.updateMadCartUI = updateMadCartUI;

  // â”€â”€ Cart rendering â”€â”€
  function renderMadCart() {
    // Sync local madCart with window._madCart (cross-module items added via addToCart)
    if (window._madCart && window._madCart !== madCart) {
      madCart.length = 0;
      window._madCart.forEach(i => madCart.push(i));
      window._madCart = madCart;
    }
    const list = document.getElementById('mad-cart-list');
    if (!list) return;
    let total = 0, cartHtml = '';
    if (!madCart.length) {
      cartHtml = `<div style="text-align:center;padding:60px 24px;color:var(--text-muted);">
        <div style="font-size:48px;margin-bottom:12px;">ðŸ›’</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-mid);margin-bottom:6px;">Your cart is empty</div>
        <div style="font-size:13px;">Add items from the menu to get started</div></div>`;
    } else {
      madCart.forEach((item, i) => {
        total += item.price * item.qty;
        cartHtml += `<div class="cart-item" style="animation-delay:${i*0.05}s">
          <div class="delete-swipe" onclick="madRemoveItem(${i})">ðŸ—‘</div>
          <div class="cart-item-img">${item.emoji}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-custom">${item.custom || 'Standard'}</div>
            ${item.note ? `<div style="font-size:11px;color:var(--milo);background:var(--milo-pale);border-radius:8px;padding:4px 8px;margin-top:4px;display:flex;align-items:center;gap:4px;"><span>ðŸ“</span><span>${item.note}</span></div>` : ''}
            <div class="cart-item-footer">
              <div class="cart-item-price">RM ${(item.price * item.qty).toFixed(2)}</div>
              <div class="cart-qty-ctrl">
                <button class="cart-qty-btn" onclick="madCartQty(${i},-1)">âˆ’</button>
                <span class="cart-qty-num">${item.qty}</span>
                <button class="cart-qty-btn" onclick="madCartQty(${i},1)">+</button>
              </div>
            </div>
          </div>
        </div>`;
      });
      cartHtml += `<div class="order-summary-card">
        <div class="summary-row"><span>Subtotal</span><span>RM ${total.toFixed(2)}</span></div>
        <div class="summary-row" style="${madOrderType==='delivery'?'':'display:none'}"><span>Delivery Fee</span><span>RM 1.00</span></div>
        <div class="summary-row total"><span>Total</span><span>RM ${(total+(madOrderType==='delivery'?1:0)).toFixed(2)}</span></div>
      </div>`;
    }
    list.innerHTML = cartHtml;
    const bar = document.getElementById('mad-cart-total-bar');
    if (bar) bar.textContent = 'RM ' + (total+(madOrderType==='delivery'?1:0)).toFixed(2);
  }
  window.renderMadCart = renderMadCart;

  function madCartQty(i, d) { madCart[i].qty = Math.max(1, madCart[i].qty + d); window._madCart = madCart; updateMadCartUI(); renderMadCart(); }
  function madRemoveItem(i) { madCart.splice(i, 1); window._madCart = madCart; updateMadCartUI(); renderMadCart(); }
  function clearMadCart() { madCart.length = 0; window._madCart = madCart; updateMadCartUI(); renderMadCart(); }
  // Inject mad-addr-pick-btn styles once
  (function() {
    const s = document.createElement('style');
    s.textContent = '.mad-addr-pick-btn{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;border-radius:16px;border:2px solid #f0ece8;background:#fff;cursor:pointer;font-family:inherit;transition:all 0.15s;text-align:left;} .mad-addr-pick-btn.selected{border-color:#e07b39;background:#fff8f0;} .mad-addr-pick-btn:active{transform:scale(0.98);}';
    document.head.appendChild(s);
  })();

  function pickMadAddress(addr) {
    const el = document.getElementById('mad-field-address');
    if (el) el.value = addr;
    document.querySelectorAll('.mad-addr-pick-btn').forEach(b => b.classList.remove('selected'));
    const addrMap = {'MMU Hostel Boy': 0, 'MMU Hostel Girl': 1, 'Ixora Apartment': 2};
    const btn = document.getElementById('mad-addr-btn-' + addrMap[addr]);
    if (btn) btn.classList.add('selected');
    const err = document.getElementById('mad-addr-error');
    if (err) err.style.display = 'none';
  }
  window.madCartQty = madCartQty;
  window.madRemoveItem = madRemoveItem;
  window.clearMadCart = clearMadCart;
  window.pickMadAddress = pickMadAddress;



  // â”€â”€ Checkout rendering â”€â”€
  function renderMadCheckout() {
    // Sync local madCart with window._madCart (same as renderMadCart)
    if (window._madCart && window._madCart !== madCart) {
      madCart.length = 0;
      window._madCart.forEach(i => madCart.push(i));
      window._madCart = madCart;
    }
    const summaryEl = document.getElementById('mad-checkout-summary');
    const subtotalEl = document.getElementById('mad-co2-subtotal');
    const totalEl = document.getElementById('mad-co2-total');
    const delivFeeRow = document.getElementById('mad-delivery-fee-row');
    const addressGroup = document.getElementById('mad-address-group');
    if (!summaryEl) return;

    // Auto-fill name
    const nameEl = document.getElementById('mad-field-name');
    const user = window._midi_user;
    if (nameEl && !nameEl.value && user) {
      nameEl.value = user.displayName || user.email?.split('@')[0] || '';
    }

    summaryEl.innerHTML = madCart.map(i => `
      <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;">
        <span>${i.emoji} ${i.name} Ã—${i.qty}</span>
        <span style="font-weight:600;">RM ${(i.price*i.qty).toFixed(2)}</span>
      </div>`).join('');

    const subtotal = madCart.reduce((s, i) => s + i.price * i.qty, 0);
    const delivFee = madOrderType === 'delivery' ? 1.00 : 0;
    const total = subtotal + delivFee;
    if (subtotalEl) subtotalEl.textContent = 'RM ' + subtotal.toFixed(2);
    if (totalEl) totalEl.textContent = 'RM ' + total.toFixed(2);
    if (delivFeeRow) delivFeeRow.style.display = madOrderType === 'delivery' ? 'flex' : 'none';

    if (addressGroup) {
      addressGroup.style.display = madOrderType === 'delivery' ? 'block' : 'none';
      if (madOrderType === 'delivery') {
        const oldSlot = document.getElementById('mad-slot-group');
        if (!oldSlot) {
          addressGroup.insertAdjacentHTML('beforeend', `
            <div class="field-group" id="mad-slot-group" style="margin-top:12px;">
              <label class="field-label">ðŸ• Delivery Slot</label>
              <select class="field-input" id="mad-field-slot" style="background:#fff;">
                <option value="">Select a time slotâ€¦</option>
                <option value="Tue 19 May Â· 11am">Tue 19 May Â· 11am</option>
                <option value="Tue 19 May Â· 12pm">Tue 19 May Â· 12pm</option>
                <option value="Tue 19 May Â· 1pm">Tue 19 May Â· 1pm</option>
              </select>
            </div>`);
        }
      }
    }

    const coPayEl = document.getElementById('mad-co-pay');
    if (coPayEl) coPayEl.textContent = 'RM ' + total.toFixed(2);
    const qrAmt = document.getElementById('mad-qr-amount');
    if (qrAmt) qrAmt.textContent = 'RM ' + total.toFixed(2);
    const proceedBtn = document.getElementById('mad-proceed-btn');
    if (proceedBtn) proceedBtn.textContent = madPayMethod === 'tng' ? 'Proceed to Pay â†’' : 'Place Order â†’';
  }
  window.renderMadCheckout = renderMadCheckout;

  // Override goTo to trigger renderMadCart/renderMadCheckout
  const _madBaseGoTo = window.goTo;
  window.goTo = function(screen) {
    _madBaseGoTo(screen);
    if (screen === 'mad-cart') renderMadCart();
    if (screen === 'mad-checkout') renderMadCheckout();
    if (screen === 'menu-mad') updateMadCartUI();
    if (screen === 'notes') { notesActiveTab = 'All'; loadNotesFromFirestore(); }
  };

  // â”€â”€ Pay method â”€â”€
  function selectMadPayMethod(method) {
    madPayMethod = method;
    const tngBtn = document.getElementById('mad-pay-tng-btn');
    const cashBtn = document.getElementById('mad-pay-cash-btn');
    const cashNote = document.getElementById('mad-cash-note');
    const proceedBtn = document.getElementById('mad-proceed-btn');
    if (tngBtn) { tngBtn.style.borderColor = method==='tng' ? 'var(--matcha)' : 'var(--beige)'; tngBtn.style.background = method==='tng' ? 'var(--matcha-pale)' : 'var(--white)'; }
    if (cashBtn) { cashBtn.style.borderColor = method==='cash' ? 'var(--matcha)' : 'var(--beige)'; cashBtn.style.background = method==='cash' ? 'var(--matcha-pale)' : 'var(--white)'; }
    if (cashNote) cashNote.style.display = method==='cash' ? 'block' : 'none';
    if (proceedBtn) proceedBtn.textContent = method==='tng' ? 'Proceed to Pay â†’' : 'Place Order â†’';
  }
  window.selectMadPayMethod = selectMadPayMethod;

  // â”€â”€ Proceed checkout â”€â”€
  async function madProceedCheckout() {
    const name = document.getElementById('mad-field-name')?.value.trim();
    const phone = document.getElementById('mad-field-phone')?.value.trim();
    if (!name || !phone) { showPostToast('âš ï¸ Please fill in your name and phone number', '#1c1c1e'); return; }
    if (madOrderType === 'delivery') {
      const addr = document.getElementById('mad-field-address')?.value.trim();
      if (!addr) {
        document.getElementById('mad-addr-error').style.display = 'block';
        document.getElementById('mad-addr-error').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const slot = document.getElementById('mad-field-slot')?.value;
      if (!slot) { showPostToast('âš ï¸ Please select a delivery slot', '#1c1c1e'); return; }
    }
    if (madPayMethod === 'tng') {
      renderMadCheckout();
      window.goTo('mad-payment');
    } else {
      await madSubmitCashOrder();
    }
  }
  window.madProceedCheckout = madProceedCheckout;

  // â”€â”€ Screenshot upload â”€â”€
  let madScreenshotFile = null; // raw File for Storage upload

  function handleMadScreenshotUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    madScreenshotFile = file;

    // Show compressed preview only (no base64 stored long-term)
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const previewUrl = canvas.toDataURL('image/jpeg', 0.75);
      URL.revokeObjectURL(url);

      const fileSizeKB = Math.round(file.size / 1024);

      // Show preview
      const preview = document.getElementById('mad-upload-preview');
      const placeholder = document.getElementById('mad-upload-placeholder');
      if (preview) { preview.src = previewUrl; preview.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
      const uploadZone = document.getElementById('mad-upload-zone');
      if (uploadZone) uploadZone.classList.add('has-image');

      // Show result card
      const resultCard  = document.getElementById('mad-ai-result');
      const resultTitle = document.getElementById('mad-ai-result-title');
      const resultRows  = document.getElementById('mad-ai-result-rows');
      if (resultCard) { resultCard.style.display = 'block'; resultCard.className = 'ai-result pass'; }
      if (resultTitle) resultTitle.textContent = 'ðŸ“Ž Screenshot uploaded successfully';
      if (resultRows) resultRows.innerHTML = `
        <div class="ai-result-row">
          <span class="label">File size</span>
          <span class="val ok">~${fileSizeKB} KB âœ“</span>
        </div>
        <div class="ai-result-row">
          <span class="label">Status</span>
          <span class="val ok">Ready to submit âœ“</span>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
          Boss will verify your payment receipt manually.
        </div>`;

      const paidBtn = document.getElementById('mad-paid-btn');
      if (paidBtn) {
        paidBtn.disabled = false;
        paidBtn.style.opacity = '1';
        paidBtn.style.cursor = 'pointer';
        paidBtn.textContent = 'âœ“  Confirm & Submit Order';
      }
    };
    img.src = url;
  }
  window.handleMadScreenshotUpload = handleMadScreenshotUpload;

  // â”€â”€ Mark Paid (TNG) â”€â”€
  async function madMarkPaid() {
    if (!madScreenshotFile) { alert('Please upload your payment screenshot first.'); return; }
    const paidBtn = document.getElementById('mad-paid-btn');
    const waitBanner = document.getElementById('mad-waiting-banner');
    if (paidBtn) {
      paidBtn.textContent = 'â³ Saving orderâ€¦';
      paidBtn.style.background = 'var(--milo)';
      paidBtn.disabled = true;
      paidBtn.style.opacity = '1';
      paidBtn.style.cursor = 'not-allowed';
    }
    if (waitBanner) {
      waitBanner.style.display = 'flex';
      const wt = waitBanner.querySelector('.waiting-text');
      if (wt) wt.textContent = 'Saving your orderâ€¦';
    }
    await madSubmitOrder('tng', 'paid');
  }
  window.madMarkPaid = madMarkPaid;

  async function madSubmitCashOrder() {
    const btn = document.getElementById('mad-proceed-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing orderâ€¦'; }
    await madSubmitOrder('Cash', 'pay_at_counter');
    if (btn) { btn.disabled = false; btn.textContent = 'Place Order â†’'; }
  }

  async function madSubmitOrder(paymentMethod, paymentStatus) {
    const db = window._midi_db;
    if (!db) { alert('Database not ready. Please try again.'); return; }
    const customerName = document.getElementById('mad-field-name')?.value.trim() || 'Guest';
    const customerPhone = document.getElementById('mad-field-phone')?.value.trim() || '';
    const address = madOrderType === 'delivery' ? (document.getElementById('mad-field-address')?.value.trim() || '') : null;
    const slot = madOrderType === 'delivery' ? (document.getElementById('mad-field-slot')?.value || '') : null;
    const note = document.getElementById('mad-field-note')?.value.trim() || '';
    const subtotal = madCart.reduce((s, i) => s + i.price * i.qty, 0);
    const delivFee = madOrderType === 'delivery' ? 1.00 : 0;
    const total = subtotal + delivFee;

    // Upload screenshot to Firebase Storage
    let screenshotUrl = null;
    if (madScreenshotFile) {
      try {
        const storage = getStorage();
        const filename = 'mad_payments/' + Date.now() + '_' + (window._midi_user?.uid || 'guest') + '.jpg';
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, madScreenshotFile);
        screenshotUrl = await getDownloadURL(storageRef);
      } catch(e) { console.error('Screenshot upload failed:', e); }
    }

    const orderData = {
      code:          'MAD-' + String(Date.now()).slice(-4),
      name:          customerName,
      phone:         customerPhone,
      type:          madOrderType,
      address:       address,
      slot:          slot,
      note:          note,
      items:         madCart.map(i => ({ emoji: i.emoji, name: i.name, price: i.price, qty: i.qty, custom: i.custom || 'Standard', note: i.note || '' })),
      total:         total,
      foodTotal:     subtotal,
      serviceFee:    0,
      deliveryFee:   delivFee,
      platformComm:  0,
      merchantNett:  subtotal,
      riderEarning:  delivFee > 0 ? 1.00 : 0,
      status:        'new',
      rider:         null,
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      merchantId:    'mad_drink_lab',
      merchantName:  'Mad Drink Lab',
      userEmail:     window._midi_user ? window._midi_user.email : null,
      userName:      window._midi_user ? window._midi_user.displayName : null,
      screenshotUrl: screenshotUrl,
      timestamp:     serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      madCurrentOrderId = docRef.id;
      if (window._midi_user) {
        updateDoc(doc(db,'users',window._midi_user.uid),{ orderCount: increment(1), lastOrderAt: new Date().toISOString() }).catch(()=>{});
      }
      // Reuse existing startStatusTracking
      if (window.startStatusTracking) window.startStatusTracking(madCurrentOrderId);
      window.goTo('success');
      madCart = [];
      madScreenshotFile = null;
      updateMadCartUI();
      const successCode = document.getElementById('success-order-code');
      if (successCode) successCode.textContent = 'Order #' + orderData.code;
    } catch (err) {
      console.error('Mad order error:', err);
      alert('Failed to place order. Please try again.');
      const waitBanner = document.getElementById('mad-waiting-banner');
      if (waitBanner) waitBanner.style.display = 'none';
      const paidBtn = document.getElementById('mad-paid-btn');
      if (paidBtn) {
        paidBtn.disabled = false;
        paidBtn.style.opacity = '1';
        paidBtn.style.background = '';
        paidBtn.style.cursor = 'pointer';
        paidBtn.textContent = 'âœ“  Confirm & Submit Order';
      }
    }
  }

  // â”€â”€ Product detail â€” reuses Oya's shared detail screen â”€â”€
  const madHeroColors = {
    'ðŸŽ':'linear-gradient(135deg,#ffe4e1,#ffcdd2)',
    'ðŸŠ':'linear-gradient(135deg,#fff3e0,#ffe0b2)',
    'ðŸ¥•':'linear-gradient(135deg,#fff8e1,#ffecb3)',
    'ðŸ¥­':'linear-gradient(135deg,#fff9c4,#fff176)',
    'ðŸ‡':'linear-gradient(135deg,#ede7f6,#d1c4e9)',
    'ðŸ«§':'linear-gradient(135deg,#fce4ec,#f8bbd0)',
    'ðŸŒ½':'linear-gradient(135deg,#fff8e1,#ffcc80)',
  };

  function openMadDetail(name, emoji, price, desc, type) {
    window._activeMerchant = 'mad';
    const basePrice = parseFloat(price.replace('RM ',''));
    window._detailName  = name;
    window._detailEmoji = emoji;
    window._detailPrice = price;
    document.getElementById('detail-emoji').textContent = emoji;
    document.getElementById('detail-name').textContent  = name;
    document.getElementById('detail-desc').textContent  = desc;
    document.getElementById('detail-cat').textContent   = type === 'snack' ? 'Snacks' : 'Drinks';
    document.getElementById('detail-hero').style.background = madHeroColors[emoji] || 'linear-gradient(135deg,#e8f5e9,#c8e6c9)';

    // Show custom image if available
    const heroImg = document.getElementById('detail-hero-img');
    const imageMap = {
      'Zapple Soda':     'assets/zapple-soda.png',
      'Blue Lemon Soda': 'assets/blue-lemon-soda.png',
      'Lychee Sky Soda': 'assets/lychee-sky-soda.png',
      'Ribena Laici':    'assets/ribena-laici-soda.png',
      'Nachos':          'assets/loaded-nachos.png',
    };
    const emojiEl = document.getElementById('detail-emoji');
    if (heroImg) {
      if (imageMap[name]) {
        heroImg.src = imageMap[name];
        heroImg.style.display = 'block';
        if (emojiEl) emojiEl.style.display = 'none';
      } else {
        heroImg.src = '';
        heroImg.style.display = 'none';
        if (emojiEl) emojiEl.style.display = '';
      }
    }

    document.getElementById('qty-num').textContent = '1';
    document.getElementById('detail-total').textContent = price;
    document.getElementById('oden-options').style.display  = 'none';
    const notesEl = document.getElementById('detail-notes');
    if (notesEl) { notesEl.value = ''; }
    const countEl = document.getElementById('notes-count');
    if (countEl) countEl.textContent = '0';
    window._madDetailBasePrice = basePrice;
    window._madDetailQty = 1;
    window.goTo('detail');
  }
  window.openMadDetail = openMadDetail;

  // â”€â”€ MAD Combo Set logic â”€â”€
  const _madDrinks = [
    { name: 'Ribena Laici',    emoji: 'ðŸ‡', price: 4 },
    { name: 'Zapple Soda',     emoji: 'ðŸŽ', price: 4 },
    { name: 'Blue Lemon Soda', emoji: 'ðŸ‹', price: 4 },
    { name: 'Lychee Sky Soda', emoji: 'ðŸ«§', price: 4 },
  ];

  window._madComboType = null;
  window._madComboSelections = []; // selected drink indices (allows duplicates for 2/3 drinks)

  function openMadCombo(type) {
    window._madComboType = type;
    window._madComboSelections = [];
    const modal = document.getElementById('mad-combo-modal');
    const titleEl = document.getElementById('mad-combo-title');
    const subEl   = document.getElementById('mad-combo-sub');
    const drinkSec  = document.getElementById('mad-combo-drink-section');
    const drink3Sec = document.getElementById('mad-combo-3drink-section');

    drinkSec.style.display  = 'none';
    drink3Sec.style.display = 'none';

    if (type === 'nachos1drink') {
      titleEl.textContent = 'ðŸŒ½ + ðŸ¥¤ Nachos + 1 Drink';
      subEl.textContent   = 'Pick 1 drink â€” save RM 1!';
      drinkSec.style.display = 'block';
      document.getElementById('mad-combo-drink-info').textContent = 'Select 1 drink';
      renderMadComboDrinks(1);
    } else if (type === 'nachos2drinks') {
      titleEl.textContent = 'ðŸŒ½ + ðŸ¥¤ðŸ¥¤ Nachos + 2 Drinks';
      subEl.textContent   = 'Pick 2 drinks â€” save RM 2!';
      drinkSec.style.display = 'block';
      document.getElementById('mad-combo-drink-info').textContent = 'Select 2 drinks';
      renderMadComboDrinks(2);
    } else if (type === '3drinks') {
      titleEl.textContent = 'ðŸ¥¤ðŸ¥¤ðŸ¥¤ Any 3 Drinks â€” RM 10';
      subEl.textContent   = 'Pick any 3 drinks for just RM 10!';
      drink3Sec.style.display = 'block';
      document.getElementById('mad-combo-3drink-info').textContent = 'Select 3 drinks';
      renderMadCombo3Drinks();
    }
    updateMadComboTotal();
    modal.style.display = 'flex';
  }
  window.openMadCombo = openMadCombo;

  function renderMadComboDrinks(maxPicks) {
    const list = document.getElementById('mad-combo-drink-list');
    list.innerHTML = _madDrinks.map((d, i) => `
      <div id="mad-combo-drink-${i}" onclick="toggleMadComboDrink(${i},${maxPicks})" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:2px solid #f0ece8;cursor:pointer;transition:all 0.15s;background:#fff;">
        <div style="font-size:22px;">${d.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:600;color:#1c1c1e;">${d.name}</div>
          <div style="font-size:12px;color:#aaa;">RM ${d.price.toFixed(2)}</div>
        </div>
        <div id="mad-combo-check-${i}" style="width:22px;height:22px;border-radius:50%;border:2px solid #ddd;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;"></div>
      </div>
    `).join('');
  }

  function renderMadCombo3Drinks() {
    const list = document.getElementById('mad-combo-3drink-list');
    list.innerHTML = _madDrinks.map((d, i) => `
      <div id="mad-combo-3d-${i}" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:2px solid #e3f2fd;cursor:pointer;transition:all 0.15s;background:#fff;">
        <div style="font-size:22px;">${d.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:600;color:#1c1c1e;">${d.name}</div>
          <div style="font-size:12px;color:#1976d2;">RM ${d.price.toFixed(2)} each</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button onclick="adj3DrinkQty(event,${i},-1)" style="width:28px;height:28px;border-radius:50%;border:1.5px solid #1976d2;background:#fff;color:#1976d2;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">âˆ’</button>
          <span id="mad-3d-qty-${i}" style="font-size:15px;font-weight:700;color:#1c1c1e;min-width:16px;text-align:center;">0</span>
          <button onclick="adj3DrinkQty(event,${i},1)" style="width:28px;height:28px;border-radius:50%;border:none;background:#1976d2;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">+</button>
        </div>
      </div>
    `).join('');
  }

  window._madCombo3DrinkQtys = [0,0,0,0];

  function adj3DrinkQty(e, idx, delta) {
    e.stopPropagation();
    if (!window._madCombo3DrinkQtys) window._madCombo3DrinkQtys = [0,0,0,0];
    const q = window._madCombo3DrinkQtys;
    const total = q.reduce((a,b) => a+b, 0);
    if (delta > 0 && total >= 3) return; // max 3 total
    q[idx] = Math.max(0, q[idx] + delta);
    document.getElementById('mad-3d-qty-' + idx).textContent = q[idx];
    const rem = 3 - q.reduce((a,b) => a+b, 0);
    document.getElementById('mad-combo-3drink-info').textContent = rem > 0 ? `Select ${rem} more drink${rem > 1 ? 's' : ''}` : 'âœ… All 3 selected!';
    updateMadComboTotal();
  }
  window.adj3DrinkQty = adj3DrinkQty;

  function toggleMadComboDrink(idx, max) {
    const sel = window._madComboSelections;
    const pos = sel.indexOf(idx);
    if (pos >= 0) {
      sel.splice(pos, 1);
    } else {
      if (sel.length >= max) sel.shift(); // remove oldest if over limit
      sel.push(idx);
    }
    // Update visual
    _madDrinks.forEach((_, i) => {
      const row   = document.getElementById('mad-combo-drink-' + i);
      const check = document.getElementById('mad-combo-check-' + i);
      const isSelected = sel.includes(i);
      row.style.border   = isSelected ? '2px solid #e07b39' : '2px solid #f0ece8';
      row.style.background = isSelected ? '#fff8f0' : '#fff';
      check.style.background = isSelected ? '#e07b39' : '#fff';
      check.style.border     = isSelected ? '2px solid #e07b39' : '2px solid #ddd';
      check.textContent      = isSelected ? 'âœ“' : '';
      check.style.color      = '#fff';
    });
    const rem = max - sel.length;
    document.getElementById('mad-combo-drink-info').textContent = rem > 0 ? `Select ${rem} more drink${rem > 1 ? 's' : ''}` : 'âœ… All selected!';
    updateMadComboTotal();
  }
  window.toggleMadComboDrink = toggleMadComboDrink;

  function updateMadComboTotal() {
    const type = window._madComboType;
    let total = 0;
    if (type === 'nachos1drink') {
      total = 13; // 10 + 4 - 1
    } else if (type === 'nachos2drinks') {
      total = 16; // 10 + 4 + 4 - 2
    } else if (type === '3drinks') {
      total = 10;
    }
    document.getElementById('mad-combo-total').textContent = 'RM ' + total.toFixed(2);
  }

  function addMadComboToCart() {
    const type = window._madComboType;
    const mc = window._madCart || [];

    if (type === 'nachos1drink') {
      if (window._madComboSelections.length < 1) {
        document.getElementById('mad-combo-drink-info').textContent = 'âš ï¸ Please pick 1 drink!';
        document.getElementById('mad-combo-drink-info').style.color = '#c0392b';
        return;
      }
      const d = _madDrinks[window._madComboSelections[0]];
      // Single combo entry: RM13 flat
      mc.push({ name: 'ðŸŒ½ Nachos Combo +1 Drink', emoji: 'ðŸŽ‰', price: 13, qty: 1, custom: `Nachos + ${d.emoji} ${d.name}`, note: '' });
    } else if (type === 'nachos2drinks') {
      if (window._madComboSelections.length < 2) {
        document.getElementById('mad-combo-drink-info').textContent = 'âš ï¸ Please pick 2 drinks!';
        document.getElementById('mad-combo-drink-info').style.color = '#c0392b';
        return;
      }
      // Single combo entry: RM16 flat
      const drinkNames = window._madComboSelections.map(idx => _madDrinks[idx].emoji + ' ' + _madDrinks[idx].name).join(', ');
      mc.push({ name: 'ðŸŒ½ Nachos Combo +2 Drinks', emoji: 'ðŸŽ‰', price: 16, qty: 1, custom: `Nachos + ${drinkNames}`, note: '' });
    } else if (type === '3drinks') {
      const qtys = window._madCombo3DrinkQtys || [0,0,0,0];
      const totalPicked = qtys.reduce((a,b)=>a+b,0);
      if (totalPicked < 3) {
        document.getElementById('mad-combo-3drink-info').textContent = `âš ï¸ Pick ${3 - totalPicked} more drink(s)!`;
        document.getElementById('mad-combo-3drink-info').style.color = '#c0392b';
        return;
      }
      // Single combo entry: RM10 flat
      const drinkParts = _madDrinks.map((d, i) => qtys[i] > 0 ? (qtys[i] > 1 ? `${d.emoji} ${d.name} Ã—${qtys[i]}` : `${d.emoji} ${d.name}`) : null).filter(Boolean);
      mc.push({ name: 'ðŸ¥¤ 3-Drink Bundle', emoji: 'ðŸŽ‰', price: 10, qty: 1, custom: drinkParts.join(', '), note: '' });
    }

    window._madCart = mc;
    if (typeof window.updateMadCartUI === 'function') window.updateMadCartUI();

    // Close modal with success feedback
    const btn = document.querySelector('#mad-combo-modal button:last-child');
    if (btn) { btn.textContent = 'âœ“ Added!'; btn.style.background = '#5a7d3c'; }
    setTimeout(() => {
      document.getElementById('mad-combo-modal').style.display = 'none';
      window._madComboType = null;
      window._madComboSelections = [];
      window._madCombo3DrinkQtys = [0,0,0,0];
      // Reset button
      if (btn) { btn.textContent = 'Add Combo to Cart ðŸ›’'; btn.style.background = 'linear-gradient(135deg,#ff9800,#e07b39)'; }
    }, 700);
  }
  window.addMadComboToCart = addMadComboToCart;

  function closeMadComboModal(e) {
    if (e && e.target !== document.getElementById('mad-combo-modal')) return;
    document.getElementById('mad-combo-modal').style.display = 'none';
  }
  window.closeMadComboModal = closeMadComboModal;

  // â”€â”€ Order type modal â”€â”€
  function openMadOrderModal() {
    madPendingOrderType = madOrderType;
    updateMadModalSelection(madOrderType);
    document.getElementById('mad-order-type-modal').style.display = 'flex';
  }
  window.openMadOrderModal = openMadOrderModal;

  function closeMadOrderModal(e) {
    if (e && e.target !== document.getElementById('mad-order-type-modal')) return;
    document.getElementById('mad-order-type-modal').style.display = 'none';
    madPendingOrderType = null;
  }
  window.closeMadOrderModal = closeMadOrderModal;

  function selectMadOrderType(type) {
    madPendingOrderType = type;
    updateMadModalSelection(type);
  }
  window.selectMadOrderType = selectMadOrderType;

  function updateMadModalSelection(type) {
    const btnP = document.getElementById('mad-modal-btn-pickup');
    const btnD = document.getElementById('mad-modal-btn-delivery');
    const chkP = document.getElementById('mad-modal-check-pickup');
    const chkD = document.getElementById('mad-modal-check-delivery');
    if (btnP) btnP.classList.toggle('selected', type === 'pickup');
    if (btnD) btnD.classList.toggle('selected', type === 'delivery');
    if (chkP) chkP.style.display = type === 'pickup'   ? 'block' : 'none';
    if (chkD) chkD.style.display = type === 'delivery' ? 'block' : 'none';
  }

  function confirmMadOrderType() {
    if (!madPendingOrderType) return;
    madOrderType = madPendingOrderType;
    const co = document.getElementById('mad-checkout-method');
    const ci = document.getElementById('mad-checkout-icon');
    if (co) co.textContent = madOrderType === 'pickup' ? 'Pick Up' : 'Delivery';
    if (ci) ci.textContent = madOrderType === 'pickup' ? 'ðŸ›' : 'ðŸ›µ';
    const cashBtn = document.getElementById('mad-pay-cash-btn');
    const cashNote = document.getElementById('mad-cash-note');
    if (madOrderType === 'delivery') {
      if (cashBtn) cashBtn.style.display = 'none';
      if (cashNote) cashNote.style.display = 'none';
      madPayMethod = 'tng';
    } else {
      if (cashBtn) cashBtn.style.display = 'flex';
    }
    renderMadCheckout();
    document.getElementById('mad-order-type-modal').style.display = 'none';
    madPendingOrderType = null;
  }
  window.confirmMadOrderType = confirmMadOrderType;

