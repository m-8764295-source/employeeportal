  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  FIREBASE SETUP
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getFirestore, collection, addDoc, doc, onSnapshot, serverTimestamp, query, where, orderBy, getDocs, setDoc, getDoc, updateDoc, increment }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
  import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    linkWithCredential,
    EmailAuthProvider,
    fetchSignInMethodsForEmail
  } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


  const firebaseConfig = {
    apiKey: "AIzaSyCkFmMpScduIj1493VWQdDCOAaTUWnWEbk",
    authDomain: "mmu-delivery-a4919.firebaseapp.com",
    projectId: "mmu-delivery-a4919",
    storageBucket: "mmu-delivery-a4919.firebasestorage.app",
    messagingSenderId: "945529333130",
    appId: "1:945529333130:web:915bfd830b44de4e19d473"
  };

  const app     = initializeApp(firebaseConfig);
  const db      = getFirestore(app);
  const storage = getStorage(app);
  const auth    = getAuth(app);
  // Expose for other modules
  window._midi_db   = db;
  window._midi_user = null;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  NAVIGATION â€” single function controls all screens
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let currentUser = null;

  function activateScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    const target = document.getElementById(id);
    target.style.display = 'flex';
    target.classList.add('active');
    currentScreen = id.replace('screen-', '');
    if (typeof window.updateBottomNav === 'function') window.updateBottomNav();
    // Fire data-onshow handler
    const onshow = target.getAttribute('data-onshow');
    if (onshow) { try { eval(onshow); } catch(e) {} }
  }

  function showLanding(user) {
    currentUser = user;
    window._midi_user = user;
    if (user) updateUserChip(user);
    // Update greeting
    const greeting = document.getElementById('landing-greeting');
    const exploreGreeting = document.getElementById('explore-greeting');
    if (greeting || exploreGreeting) {
      const hour = new Date().getHours();
      const tod  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const name = user?.displayName ? ', ' + user.displayName.split(' ')[0] : '';
      if (greeting) greeting.textContent = `Good ${tod}${name}! ðŸ‘‹`;
      if (exploreGreeting) exploreGreeting.textContent = `Good ${tod}${name}! ðŸ‘‹`;
    }
    activateScreen('screen-landing');
    refreshMenuAvatar();
  }

  function showLogin() {
    activateScreen('screen-login');
    const loading = document.getElementById('login-loading');
    const btn = document.getElementById('auth-submit-btn');
    if (loading) loading.style.display = 'none';
    if (btn) btn.style.display = 'flex';
  }

  // Wait for BOTH splash AND Firebase auth to resolve before routing
  let authResolved = false;
  let splashEnded  = false;
  let resolvedUser = null;

  function routeAfterAuth(user) {
    const splash = document.getElementById('screen-splash');

    // Prepare destination under splash
    if (user) {
      showLanding(user);
    } else {
      showLogin();
    }
    const next = document.querySelector('.screen.active');
    if (next) {
      next.style.transform  = 'translateX(30px)';
      next.style.opacity    = '0';
      next.style.transition = 'none';
    }

    // Start BOTH at the same time â€” splash fades out, page slides in simultaneously
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Splash fades out
        splash.style.transition = 'opacity 0.45s ease';
        splash.style.opacity    = '0';

        // Page slides in at same moment
        if (next) {
          next.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)';
          next.style.opacity    = '1';
          next.style.transform  = 'translateX(0)';
        }
      });
    });

    // Hide splash after fade completes
    setTimeout(() => {
      splash.style.display = 'none';
      splash.classList.remove('active');
    }, 480);
  }

  // Firebase calls this quickly (usually <300ms) â€” track when it resolves
  const unsubRoute = onAuthStateChanged(auth, (user) => {
    currentUser    = user;
    resolvedUser   = user;
    authResolved   = true;
    if (splashEnded) {
      unsubRoute();
      routeAfterAuth(user);
    }
    // else splash still showing â€” it will route when done
  });

  // Splash ends after 2s â€” route immediately if auth already resolved
  setTimeout(() => {
    splashEnded = true;
    if (authResolved) {
      unsubRoute();
      routeAfterAuth(resolvedUser); // no flash â€” auth already known
    }
    // else wait up to 1.5s more for Firebase, then fallback to login
    else {
      setTimeout(() => {
        if (!authResolved) routeAfterAuth(null);
      }, 1500);
    }
  }, 1000);

  // After successful login/signup â†’ go to landing
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loginActive = document.getElementById('screen-login').classList.contains('active');
    if (loginActive && user) {
      showLanding(user);
    }
  });

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  EMAIL / PASSWORD AUTH
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let authMode = 'login'; // 'login' or 'signup'

  function switchAuthTab(mode) {
    authMode = mode;
    const isSignup = mode === 'signup';
    document.getElementById('tab-login').style.background  = isSignup ? 'transparent' : '#fff';
    document.getElementById('tab-login').style.color       = isSignup ? 'rgba(255,255,255,0.6)' : '#1B3FA0';
    document.getElementById('tab-signup').style.background = isSignup ? '#fff' : 'transparent';
    document.getElementById('tab-signup').style.color      = isSignup ? '#1B3FA0' : 'rgba(255,255,255,0.6)';
    document.getElementById('name-field').style.display    = isSignup ? 'block' : 'none';
    document.getElementById('auth-submit-btn').textContent = isSignup ? 'Create Account' : 'Login';
    document.getElementById('auth-password').placeholder   = isSignup ? 'Password (min 6 chars)' : 'Password';
    document.getElementById('auth-password').autocomplete  = isSignup ? 'new-password' : 'current-password';
    document.getElementById('auth-error').style.display    = 'none';
  }
  window.switchAuthTab = switchAuthTab;

  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        lastLoginAt: new Date().toISOString(),
      }, { merge: true });
    } catch(e) {
      console.error('Google sign-in error:', e);
      const errEl = document.getElementById('auth-error');
      if (errEl) { errEl.textContent = 'Google sign-in failed. Try again.'; errEl.style.display = 'block'; }
    }
  }
  window.signInWithGoogle = signInWithGoogle;

  async function submitAuth() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name     = document.getElementById('auth-name')?.value.trim();
    const btn      = document.getElementById('auth-submit-btn');
    const loading  = document.getElementById('login-loading');

    document.getElementById('auth-error').style.display = 'none';

    if (!email || !password) { showAuthError('Please fill in all fields.'); return; }
    if (authMode === 'signup' && password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

    btn.style.display     = 'none';
    loading.style.display = 'flex';

    const resetUI = () => {
      btn.style.display     = 'flex';
      loading.style.display = 'none';
    };

    try {
      let userCredential;
      if (authMode === 'signup') {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
          await updateProfile(userCredential.user, { displayName: name });
        }
        // Save user profile to Firestore users collection
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid:        userCredential.user.uid,
          email:      userCredential.user.email,
          name:       name || '',
          status:     'active',
          orderCount: 0,
          createdAt:  new Date().toISOString(),
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Check if suspended
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().status === 'suspended') {
          await signOut(auth);
          resetUI();
          showAuthError('Your account has been suspended. Please contact support.');
          return;
        }
      }
      // Success â€” navigate immediately
      resetUI();
      showLanding(userCredential.user);
    } catch (err) {
      console.error('Auth error:', err.code, err.message);
      resetUI();
      const msgs = {
        'auth/user-not-found':         'No account found. Please Sign Up first.',
        'auth/wrong-password':         'Wrong password. Please try again.',
        'auth/invalid-credential':     'Wrong email or password.',
        'auth/email-already-in-use':   'Email already registered. Please Login.',
        'auth/invalid-email':          'Please enter a valid email address.',
        'auth/weak-password':          'Password too weak. Use at least 6 characters.',
        'auth/too-many-requests':      'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'No internet connection.',
        'auth/user-disabled':          'This account has been disabled.',
      };
      showAuthError(msgs[err.code] || 'Error: ' + err.code);
    }
  }
  window.submitAuth = submitAuth;

  // Allow pressing Enter to submit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('screen-login').classList.contains('active')) {
      submitAuth();
    }
  });

  function skipLogin() {
    showLanding(null);
  }
  window.skipLogin = skipLogin;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PROFILE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let profileAvatarUrl = null;
  let profileUnsubscribers = [];

  function initProfile() {
    // Load saved avatar from localStorage
    const saved = localStorage.getItem('midi_avatar');
    if (saved) { profileAvatarUrl = saved; }
  }
  initProfile();

  function updateUserChip(user) {
    if (!user) return;
    // Update menu greeting
    const greeting = document.querySelector('.menu-greeting');
    if (greeting) {
      const hour = new Date().getHours();
      const tod  = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      const name = user.displayName ? user.displayName.split(' ')[0] : 'there';
      greeting.textContent = `Good ${tod}, ${name} â˜€`;
    }
    // Update menu home button with avatar
    refreshMenuAvatar();
    // Auto-fill name field
    const nameField = document.getElementById('field-name');
    if (nameField && !nameField.value && user.displayName) nameField.value = user.displayName;
  }
  window.updateUserChip = updateUserChip;

  function refreshMenuAvatar() {
    const btn = document.getElementById('menu-home-btn');
    const madBtn = document.getElementById('mad-menu-home-btn');
    const landingBtn = document.getElementById('landing-avatar-btn');

    let html = '';
    if (profileAvatarUrl) {
      html = `<img src="${profileAvatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
    } else if (currentUser?.displayName) {
      const initials = currentUser.displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      html = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1B3FA0,#2979D8);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;">${initials}</div>`;
    } else {
      html = `<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="10" r="5.5" fill="#94A3B8"/><path d="M3 23c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#94A3B8"/></svg>`;
    }

    function setMenuBtn(el) {
      if (!el) return;
      if (profileAvatarUrl) {
        el.innerHTML = `<img src="${profileAvatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:13px;">`;
      } else if (currentUser?.displayName) {
        const initials = currentUser.displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        el.innerHTML = `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1B3FA0,#2979D8);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;">${initials}</div>`;
      } else {
        el.innerHTML = 'ðŸ‘¤';
      }
    }

    setMenuBtn(btn);
    setMenuBtn(madBtn);
    if (landingBtn) landingBtn.innerHTML = html;
    const exploreBtn = document.getElementById('explore-avatar-btn');
    if (exploreBtn) exploreBtn.innerHTML = html;
  }

  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      profileAvatarUrl = ev.target.result;
      localStorage.setItem('midi_avatar', profileAvatarUrl);
      renderProfileAvatar();
      refreshMenuAvatar();
    };
    reader.readAsDataURL(file);
  }
  window.handleAvatarUpload = handleAvatarUpload;

  function renderProfileAvatar() {
    const el = document.getElementById('profile-avatar-display');
    if (!el) return;
    if (profileAvatarUrl) {
      el.innerHTML = `<img src="${profileAvatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
    } else if (currentUser?.displayName) {
      const initials = currentUser.displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      el.innerHTML = `<div style="width:100%;height:100%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;">${initials}</div>`;
    } else {
      el.innerHTML = `<svg width="52" height="52" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="20" r="11" fill="rgba(255,255,255,0.4)"/><path d="M6 46c0-11 8.954-20 20-20s20 8.954 20 20" fill="rgba(255,255,255,0.4)"/></svg>`;
    }
  }

  function loadProfile() {
    // Fill user info
    const user = currentUser;
    document.getElementById('profile-name-display').textContent  = user?.displayName || user?.email?.split('@')[0] || 'Guest';
    document.getElementById('profile-email-display').textContent = user?.email || 'â€”';
    renderProfileAvatar();
    refreshMenuAvatar();

    // Clear previous listeners
    profileUnsubscribers.forEach(u => u());
    profileUnsubscribers = [];

    if (!user) {
      document.getElementById('profile-active-orders').innerHTML  = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Sign in to view orders</div>`;
      document.getElementById('profile-order-history').innerHTML  = '';
      return;
    }

    // Load orders from Firestore
    const q = query(collection(db,'orders'), where('userEmail','==',user.email), orderBy('timestamp','desc'));
    const unsub = onSnapshot(q, snap => {
      const all = [];
      snap.forEach(d => all.push({ id: d.id, ...d.data() }));
      const active = all.filter(o => !['done','cancelled'].includes(o.status));
      const hist   = all.filter(o =>  ['done','cancelled'].includes(o.status));
      renderActiveOrders(active);
      renderHistoryOrders(hist);
    });
    profileUnsubscribers.push(unsub);
  }

  // â”€â”€ Grab-style tracker â”€â”€
  const STEPS_DELIVERY = [
    { key:'new',        icon:'ðŸ§¾', label:'Confirmed' },
    { key:'preparing',  icon:'ðŸ‘¨â€ðŸ³', label:'Preparing' },
    { key:'ready',      icon:'â³', label:'Waiting Rider' },
    { key:'delivering', icon:'ðŸ›µ', label:'On the Way' },
    { key:'done',       icon:'ðŸŽ‰', label:'Done' },
  ];
  const STEPS_PICKUP  = [
    { key:'new',        icon:'ðŸ§¾', label:'Confirmed' },
    { key:'preparing',  icon:'ðŸ‘¨â€ðŸ³', label:'Preparing' },
    { key:'ready',      icon:'âœ…', label:'Ready!' },
    { key:'done',       icon:'ðŸŽ‰', label:'Done' },
  ];
  const STEPS_PREORDER = STEPS_PICKUP;
  const STATUS_ORDER  = ['new','preparing','ready','delivering','done'];

  function renderActiveOrders(orders) {
    const el = document.getElementById('profile-active-orders');
    if (!orders.length) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No active orders ðŸŽ‰</div>`;
      return;
    }
    el.innerHTML = orders.map(o => buildTrackerCard(o)).join('');
  }

  function buildTrackerCard(o) {
    const steps     = o.type === 'pickup' || o.type === 'preorder' ? STEPS_PICKUP : STEPS_DELIVERY;
    const curIdx    = STATUS_ORDER.indexOf(o.status);
    const totalSteps = steps.length;

    // Calculate line fill %
    const doneSteps = steps.filter(s => STATUS_ORDER.indexOf(s.key) < curIdx).length;
    const fillPct   = totalSteps > 1 ? (doneSteps / (totalSteps - 1)) * 100 : 0;

    const dotsHtml = steps.map(s => {
      const sIdx   = STATUS_ORDER.indexOf(s.key);
      const isDone = sIdx < curIdx;
      const isNow  = s.key === o.status;
      const dotColor   = isDone ? '#7a9e5a' : isNow ? '#7a9e5a' : '#d1d5db';
      const dotBg      = isDone ? '#7a9e5a' : isNow ? 'rgba(122,158,90,0.15)' : '#f3f4f6';
      const dotBorder  = isDone ? '#7a9e5a' : isNow ? '#7a9e5a' : '#d1d5db';
      const labelColor = isNow ? '#7a9e5a' : isDone ? '#374151' : '#9ca3af';
      const labelWeight = isNow ? '700' : '500';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0;">
        <div style="width:30px;height:30px;border-radius:50%;border:2px solid ${dotBorder};background:${dotBg};display:flex;align-items:center;justify-content:center;font-size:13px;color:${isDone?'#fff':dotColor};background:${isDone?'#7a9e5a':dotBg};">
          ${isDone ? 'âœ“' : s.icon}
        </div>
        <div style="font-size:9px;font-weight:${labelWeight};color:${labelColor};text-align:center;line-height:1.2;">${s.label}</div>
      </div>`;
    }).join('');

    const date  = o.timestamp?.toDate ? o.timestamp.toDate().toLocaleDateString('en-MY',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'â€”';
    const items = (o.items||[]).map(i=>`${i.emoji} ${i.name} Ã—${i.qty}`).join(' Â· ');

    const riderHtml = (o.status === 'delivering' && o.rider)
      ? `<div style="display:flex;align-items:center;gap:10px;background:rgba(122,158,90,0.08);border:1.5px solid rgba(122,158,90,0.25);border-radius:10px;padding:10px 12px;margin-top:10px;">
           <span style="font-size:22px;">ðŸ›µ</span>
           <div style="flex:1;">
             <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Your Rider</div>
             <div style="font-size:14px;font-weight:700;color:#111827;">${o.rider}</div>
           </div>
           ${o.riderPhone ? `<a href="tel:${o.riderPhone}" style="background:#7a9e5a;color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;text-decoration:none;">ðŸ“ž Call</a>` : ''}
         </div>`
      : '';

    return `<div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:16px;padding:14px 16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:#111827;">${o.code||'Order'}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${date}</div>
        </div>
        <div style="font-size:14px;font-weight:700;color:#7a9e5a;">RM ${o.total?.toFixed(2)||'â€”'}</div>
      </div>
      <div style="position:relative;display:flex;align-items:flex-start;gap:0;">
        <div style="position:absolute;top:15px;left:15px;right:15px;height:2px;background:#e5e7eb;z-index:0;">
          <div style="height:100%;width:${fillPct}%;background:#7a9e5a;transition:width 0.4s;"></div>
        </div>
        <div style="position:relative;z-index:1;display:flex;width:100%;justify-content:space-between;">
          ${dotsHtml}
        </div>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-top:10px;">${items}</div>
      ${riderHtml}
    </div>`;
  }

  function renderHistoryOrders(orders) {
    const el = document.getElementById('profile-order-history');
    if (!orders.length) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No past orders yet</div>`;
      return;
    }
    el.innerHTML = orders.map(o => {
      const date   = o.timestamp?.toDate ? o.timestamp.toDate().toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'}) : 'â€”';
      const icon   = o.type==='delivery' ? 'ðŸ›µ' : o.type==='preorder' ? 'ðŸ“‹' : 'ðŸ›';
      const status = o.status==='done' ? 'Delivered' : 'Cancelled';
      const sColor = o.status==='done' ? 'background:#EDF4E6;color:var(--matcha)' : 'background:#FEE;color:#E8654A';
      const riderRow = (o.type==='delivery' && o.rider)
        ? `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--beige);">
             <div style="display:flex;align-items:center;gap:8px;">
               <span style="font-size:16px;">ðŸ›µ</span>
               <div>
                 <div style="font-size:11px;color:var(--text-muted);font-weight:600;">Rider</div>
                 <div style="font-size:13px;font-weight:700;color:var(--text-dark);">${o.rider}</div>
               </div>
             </div>
             ${o.riderPhone ? `<a href="tel:${o.riderPhone}" style="background:var(--matcha);color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;text-decoration:none;">ðŸ“ž Call</a>` : ''}
           </div>`
        : '';
      // Delivery photo thumbnail (clickable to fullscreen)
      const photoRow = (o.status === 'done' && o.deliveryPhotoUrl)
        ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--beige);">
             <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">ðŸ“¸ Delivery Photo</div>
             <div onclick="openDeliveryPhoto('${o.deliveryPhotoUrl}')" style="cursor:pointer;border-radius:12px;overflow:hidden;position:relative;">
               <img src="${o.deliveryPhotoUrl}" style="width:100%;max-height:140px;object-fit:cover;display:block;" alt="Delivery proof">
               <div style="position:absolute;inset:0;background:rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;">
                 <div style="background:rgba(0,0,0,0.5);border-radius:100px;padding:6px 14px;font-size:12px;font-weight:700;color:#fff;">ðŸ” Tap to view</div>
               </div>
             </div>
           </div>`
        : '';
      return `<div class="hist-card">
        <div class="hist-card-row">
          <div class="hist-card-icon">${icon}</div>
          <div class="hist-card-info">
            <div class="hist-card-code">${o.code||'Order'}</div>
            <div class="hist-card-meta">${date} Â· ${(o.items||[]).length} item(s)</div>
          </div>
          <div class="hist-card-right">
            <div class="hist-card-total">RM ${o.total?.toFixed(2)||'â€”'}</div>
            <div class="hist-card-status" style="${sColor}">${status}</div>
          </div>
        </div>
        ${riderRow}
        ${photoRow}
      </div>`;
    }).join('');
  }

  async function handleSignOut() {
    profileUnsubscribers.forEach(u => u());
    profileUnsubscribers = [];
    await signOut(auth);
    currentUser = null;
    showLogin();
  }
  window.handleSignOut = handleSignOut;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  APP STATE
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let currentScreen = 'landing';
  let screenHistory = [];
  let orderType = 'pickup';
  let cart = [];
  let detailQty = 1;
  let detailBasePrice = 0;
  let currentDetailType = 'drink';
  let currentOrderId = null;   // Firestore doc ID
  let unsubscribeStatus = null;

  // Notes state â€” declared before goTo so it's accessible
  let notesActiveTab = 'All';
  let notesUnsubscribe = null;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  NAVIGATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function goTo(screen) {
    const cur = document.querySelector('.screen.active');
    if (cur) {
      screenHistory.push(cur.id.replace('screen-', ''));
      cur.classList.remove('active');
      cur.style.display = 'none';
    }
    const next = document.getElementById('screen-' + screen);
    if (!next) return;
    next.style.display = 'flex';
    next.classList.add('active');
    currentScreen = screen;
    if (screen === 'cart') renderCart();
    if (screen === 'checkout') renderCheckout();
    if (screen === 'mad-checkout') { if (typeof window.renderMadCheckout === 'function') window.renderMadCheckout(); }
    if (screen === 'notes') {
      notesActiveTab = 'All';
      if (typeof loadNotesFromFirestore === 'function') loadNotesFromFirestore();
    }
    const dsb = document.getElementById('detail-sticky-bar');
    if (dsb) dsb.style.display = screen === 'detail' ? '' : 'none';
    if (typeof window.updateBottomNav === 'function') window.updateBottomNav();
  }
  window.goTo = goTo;

  function goBack() {
    const prev = screenHistory.pop() || 'landing';
    const cur = document.querySelector('.screen.active');
    if (cur) { cur.classList.remove('active'); cur.style.display = 'none'; }
    const target = document.getElementById('screen-' + prev);
    target.style.display = 'flex';
    target.classList.add('active');
    currentScreen = prev;
    // Show/hide detail sticky bar
    const dsb = document.getElementById('detail-sticky-bar');
    if (dsb) dsb.style.display = prev === 'detail' ? '' : 'none';
    if (typeof window.updateBottomNav === 'function') window.updateBottomNav();
  }
  window.goBack = goBack;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  BOTTOM NAV BAR
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const NAV_SCREENS = ['menu', 'menu-mad', 'orders', 'profile', 'landing', 'explore', 'post', 'notes', 'note-detail'];

  function proceedCheckout(screen) {
    if (!currentUser) {
      // Show modal prompt
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:DM Sans,sans-serif;';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:24px;padding:28px 24px;width:100%;max-width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
          <div style="font-size:36px;margin-bottom:12px;">ðŸ”</div>
          <div style="font-size:17px;font-weight:800;color:#1c1c1e;margin-bottom:8px;">Sign in required</div>
          <div style="font-size:13px;color:#9a8f85;margin-bottom:24px;line-height:1.5;">You need to sign in or create an account before checking out.</div>
          <button id="login-ok-btn" style="width:100%;padding:14px;background:#1c1c1e;color:#fff;border:none;border-radius:14px;font-family:DM Sans,sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Sign In</button>
          <button id="login-cancel-btn" style="width:100%;padding:12px;background:transparent;color:#9a8f85;border:none;border-radius:14px;font-family:DM Sans,sans-serif;font-size:14px;font-weight:600;cursor:pointer;">Cancel</button>
        </div>`;
      document.body.appendChild(overlay);
      document.getElementById('login-ok-btn').onclick = () => { overlay.remove(); goTo('login'); };
      document.getElementById('login-cancel-btn').onclick = () => overlay.remove();
      return;
    }
    goTo(screen);
  }
  window.proceedCheckout = proceedCheckout;

  // Store files for upload
  let notesPhotoFiles = [];

  function handleNotesPhotos(input) {
    const row = document.getElementById('notes-photos-row');
    const current = row.querySelectorAll('.notes-photo-item').length;
    const remaining = 5 - current;
    if (remaining <= 0) { showPostToast('âš ï¸ Maximum 5 photos allowed', '#1c1c1e'); return; }
    const files = Array.from(input.files).slice(0, remaining);
    let rejected = 0;
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) { rejected++; return; }
      notesPhotoFiles.push(file);
      const url = URL.createObjectURL(file);
      addNotesPhotoPreview(url, notesPhotoFiles.length - 1);
    });
    if (rejected > 0) showPostToast(`âš ï¸ ${rejected} photo(s) exceed 2MB limit`, '#1c1c1e');
    input.value = '';
    updateAddPhotoBtn();
  }

  function addNotesPhotoPreview(src, fileIndex) {
    const row = document.getElementById('notes-photos-row');
    const wrap = document.createElement('div');
    wrap.className = 'notes-photo-item';
    wrap.dataset.fileIndex = fileIndex;
    wrap.style.cssText = 'width:90px;height:90px;border-radius:16px;overflow:hidden;flex-shrink:0;background:#eee;position:relative;';
    wrap.innerHTML = `
      <img src="${src}" style="width:100%;height:100%;object-fit:cover;">
      <div onclick="removeNotesPhoto(this.parentElement);" style="position:absolute;top:4px;right:4px;width:20px;height:20px;background:rgba(0,0,0,0.5);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>`;
    row.appendChild(wrap);
    updateAddPhotoBtn();
  }

  function removeNotesPhoto(el) {
    const idx = parseInt(el.dataset.fileIndex);
    notesPhotoFiles.splice(idx, 1);
    el.remove();
    updateAddPhotoBtn();
  }
  window.removeNotesPhoto = removeNotesPhoto;

  function updateAddPhotoBtn() {
    const row = document.getElementById('notes-photos-row');
    const count = row.querySelectorAll('.notes-photo-item').length;
    const addBtn = document.querySelector('[onclick*="notes-photo-input"]');
    if (addBtn) addBtn.style.display = count >= 5 ? 'none' : 'flex';
  }
  window.handleNotesPhotos = handleNotesPhotos;
  window.updateAddPhotoBtn = updateAddPhotoBtn;
  window.addNotesPhotoPreview = addNotesPhotoPreview;

  // â”€â”€ NOTES MARKETPLACE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const NOTES_DATA = [];

  function loadNotesFromFirestore() {
    if (notesUnsubscribe) { notesUnsubscribe(); notesUnsubscribe = null; }
    const listEl = document.getElementById('notes-list');
    if (listEl) listEl.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#b0a8c0;"><div style="font-size:32px;margin-bottom:8px;">â³</div><div style="font-size:14px;">Loading notesâ€¦</div></div>`;
    notesUnsubscribe = onSnapshot(collection(db, 'notes'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
      renderNotesCards(data);
    }, err => {
      const el = document.getElementById('notes-list');
      if (el) el.innerHTML = `<div style="color:#e8654a;padding:20px;">âŒ ${err.message}</div>`;
    });
  }

  window.loadNotesFromFirestore = loadNotesFromFirestore;

  function applyNotesFilter(data, q) {
    let filtered = data;
    if (notesActiveTab !== 'All') {
      filtered = filtered.filter(n => (n.category || '').toLowerCase() === notesActiveTab.toLowerCase());
    }
    if (q) {
      const s = q.toLowerCase();
      filtered = filtered.filter(n => (n.title||'').toLowerCase().includes(s) || (n.subject||'').toLowerCase().includes(s));
    }
    renderNotesCards(filtered);
  }

  function notesStatusBadge(status) {
    if (status === 'reserved') return `<div style="background:#FFF3E0;color:#E65100;font-size:10px;font-weight:800;padding:4px 10px;border-radius:100px;border:1px solid #FFB74D;">ðŸŸ  Reserved</div>`;
    if (status === 'sold')     return `<div style="background:#F0F0F0;color:#888;font-size:10px;font-weight:800;padding:4px 10px;border-radius:100px;border:1px solid #ddd;">âš« Sold</div>`;
    return `<div style="background:#E8F5E9;color:#2E7D32;font-size:10px;font-weight:800;padding:4px 10px;border-radius:100px;border:1px solid #81C784;">ðŸŸ¢ Available</div>`;
  }

  async function buyNote(id) {
    if (!currentUser) { showPostToast('ðŸ” Please sign in to buy', '#1c1c1e'); goTo('login'); return; }
    try {
      await updateDoc(doc(db, 'notes', id), { status: 'reserved', buyerUid: currentUser.uid, buyerName: currentUser.displayName || currentUser.email });
      showPostToast('âœ… Reserved! Meet the seller to complete.', '#7C6FD4');
    } catch(e) { showPostToast('âŒ Failed. Try again.', '#e8654a'); }
  }

  async function markNoteSold(id) {
    try {
      await updateDoc(doc(db, 'notes', id), { status: 'sold' });
      showPostToast('âœ… Marked as Sold!', '#2E7D32');
    } catch(e) { showPostToast('âŒ Failed. Try again.', '#e8654a'); }
  }

  window.buyNote = buyNote;
  window.markNoteSold = markNoteSold;

  function renderNotesCards(data) {
    const list = document.getElementById('notes-list');
    if (!list) return;
    if (!data.length) {
      list.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#b0a8c0;"><div style="font-size:48px;margin-bottom:12px;">ðŸ“­</div><div style="font-size:15px;font-weight:700;color:#7C6FD4;">No notes yet</div><div style="font-size:12px;margin-top:4px;">Be the first to sell your notes!</div></div>`;
      return;
    }
    const catColors = { IT:'#1565C0', Engineering:'#6A1B9A', Business:'#E65100', Law:'#B71C1C' };
    list.innerHTML = data.map(n => {
      const status = n.status || 'available';
      const isMine = currentUser && n.sellerUid === currentUser.uid;
      const isSold = status === 'sold';
      const isReserved = status === 'reserved';
      const catBg = catColors[n.category] || '#7C6FD4';
      const photoHtml = (n.photos && n.photos[0])
        ? `<img src="${n.photos[0]}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
        : `<span style="font-size:36px;">ðŸ“</span>`;
      const statusBadge = isSold
        ? `<div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:100px;">SOLD</div>`
        : isReserved
        ? `<div style="position:absolute;top:8px;left:8px;background:#FF6D00;color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:100px;">â³ Reserved</div>`
        : `<div style="position:absolute;top:8px;left:8px;background:#2E7D32;color:#fff;font-size:9px;font-weight:800;padding:3px 8px;border-radius:100px;">âœ“ Available</div>`;
      let actionBtn = '';
      if (isMine && isReserved) {
        actionBtn = `<button onclick="markNoteSold('${n.id}')" style="padding:8px 14px;background:#2E7D32;color:#fff;border:none;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">âœ“ Mark Sold</button>`;
      } else if (!isMine && !isSold && !isReserved) {
        actionBtn = `<button onclick="buyNote('${n.id}')" style="padding:8px 16px;background:linear-gradient(135deg,#9C8FE0,#7C6FD4);color:#fff;border:none;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 3px 10px rgba(124,111,212,0.35);">Buy</button>`;
      } else if (isReserved && !isMine) {
        actionBtn = `<button disabled style="padding:8px 14px;background:#F3F1FF;color:#b0a8c0;border:none;border-radius:12px;font-size:11px;font-weight:700;font-family:'DM Sans',sans-serif;">Waiting meetupâ€¦</button>`;
      }
      return `<div onclick="openNoteDetail('${n.id}')" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 20px rgba(124,111,212,0.10);border:1px solid #EDE9FF;${isSold?'opacity:0.65':''}cursor:pointer;-webkit-tap-highlight-color:transparent;">
        <div style="display:flex;">
          <div style="width:100px;min-height:120px;background:linear-gradient(145deg,#EDE9FF,#C5B8FF);flex-shrink:0;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
            ${photoHtml}${statusBadge}
          </div>
          <div style="flex:1;padding:12px 14px;min-width:0;display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              ${n.category ? `<div style="background:${catBg};color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:100px;">${n.category.toUpperCase()}</div>` : '<div></div>'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DDD8FF" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div style="font-size:13px;font-weight:800;color:#1c1c1e;line-height:1.3;">${n.title||'â€”'}</div>
            <div style="font-size:11px;color:#9a8f85;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${n.desc||''}</div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:2px;">
              <div style="width:16px;height:16px;border-radius:50%;background:#E9E4FF;display:flex;align-items:center;justify-content:center;font-size:8px;">ðŸ‘¤</div>
              <span style="font-size:10px;color:#7C6FD4;font-weight:600;">@${(n.sellerName||'anon').toLowerCase().replace(/\s/g,'')}</span>${n.mmuVerified ? '<span title="MMU Verified" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:#1877F2;border-radius:50%;margin-left:3px;flex-shrink:0;"><svg width=\"9\" height=\"9\" viewBox=\"0 0 10 10\" fill=\"none\"><polyline points=\"2,5.5 4.2,7.8 8,3\" stroke=\"#fff\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span>' : ''}
              ${n.rating ? `<span style="font-size:10px;color:#F5A623;font-weight:700;margin-left:auto;">â˜… ${n.rating}</span>` : '<span style="font-size:10px;color:#b0a8c0;margin-left:auto;">New</span>'}
            </div>
          </div>
        </div>
        <div style="padding:10px 14px;display:flex;align-items:center;gap:8px;border-top:1px solid #F3F1FF;background:#FAFAFF;">
          <div style="font-size:17px;font-weight:900;color:#7C6FD4;">RM ${parseFloat(n.price||0).toFixed(2)}</div>
          ${n.condition ? `<div style="font-size:9px;font-weight:700;color:#9a8f85;background:#F0EEF8;padding:2px 8px;border-radius:100px;">${n.condition}</div>` : ''}
          ${n.location ? `<div style="font-size:10px;color:#b0a8c0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">ðŸ“ ${n.location}</div>` : ''}
          <div style="margin-left:auto;flex-shrink:0;">${actionBtn}</div>
        </div>
      </div>`;
    }).join('');
  }

  function switchNotesTab(el, tab) {
    notesActiveTab = tab;
    document.querySelectorAll('.notes-tab').forEach(t => { t.style.background='#F0EEF8'; t.style.color='#888'; });
    el.style.background = '#7C6FD4'; el.style.color = '#fff';
    const search = document.querySelector('#screen-notes input[type="text"]')?.value || '';
    // Re-fetch and filter
    const q2 = collection(db, 'notes');
    getDocs(q2).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
      applyNotesFilter(data, search);
    });
  }

  function filterNotes(q) {
    getDocs(collection(db, 'notes')).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0));
      applyNotesFilter(data, q);
    });
  }

  window.switchNotesTab = switchNotesTab;
  window.filterNotes = filterNotes;
  window.renderNotesCards = renderNotesCards;

  // Render when entering notes screen â€” merged into existing goTo patch below
  // â”€â”€ END NOTES MARKETPLACE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function showPostToast(msg, bg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:${bg||'#1c1c1e'};color:#fff;padding:12px 20px;border-radius:100px;font-size:13px;font-weight:600;z-index:9999;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.2);font-family:DM Sans,sans-serif;`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.4s'; setTimeout(()=>toast.remove(),400); }, 2000);
  }
  window.showPostToast = showPostToast;

  async function submitNotesPost() {
    if (!currentUser) { showPostToast('ðŸ” Please sign in to post', '#1c1c1e'); goTo('login'); return; }
    const title    = document.getElementById('post-title')?.value.trim();
    const price    = document.getElementById('post-price')?.value.trim();
    const subject  = document.getElementById('post-subject')?.value.trim();
    const condition= document.getElementById('post-condition')?.value;
    const category = document.getElementById('post-category')?.value || '';
    const desc     = document.getElementById('post-desc')?.value.trim();
    const location = document.getElementById('post-location')?.value.trim();
    const time     = document.getElementById('post-time')?.value.trim();

    if (!title || !price) { showPostToast('âš ï¸ Please fill in title and price', '#1c1c1e'); return; }

    try {
      showPostToast('â³ Postingâ€¦', '#7C6FD4');

      // Fetch mmuVerified fresh from Firestore
      let mmuVerified = currentUser._mmuVerified || false;
      try {
        const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
        mmuVerified = uSnap.data()?.mmuVerified || false;
        if (mmuVerified) currentUser._mmuVerified = true;
      } catch(e) {}

      // Post immediately without waiting for photos
      const docRef = await addDoc(collection(db, 'notes'), {
        title, price: parseFloat(price), subject, condition, category, desc, location, time,
        photos: [], status: 'available',
        sellerUid:   currentUser.uid,
        sellerName:  currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        sellerEmail: currentUser.email,
        mmuVerified,
        rating: 0, reviews: 0,
        timestamp: serverTimestamp(),
      });

      showPostToast('âœ… Posted successfully!', '#7C6FD4');

      // Clear form
      ['post-title','post-price','post-subject','post-desc','post-location','post-time'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('post-condition').value = '';
      document.getElementById('post-category').value = '';
      document.getElementById('notes-photos-row').innerHTML = '';
      notesPhotoFiles = [];
      updateAddPhotoBtn();
      setTimeout(() => navTo('notes'), 800);

      // Upload photos in background if any
      if (notesPhotoFiles.length > 0) {
        const photoURLs = [];
        for (const file of notesPhotoFiles) {
          try {
            const path = `notes/${currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            photoURLs.push(url);
          } catch(e) { console.error('Photo upload failed:', e); }
        }
        if (photoURLs.length > 0) {
          await updateDoc(doc(db, 'notes', docRef.id), { photos: photoURLs });
        }
      }

    } catch(e) {
      console.error(e);
      showPostToast('âŒ Failed: ' + e.message, '#e8654a');
    }
  }
  window.submitNotesPost = submitNotesPost;

  // â”€â”€ MMU Verification â”€â”€
  let _mmuTempEmail = null;
  let _mmuTempPass  = null;
  let _mmuTempCred  = null;

  function mmuValidateInputs() {
    const name  = document.getElementById('mmu-name-input')?.value.trim();
    const email = document.getElementById('mmu-email-input')?.value.trim().toLowerCase();
    const btn   = document.getElementById('mmu-send-btn');
    const hint  = document.getElementById('mmu-email-hint');
    const isValid = name && email.endsWith('@student.mmu.edu.my');
    if (btn) { btn.disabled = !isValid; btn.style.opacity = isValid ? '1' : '0.4'; btn.style.cursor = isValid ? 'pointer' : 'not-allowed'; }
    if (hint) hint.style.color = email && !email.endsWith('@student.mmu.edu.my') ? '#e74c3c' : '#aaa';
  }
  window.mmuValidateInputs = mmuValidateInputs;

  async function mmuSendVerification() {
    const name  = document.getElementById('mmu-name-input').value.trim();
    const email = document.getElementById('mmu-email-input').value.trim().toLowerCase();
    const errEl = document.getElementById('mmu-error-msg');
    const btn   = document.getElementById('mmu-send-btn');

    if (!name || !email.endsWith('@student.mmu.edu.my')) return;

    btn.textContent = 'Verifyingâ€¦'; btn.disabled = true; btn.style.opacity = '0.6';
    errEl.style.display = 'none';

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        mmuVerified: true,
        mmuEmail: email,
        displayName: name,
      });
      currentUser._mmuVerified = true;
      document.getElementById('mmu-verify-modal').style.display = 'none';
      btn.textContent = 'Verify MMU Student Email';
      btn.disabled = false; btn.style.opacity = '1';
      activateScreen('screen-post');
    } catch(e) {
      btn.textContent = 'Verify MMU Student Email'; btn.disabled = false; btn.style.opacity = '1';
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
  }
  window.mmuSendVerification = mmuSendVerification;

  function closeMmuVerifyModal(e) {
    if (e && e.target !== document.getElementById('mmu-verify-modal')) return;
    document.getElementById('mmu-verify-modal').style.display = 'none';
  }
  window.closeMmuVerifyModal = closeMmuVerifyModal;

  async function openSellScreen() {
    if (!currentUser) { showPostToast('ðŸ” Please sign in first', '#1c1c1e'); goTo('login'); return; }
    // Check if already mmu verified in Firestore
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = snap.data() || {};
      if (userData.mmuVerified) {
        currentUser._mmuVerified = true;
        activateScreen('screen-post');
        return;
      }
    } catch(e) {}
    // Not verified â€” show modal
    // Reset modal to step 1
    document.getElementById('mmu-step-1').style.display = 'block';
    document.getElementById('mmu-name-input').value = currentUser.displayName || '';
    document.getElementById('mmu-email-input').value = '';
    document.getElementById('mmu-error-msg').style.display = 'none';
    const btn = document.getElementById('mmu-send-btn');
    if (btn) { btn.textContent = 'Verify MMU Student Email âœ“'; btn.disabled = true; btn.style.opacity = '0.4'; }
    document.getElementById('mmu-verify-modal').style.display = 'flex';
  }
  window.openSellScreen = openSellScreen;

  function openLightbox(url) {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;';
    lb.innerHTML = `<img src="${url}" style="max-width:95vw;max-height:90vh;object-fit:contain;border-radius:12px;">`;
    lb.onclick = () => lb.remove();
    document.body.appendChild(lb);
  }
  window.openLightbox = openLightbox;

  let currentNoteData = null;

  async function openNoteDetail(noteId) {
    try {
      const snap = await getDoc(doc(db, 'notes', noteId));
      if (!snap.exists()) return;
      currentNoteData = { id: snap.id, ...snap.data() };
      renderNoteDetail(currentNoteData);
      goTo('note-detail');
    } catch(e) { showPostToast('âŒ Failed to load', '#e8654a'); }
  }
  window.openNoteDetail = openNoteDetail;

  function renderNoteDetail(n) {
    const el = document.getElementById('note-detail-content');
    if (!el) return;
    const status = n.status || 'available';
    const isMine = currentUser && n.sellerUid === currentUser.uid;
    const isSold = status === 'sold';
    const isReserved = status === 'reserved';
    const catColors = { IT:'#1565C0', Engineering:'#6A1B9A', Business:'#E65100', Law:'#B71C1C' };
    const catBg = catColors[n.category] || '#7C6FD4';

    const statusBadge = isSold
      ? `<span style="background:#888;color:#fff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:100px;">SOLD</span>`
      : isReserved
      ? `<span style="background:#FF6D00;color:#fff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:100px;">â³ Reserved</span>`
      : `<span style="background:#2E7D32;color:#fff;font-size:11px;font-weight:800;padding:4px 12px;border-radius:100px;">âœ“ Available</span>`;

    let actionBtn = '';
    if (isMine && isReserved) {
      actionBtn = `<button onclick="markNoteSold('${n.id}')" style="width:100%;padding:16px;background:#2E7D32;color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;">âœ“ Mark as Sold</button>`;
    } else if (!isMine && !isSold && !isReserved) {
      actionBtn = `<button onclick="buyNote('${n.id}')" style="width:100%;padding:16px;background:linear-gradient(135deg,#9C8FE0,#7C6FD4);color:#fff;border:none;border-radius:16px;font-size:16px;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 6px 20px rgba(124,111,212,0.4);">Buy â€” RM ${parseFloat(n.price||0).toFixed(2)}</button>`;
    } else if (isReserved && !isMine) {
      actionBtn = `<button disabled style="width:100%;padding:16px;background:#F3F1FF;color:#b0a8c0;border:none;border-radius:16px;font-size:16px;font-weight:800;font-family:'DM Sans',sans-serif;">Waiting meetupâ€¦</button>`;
    }

    const photosHtml = (n.photos && n.photos.length)
      ? `<div style="display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;margin:-20px -20px 20px;padding:0 20px 16px;">
          ${n.photos.map((url,i) => `<img src="${url}" onclick="openLightbox('${url}')" style="width:240px;height:240px;object-fit:contain;background:#f0eeff;border-radius:16px;flex-shrink:0;cursor:zoom-in;">`).join('')}
        </div>`
      : `<div style="height:200px;background:linear-gradient(145deg,#EDE9FF,#C5B8FF);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:60px;margin-bottom:20px;">ðŸ“</div>`;

    const divider = `<div style="height:1px;background:#EDEAF8;margin:0 0 12px;"></div>`;

    el.innerHTML = `
      ${photosHtml}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        ${n.category ? `<div style="background:${catBg};color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:100px;">${n.category.toUpperCase()}</div>` : ''}
        ${statusBadge}
      </div>
      <div style="font-size:20px;font-weight:900;color:#1c1c1e;line-height:1.3;margin-bottom:6px;">${n.title||'â€”'}</div>
      <div style="font-size:24px;font-weight:900;color:#7C6FD4;margin-bottom:12px;">RM ${parseFloat(n.price||0).toFixed(2)}</div>
      ${n.subject ? `<div style="font-size:13px;color:#7C6FD4;font-weight:700;margin-bottom:12px;">ðŸ“– ${n.subject}</div>` : ''}
      ${divider}
      ${n.desc ? `<div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px;">${n.desc}</div>${divider}` : ''}

      <div style="display:flex;flex-direction:column;margin-bottom:16px;">
        ${n.condition ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #EDEAF8;"><span style="font-size:13px;color:#9a8f85;">Condition</span><span style="font-size:13px;font-weight:700;color:#1c1c1e;">${n.condition}</span></div>` : ''}
        ${n.location ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #EDEAF8;"><span style="font-size:13px;color:#9a8f85;">ðŸ“ Meetup</span><span style="font-size:13px;font-weight:700;color:#1c1c1e;">${n.location}</span></div>` : ''}
        ${n.time ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;"><span style="font-size:13px;color:#9a8f85;">ðŸ• Available</span><span style="font-size:13px;font-weight:700;color:#1c1c1e;">${n.time}</span></div>` : ''}
      </div>

      ${divider}
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:#F7F5FF;border-radius:16px;margin-bottom:24px;">
        <div style="width:42px;height:42px;border-radius:50%;background:#E9E4FF;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">ðŸ‘¤</div>
        <div>
          <div style="display:flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:#1c1c1e;">@${(n.sellerName||'anon').toLowerCase().replace(/\s/g,'')}${n.mmuVerified ? '<span title="MMU Verified" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#1877F2;border-radius:50%;flex-shrink:0;"><svg width=\"10\" height=\"10\" viewBox=\"0 0 10 10\" fill=\"none\"><polyline points=\"2,5.5 4.2,7.8 8,3\" stroke=\"#fff\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg></span>' : ''}</div>
          <div style="font-size:11px;color:#b0a8c0;">${n.sellerEmail||''}</div>
        </div>
      </div>
      ${actionBtn}
    `;
  }
  window.renderNoteDetail = renderNoteDetail;

  // â”€â”€ MAD DRINK LAB SCHEDULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Schedule (Malaysia time, UTC+8):
  // May 19: 10amâ€“1pm, 10pmâ€“12am
  // May 20: 2pmâ€“5pm
  // May 21: 1pmâ€“3pm
  function checkMadSchedule() {
    const now = new Date();
    // Convert to Malaysia time (UTC+8)
    const myt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    const year  = myt.getFullYear();
    const month = myt.getMonth() + 1;
    const day   = myt.getDate();
    const hour  = myt.getHours();
    const min   = myt.getMinutes();
    const t     = hour + min / 60;

    // Permanently closed â€” always show Closed badge, no time shown
    const img     = document.getElementById('mad-img');
    const overlay = document.getElementById('mad-overlay');
    const badge   = document.getElementById('mad-status-badge');
    const text    = document.getElementById('mad-status-text');
    const nextEl  = document.getElementById('mad-next-time');
    const openBadge = document.getElementById('mad-open-badge');

    if (img)      img.style.filter = '';
    if (overlay)  overlay.style.background = 'rgba(0,0,0,0)';
    if (badge)    badge.style.display = 'none';
    if (nextEl)   nextEl.style.display = 'none';
    if (openBadge) { openBadge.style.display = 'block'; }
  }
  window.checkMadSchedule = checkMadSchedule;
  // Run on load and every minute
  setTimeout(checkMadSchedule, 500);
  setInterval(checkMadSchedule, 60000);
  // â”€â”€ END MAD SCHEDULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function filterCategory(cat) {
    if (cat === 'notes') {
      goTo('notes');
      setTimeout(() => { notesActiveTab = 'All'; loadNotesFromFirestore(); }, 100);
      return;
    }
    if (cat === 'market') {
      showPostToast('ðŸ›ï¸ Marketplace coming soon!', '#E8722A');
      return;
    }
    document.getElementById('cat-food')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  window.filterCategory = filterCategory;

  function updateBottomNav() {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;
    const show = NAV_SCREENS.includes(currentScreen);
    nav.style.display = show ? 'flex' : 'none';
    nav.querySelectorAll('.bnav-item').forEach(item => {
      const tab = item.dataset.tab;
      const isActive = (tab === 'home' && currentScreen === 'landing') || tab === currentScreen;
      item.classList.toggle('bnav-active', isActive);
    });
  }
  window.updateBottomNav = updateBottomNav;

  // Call once on load
  updateBottomNav();

  // Wrap goTo to also refresh nav
  const _goToBase = goTo;
  function goToWithNav(screen) {
    _goToBase(screen);
    updateBottomNav();
  }
  window.goTo = goToWithNav;

  // Wrap goBackToLanding â€” defined later, so patch via window after load
  function navTo(tab) {
    if (tab === 'home') {
      window.goBackToLanding();
    } else if (tab === 'post') {
      openSellScreen();
      return; // openSellScreen handles screen activation
    } else {
      window.goTo(tab);
      if (tab === 'notes') {
        setTimeout(() => { notesActiveTab = 'All'; loadNotesFromFirestore(); }, 500);
      }
    }
    updateBottomNav();
  }
  window.navTo = navTo;

  // Init after splash clears
  setTimeout(updateBottomNav, 3200);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PAYMENT METHOD SELECTION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let payMethod = 'tng'; // default

  function selectPayMethod(method) {
    payMethod = method;
    const tngBtn  = document.getElementById('pay-tng-btn');
    const cashBtn = document.getElementById('pay-cash-btn');
    const cashNote = document.getElementById('cash-note');
    const proceedBtn = document.getElementById('checkout-proceed-btn');

    if (method === 'tng') {
      tngBtn.style.borderColor  = 'var(--matcha)';
      tngBtn.style.background   = 'var(--matcha-pale)';
      cashBtn.style.borderColor = 'var(--beige)';
      cashBtn.style.background  = 'var(--white)';
      cashNote.style.display    = 'none';
      proceedBtn.textContent    = 'Proceed to Pay â†’';
    } else {
      cashBtn.style.borderColor = 'var(--matcha)';
      cashBtn.style.background  = 'var(--matcha-pale)';
      tngBtn.style.borderColor  = 'var(--beige)';
      tngBtn.style.background   = 'var(--white)';
      cashNote.style.display    = 'block';
      proceedBtn.textContent    = 'Place Order â†’';
    }
  }
  window.selectPayMethod = selectPayMethod;

  function showToastMsg(msg) {
    const existing = document.getElementById('inline-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'inline-toast';
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#2C2420;color:#fff;padding:10px 18px;border-radius:100px;font-size:13px;font-weight:500;z-index:999;white-space:nowrap;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PROCEED FROM CHECKOUT â€” validate first
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function proceedFromCheckout() {
    const name    = document.getElementById('field-name').value.trim();
    const phone   = document.getElementById('field-phone').value.trim();
    const address = document.getElementById('field-address')?.value.trim();

    // Validate name
    if (!name) {
      const nf = document.getElementById('field-name');
      nf.style.borderColor = '#E8654A';
      nf.placeholder = 'âš ï¸ Name is required!';
      nf.focus();
      setTimeout(() => { nf.style.borderColor = ''; nf.placeholder = 'e.g. Azri Hakim'; }, 3000);
      return;
    }

    // Validate phone
    if (!phone) {
      const pf = document.getElementById('field-phone');
      pf.style.borderColor = '#E8654A';
      pf.placeholder = 'âš ï¸ Phone number is required!';
      pf.focus();
      setTimeout(() => { pf.style.borderColor = ''; pf.placeholder = '+60 12-345 6789'; }, 3000);
      return;
    }

    // Validate slot for preorder
    if (orderType === 'preorder') {
      const slot = document.getElementById('field-slot')?.value;
      if (!slot) { alert('âš ï¸ Please select a pickup slot!'); return; }
    }

    // Validate address + slot for delivery
    if (orderType === 'delivery') {
      const addr = document.getElementById('field-address')?.value.trim();
      const slot = document.getElementById('field-delivery-slot')?.value;
      if (!addr) {
        const af = document.getElementById('field-address');
        af.style.borderColor = '#E8654A'; af.placeholder = 'âš ï¸ Please enter your address!'; af.focus();
        setTimeout(() => { af.style.borderColor = ''; af.placeholder = 'e.g. V5 Room 203, MMU Melaka'; }, 3000);
        return;
      }
      if (!slot) { alert('âš ï¸ Please select a delivery slot!'); return; }
    }

    // Cash + pickup â†’ skip payment screen
    if (payMethod === 'cash' && orderType === 'pickup') {
      submitCashOrder();
    } else {
      goTo('payment');
    }
  }
  window.proceedFromCheckout = proceedFromCheckout;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CASH ORDER SUBMIT (no screenshot needed)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  async function submitCashOrder() {
    const btn = document.getElementById('checkout-proceed-btn');
    btn.textContent = 'â³ Placing orderâ€¦';
    btn.disabled = true;

    const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount    = (orderType === 'preorder' && preorderDiscountEligible) ? +(subtotal * 0.10).toFixed(2) : 0;
    const grandTotal  = +(subtotal - discount).toFixed(2);
    const customerName  = document.getElementById('field-name').value.trim();
    const customerPhone = document.getElementById('field-phone').value.trim();

    const foodTotalC   = grandTotal;
    const orderData = {
      code:          'SOD-' + String(Date.now()).slice(-4),
      name:          customerName,
      phone:         customerPhone,
      type:          orderType,
      address:       null,
      slot:          null,
      items:         cart.map(i => ({ emoji: i.emoji, name: i.name, price: i.price, qty: i.qty, custom: i.custom || 'Standard', note: i.note || '' })),
      total:         grandTotal,
      foodTotal:     foodTotalC,
      discount:      discount,
      serviceFee:    0,
      deliveryFee:   0,
      platformComm:  0,
      merchantNett:  foodTotalC,
      riderEarning:  0,
      status:        'new',
      rider:         null,
      paymentMethod: 'Cash',
      paymentStatus: 'pay_at_counter',
      merchantId:    'soy_oden',
      merchantName:  'Oya',
      userEmail:     currentUser ? currentUser.email : null,
      userName:      currentUser ? currentUser.displayName : null,
      timestamp:     serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      currentOrderId = docRef.id;
      if (currentUser) {
        updateDoc(doc(db,'users',currentUser.uid),{ orderCount: increment(1), lastOrderAt: new Date().toISOString() }).catch(()=>{});
      }
      // Increment preorder counter if discount was applied
      if (discount > 0) {
        try { await setDoc(doc(db,'settings','preorderCounter'), { count: increment(1) }, { merge: true }); } catch(e) {}
        preorderDiscountEligible = false;
      }
      startStatusTracking(currentOrderId);
      goTo('success');
      cart = [];
      updateCartUI();
      document.getElementById('success-order-code').textContent = 'Order #' + orderData.code;
    } catch (err) {
      console.error('Cash order error:', err);
      btn.textContent = 'âŒ Failed. Try again';
      btn.disabled = false;
    }
  }
  window.submitCashOrder = submitCashOrder;

  function goToMenu(type) {
    orderType = type;
    applyOyaOrderTypeUI();
    goTo('menu');
  }
  window.goToMenu = goToMenu;

  // â”€â”€ Merchant search â”€â”€
  function filterMerchants(query) {
    const q = query.trim().toLowerCase();
    const clearBtn = document.getElementById('landing-search-clear');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    const cards = document.querySelectorAll('[data-merchant-card]');
    cards.forEach(card => {
      const text = card.getAttribute('data-merchant-keywords') || '';
      card.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  }
  window.filterMerchants = filterMerchants;

  function clearMerchantSearch() {
    const inp = document.getElementById('landing-search');
    if (inp) { inp.value = ''; filterMerchants(''); }
  }
  window.clearMerchantSearch = clearMerchantSearch;

  // â”€â”€ Merchant selection â”€â”€
  let activeMerchant = 'oya';
  function selectMerchant(id) {
    activeMerchant = id || 'oya';
    if (id === 'mad') {
      activateScreen('screen-merchant-mad');
    } else {
      activateScreen('screen-merchant');
    }
  }
  window.selectMerchant = selectMerchant;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PREORDER EARLY BIRD DISCOUNT (first 10)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let preorderDiscountEligible = false;

  async function checkPreorderDiscount() {
    try {
      const snap = await getDoc(doc(db, 'settings', 'preorderCounter'));
      const count = snap.exists() ? (snap.data().count || 0) : 0;
      preorderDiscountEligible = count < 10;
    } catch(e) {
      preorderDiscountEligible = false;
    }
  }

  function oyaPreorder(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    activeMerchant = 'oya';
    orderType = 'preorder';
    applyOyaOrderTypeUI();
    activateScreen('screen-menu');
    checkPreorderDiscount();
  }
  window.oyaPreorder = oyaPreorder;

  function oyaIsOpenNow() {
    return true;
  }
  window.oyaIsOpenNow = oyaIsOpenNow;

  function madCheckOpen() {
    // Check MAD schedule
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    const day = now.getDate(), month = now.getMonth() + 1;
    const t = now.getHours() + now.getMinutes() / 60;
    const madSlots = [
      // No active slots â€” closed
    ];
    const isOpen = true;
    selectMerchant('mad');
  }
  window.madCheckOpen = madCheckOpen;

  function oyaCardClick() {
    if (!oyaIsOpenNow()) return; // blocked outside opening hours
    orderType = 'pickup';
    selectMerchant('oya');
  }
  window.oyaCardClick = oyaCardClick;



  // â”€â”€ Go back to landing (home) from anywhere â”€â”€
  function goBackToLanding() {
    screenHistory = [];
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    const landing = document.getElementById('screen-landing');
    landing.style.display = 'flex';
    landing.classList.add('active');
    currentScreen = 'landing';
    closeOrderModal();
  }
  window.goBackToLanding = goBackToLanding;

  // â”€â”€ Order Type Modal â”€â”€
  let pendingOrderType = null;

  function openOrderModal() {
    pendingOrderType = orderType;
    // Highlight current selection
    updateModalSelection(orderType);
    document.getElementById('order-type-modal').style.display = 'flex';
  }
  window.openOrderModal = openOrderModal;

  function closeOrderModal(e) {
    // Close if clicking overlay background (not the sheet itself)
    if (e && e.target !== document.getElementById('order-type-modal')) return;
    document.getElementById('order-type-modal').style.display = 'none';
    pendingOrderType = null;
  }
  window.closeOrderModal = function(e) {
    if (e && e.target !== document.getElementById('order-type-modal')) return;
    document.getElementById('order-type-modal').style.display = 'none';
    pendingOrderType = null;
  };

  function selectOrderType(type) {
    pendingOrderType = type;
    updateModalSelection(type);
  }
  window.selectOrderType = selectOrderType;

  function updateModalSelection(type) {
    const btnP = document.getElementById('modal-btn-pickup');
    const btnD = document.getElementById('modal-btn-delivery');
    const chkP = document.getElementById('modal-check-pickup');
    const chkD = document.getElementById('modal-check-delivery');
    if (btnP) btnP.classList.toggle('selected', type === 'pickup');
    if (btnD) btnD.classList.toggle('selected', type === 'preorder');
    if (chkP) chkP.style.display = type === 'pickup'   ? 'block' : 'none';
    if (chkD) chkD.style.display = type === 'preorder' ? 'block' : 'none';
  }

  function confirmOrderType() {
    if (!pendingOrderType) return;
    orderType = pendingOrderType;
    applyOyaOrderTypeUI();
    renderCheckout();
    document.getElementById('order-type-modal').style.display = 'none';
    pendingOrderType = null;
  }

  function applyOyaOrderTypeUI() {
    const co       = document.getElementById('checkout-method');
    const ci       = document.getElementById('checkout-icon');
    const cashBtn  = document.getElementById('pay-cash-btn');
    const cashNote = document.getElementById('cash-note');
    const tngBtn   = document.getElementById('pay-tng-btn');
    const pgPre    = document.getElementById('preorder-group');
    const pgDel    = document.getElementById('delivery-group');

    const labels = { pickup:'Pick Up', preorder:'Pre-order', delivery:'Delivery' };
    const icons  = { pickup:'ðŸ›', preorder:'ðŸ“‹', delivery:'ðŸ›µ' };
    if (co) co.textContent = labels[orderType] || 'Pick Up';
    if (ci) ci.textContent = icons[orderType]  || 'ðŸ›';

    // Show/hide field groups
    if (pgPre) pgPre.style.display = orderType === 'preorder'  ? 'block' : 'none';
    if (pgDel) pgDel.style.display = orderType === 'delivery'  ? 'block' : 'none';

    // Payment: Cash only for pickup
    if (orderType === 'pickup') {
      if (cashBtn) { cashBtn.style.display = 'flex'; cashBtn.style.borderColor = 'var(--beige)'; cashBtn.style.background = 'var(--white)'; }
    } else {
      // preorder / delivery â†’ TNG only
      if (cashBtn) cashBtn.style.display = 'none';
      if (cashNote) cashNote.style.display = 'none';
      payMethod = 'tng';
      if (tngBtn) { tngBtn.style.borderColor = 'var(--matcha)'; tngBtn.style.background = 'var(--matcha-pale)'; }
    }
  }
  window.confirmOrderType = confirmOrderType;

  function switchTab(el, type) {
    document.querySelectorAll('.tab-chip').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }
  window.switchTab = switchTab;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PRODUCT DETAIL
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  const _detailHeroImages = {
    '__unusedâ˜•': 'data:image/jpeg;base64,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TNWmJKYdHPZgN84TAAmJExJfXLTOrzEzWOO2OsBZAAAJBN6Xl11y0xvffDbO9b53mtbUvEcPdw2edS9OvFWYpEwgCYknTO8u+2G+OnTpjrnelZg5eDv4N88q2rvmgqAgE2peW16Xmt+jm6cb6NM9M72vS8WQObxvZ8feOQdeIgkCJglEiYlUxMX2w2zro359sdNZpaasiIjk6uXWeCl6duAAAAACYkvfPSavats21q2mpmBXn6OezEb5wABMSJiS+memdXmJmscdsdYCyATAAJiSb56S6aUvne+uWuN63pea00z0iOLt4rPNpenXiia0iYQKTEwvS8u3Rz7430Xz0zvSJLycPdwb55VtG+cCyAALVutrVtm79PL046dGmemd63z0iyJOfx/Y8jeOMdeIAEJglEiYLIi++G01ttjrz6azWZbQS15ujn1ngpenbgAAAAAmJLaZ6TV7Uvm2tS01ZElcN8LMBvnCYAJRImBfXLXOrzEzWOO2OsBYiRAAJA0zvLtfPTO9tcNs630x1zrW+ekscXbxV5tL068Ii1agIFJhE3pZdt8Ncb6dMdcb1C8nD3cO+WUTG8QLEAAvS6zat83Xp5unHTp0y1zvS9LRdEmHkev5G8cY68UTBMAmAmJAWRFtsdZd9cdsdNLUtnVoCvP0c9nDnpn24ggAAAUmJi16Xlvats6tasyzatlrhvhZgN84TAAmJAL65a51cmaxx2x1gLEAAAmJF6XXXTLTGtdcdc721x1zrXTLSVx9fJZ5tL068YiYsgUgJETatl11y2xrfXLTPTeIiXm4e3i3yzrMbxAqAgC1bLa9LZu3TzdGN9GmWmd7XzvLdAx8n1vJ3jjHXiAiYJhIACyC2uOubvrjrjprals6siSvP081nDnpn24ggUAAAmJi16Xltelpq8xbNmYla4b4WYDfOAAJiQC+uemdXmJmscdsdYCxEwAAJiRatl00pfGtNctc720yvnW2mWizx9fInnUvTrxiJioiVkATEk2paXbXLXGt9cds9NEJebi7eLfLKJjeIFkAAWrZbWrbN26OfozvfTHXG9b53luiTHyvU8veOMdeIAglEgAEolZ0zvLvrjrjel6Wzu81mIw3ws4ctcu3ELAAAAExMWvS0t70vNWtWc20xK1w3wswG+cAATEgGmmW2dWtW2dYY7Y7wFhAAATAm1bLpels621x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biCzgPPPPPPsuIfQ/PPC14nBvvvPJk5qU2q1q4nFiOx0+eaAFKp2KJzFvPvPPPAq8MUuIPPPPPOsCP8A0PzzytezR777zy/gEO14/nyv0g8YVDyywzCpeRG6FbzzzzzwKsD/AEUA88888qVbbbf888qDod+++88t5DSBUYVR+/vO8Sdg3ckc+XVTI3W888888qn8jUAI88888qVnwbv888+rF92++88pciybDMzpug+NzD1HXQQ8+XBnt68888888uXhGwAo88888qFb8g/888+q99W++888rXb4XTFUHZ4kjyyj3IE0qXF4TC8888888+XF4LIo88888q9344X8888Kr5e++888fa6nmceAaDvL02Wr4gU0qX5Mm08488s008bLMuoo88888u/+BoX84Q8urf8AvvvPKIkTm4LQeYjD7+OuELAOJKgq2CGPMONNNOPKq6WBKPPPPPLKVBQF/KAPPt0/vvvBACRaIHhAmxmYqzdanrEBAKgq7ZOKDDCMKKPKv1ZPaMINPPPIwK/VvJNNPFy/vvPAAKniGvCKAkqNUrGZIeAACLgt1WKKDFKIAFFKl1XPaIAEEFPK+B03+AAFPF6/vvPJAEWBjLB7FGizBbfttqCACOglwaaKBDDIDClql4bVYgCDPEFPwHq/rAHPPB78uuqphkd0uYlO6kSP3mSJEomnrkh7w4295glrsDDOMMMONOsh044ZFOivl00bfTdGNDFJLht5XSh+NaUm632ED4GGdQJBOdWdZ/4ispjjsrnhgDUZSIKGBqrul22VJAc/oto01/O1bKeaplX7JPTeIvGNKLCJEMXaZ297tyksvjjikgcCDMBIlhL4YMx9ULZc/E5+4umI9MoeUkdyzx9xgnKHPALAEMNZcWb1y9qgkvvvgsPNJMLiPLZdyFL7ARUbolKBpAvi5KBWjvMN9y3X2/8AIQAxzCgACRVVEvYr44JLboIJLjJZzCZxUvkyGpCFz0CJcMHUaduzGn5Lhw89cSCWj9czifjihC2mmV+bKqJpoZQIJYrDgTnwiw9YlyE3RE2hNDwEF9Nyk2rAgiwSfZzyt90LcWLuudF1Xdf4LYpYKBSrZ676gzlFNY89P7WzDq97mMsVZ8Cg2HqYTtbJDcrzIzZNCBU+fVm6luv4aqb6pTSSRgKqBDC21ryhDzS/89gztoC6JjMAUipLoJIyoQsHEEw7f00jO1mM3+pL6JzwBzwtmDAgRLq6TWf4owzAAABTasemTxolnmGyxhn+ZDBYZExmPbZztNgKCB5ZDARwzzwPOesWXARwSgCnWsPbrpziZoCxTCCpdsMgQwVVEZl6ESVgjexKUd1ADkSQjBjDTCAsMPPe+OXmnSABg3H322EyPTjCd8wyQBziAIM/8kKxp7v067z6LNVgTSS0VlU2xySoIMNP/wDvPbvRZltZ19FFCPGcL7mizy92hjGF/wCD1CzH7GPHPNh28aMDAAIIVSQQcfvjigw88+//AP8AvZlRZ1958P7/AHaUSzL8UfA6/JkU9rbyIYcov48ReG6JIRBTTfTQYPvvvihgggw01/7wbcTWZZPzK811emGbb25AKeHx7K70o413yZEilu4DAdfZeUQQQfvvvvnnqgggw89w/SQbQPALN1Nov1NOGORUqt5GQDQUdBJZi7LOh+4tOIHBTSSSQUgsvvvvvijggl/ww8bT5oeQH+mBA1+OHfaYeChpzPDLNDiZIDErjonkIFLGJITSVQggognvvvvqgjvrz1wz94DZWlcdLGKdfcZeNSEJMCuiFEh64/02qjoGHfbRXPDMSQggggsvvvvvigkt/wA8P1lh2GXPBnxzEE0mVkjjROfTBwxiTc+88NJiSGUGVHWk0AAIIIIIIL7777574IPe9mVnU2hUH+/w1X32lFlxTdYiygSBoMwPPd/KRiWUHWnGE00IIIIIIIIJ77776oIPPctPVlmA7O5B1X3W0H1Ej6aQ0211MmBI44pLyiSTU1E0ENEoIIIIIIIJYLb74o4oMOsNGmmir+Ki32kH0lWjwKjgEFH10ETRw760SzBDQyVE0EGoIIIIIIIIK577774IMN/+lW3yrsqyHWkHX0GlQpRQX003FExz2ONADCTnHBGlH0H/2gAMAwEAAgADAAAAEP1y0nYlqeV6qw1EMj/970BZby3mQvlYXCR8Ojcm5FNzygac8EIY/YQQ/cep3rVIAP8A/wDD8/r4CtXpr4EqGXP/ANCLXOwhcbOLIkUoOWUpjI3I+gik8TB60fPawaC/DVGgAM8/78G4kVc/xR6NOt9n37j9s4Nu8xL8yfiuusuzgr4hEjgVKCEa0PPax/LxoeiQAH/+z2q3BpZ98VTIgeBP/wD96HSj6iiJhxcpqCzN+cJvvKG7Li0BSdXz1do4863oIABf8vf6JH4kJeFVC/7SD+//AAimQjFY6AeO/aIYT2wr4RC7aQcNKMLLxxDqWI6RWeAAX7jTinJpaNfNFsv6ko7/AO9WGEy+P2irOvjTd6ErEKjjdoZaWVj/AMWEEeobr5CGkiBe8fuP9O21/fn/AIvILh//AK1fpxAGBIbDhqr7U2Jp24XXHsrt8Vv43TTVzqjeiKLgAB1/91zswnHn71aL9bg//wCuZGshTwe1lMUbeHuiHttl5aBNaS0rMP3zBZ4JxrZRIkAfu/8AT+f+KiW/foH1zD//AP1gYM0aCrhhSmi/m6M5R1+tnvRiJYZx0fABlklirntbwN/2S02Zs34fv3yBadAv/wD/AKCs3pwQHtzZ9Ocbw4LSuBV9Sdepd/XJ8UCeKuCHrL/BX37TH5DUmxr/AH4F1SAv/wD+MwtfoouqICqLicDQDH7EoBZaBxhmnctX1ZaC+N8GjsEAEAVMXrouv7/8BHrrr9//AFx3z+SlzmfZ6AafE0TjoiC4a3o8ywD3R9L6hUHfVg/hQAAUHkRO9t//AN0GbQdv/wD9TKNdf5JX4X6wRK5kiEUBWbyqQ7GKAekXw+YHs+c4Z98AAx99pqoFN/v9CxwPb/8A/Q4tCLWydtaex3VyWs1go5Y1EAu+fcblUwfpJ40h0nXAAEhA5G0fEV6v3U4w0+//APwBQl2uo5YC3df2jBjnoPGcvasl5uUI1OAL5zfbYcxFyADQQLAnnttQr11EjoPv/wD/AOV9WsAOIKVNUzNUjHjQX7WSGANVjgXU4M/WFotF1fXL/wCze+BuY55gO/wLrkH9/wD/AKOWuKZLcKVApChgdgI4RtWkqLx6FlHA85CXXy3lv5XjZ/7hoqVJ7+Yf/Wyr42//AP8A79WX0db+5qhb6azAAxE9Re1Z4nTEOeEEUN1M29e4n/MlgAKxrWzN8C/dYOfxbd/+qHraWxbObYVaiak1EjG+aPd7EipLZ8EO1cUoNN/Wb6sIQm/xK7GdIL8d5eG9L/8A/r9l/wBPqhxv3SrxswLTMbZ/f5tcT2nHwwRc1ZgpzQ93oyr/AP8Ag39xnWC/f2XEHWC//rdG/HSL8PXdC3K4q58sVV4Qti7vGrTQx5hVMrYgHC0r/wD+/wDzsEgRQL//AOXI/SC3/r5SHTu3QlNADXJ2B1nTdVoF6iHexM3BBdpAhLXbl5cI/wD/AN/z1qygUhf94dG/4L//APo51fDtUFKGD6+ku0vpMDgvYy/z4WXkAJBRRsNdmQVr/f7/ADsOcNMtN/8Ar27dIL/99TTLemQMDrodHFxp3/QKlR78AQzQFcQBUsqpalxITev/AP8A/wD5znbzRz//AKZyjIi/f/8AjrQVo6fRqiQWr0SdI36VEQT6DeurwANCbtgZhwiH6/8A/wD/AP4ibFEkN+3ramSAk/8A8L9MmtLpzK+G7Tvekcv8hylmIicIX9Ry2n591wR154L/ALzNjxWlpWo3z68GVoCf/wD6gabpK6QU/W0qf/YYynqOnfZ7xxcHwFGQRuXgAcanK8AERa+dWcCgP/6+JjIQl/36r4yD+WROuQtTm3Ok573KghgOLACOQBGQ1zUCOGdfQKIRAI7RTRBqP/6rGu6Qj/8A+/7Zk0Me7UVIU3miF4fvQK65NOImT4BwktPkMBVXh8oUAAENFWvA9Hf/AOomjBCX/wD/AMdap0sMtFitJZAzGHU9AL6H0TmWW5zz0e0Nv10q5+AAQlNflVLWXlf+6n0e8ZL/AD/NmkQDBPIkzGG+H7mw1UC7udUwGCc8M999+Atj9teAApIAXdU6b9J//epobBCX/wC96AnBtM1d+ne5VTowXlSr1YQZvOwvvKPfdQnoj25HADAAEd0EZ80lX1+vH1IQlv8Av/wlHVIGkxKrMr09KJbmr+Q5KbsDL7gBDkB8HXQSvYAADkFfhHVOVFe+vzsWFJL/AP7cwIIjE5MieWNrcCMYfg38zkFgcIQIQAgAyPO7JUYAhAAAfqRpb3hH5r+XeACC78o8iA54gnhBfl+OczuO1UM0lf6GaxMcIAEAfxvxfbgEAAAJ3e8p2lp//r8BtYCyY5JH+HIJbp4MehJzh3lIZVHcwB0PjE9404EArZ6uy3oQBAAoTve1ydp//r+5m0GC33LAbHpn/wAAv37TX8y3HZh+14eAmWa/P/uELIfMSvENBAAADAJWiuaaf/7/AIH5UJIh1kO0Q4/TmZGhc1ZTYxjRY+/7eAWHi0svrrZUbIk8WRAAABD1GGVcKnu2v6x9wIK8C3ucXfNt71OyrG4O/wDXhnQDHal01sCTjCCCgLdRlGxUAAAAha00QFJ/g/2HAeGiXEZHQXYRsRDgycFuHUMgh5rD78PZAaDDDDqDk/G/RFBMAAAAFq2nthh/ALWNeeS+XAC/KSWFyqv2G9+JxnvQ4yAXBzX53uDDDDCPUFnh4pl8AAAUs7ttyRJ3hXG+deCiXAbaagERBe4yXCz/AHup7WxgFFFQtDeATww1/wBZSUbYY1wAAABAdCSUaFcBdKqRoIJ8kNsS9u0HLNJcxuYFn3QJsBTihXnRV+/+vferhAXFCRwCgAAAW9OJoFcFXa/6YIL+sPtH4rXu+XnWQHt+Q5tKEBACyxagL/8A/wD/AP8Aj46fDF+8AwUwAszxzJFX9V2tY+CCfoHZJarcFBdEEh7+t256FqAAAGDxfx//AH//APMuRJwzJ/wAAAgCz0w3MlcBRZ24kJf8BBosyS3wrDC1fq3sEVBSBggZvw5ij9//APr2/W7K3V/8AcsQAwYKFO59AUG8iJCT/AAWBXBeyxE8xHdrYmBtgU0o7QPpaa/+W6ggX2vH4aP8Qk8U8f8A+U+6aQCGkE3h/wD8kCKlvcc0PVFuhI3docWhTyiswzJwTeyYAABRf1QuNFwBQBTS/hLQOigACoKQp/8A/JA8sZcg0TDUUprdDrmWTQwMrwOn37CAEAAAEXxA4d98AMIQk/XIKp1gAArWSr//APwMHUsiaMmRDom4awCXOSYGIFwg1EOAgAAAAAKzMusCdAEECAN15EfhZAAN+h49/wC+AArE6mfKGFgx4b4OtYWmywBcLfbeegAAAAACfxseoBQAASgDsdqhFQgADeuutf8A/IAA9n9eIIXKga/F2dVNg04IDKHlAzoAAAAAAXAjlccUAAAAAD/2gm8AgA1LVHf/AP6AAE7A7gxFxxq3UpoQ6hHKCAwr7D/KBAAECCNDnDJ0FAAAAABuc41kABLFJ0Yf/wC8ABTjCIqpqaBgr26vdBZDwRgPf05y4gwQgggRD/HM2ZQAAAAAT+gfrABTwBdyX/8AvA48Nw7472vD8Kc6BlBlQs48DXgHMuUww0MUUEvU/M3UMcIAAUZQw3JAYIIUwc//AAIPPBjKnOjiGkHGkN7Q2hPPNBx3MzlvMKFHPKKK/M+l1HPLLKFAJpIShPPKAAFP+4AGPOX+G6HXcHb/AMiDQyFTTzRIOxetbzjDxTTquOjfXd/zTACyxSpuCtDyAARAjf8AvTf9tRoejsUTdTXWMOTNn3LjpUA4AcAdfPbpsI08gAIEJdMg4L6QvPHM0OzrNgI4c4caHaspGlcaiADfWdJ0Ycd5M4AznzSU4RPvXrDrfn3MfjJ48MpbL1Z8gf6SH8zDrgyMa6sj+bnn6rWOPfoPp0QkgEwcJbP0wEZonLTvjDjTz8E0Bdj/ALPA+Xhf1qMKvSP1g+n0tSUqgbIzlGWDOzUHBDGDGNJQ702HJJ3/ANMs++tzXnkEdkwvZy4QrHL1e7imX48tIWHc4kTfmZqBe/SKfgjBDBTyxw+tuCeevcNOdfMNPnNeklfSPisritKKEpwWF3qXnLbuixXQcnITy7rPiSJEbf8AEUYfnH6cz7nzbHvF/wD658aWKRCENkGB0/cZU4UtdFWRjt5OjH5RWaeOf0W7geWG+xJvoyz0HA757174dVy40y6UG++NwELMKeqQVkiWlEaSnV/LtfCYC45psR0HOXkQZ7Kb5648AK593+93dbKad09UfM3/AEhSwAgBG0lG4cdqrPmmL8x+bqg6hK+GBlfW+2QySOfBbREeNN2mV3nBdJgF2cvdDciPrjAzzzzj+Rg/pEzDyo1Xevm+bu8Zpzfkbm7UDBR+D0/flXVE23347hAte7DEUWQMeRCMsagK1jxCgy3dkQEePOZ0Z4jXveEM4i19twOYAUB55qhVSXUpLwwiQAtMN6QTwPt/+841p0gtuHDBjyAQz+xDpE0ivMZNFODOchMSiQBu9tNMDTmtPLKTDCAgiycPN8tcvuvuPmryRM/gcM9tJR8Zw7BbCREUCBzOTRtCRmCy5meNet/Pc8sLYwwTAACyq7cMsPty5Jis+8DDazWMIMmpoeLFD7CTutRS9fDRGhtZf+2PMOoP/tcsdPPrqyjCRYZcev8ASCuttJzH0HvI8FndEZ61VEZQEgKR07Hjulcb3Xrjn3f/AAwww9336ww/PDHFAiohyBRATjzuxhGOEB9iy9P+Vv620EkgbtJZzJq0bGGP+wyy+7/zww89/wAs/P8AoUQ0e2qeMLgEzP2JyIGfPbvejW5dsVIYbb60RLb33fRZVcMU7DHX3/8A3/409/8A+tfMGQxRRDSxMNvj3zAWec8MspsTKKyP/TlegwG1RdNfhB3ufvDaju8P/wD/APzww/8A/cvOcjQxQfOS8P8A0mLQRXjLbLrsN8Qo18B1tkqs90kXhAF3v/j3vfwuDbz/AP8A/wDDDDX/AH/0/GICq+y19vxwAMG16069wxIWP5GrPEQRzMENEOyeI079/wA+8P8AHvz/APz/AP8A/jDDD3rX8MYIofPfN/8AZxC14yp115VM0lA3559O6N/7723VcKL628wwZyww80/04/6/yw3yzyxPIAJog6H9F7F41vly66lOvbs978+23CbHzHPGfMBqM0+zyqwwwwywx/8A9OMMMPcNazDCr8dTXRuYvdfctfePAoES/Mf8PcKy9isaDrYvczt9sqr/xAAzEQACAQMEAQMDAwQBBAMAAAAAAQIDETEEECAhEjAyQRMiUQVQYRRAcYFCI5HB0UOhsf/aAAgBAgEBPwDhIez2p8ZEyOSGN2SKiJIa4UhIihIaJImhj2oC2SGuixLBIe+jxzqYKiHtDJR9vOQ+FPPGRIWSGN2SJkx8KIkR2aJImiQ9tOIsJDwMngkPfR45MqFQe0clD2rnIY9mU93tImLJDHCRUJDHvQEIQyRMkPahkQhDJE8DHvo8cmVMFQe0cmn9nOQx70+MiQskMbsZMmS4UBCEMkTJ530+dlvLJUwSHvo+TJ4Kg9o5NN7Ochj3p8ZEj5IY4MmTJcKGyEMkTJ76fIhbyyVMEuh76PkyWCpkeyyaX2c5DHvTzxkSPkp44MmTJcKGyEMkTJD20+RbLaWSeCfDScmSwVMjGLJpPbzkMe9LPGRI+SnjgyZMkPegIQhkiZIe2nEIW08kyeeGkFxZLBVyPZZNJ7echj3pZ4yJnyU8cGTwTJD3oZEIQyRMkPbTiFsyeSRPPDScmSwVcj2Ro8c5DGPannjImfJTxwZMmT4UMiEIZImSHtpxC2ZPJLBPI99HyZIrZHsjR45yGMe1LPGWCR8lPHBksEyQ96GRCFsyZIYjTiFvMkVM8NHyZIrZHvo+chj3p54yJnyUscGSKhIe9DIhCGSJkx7acQt5ksE+GkzyYytke+i5yGPennjIkMp44MkVMkh70MiELaRUJjEacQt5k8E88NJnkxlYe+iffOQx7088ZEhlPHBkipkmh70MiELZlQmPbTiFvMmuia74aTPJjK2eGjzzlgYx7U88WS2p44MZUJj3oZEIWzKhPfTi2W0yRUzw0meTJFbIx7aR/dzkSJD2pZ4skfJTxwYyqTQ96ORCFsyeCe+nFstpjKmeGkzyYysh76T3c2SGPalniyW1PHFlQmPejkQt2TwTzvpxbLaZIqcNJnkxlYe+l93Nkhj2pZ4sltTxyqExj2o5ELdk8E870BcJkipw0meTGVhj203u5skMe1LIuDJbU8cqhMkPalkQhbMmVN6AhbzJFQe+kzyYysSyPbTe7myQx7Usi4MltTxyqExj2pZEIWzJ4J7IoCFvMkVB76XPJjKxLO+n9wuTJDHtSzxZI+SnjlUJEh7UsiELZlTBPZFAQt5ksEx76X3c2VSWR7af3C5MkS3p54smMp45VCRLelkQhbMmSXYxGnELeZJEx76TPNlUlvQ9wscmSGPalniye1PHKoiaJD2pZFgW7Jk99OLhMmTHvpfdzZVJZ3o+4WOcyQ9qWRcZ7U8cpkiaHtTyRwLdkiaGttOLhMkVB7I0vu9CoTzvR9xHHOY96WRcZ7U8cpk0THtTyRwLdkiYxGnI8JEkVEPfS+70KhNd70vcRxzmSHtSyLjPanjlPBIkPankjgW7JFRDLlAXCRIqcNM/u9CoTHtSyQxzmSHtSyLjPanjlPBImh7U8kcC3YyoiW1DAuEhlUe+m93oVCY9qWSGOciQ9qWRcZ7U8cpEkSHtDJHAt2MqEhFAXCRIqElvpvdzZMmh7U8kPbzkSHtSyLjMeSnjlIkTGhkMkcCFsxkyW1AXBkioS303u9CRNdjGU8lP28mSJD2pZFxmMpY5SJEkSGQyRxstmMqEltQFwkMqE99N7vQkTGhkMlP285EhjKeRcagyljkyRIaGU8kcC4MqEixQFwYyaJD203u9CRNEkMhkpe3nMkSQynkXGoMpY5MkSJDIZI4FwZNDR8lEXBjJkkPbT+70JEyQyGSl7ecxjGU12LjMeSljkyRIkMhkhjiyZLaiLgxkyQ1tp/d6EiRIZHJS9vOYxjKeRcZjyUscmSJDPCT+CFJp9iml0fVXwKqj6wq1z6o3clFjjZ2ZR4sZMkiW2n93oMkSGRyUsc5jGMp5FxmMp44volUXwOTedptQfZOu2KtUk7EVFIbhklqKEX4ykiMqcl9vY4079njBijFDze7FJsdvlCuvazya9yE08bMZMkNDNOvuFzZIkMjkpY5zGPankXGoPJTxwcvwSnd/kTT6YmngVr9FSKfuZKUY5aQ9ZRh7poh+qaepLxh2yrXUp2lgg6U5eFGKb/LwVdJU0685S+coeuVFJVknf5RH9R0s+sH1qEkmpEq9O94y7KblPu5dpXYmpK6PKUciaa6Iyv0xjKhIe2n93oMkSGiOSljnMYxlPIuMxlPG838Fep4vxQvuV30iFRtddFbV0aKvNlf9dkuqEP8AbJaqvqHepPxTIQlUfd2aLRxqO90hfp8Kfd+jVToXXeP/ALKGrdeXhSjj/v8A5JJV6ElJ2NLp5SSU31/+GqoKM/twinGnKpaT6/gdCEIpRXX5KmmnBfayNSpTdrmm1CcksMU0u2dNXRci77TJDGUM+gyRIZEpY5zGMZTyLHGYynjeeUypH722fU835N9Ir/qU60vo0P8AbP6b6NpVHeX8kqzVvEqwgoeU45+SFBVad6fRHQ+GclbTucVCLuiP6X5L7n2aTR0oydNZK9NU/tfTIRcH5Pv+CvKEk7IhF05FKvT1EfGWTU6mUJOlD/uyNVPqb/2Th4O0jR6v/wCOo+vhiqvHwXuinl7TJIaGihkXoSJDEUsc5khjKeRY4zGU8btXRUp3Vj9RoVlaEfaaPTxjFL5vY1dOVSd44/8AXRR08k/GWD6Da+m+0U4qnFJLpChKr2uj6Pg7MqJQRKKklWp5wyrF1u5LuJOFo9Hh5PvJOi0uyhKEZ/c7FWcKkPLJPTeV4ojTqJXkTx4NGgozivvO5fbEjFRVltMkhjRQXYvQkSQxZKWOchjGQyLHGeNqeOEldDlF9SKmmhNpr4J0pX7JQ8e2Unduyx+Srq0k0uijq3GNl2VNTOeSMfPuRTm6bvboWoai79XPOMV9z/wRcZK8ipSbV12R0/yKvOlem1dMnp6zflF/+B6GdRrzkylCnRVkSk8roppKKtvIkSW1Fd+jIkNCKXOQxraGRcZ42hx1NZRkqbxe3+PwSlWov8xKervjodVPI/GXx/5PoUn8CpU/hE9OpYZGhbBOlJwcYK1x6NySTI6Bwk3fpkIqKtcUopdEpQjk+rGKukOu0r4RUrT8bv8A0Qk5lTUpWoxzJ2ErK28hokhopLv0ZEhoRS5yGMZDIuM8DIcf1FOnVcl8ooa6TvCou11cUozl1kx0RcUfVgipqacM3HqovpMlUbjchVu7f+yTjLJFKSvFCsr3E2rd3E/K6aJVpQ6jZHmqiUG+xqEF9zwVNfCEW4n6PSeorqvP44MaJIsU8+jIkMSKXOQxjIZFu9pY2hx/UorxUicWpJ36/wDJKm190RVqse32LW9/cR1EZDnCStJEo0WsEoQeBOEeiM7fItUoC1Ub9Eaz+D6rSu+ieopx9zuPWTn1TQ6NWp1LAtEm1GJ+m0FTTtwY0Pann0WMe1PmxjGQyLd7S2hx1yTou5Lxpq0u02KLSv8ABGMWuj6MZdSQ9JCSuh6CV7pktNUS6kSdaDs1cqVmpfdE/qE8RFqKn/GKFKvL4Po15ZZHQN+5lPQwj8EKCiukRp/LyQpKHZpI/ZfgxjGiGfRY0NCKfNjGMjkWOLGR41l5U2v4JWldfBBtKxBK/ZFWfTFB/gS6wVad8FSjdE9H5Mho4pYI6VfgjQt8DpfIopEl+ROyszBf5KCtTXBjHtDIvQYx7Q5sY9o5FjixkeLV1YkvFuJTd24t9og38GckVbDF5Hfyhwv8H01+B07fB4MlE6XZJ3WBxaHL4P8AIiKskuDGPaGfSY9oc2MeyyLHFjI8tXC1Z3LLyv8AJF+IpMTRFL8iv+RX/I7/AJGn+Rx6yKw/4Q079l79F7dDfZS+6aXJj2hn0WMZYhzYx7LIscWMjy/UYr6g+u0Qu2QItif5QrH2lon2ovH8DffSHcumdFkN3fZpfuqq3xyYxkM+kx7Q5sYxiyLkxcv1KDl4ss30im3khK6uRsyN/hichv8ACL/wO/4Hcb/LFYkmN2FJpXG3c0K+5vkxjIeixj2jzezGIWOTFy18U6d/wSt7WRaT8UQthCZBpis30yL/AJO/yS/yO35G0i9ybtgkxyEm+vk0Csm+THtEXpPaPN7MYsixzXLUx8qTRJCvf+CObkWKTw0Jp/AnE+0bRJjbG/yJqUSWS5Hrs0cbU78nvEXpPaPN7MYkLHNcpryi0VI92KkfG0nhEMEXdkIprJ2Jv8Hl/A5P8DbH/JJ/gUmtmQNOrU4+jH03tH0Xshc1zr07PsnFPJFKS8WRTXRCo0sHTMfJ/sl/kdhtIci6Pi4rJEU32QXjFLm9l6b2j6L2Qua56mP3MmrEemyK+66IZsRSSKjVhtDY/wAjdxtLbJ43KK8ppekvVj6DGMQvW1Me7k4XROLvcV0RZGR3+TsfYxux0y1tkaSN6i9JeoxegxjELmuddXROPdycbF38Cu8Cvt1tGm7FSHidltkjQxvO/pL1V6LGIXJi51l0TRUjfosRSF/G3Ze2RVFYqS8hroSQrvIl+DRRy/SXqr0HsxC9ar7Rk0SiWF/JZFkNIbY4saSyN2wJX7Iq5pFaD4v07ly5cvwv6LEL0rl0eSPJE5JxYyViUbniJCTHFoaY0yx/gUfyWIooy8YI82ebPJnkzyZ5Muy5cuX9a5cuXLly5fe7PJl2XZdl/ReBjGNXPjsSVj/Y4/yOKPFWP4RYSQiCtFfsdixY642LI8UeJ4HgzxY+iW0vyJpiHYaLFzvZMQsfsKRZcbbXseaRcTLEqkYZKWqpVX4xff43qdSY/wCRj2ydbdb9LaK7X7O2o5PNfgupKyFBk6bt2rlK8Y/ef1MFlWF3G8RR+TV6ROalg08/KmnJn9VT8/Aq2vdMYx33tzpK7Lly6/vr2Li/nZtI828Fm/ceFsDioO6LzbvcjV+JDiSh1ghCbusInSrU7fSZ/VU7L6vT/An9TqD6Q9PGTu0UKf0K8qbeSVh7dsudjuW37LEZuL6RGopdoc7EqiiryPL8Dml8ikeVsn1UvgjUUi/9xZHaL/kkriiNDkkiU38oi4slFNWMdXHUb6QlUzcnOT+1EtEpSbZCmqcfL5HKcm5R6ITcn/1V3+RjGW4dltr2LXKUIqPkyLjGXayeCj28FZqX2+JBRt4pn0lFXseCTXizxl/xYo1MM8JfkSduxRduzwLW/uPFFn+TskuxJFkiUW32Rh+RySf2odWSyj6qXaQ5p4FJt2Z9sYpyLqWEW+GSX5MbK52XY5FxXGiKcnZCjU8bJ2Iefl4zFeTaZ9Nk6LPL6nUuicIfkoNJuz7KlNSRSlKm/GTutv8AI2N3E+7f3jgmeNsMsxJr4LJ5Q4xaFTv0xUUnclHzd0Om2OlZfcxUrn0Yk4OD7wQgsjViUE+0fQeRxs7EKMpPvBKkvgpSdOpZ9pkVL5JRJwmvayOocUlNEpxX3PAnBK7PpxfY6MJLobnDrIpwbsNl2WHaxBNu/wAepYt6Vy5f0LHiixZrB9y+CXatYVvyKBV7+1EaVuzy78ZIUYroabZOHl0Kf01aQ4xn2idN2uskZykv8EZ+SsePXZOn5YJSUafguylOMaaTIqM19rFBRxkaZUi2U7uPe3+D6SeS21vVsW3ttblcuXL7Tl4q4pSbtchN4fG1zxR4K9yzLE4Nu6It2sySkndYHTlMjTlT7t2RnKa8Zds+r9LJCVOfafZKDv0KnZn0rO44tlnFqwoy8rjkjyXwhKQo2/Y5x8lZniorsTinnZ1Gz6siMm8+g43PFLA43JLxi2hU7lWn2mUJuUe/g7Oyw4Ju54osuL/YZE35yaJJu35KN/HsSPFbXFK5clNRyf1K/BCpGeCpNrpCnJfJGXkiVaMeiNRSLDgrFNQj1F7Sl4q5PUTXtRQrqrnP7QyMUncsY3vYu5jp+LuiDbV2eDbbZKkU6fi7kopPyZOsl7Y3FWVrWsfTuSTXSH5eFh05x9p92ZIozco9k43JU+iimp2RcuX4XL3/AGH52crEqrXwRqeRe5GCjgcEyyRcuXJLyPoodP4sQXjFIlUUXY+v3axGcZ4HFMSS6RcuXSwSqRj3JkdRTm/FPve5fZf38q0YkK0Juyfe/gmSoolTs12Sm1ghUT6L8rly59K9z+n+blKElK/wX4PrsUL9lSgmu0aed14v43t+wTV1ZEqfRVpW7ZSk5QTeyJVVEVelUl437HQg8odJRat6LdipBtZKc6tGVm7oUk1dcrodmiEIw9q2uXL/ALBckk8reT66FDoq0FJFCd42fwNeja54oq0XLDIRskl+4IVkSiminCMFaOy9G4+xcpVIRfi32KrBvxT/AH+VFzV0VKLt5ELuKvxv+4v0ESVyxbhb9kf903btjqS/4oVdrqaM/sb9denOPkKBKHRSva3p/wD/xAA1EQACAQMEAQMDAgUDBAMAAAAAAQIDETEEECAhEjAyQRMiURRhBUBQcYEjQsEzobHhkdHw/9oACAEDAQE/AOERbplQey2iQJP7Sed0RKbIMT4ViTJMbEyLIMjvqRvZsT7LkGQ4azK50slLAtpFf3vnEQtkVOMSA8E87oiQICHvXGyWyIspsiPbU7NjFkRTI7PbW5XOnkpYFszUe984iFvU4xIDwTzuiJTIMW6NQMYxEWUyBYsanAxjFkWCnkjjdGtyuSKeSlw1Pv5xELepxiQHgnndESGSBHhqRj2REgQwPG2pxs9lkjgp5I8NblckQyUsbW21Xv5xFwqY4xIDwVM7oiQyUyPDUjGMREpkMb6rA3sxZI4KeSGOGt+OSIZKWBbM1fv5xELaxU4xIHwVM8EQKZHhqdmMREgQwLbV4HsxEcFPJDhrfjkiOSlgW+s9/OIhCEVeMSJ8FTPBEGUyPDU4GMYiJTIb6ofCOCGSngeyNbyRHJRwLfW+7nEQhIRV4xIHwVM8EQyUyD4anAxjERKZHfVDHskRwQyU8D31vxxQiOSjjhrfdziIQtquOMSB8FTPBESmQFvqcDQ9kRKZDZmqGPeGCOSnjhrfjihEclHHDXZ5xEIW1XA+EckD4KueCIlMgXGI1GBj3iUyAttUMe8MEclPA99ZjkiJRwLfXZ5xIiFtVxxiQFgq+7giJTIi31HtGMYiJAp76kY94YI5KeB76zHJCKGBb67nEQt6uOCI5ICKvu4IjkpERD21HtGPeJTyU10LbUjHvDBDJTxw1mOSEUMcNcuucSIhbVMD4RIiwVc8ERyUmQez21HtGMYiJTKeBbaoY94YIvspvrhrcLkhFDHDWr7ecRCFtVxxRHapnghFIgLev7RjGIRTyU8b6kfCGCJSfQ99ZjkhFB9C31nt5xERFtVwPhEgfBUzwQikU2Ie1f2jGMQiD7Kb631I+EMCKWB76zHFCEUGLfWeznEQhbVccUQ2qZ4IRTKYt6/tGMYhEMlPB8bakfCGCOSkPfWY4oQigLfVr7OcSIhbVccUQPgqZ4IRTKZHZlb2j3QiGSnjfU5HwhgjkpYHvrMcULagR31ft5xIiEtquOCERPgqZ4IRTIEd63tHsxCIZKWN9SMe9Mjkp44azHJCKJHG+q9o+SIiFtVwPgiB8FTPBbUyBHer7RjGIRDJTLDNQMe9MiUj431nt5ookd9V7R8kRIi2q44IREWCpnlTIEcbMq+0Yx7Ip5KeBbakfCmRyU+Gs9vNFEjjfU+0fJESItquOKICwVM8qZBkd6vtGMeyIZIPoQzUj4QIspiHtrMc0UiGN9R7R55IgREIq8UQPgqZ5U2U2RwfG1X2ksjHsiGSmLbUj4QI5KYh7az28kIokcC2r+0lnkiBEW1XHBCICKmeUCDIMT2q+0lke6I5KUiLGakfCBHJSFvrPbyW1Ihja5X9pLPJECIhFXHBCICwVM8oEGQFtU9pLI90RyUxDZqR8ICKTEPbV+3ktqZTfQtq3tJZ5IgRFtVxwQiAipnlAgQFtU9pLPBEclIRbo1OR8ICKXDVr7eS2pZICZcq+0nnkiBEW1XHBbQFgqZ5QyQIMW1T2ksj3QslNkdtTkfCAiiLfVe30KbKYtquCeeSIkRCKuOC2gLBUzyhkgyAtqntJZHuhFMiNmpHwgIpEXvqvb6EGU2Largqe7nEiIRVxwW0BYKmeKI5IEBMRU9pLPBCKZFjZqR8IiKRHfV+30IlNkRFTBU93JESIhFXHKmIq54ojkiQZERUwTyPdCKbIvbUj4REUiG+r9voRKbExFTBV93OBEQirge62piwVc8lkiQIsRVwSyPgimRLmo4xEU2REXNV7fQiQZFiJ4Kvu5IgRIsRVwPdbUyOCrnkiJAiIqYJZHuhFNkWfBqGPghFMgxban280RIERE8Fb3c4CEIqvoe62piwVc8kRIERFTBPI91tAjtXyPghECJHbU+3mhZIERMlgre7nAQhFXA91tAiVc8kRIEbnmo9NlStFqyHBtn0/wAjou1z6I6Vj6ZFWeSEkRkmrorcUIpsixPbU+3mhESAieCt7ucBCEVcD3W1MiVc8V2RpP56IqCx2d5wQTqLJDTpDoU4L9yTk2JTwRoV5K6iyUaif3dCc0ujymhuTFG6whwsLyWGNr/dEsn7WNNZ2QimRIsRqX9o+aIkGIlgrZ5wEIRVwPdbUy/RUzwjD8kYO34Q4OPZjtk7+P3YKcvH2oTuursdGUsQP0Fa130ilQ+nTvHP5KkqsY+dZu3/AHKeqhW+yEf8C0bqtui2rfDJaLUxPpVo9NEaNS33RKiUOvEtd2Q+nZnhCWBqUc9olH5QtqZAQjU+0fNESIiT6K2ecBERFTA91tTEVM7wV+zT0vP7mNqMrR7ZOmk7y7IUZzf2op/w1y/6jIaSnSX2xuxxhTtfo1WqjQVvFsf8TlPpRKEa0k7r/wBFXTOmvKpIjF0K0bK9yvVjC7iu/wDyUKjlC8l2yo5KneK7I15zbcn3+Cnq4VLKaJUqdRdo1OmlGLeUODeC7XUi1n0SVtoEGREaj2+giJETJYK2ecBERFTA91tARUzvD5RTl9iS/JZUlZZZQ0Ta+pPBT8JXUFZEKad7lKUvL7ZYJVvGfjU7/wDRPVqbuijUjFuUlZktZGOEarUz8VVt0UKv1F5R7RKopLxXRS+pdXfRNqa6dirp6unk5Rx/9mm0sZwVaff7IlTa7j/8EJ/Uj0a3SOL+pSWMjpJ3ayWsyptAiyLEzUYHzREiJkirnnAiR2nge62gIqZ3TsynUs7mhnTqS8ptf2NVWlFtr2pX6/Y001GPeb/+eypUXujkVZe9FWTlJtvJKcafTFW81dEJymyM/G9CeH2v+ShKNC6i7qWCM1J9nl4rojVTwVVKUOlc09KdOTUevyRqpdy/9F4PpMS780a2rBv/AEzqP3SHJyd2IgRZFiZqH0PmiJERIq84iEIqYHxp5EVM8IuzIxku4FLV1KaaeH/kpV4W6PqRl1Flbpdshp27N9lXTKUrsp0IwwSl4dRJU/qq1x6VOS/bBKN5Wj/klFp2iRqJO2B1/gdGNW1SLs0fqKdrSHrVBfairOpV7f8A+/wRivkqNuTuLaJFkWIrvofoIiIZV5xEJiJ4HutoZ2nu9tPTfi6iza/9/wAkFRrL8SKmjt2+xUGsN/8AkUJR+f8AgVWssDq1PkjqHHKHXvlEK8VNSn8fB+tindfI9bGSStgdVt3USSnJ3aIwqS7QqEpOzYtN327sp0Iedl/kqxjBdEaLk3UeF3/yN3dxbRIsiy5WfXooiRGVecRCETwPjHIifH+G2q0lB/DK2hUbSpvrNjuEe8GeyXkx05vsp6eUl8C08l2KKUrEoWV3/wAEftXRJ+Ls2NN2sZveNhrw7TFQUu2SbpzukXnLqKyLSzk0mfxWa0+ndOPz1stoiZFlyrj0URExsq84iEIngfGOdp8f4VP7pRINN47/AOC8ZfbJDowfSJaSysh0nEjFp3TIyn+SLt2ySciULj03mS0za7JQX+74Got/kUJy6irEdGk/KQvCLufqFG7Z/Fq7qWXBCEIqPofoIiIZU5xEIRPAx8I52nx/h8mq6sRvJ3j00hy7t8jnJPsdXx7TFqH8i1EXlEZU2+0fThLDI0nbpn0Zfk/S3yz9Mlln0qcSVSnElqrYKmpcurkqvdlgnVc+jXSbml+OCEITJ49FCYtqnOIhCJYHkfBZET40JeNSL/cj1Z/JKzdyo38Df5R5o8u8lKpbJTqdkaqHXsS1ViWquPUXJVGxSH27jd9tTLyqy4IQtp49FCFtPmhC2lgeeKES4p2dynLyimT6SaRNJZH0Sd8ouhSsQrW+T67/ACfWv8jrXFMcm+hdM8rsUfk/ttJttvghEdp49FCFtPmhC2kPPFCJctFP/RTRe6JryJJDTHc/wXQmhTFL9i7F+5f8C67M9iwVftg3+3FCFtPHoIQhFyfNCEIlgfJEuX8Ol/pi76ZPpFQaQ1+GO5dibPuZZi/DOizQn1sukat+NJ/vwWyEInj0kLafNCYmIeB8Fsh8v4bNR8kJpJtk18E42ZJWJWGkJfkQhWEvwO5FiVzxTdhI17+xLkhCJD9BCFtPmhCEPA+C2Q+Wgl41CEnk7auydxq5JNHf4Jf2EIVyzLWI95IfkSG0a+V2lxQhbSwP0ULafNCEIeB8Fsh8tNLxqIpsv0TXRNWGlkaLM7EmRQktrNSI42/Y1sr1f7cUIW0vSQtpc0IQhsfJD5QfjJMpSurlOafSyyebE1ZE20zodi37iQkhCR43EhEkal3qyfJC2l6S2RLmhCEMfN86E7pWIyawOVvuRJp9k4JvJgyf4EK4uxRLCOyTSJvyk3xXCXorZbS5oQhDH62mn9qIO+S90rsk+iaJO7IJiTEL8C6O2LbysVn4wb9BbP0VshEua2Qhj9bTy+CnOzKclaw7MkrEo/sdfg6EIXYhPfVytTfpP1X6KEMfrUH2U5dWISudfIxjLPZzRCXkIuXsNmtl9lvSfqv0kMfrUn2QZCVu0KQ2x/utuix4O5Tj4ifY2N2wN/k1kr2XpP1X6SGPkvQp+4RBkZFx/sNsuxCSE0XbEhuw3Y1TvP8AkbFiwt2W5rZDHyXCxZlmeLIxaYiLZCVjyGxtCaYmhWLl/wAnl+BsciqvKVzwR4I8EeKPFHiiyLIttblYtwtvYsWLHiWLFt7I8UeKLIsvTQuhMjKxfvok3c/wJikxyZ/cuNjZLt/0S5flcuzyZ5HmeaFJCIiImNlcuJljouNDHn+gtl3strly4ot4Q6UvwWGhsp0J1faVtHXoLynHr8rveGEIQtm7F3t3vnaWP6DgZbZFyMZTdkfQdskYuErzXQ60F8lOvHy6div4zmvp/wCf7n6CrL2tM9s/GY6iwjSat/TccmppeFVxij9BV+n9T/t8lNNKzVhCF3vfnN9FjxY0/wCetct+R/sdii27CpRj7i6ivsPrN5IzdVeLweFKKs4k6CVpU+/2FU77IVbu6ZVq0l4yfciGooVr/Vifo63k3Qd4/kf+k71F2xaqUI2Twaqr+o08aqIiFfax0dcOi5Giqid3YqUpU3ZkKDl3cWnk3aPZb8ipt4Q4WyKHlgWnk/lEqMoZLfzF2dM8fwQl4vsdR3FJEabkyFNJ9PsqRnHLITad2dS7sRopO8sEnSwolOlCKc2yOvaSSJVXVn4YR4U4xUZd/kqwUYf6T6/AhC6L/nh0X3uOpLy8EVYyqQTTvY+q5dLJp1KP3OSKil5+bXQ67k/FMc3JPzQpwVlJDnSXaQ6lP4Q2r3RKSv0eYu/5jyZ5J5R0QnZZHJ5PKT6ZGUIx6ROr8IjFuP3MVGPwz6LfTZGDWRpJXRaUpNRGnHpyHciLZ2OjoS4NqKuzypeV2rk/Dx8qZK0EpR+T6qWUQ1C/B4/R7j2QrVH8GoTaTcekUqzi+ivGNVeUFZiP7CQlYa6v6l+dvRU5L5PO+UXiOV/ku1hkZyTux1Uu0PUNqyIyVONpCqr8H1VJ2ihySPqSIzUsZJtidzyaPq/B8XJVUl+5Cf5K1ONSnddNEnHqxCZTqQfuRPSqTbgyEJP7VkaqN2R9WUehV6kX3gXhU7wOnUSusCRZI8heVybSVvn1rl+VixYsW9C7PNnl+UeSeT7fhkPtd7jbv2h1Cil7mOqn0OH+6LHOUuyLSXRCp49sdL6ncBSlB2kQqK9nglThF/3JU/F3PPvpEKqjkUXKp5voqQlKq2iUpU396HUcs4FJFOaRVspdFjpZPqv4L32v61y5fjbhYsW3pw83YcIxXlYnTWVxTseTPN2sXPLq1ynUUVZk0r3RBwas12KpGA6iqdXuiUIwflHpH0vq4KiqU1Z4IVVazRKqpLo+t5KzIzUS6nF3HKHhYSl8Hi1ljlG3Q5N7re5cv/IXL725wl4S8kecpS6GptY2VJfJ9GPyTio49BSaHNvIptEJeUkmOrYpVFZmohGEusM6LouebSsjyZd8V/QY5Ka8IpkWl/Yr2v0Ns82XuWHFosRpyng/TP8AJOnKGSlTT+5jpxeETh4shRlLslTcTyFOVyr5y+6S2jFydkQ00X02V9O6Xax/SF0Sk2rfBdl29rFrkYqmKop9MqRUZWQqijFJEa35KtXyViE214ohSl/udh0n5XyOpYi1li8fO4qkJdSGo4iyvBQl0Ql4kat2V2nBtlixYtvYtZf0G90WIwbI0U/klScdpVJSyKo0Nt5LFixCXiKu7iqrLZUl5yckQpykrt2P09u7k4Sp5FNobbd2WFcs3khTlP2olpqsFdrraxYsWH/PxozZOhOCu11v9RxI6h/JGpeL6yRpp56KlJrstysWZYVbxsfqb9WK04uNkWLbWF30fUt0U9Q0zUwSfmvkW1y/8/TaTuyNXsp1r9IqxUZtLZkKMpDoVqcfK3QtRNYPq+Sdx+hGPkynJRdrFSnSqxulZji07Pl2JtMnOU7Xe1ixb+fsWIyksDztFd9jqdlOu0yvC0rr5E/RTaPN3KVdRyicnKTb9d8L/wA1fdjbZGTiVJyqO8i3pWI9D5KlOS8kuh0ppeTX9eRGsoOzKdZX8SokpNLm/wChr+UZF2Ll/Qt/VWLgld2RGlH/AHMenurwdx9f12EvF3HUIzKtrpl/S//EAEMQAAIBAgQDBgMGBQIFBAIDAAABAgMRBBIhMRAwQRMgIjJRYQVAcRQjQlKBkQYzYGKhUHIkQ4Kx0RVTksEl8cLh8P/aAAgBAQABPwLkIQuRIlyUREIRUKm/IXBESBEiyJEQuDKhiSXFj7i4IiRIsiyJEQzE7FbzchcURIlIgRELhU2MdsVPNzUUyBAiRI8GYrYxXm565MiXJREQhEypvyFwREiRIkSIhcGVDEkh8X3kRIECBEQhmJ2K2/IXGJEiikRIkRcKmxjtmVPNzUQIECBEjwZitjFb85C5MifJREQhE9ipvykRIkSJEiIQuFQxJLix91CIkSBAiIRIxOxW35C4xIECBEiRFwqbGO2Knm5qIECBAiR4MxWxi9+chcmRLkoiIXCexU35SIkSJEiREIXCqYknvxY+8iJAgQIiESMSVd+QuMSBEgRIESPCpsY7YqebmogQKZAiREMxOxi9+euTInyURELhPYqb8qJEiIiRIkRC4VDEk9+4+6uESJAgQFwkYgrb8hC4RKZEgRIiI8Khj9ip5uaimQIECJHgzEbGM3565MifJQhCET2KnKREiRIESIhC4VDEk9+4x9xcIkCBAgLhIxBW35CFwiUyBAgRELhUMdsyr5udTKZAgQI8GYjYxm/PQuRInyUIQuEtipykRIkSBEiRER4VDFE9+4x9xcIkSBAgR4SMQVt+SuESmQIESIhcKhjtmVfNzqZApkSAuDMRsYzfnoXIkT5URC4SKnKREiRIkSJEiR4VNjEk9+4x9xcIkSBAiR4SMQVt+SuESmUyJEiIjwnsY7ZlXzc6mQIECIuOI2MZvz1yZE+VEQuEtiryFwREiRIkSJEiLhUMST37j76IECJEXBmIKu/JXCJTKZAgIQuEzHbMq+bnQIESmQFxr7GM565LJ8qIhcJbFXlIiRIkSJEiRI8KhiSpvy4kCJEiREMxJW35K4RIFMpkSIhcJ7GNKvm50CmRKZAQuFfYxnPXJZPkoiIXB7FXlIiRIkSJEiRI8KhiSrvykRIkSJEiIZiSt5uTHgimUyBERHjMxpV83OgUyJAgIXCvsYwfOXFd6RPlIQuD2KvKREgRIkSBERHhU2MSVd+4x96JEiRIkREjElXfkrgiBApkRERcKhjepV83OgUyBAgIXCvsYzqPfnLiu9InykIQh7FXlIiQIkSJEiIjwqbGIKvm5cSJEiRIiJGJKu/JjwRAplMiRIi4VDGlXzc6BTIFMgRFwrbGM6kt+cuTInyoiEIexV5cSBEiRIkREeEzElXzdx9+JEiRIkREjElXfg+/HgiBTIECJEXCoY3YrebnRKZAgRIi4VtjGEt+chchk+UhCEPYq8uBEgRIkSAiPCZiSr5uXEiRIkSPCRiSrvwffjwRAplMgRIi4T2MdsVvNzolMgQIiFwrbGMJ785C5EifKiREIexV5cSJEiRIkCJHhMxJW83LiRIkSJHhIxJU35MeCIFMpkSJEXCexjtmVfNzolMpkCAhcKuxjCfm5y5LJ8qJEQh7FXlxIkSJEiRIiETMQV/Ny4kCJEiR4SMSVN+4+7HgiBTKZEgIXCpsY3YrebnRKZTIERcamxjCp5ucuSyfKREQh7FXlxIkSJEiRIi4SMQV/N3H34kCJEiR4SMSVN+4+7HgiBSKZEiIXCpsY0rebnRKZTIERC4VNjFlTzc5cllTlRIiES2KvLiRIkSJEiIXCRiCv5uXEgRIkSPCRiCpvyY8YlIgQIiFwmY3YrebnRKZTIERC4VNjGFXzc5C5DKnKiIQiWxV5cSJEREiRIkeEjEFffloiRIESPCRiCpvyY8YlMpkBC4yMbsV/PzolIpkCIuM9jGFXzc5CF32VOVEiIQ9iry0QIkSJEiRI8JGI2K+4+UiJEgRFwkYgqb8mPGBTKZEQhcJbGM2ZX83OiUymRIi4z2MWVvNzkIXfZU5SIiEPYq8uJAiRIkSJEiIZiDEb9x99ESBAiIQzEFTfkx4wKZTIcELhLYxmzK/m5yKZSIkRC4SMXsVvNzkIQu8ypykIQhlXlxIERESJEREQzEbGI35aIECBEQiRiCpvyUIRApFMjwQuEtjGbMxHn5yKZSIERC4SMVsV/NzkLgu/U5SEIXCry0QIiIkSIiIhlfYxG/LRAgRIiESMQVd+SuCKZSIEeC4yMZsYjzc5FMpkRCFwkYrYxHm5yFyanKQhC4VeWiBEiRIkSJEQyuYnflogQIERCGYgq78mPBECkUyIhcZbGL2MR5+dEpFMiRELhIxWxiPNzkLghd6pykIQuFXlogRIkCJEQhDK5id+WiBAgRFwZiCrvyVxiUimyBHuSMXsYjzc5FIpkSJHizE7GJ35yFwQu6ypykIXGry0QIkSBEiIQhlYxW/LRApkRC4MrlXcfIXGJSKZAQhcJbGL2MR5ucikUyJEXFmI2MVvzkLghd1lTlIQuNTlogRIkCJEiIQyvsYrflogUyAhcGVypvyVxRSKRAXckYvYxHm5yKZTIkRC4Mr7GL35yFxXdZU5SIi4MqcyBEiQIkRERDK+xid+WiBAgIXBlcqbj5C4oplEgLuSMXsYjzc5FMpkSIhcGV9jF785C5DKnKREXBlTmQIiIESIiIhlbYxXLRAgQELgyuVNx8hcUUykQF3JbGL2MR5uciBTIERC4Mr7GL5yEIXeZU5SIi41OZAiRIESIiIhlbYxPLRAgQIi4MxBU3HyFxiUykUxdyRitjEebnIgUyBEQuDK+xi+chdxdxlTlIiLgypzICIkCJEiRIjKxiR8pECmRELgzEE9x8hcYlMpFMXclsYrYxHm58CmQEIXBlbYxfOQuC4LuSKnKREXGrzIkRECIiIhcKpiR8pECmQFxZiCe4+QuMSmUymLuS2MVsYnzc+BSICELgytsYvnIQuK7jKnKREXBlTmQIkSJEiIQuFUxI+XApsgLiyuVOSuCIlMpkCPclsYrYxHm58CmQEIXBlYxXOQhcV3GVOUiIhDKnMgRIkSBEREXCqYkfF99ESmQELhIrlTfkrgiJTKZAiLjLYxWxiN+ciBTKYhC4MqmL5yELvsqcpERC4VOZEiIiQIiIi4VdjFD5SIkCAhcJFcnvyUIREplMgQFxkYrYxG/PgUymIXFlUxXOQuC4LuMqcpERcGVOZEiIgQIiIi4VDFD5cSBAQuEisT34PvoQiJApkCHclsYnYxO/PiUiAhcWVTFD5qFwXeZU5SIi41OZEiIgQIiELhUMUPi++iJAgRFwkVypvwffQhESBTIERcZbGJ2MTvz4lIgIXFlQxI+ahcF3mVOUiIhcKnMiREQIkRERcKhih8pECBEiLhIrFTfg++hCIkCBTIiFwkYnYxW/OREpkBC4sqGJHzULgu8ypykRELhU5kSIiJEiIQuFTYxQ+UimQERFwkVypvwffQhESJTIERC4SMTsYrfnxKZAQuLKhiR781CELvMqcpCFxqcxERESIiIhcJ7GKHvxffRAhwiR4SK5U35KEIiRKZTIi4yMTsYnfnxKZAQuLJmJHvzUIQhd2RPlIQuNTmIiIiRERELhPYxQ9+UiBAREXBlcqb8lCERIkCBEjxexidjE78+JTICFxZMxBLfmoQhC7rKnKQhC4VOYiIiJEQhC4T2MUS34vvogRIkRCGVypvyULhEiUyBAXGRiNjFebnwIEBC4smYglvzkLgu7IqcpERC4VOYiIiJEiIiLhMxJLflIgRIkRcJFcq78pCIkCBAiLizEbGK358CBAXdmYglvzkLgu7IqcpERcanMRAREiRERFwkYklvy4ECJEXCRWKvKQiJAgRIkeLMRsYnfnxIECPdmVye/OQhcF3GVOUiIuNTmIiIiRIiELhPYxJLflxIkGRFwZWKu/JQuESBTIkSIuDMRsYrfnxIECPdkVye/OQhcF3JFTlxFxqcxERESJEQhcJGJJ78uJEgQFwkViruPkIQiJAgIiRFwZiNjFb8+JAgR7siuT35yF35FTlxFxqcxERESBEQhcJGJJ78uJEgREy5IqlTcfJQhECBEiR4sr7GL358SJAQu4yuT35yEIXBcZFTlxFxqc2IhESJEQuEjEk9+XEiQIiESKxUHyVwRAgRIiFwZX2MXvz4kSIhdxlYnvzkIQu6ypy4iFwqc2IhESJERERIxJPflxIkCJERIrFTlLgimQIkRC41tjF89ECJEXcZVKm/OQhC7rKnLQuNTmxERIkSIhCJGJJ78uJEgRIiJbFYqb8pcEQKZEiIXGtsYvnogRELuMrFTfnIQu8ypy4iFwqc1ERCIkRCESMST35cSJAiRESKxPlLgiBTIkRdytsYvnoiRELuMqlTfnIQu9IqcuIuNTmxEIiRIiIiJGJKm/LREgRI8JFYqcpcEQKYiIhca2xiueiJEiIXFlXYqb85CELusqcuIuNTmxEIREiIiIZiCe/LiRIESPCRVKnKXBECmIiIXGtsYrnoiRIi7jKpU5yEIXdZU5cRC4VOahCERIiIiGYgqb8uJEiRIiGVSpzIkCBEQu5W2MXz0RIiF3GVSrvzkLghdyRU5ceC4VOahCIkRCIiGYgqb8uJEiRI8GVSpvylwRAgRIiFxq7GL+QiRELuMqlXnIQhd1lTlxELhU5qEIiIQiIhmIKm/LREiRI8GVSpy0IgQEREIXCrsYr5CJEiLuMqlXnLghd1lTlxELhU5qEIiREIQhmIKm/LREiIiIZVJ8pcERIESIhcauxivkIkRCFxZVKvOQhC4rgyoPlRELhU5qEIiREIQhlcqb8tESIiIhlUnylwREgIiIXGqYr5CJEQhC41CrzkLghdxkx8pCFwqc1EeESIhCEMrlTfloiRELgyoVOYiJEiIQuNQxPyERCEIXGoVechCF3WVB8pCFwqc1C4IQhCEMrlTfloiREIQyoVOYiJEiRELjU2MT8ghCEIXBkyrzkLvsqD5SIi4VOahcEIQhC4VipvzIkSIhEioT5iIkSJEQhcKhifkEIQhcWTKvOQu+yoPlIiLhUHzER4IQhCFwrFTfmRIiEIZMnvylwREiREIQuEzE/IIQhCFxmVechcF3WVB8pERcKnNQuCEIQhcKxV35kSIiIhlQnzEIiREIXGRifkEIQhC4zKvOQuC4LiyoPlIiLhU5qFwQhCELhWKm/HK/RmWX5X+xkl+WX7HZz/JL9js5/kl+x2c/yS/YyS/K/wBi3BERCEMqE+YiJERFiFxkYn5BCEIXcmVechcF3WVB8pERcKnNQhCIiTeyZCjUf4f3Ps0l1RDD+/8AgjhL9Ji+HX3p3/Uj8KX/ALET7BFbQpxJYVZFd0kon2akt61NEqdCNvvoipYa9u2Q4Yd/85HY0OleI6NGo9JxX0FhaP8A7sD7FS/NTF8OpvpAn8KpvejAfwal+Rr9R/Bo9M5L4S0n43+xH4fXcrJalTD1Y/gZUi1umifNiREIiLjLYxPyCEIQhcZlXnIXBd1lQfKQhcKnOpYatUV4U5NepS+G1H/MlGP+Sl8NV9Yzl/gpfDH0goiw0KPmrRjf3HVwFPzVMz9j7bh8t6dL9yeOzRyqMYr2KmPrZrUpWgttCeNrJeKtL9Cpjqr2lL9yVab3kyNaa6s7eo3du5GtJdT7XNLzL9ieMktpEcbVFjZpa7M+26aQt+pHFNy1np9CHZVLXxCsTr06KUc0nH1jIpV1UX3eImOvWjG+fP7OIsdPKpSpKxCupLxU5fpqP7PKWuhLCUn00K/wahV/BH9Cr/DtG3h7SH+TEfw/iIK9OcJL30K+BxND+bRml6205USIhEe5MxPyCEIQu5Mq85C4LusqD5SIi4VOXhcFXxP8qm2vzdCj8Fin97Uc3+WCMN8JjF3hTjH66slQo4en99WS+rK3xLCU9KUHP/BU+M1n/LhCH+Svja8197Wk/YzuUhaCk2rFCm/ys7Cf5TE0J01447joNvex9m11mh0NfNoPDTzWjqLB1ZRzZlYeCl+dC+HS7J1HfKiOHjbeV/oUsNGT8TcV9CODu/OQwV6uV1F9RfDn0qRHgpW80WRwlW94/wCCm8RBa3FXl+OCZ9phT2g4/RlP4jTbtVX6lOVKUb03+zFUknpIjXVtTwTOwh00Mb8GwtfzUkpfmh4WYv8Ah2pG7w1RVP7JaMrUalGbhVhKEvR9+JEQhCFwmYj5BCEIXcmVeciPfZUHykRFwqcnBYGvi5fdR8P5nsYP4Vh6O6+0Vf8ACKWFdvvPL6LRGIxWHwq8Pif9pifjNWelO0I/2jm5ybf+RiRUUX6lGlf2Q+zUvVFKT/BE7Sr+aw83WbJQlL8TZUnKMrZTNV6R/wAEKdTep9bHbOVaK6CiZXLQoU0lYr0FKFirGtTuruxmrq2rI1a17EMXUjK04qR9svvSX7kKtOTWXwfqQqSh+Jv/ACLEPqkzETjOP8vUnhM68BOnXoO8G0zA4/PdYi8GvxdCFRVF91OM/oztpU5apoh8RS82pRxVGt5Zq/oydGMzG4WFWGXFU1Vh69V+p8R+AyhF1cC3Vp/k/Ehq3diREIQhcJGI+QQhCF3JFXnIXIqD5SI8Z8j4b8IvFVsZ4YbqBSi6ngprJS9ESlRwUbvWXoYv4nVrvwrT06FVyqa1JXI029kZKUafnzVPypF5W0VkRjpuSlk8qIupU2uyODruKeUp4aokrkKThNuykrdRYcVOx2VPNmaVyvJKHgjdk6c6dPNUl4p9CnQ8S8I3GnHxb+hjMTWj/LtGPsYb4hXozzXze0j4d8QVaHkiqg7Sep4b2a1MsOh2cbkqEehHDe5DDpPcjST/ABaFWcMzUG7epSzSfh/wfaqtrNRqL+4wzoYnNCdJwfqifwq/iw1VN/sU4Y6NWnDE3nSvqzEfDLq9CV/YlCVOVpJplHGTowWZ5o+jKGIpYmneDuvQrU3Rlmp6I+L/AAqGPi6lGKp4pftMqQlTm4TTUlun3IkRCEIXCZiPkEIQhdyRU5yELvzHykR4z7/wP4d4I4msrt/y4v8A7kIfaJ6eSJjMSsHR0X3j2XoS7StNyrSf0IxvaMSay/h1fqZPzuwpdnNSgldep8PjTnX/AOIvkfVdBYFym8nkvo2R+G01NZ3mI0qNL+WrEpxWx23QqV9Pf0J1LRTTvc7XK77lGo6k7Ra19TEyVDwylr7FXFwqRpw7O8o9SriXkiklF+xknUnaCbbMJ8M7Snev/wDHqV8B8Oi+znJ05Wvmvcwf2enmhTk5VXsys5QV0yj2s3dQcipGVGklNK89RuyNVbXcoU5VZ5YdOphaFOopPxSS/wC46VSC2gv1KmH7aUtLy/tKVKUZ5W//ACdnlmUoqnJya1fVELbrUqYuthpeGWaD/N0MPj6VVpP7uf8AgqQpV4JVUmukkY7ASyuVF3stjBzqxxC7J2/MUKqqwtLcqp0qtltvE/iPARxWF+10l99Dze67kSIhCFxkV/kEIQhdyRU5yELgu7UHykR4z72DovEYqlSX45WJ2jTlbZeCP0MN93h51erJJ1arnN7FSf5SneUtSrVvGKS1X4upToTqy0KfwxX8crkaFOkSxEYq2h2sZS8UrDlr1sU80ZNyt7F4p6vU7CMqDqSIWflPiEJxprR+IhRl4baPqdlnXhW27IYZ20WvqRwyXmdyWkGqejMRjakH2d2/V3Jy+7eTcwsn22aXQq1LxWp8Jk6NKM6mqqOyPiePVarlpfy1/kg8zWhUTzfdeGHuUF2NFpy8b8a/QqwpYmhGSi02tLaMpUIUPBiJ9pf8Pp+pUpfd2g8q/tMXhvBnWjXUpVu1p5paS2Zdopt+JpXf/Yw7VeMlJXS3MThJUNfNB7M+H42VP7mcc1P/ALEaknJTpSUqfX2K+GhK9SirS6r1MFfO/Yxi/F7lFqanB7MxdLscVVp/lk1xiREIQhcJFf5BCEIXckVB81C5FQfKRHjPvfw1b/1ihf3K0rUnH3M//AW9io7O3WRRowlCSnHT16o7PTJThqYfBX1mZYUkVMUlsLF380b+9zERhJydnk9iMNPFK31FUVOUk3/1Ea8pR8W5Ktcw2Ll2TpTl916FCM5VrQV7alfEqtV1laEdiWLUYZaGXXeVtSnOx26jufaE9hSUm3J2px8zRiaNF4aVam/Al09TtHs7tELSV43NXO843XsYrFVZxjBStCKskiFSxRnJyISt9SM4VK0ajeWcdbdGQallknpLVMrUc9W8dLbkfCYjFU8ry+KXoOjVhXzUrWluiUMsLOztvboSvDxLYoycpaXT9TDYmL8NTxJ6WK+D7CTnBXgzDYizUZWisvREpuL7SF8vVegrKeZbSMX+FfqYPeT/AEPiss/xHEyX53xREQhC4zK/yCEIXBcZFQfNQuRUHykR4z73wyt2GPoVHtGRjKKy5ls9SjrGUP2MLgn9qm276fi2ZOPiyQWiKVKKSt+5WqqmiWLzXy6PrIrR7PBqUXdVJW13sR1l7ehTirtXaX1LK2pjI1OyhVeVw8mhh6eeEmtB0oTq9m7xf5jF0KuCqdnWW6voYTFKMstRtR/MuhicHmhegoNNXvFmSUZa7na22RKpm9SjhatWOfy0/wA8tiVOGDw9CLUaqfifuYeUMRli4R7GpG2X0Z8W+HUMNgb0o+LNuVo06c4zoxnGLXiUjsJV6KlhJax86e//AOi6u1W/+SOytZ20Y4KNskkynrLVjqThTatv1PhOLafZS1jukYLGRxNK6smvMvQ+KTnGEMnle7RTnSu8+rWwqrqStZGJ7WN+xauujMJi3tVu5N6or0Zy8knYwkasM0be6MFjXNZKq8f/AHKlO7zxKcrT126mS1PzeVmJk3LKt3/gxE1hMFUqflV/1JPNJt9eKELghcZFcfyCEIXckVB81CELvTHykR4z7/8AD3xCONwnYVH99TX7r1KuH7Oqm9I+3QcbdClT6mIrdlHQs8RJ+LX0K8expzjbxX3Kr/4LCRl5/FL9CA3qTc8RVbpUkrRu4wJWZSxEoxcFuVa05SWuVoxeIliJZpNt+rILUw9R09acbVLWcmyUKmRveJJ2MyKMpScYKTtfRdBxeN+F0qkNa1N5ZGFxVTDJyetnbL1RLF08T8Jq1YrN4dY+4q0bPtIuX67EcTKlX7ShKUX0FThioXp/zesSDdF5Zq8fQqRW8dYsksv0KM7TXoKfY1lKHR3QsV9mx0qlHy329V6GFxtDFUUqTVreV7oxmG7OpdVIxTfUhrvJR/8AslWhLESyPw9LlSlDWafiv5bFOajTeduMrbS6ixWTq2PESqVdzDVe0fZxzZmiCvFZd+pJ2jqQjlk5y1bP4i+I9tL7NSfgj536vuIQhC7kiv8AJIQu5ImPnIQu9MfKRHjPv4avUw1eNWlK04nwn4nR+I0MsrRqrzQ/8Dp+G3ToycZQfsYrt1B3XXoUpShUjOS8MXfUpPD4zHR82ss1uhjs0oueSzovLL6DrHbCryhK8W19Co1n8CyxeqV72M0rq37laGVyvJN7Ox2P3CqLWG110Zg8O6lKpKlKHaLRRkYDCOFCtWqxfaU5WysoVZyxMpOoovV/X2K+GjOg6uHea3mXoeaXoUlZ36nwjFwoVZxqq0Km7PiGBh9rpSpVI+N7exKjV+GzfYzXZVH4Wt2fG8HT3jSyqOspJf5KuBqQoyq5qbguqluQm4jq9prKV37jvCPg2HXXihlsU7ydrI0yJHZzVRTi/Fe5SwXa4mMoSlB+aT6IxuJ7av8Ad/y47X/F7spVW6934rvWJXq0e2tGNvS5OvLaMkmU680nm3XW5DEwmvJC5Gom1lpxv7Iw9GScZ1H2ft1Iy18K0Jf3M+M/F96OElr+Kf8A47qEIQu5IrfJIQhcZEx81CFxXcmPlIjxnyKdSVOanTk4yWzR8D+O/aJKhiUlV6SX4h5ZrQnh2lpsYjCQq0pQayX6pXJ4OdHC1FS8c31XoYmt9qj2Uc0KtSzmmuqKsJU9J6S9BMzCqW8u5KU8rtmM0n5zDVJRoVKa8tS1/wBDCV3QqbZoPScfVGMqqu5vD1Kkrq29tPRkaOWexTWWadrlTx1G8qjH0JuKStY3MHUw9XIq8FZb+36lHLiMV9qmlDCUFancxvxCniKFXJO6tZK1iSpVJb5fclhkqMJQq5pS2jbdD0IVsooKtbJbP6Esr0cVTmunqKVo9Cc5ZbW/U+G1Z0fEpLLJ2ldXMVGhiMOskITb0elmQo6u8ZeHclTpzeacPoLCUIQzya9lchRz6Uad162IYOmk+3ya/lWpQhGmrYakof3dRwUdaj1HU0Tiv3P4kxjio0IS8ctZ/T07yELghcWVvkkLusqD5yELgu5MfLhxmPkYKWTF0pJ2tJDjaOaBGvrZPK/8Dq2/mw/VGSlVXgnqVsJPfwz/ANyK+Dp1auetCeb63Rifh9StUvSqUn6R8tieBrUv5lORZJDcnV08r6DglLxWt9bkILW3+SpDwJJr39yyRfhJm7KVN5czso+rJy8S/DBdH1MVjKlSKh+Dp6EKdSrOy1MJ8PUqfaVKij/uMXhmqmdTz/8A0VPDr69Ds76xLygKveOu5CSzK+xjJYaEPuXKbl7Wsdtr4b5OiIyqThaN8u5KnWq1oyp07JR1zPcp4RadpUv7RQsPCE7xoq76yMkreNtL9iUoKWizMVV/i8JdLy7mW8lc+Mzz/E67/ut3kREIQuLKvySEIXFlQfOQhd6Y+XDjIfJ+H1VUwlGpDVSirlSKlJuHToOvOk/b0Z2tOtJQ0zej/wDJm7OVoVpQ/wB2qFia1tYwqr1ifacPL+ZTlF/ufcSf3VdL9bDoZ4vPaat6JlT4fS/9pf8AS7DwC6OpH9EyrgprarH9U0PB4peXLJe0ieGxS3ozI0at/wCXJfVDi4vW5GMpFWE6OEs6VlfVtHw+VGpWSryyL6GNpxo0oUIqlO340tRVIRclNZo62XoxVYZtmoDmpS8DvEqVJxcdPL/krffLyvNfofZq+6pT/Y+xYqS1pWXu7Efh9RPWVOP63IfDH1nJ/wC2JHBwyeOEpOKss0loUsJFbRgvpG4qS/E429LijClJSbu/YzK/3cGxYmFNvtHFey1ZOd43hB/9bsZ/zyv/AGx0Qs0vZexh4fsYipGnTnL8MVe5Wn2lWc3+J378eC4LjIq/JIQu4yY+chd+Y+XHjMfJ/hevbA5X0k0QbhXksukipCMot1NEupVwsoVXOm81tdNxzrUJeKXvqfa6VT+bCz9Ynbfd/c1c79J6ksRZ/fYX9YMVfDPVSqUn9P8AwU60/wDk42EvZy/8n2jFRj4qVOf9yQ8db+Zhh1qcrSnhqtvpcvh3sqsf+hkZYfpiLfW4pUn/AM2D/wCo8FrLs7fVHYqq9VFv9COGj+RfsiphYq14ZriwkH/yl+x9kgtOzVv9pGjSX4Y/4MsXZLJf2aPDB2nKCf1KlSlBrPPdX0TPtVH+5/oOvFfhd/8AcTnJRTUFKT+oq8kvHkj+xHExnNU1UzSlorIqucJZezd16s7WbvfLf2RdtKU5+JdEUqaWsVa/UrXlotkKn49foUo3snovUzZG1F3TPjlfLgJJfi5CFwQuLKvyaF3GTHzlyJj5ceMx8n+HZtutSXVZkdr9y9fvP/shVjXhllu+hW8NCCVnlZjJwyrt75L2zehiqLjU8K8L2e9xU2vFJaJ2IVqtPaTKmIVvvIRb9hypPpJGn/LqWZQx2VeLPe28an/kljqztmle3rG5Sx9SGqhT/wAoo1oVpqDpRj75zsNNadT9JJjlQjPTtFb2R9njrJy/wToxX45L/pLU4v8Any/+JW+98XaOy9FoWhFayqS+kSWIw2kfvE1v4dztKFKp4HNyj1TQ8RTbbyNv3kUqfaYdVuyhl/VtFS+T7qMb+1Iy15zjHPNX3dkrEKXZKSc88X/7hV+zeH+XFr8vUp5F4rX+iHVgmk+voUKM29SrSSVkTzKNqXmb29ijQf4lkOzS0iR2f/Yr1bTyo+NVs8fa/IQuCFxZU+TQu4yY+cuC70x8uPGQ+T/DmvxKKvvF2Kngg9dPYctFK9/cjXdl2vUrwhXpvqYTDqOamnLXYrx+8cZ09fWJOjpmW22pVw1Vayg1cp4aVSajsfZYQ0q1dfRIjh6FnaTv/cdnGNulynFZLKckvYjT/vv9UPbS37FGjnerX7HZuEvN/gqSu/ETTyZuz8PqKSs9CNdRWlyrUhu6ab+pHERvbs4IVR/hUf2PtFanHqlIpYuDovPTTa/LoyfZSnr20f0uVNdNbdGyTS6NspV5q1tvQVpzU9mYWfoStGLvq30NO0ivx76Fapmk/UVSz/8AonVUUYqfhb6vY+IO9a3RLkIXBC4sqfJoXcZMfOXBd6Y+XHjIfJoT7OrGeujvoSlCpTi7OzV1cw77OalFeFOxKd23Zbkpyj5LEcVLOs5nhe8TsXmzwlre5OpVeJnPERVRTVmYPJGFeN2qktE36DpzUvFf9Sr2TcFG0NPEyVdpLVtJZVcpVM2WMbae243JdSjUn6FOtZiqZmNJ73/YnKWq1ymRs7GoujsU6faStmS+pUwyhNXmpJ7ZSn4bJeUwc5VqMo7RivCvccKik3JR/QnVzUVBrK/xW6jw7k9Hclh7bFOhIjRk8sdLLqUJpRtHUrVW5NLT3IOMW31KtbohV9dSVTNqVZ52Yt3xE+SuC7tT5NC7jJj5y4LvTHy4i4SHysN4sFh/emh0pSmnCVrFd5FBZbb3fqypLUUlkk+rO0shVXE7dkK0b+KN0T7OX4pI+yKXlqIfw+bTV7iwThumSoyV9BQaafoU9fMdgmvC7MlSdkmdm7WuQTXsVI53q27e44xOzj6CXsR8FhSqO9rshTqTV3HT6EKb6yjH9Tsoq+TxfUWWK2SZOcW7t7Eq9vKVa7X1E3l/yVJ+4pXdyc/Afhb9h8ld+p8mhdxkx85cF3pD5cRcJD5XwOangpQe8ZF32vl/8FVJtu7zN7Fb1WqvYvZtWsTby3voJ+JJ6JjeV7irHbCqkKvofaHZLO9BYqS3f7ixDlu0/wBCLjbZI8Nth29P8ij6jp+h2K9zsKf9wo01/wAuP7mWH5YotTvczxR2qsdrGOyQ8USxLfUdT3HU09xVLyWbWJOu8zUopX9CTu76HluhlWWSjJ+3KQu9U+TXekPnLgu9MfLQuDHyv4cy9nX6u6/YctyVnNqonl9iafqS8ak3uSh49B36kWpbux+LXYb9NhN2M7R2jO0ZGoynXO3IVRTM9jtR1R1h1x1x1h1TtDOORGTasi/hIz0sTu9WaJERamO0ofrykLvVPmGSHzlyJEuWhcGPlfw7KKxzUvxQaRUiirLLDwq6/wDoqRajG/8A+hU04O7eZ+Uq/wAyWTykpLqXvFRfl3JR1NbmoxMhIQmQkRkhVCVY7U7QdQcxyLlzMa622EKdn4SCUp2m9CnRvUk6Tso9RtrS1z6svf8AUifEPwLlIXen8ou7IfOXIkPloXBj5XwqoqePouW17FTfL1Jw8W+noS2tLQy6qKevuNtX/Ymr+hl9x6X6+5czly4hSLkWKZnHIzGccjMZi4tdySV/CRbVz2I6ambTbUUrfQcs3iVkl0LacImNf379uWu9P5mQ+cuRIfLQuDHysP8Azoa28SKqs8yZUfQq6tty12uSWZ6Iyx8aaWb19CcXFJ6+9yKeR1GrxWm5fY6jSMo4lmal2ZmZ2ZmZmXfHqLhJlyK+6Ut2+hSmqd8yumR8TZVyKCUfN1ZOEJU6WR3lbZC1kdeEDESz1pPmLuz+ZkPnLkSHy0Lgx8vAz7bBUJbvKVLQfv0ZXV3veT1fsZv0Kuj/ALmTlfSQnZSt6alhpjuXMxmLlzMZi5mMxmLiuK/Cx6F/QtpuRvsOK0UdTxQzK7S6mz0Fo3a5EWqHvzF3Z/MyHzlyJD5aFwY+X8Ff/wCJpOOjV9SopWzFRXaaauVEo5rS8aZU82zKvibbV2zKO8XsXLri0jKjKjKWLFuK4XsXFccbP1L/ALj8Ykksv4vUpVMk7uKk+g5uUn7ijqfhNyvLJQl9Oau7P5Nd5j5y4LvSHzFwY+X/AAxJunXh+FNMqdV//kSyxhldruW5NeKVlox+UnHw6Du3fr6En1JdBosOLLM1NTU1NTU1NSKd9TL1LGlhSsrEbvYpq71Ntj+5sWVauz0Grbf4FZL34RMY7Yb66cxd6fzLH8gu9IfOY+X/AAxVaxNSl0nG/wCxU12Tv1KiuVE4Kz09SUU3l29yo5WR11JJEolma+hczFy5cuXLmYzGa6ItmokWG7bEPFJdB5b2jJv3J5bEHTyaq7GrbkY2TuLYSPiP8uC9/kp/MsfyC70h898v+H7/APqlO3oxq1miVm/UxMu1yu2qWpO18y3H1LWd2SjvYb0G+OhZGVGUymUSMqLLjcjd7Fn1I+F9C+vCMc8t0i8GtNNLDd36id1vwifEv5kI+i5q7svmWP5aQ/msHOVPE0pQ8ykiotfoT0u0brTRlTwwaVt9SqtConBRd083T0HfYjvrwaRYa1JJmpqamvDU1MokbF7FxalkX8J18I45VqWb2LHQgtDHO+IftpzV3ZfMsfy0h/NU5OE4zW8XcpydajCtl1cVJxJW3IwU6r8VtL3JWV81mOGm5PR7kiaVlpuZdNDVMuzMNmhmLly5cuJmokKOj1L2LlmKJvLQy+Kx+3BIiYh5q837/JS+ZY/kV3ZD+bwFf7V8PpTXh8OX9h6rUtZlWNrprfYnG1itpLbYklbhcftwVh2GkWLFixbguF+FiVsysrE26lmOXQuklrr1JSNdUJWQiOiHv8lL5lj+WkP5v+G3KXw2Se0Z6FayivUqepOzlfcnu9Cpedxxsuth7DsO1vcymUaZqampqampYsJFjqLVml0Nuxa26MvsZesVYcv3PMIrvLh6j9vk38yx/LSH83/C9fNQq4e2zzXJxvdMnrvudn5tehO3XYlomyTujLqNDTizUuZi5czF+Fxbl+Gpt+vBlPyts9zNpY3FsJFjHWWFf6fJv5lj+WY/m/4aqOPxHItpxaZpG9yavdkrxul13K1Nxevm9DZq6tErbtbR3Gmn4SV0r20HLMX4NDSLIyljKWELuWGRi0JadT8OxeyLcEj4m/u4R9/k38yx/LMfzfwOpk+J0f7nlN1ZlTpk3PC5/eIkpOT11ROzsvQqxRU0RurdCaQ7FizLM1NTU1LMSLCXdS14at6kV+zJDfQWh8Uf3kF7fJv5lj+WY/m8LN0sRTnHzRkVNlY6/wCCcdX/AJMRFUpRyO+l2VLMrRcVHN6X0JPQy+xJN9SzTsy+hcuXL9y5fhY2EJcFpsI3tYy+o9ddCx8Rf/FSXp8m/mn8sx/Np2ZTl2lCnNbSimNdWyX+TVKWif8A9E4+K5OV/DFakorYei634bu/XiyxZFiwu7bgnwtqJDVpDZYSMZLNiaj9/k380/lmP5z4DVlV+E0ZS3XhKg9Wruxmyvw72sV6apT0lmJpX/7WKicZW6n4tyo/FclsZBoysszU1LFhIsLgkJaX4xRcX+DLaMffhF6X9CbvJv1+TfzT+WY/nP4WqOfwvK/wTaJdSaJS8eZWK1JpKX5tiUVbTcTtLxXP0RKI0yV7bDmZi5cvxXFdz0LXEI/D9OFZ9nh6j/t+UfzT+WY/nP4Pqv8A4ml00kSRJK3uTtZepVhJeYqQa8upVfaVFZW0tYqKz31J3vlJe42bvhYsi3cRuWFw2PoWMpsJssfEZZcHP30+UfzT+WY/nP4RrKGNqU3/AMyOgyUepURUm5Zcy2RWdpWjfKzcmtCX+S/UcV1HBDj6GUsWZZiRbuIuISNmWZZC34fGZWoRXrL5R/NP5Zj+c/hjL/6xRze9iY1dFRWv1H4l7+pXjZRvtuT8UiWl0S1HDcaJI14XFfjqJFhFriRYSFpcV+KR8celGP1fyj/1Bj+cwNd4bF0q0fwSuS11Jj/ySWui1KmVvZ5SUbE7toslm9Rqwy5cb4pl0XFIRsIRY/Tgti1hEVY+NyvilH8sflH80/lmP5yOjIPPTi+jQ9Sa9B3iyfUcnly9GVIa+jHFrXoSegyQ0ZTKZTKW4JkWWF0OnFIvoLU2InxWWfHVWvp8o/mn8u/nfg8nP4Vhm3d5S/Q2J7E/Loti3rsT1uS2+hIaHEaZrw1NTUsy2pERYQlYuK4kJanUjuV3etN+/wAo/mn8u/nf4Zlm+D07PZtD2GVF6ClaLNlr+g463/UmSguhZjvxuX7igJC4LUSMqFYRa3Bu0JP0Q9/lH/qL+d/hGaeBqQ6qeozdoluyXUkvCSvZ5iSvLwjuT4PbhZFuGnBcLCVxI2FdvQihaH/YiY95cFW/2/Kv/UX87/B8n22Ih+HKnwasO1vcqv0RJ+HUeuj2JK0vYmrMkSSuSiOJkMvuZTKWFwXBXIr1E9T6CXBHxmWXAterXyr5Niz9Cz9DK/QysysysysysymUymUymUsWMplRlXyr+d/hao4fFYRW000+DHqTTvqSScScX6jfiJq6JQ09xoaZr6F2ampqWZYyiXqacLO5YuLcR7nxy7pU4r1Oyn6HYz9DsZHYyOxl7HYP1R2D9TsPc7H3Ox9zsfc7Fep2S9WdlH3OzidnEyRMkfQyR9DKvQyr0Mq9Cy9Cy9P9NfyViz9DK/RmWXozs5flZ2c/ys7Kf5TsZ+h2M/Q7GZ2EvY7CXsfBIul8Uw8tPNbgx+xJ3JxvqiW2pK1vcyb6jvYbMxJmZFy/C5cT4WfU24W9RJW4JcPir+9gvb/V7FmWZlZlZkZkZkZkZkMhkMnuZPc7P3OyXqdkvc7KPudlE7KJ2UTs4+h2cfQyR9DJH0MsfRGVeiLL0LL5ChN0q9Oa3jJMvdDGT3KidiTto3cauipfRFx2HFDiOnqZTIKCMplLGhfh+hYS01Fx+Iu+J+i/qTDz7XD06i6xuSL2OpL3HYn5tBz/AH6jSJIlB9GWkjxCuK5qJlyzLepoR04XFctrxxbvian1/o7Kzs2dkzsjsvc7P3Oz9zs/c7NnZsyMyss/Qs/Qs+R8Is/huHy/lHwfqSJx100J7j2Jx0JJ+p4iV/QzGYzCYhIyluDZl9xLhayFwqfzJfX+hrmZF+CQkJCXIuXL8FwuXRdGnoWi+hkR2Z2b9TIz+H9PhyX9zGS2JMnruSVupImtCVx6DkZrjaLo0NC5cQlct78Li7k3lg5PoN3bf9COZnfBcEIQmJl+5YcBwHBluCkIXGxYylu5/DknkrLomPbg1oSJIlbKS0GMkZTszIhRMqQlxUjVi3NuFrC34YmWXDVH7f0HJ2G+K4rgu4mJlztFHceIXoLEr8pGrCRZMdNDpHZluGiJVEims/UlBx3XGxY/h+plrTpP8Wq4y9hvQa0JKxNa6E3oS1Gh3NTUuxXNRIsIvxvfuY9/8M1/QWbKOV+7FrjcUjMXMxfhTjmJOaflJZn1LNdRSqR8SsU3NU3OWx9oifaIixET7RAhWhKVitTp5Y5Xdsq+HqYebijDw7exi6P2edn1NDQynwmKWPj9Hw3GO1iUfQY30JNcJWG0XRmRdF0Zi4ri9+NhbcHw+JP7uK9/6B6Nl+DXdUjMXLlxQlbU2MxefqRrSgnrqVMTmitDtWdpco1su5KvOdPIvKRpmSJGlF7HZxHSss0dyVeSe7Mzl1Iy6Hw3FqnBZ9j4ti/tKSjo0LtF1KcnfXUlOS8v7FPFzpzUsrTRRnnowl+ZXHwn7Etj1ZIkSRYcTKjKZTKKJYtwW/G3cnKOZ54pnZ4aW8EiWDoy8smh/DvyVV+o/h1ZbZWSwleO9NkoTjvCS/T/AFulHtFKK337jTXesZWUUo1M09kfaqbTurE6kZS0GyM7E9diFK+5Kil1JU2ikrzSewnDWzM1y7IyknoUXKSdtxSfUq06bts7jwl1929fRklKErSVmKrJFNym/clDwXuilLJInVy1b7GGy1qWtrswfiwlP2XCS1JaD1JIaaJXSJPUf04ampqXZdmpG5ZiWojqPg+FRp1JfXipMjKQqrO09UOFGXmpolg8LL8Nh/DMO/LUkmT+FS/BVT+pL4dXXSL/AFJYWvHelIcZR3i1+n+qJ2d1uKnTxf8ALtTrW2e0ipRnTdqkXFmUbNOFuGHourLTYq0409Blx6l7F+FOglQTfUlHKORF+pKlr4GbCkxTaIz0FVywyrQ7X3FMp4pqFupipLFuFl4up9j9XYp4d08M6inqSqvtGdoypOT3Ph9WpspWSPgtXPhsrfiiyRfXUmPY110L+qJD31GNly5c0LiaLiYri4bDehuTkoRu+hKTzGHXaQWh2ROHoVKkszjNtR6WJVKkZaSZhMVN+fxIWsbosydSFPzySHj6K6y/YpYmnU8s9fRiuaPdIrzwqv8Adqf0RWdJ+Wjl/Uo4enWjeLa9StTVOeVlGlKs7U7SfoToVo+alP8AY230/wBPWKqZFCbzwXSQqkHL8q9yrg5eKdFqrTXWI01v3MPV7KBOa803dszX4MfCzKdWUFZ3HVbGzMyhmb0JUerY6aGrEKcpbH2aK80iVFfhZZp6lKi/NLYpuKispB6peZEcT9nrz0zR6IVddu5umpX6CUXeWT9CWGVRxt4ZE6FSg9dvVH8MVJz+ITTf/LGSjcldDkSZMlG70JR3MvuNGUyIymUyliPCIuF/Qt68PiNTJQv7kq12fDsXGMPHovUeJg8HOvT1SMNjozpWdrnxDFdpU8GhKepg5xvZsoySlGHqVE75Y7mNjke+qJsTTylDETpQj23kfX0MbWSg4Z1F2Oynlf3srv8ACiWFa3k79TCQqKb7OplS1ZUg53lOp42yCnSnFxn1KE+0oxm+qKsYSXihFlf4fRn5Fl+hUw2R+ccLdU/9OjJxd07CxzlpiKcKy91r+41g6q8EpUZektUTw01fLaa9Yu5ZxeqsZh8Lm5kXqQwslSz2JZl7GbOnfzE6fgUvUatwhNx0FOTOoorOs+xUlSVLwtWJ1LvQUinK9SOfVGKrQ0V1+hGovWxCrZoxTzVND4bJRqNytt1JqnCk4QaT6j8D9yFVNH8O5KfxTwvSUWS3uMexUimT0j7mZ63RnTGxjQ0WLM1L8cyRm9iN2hRXHfY+NytShH1ZTjDL4peIwvZytB/p9StehhalOGsWthScSjTniKlk7e7IwhCraXiL07eEWeNSFVS1jsVfiNTte0l4YtW0K+Mzu5Tk3olcUJpbmIqyeFjTivqSqSlh4zesovKQxU4u6eo8TNq2rO2qLo0Os2jNeSuzC/EcNNRhCVraak6kUt0VcWrWiV61ydQ7R3I1PXUunt/pydtiGMqxjlupR9JK5OvSqeehGP8AsdhQw89qsof74n2OUv5c6c/pIqYatT81Ka/Tgnqfa7U0mV6zmXM42YbD534nYlShGPg/UWkXcchTf1H4tkZJeg047oTWX34xbNIva4tdvCVbxqZtHYqVc+vU7T0MJiXQxMKq/CylPtKSlF6MkrR0FqMkP0JRTJUxxl6ks5mn6GaXoZp+heZ4xQfqKArJiL8ELXYvY+J/fV0k/KU8NmvZ6o+yS3jJX9BucXluxU7y8Tyr1ITyRyxZHV6scfRlOW3UVNVaThuZfFYi1SjlFViuoqtOW5CcKNJwlBOmzsYp6v8AQ2XhKc0vMVMHGtR7SjpK/l9SScW1JWZHcp4lqNpakqzf/wDQ5cEmLzGq2E7r/S334V6sPJUmv1Fjan48k/8AdG59ooS/mYaP1g7H/CVI/wA2rTfurksKn/KxFGf62JYHEr/lSa/t1HCUfMmvrwoTyTvuVa7lpccmzqYTCQyZqstd8vsTlCztZL2HO71HK+44Qb9BuDjly+E7JJNv9Eb7FNxVJJxzSbJxkruzRIo4fX7x2MtGne6WgqkX+GJ8G+JKCjRq6R/CztFJaE0rabkpSi9UZ09iQ730LkpWO0HNHaIzozGYz66CEixsZr7alvUv4UY/FKjBpPxsdVim4mHq55+N9DGXdr2v7GFak+zn1JrLOS9y5mfqRk/UpVJxkssmmSyVMOoNpVHK+YlSn9RUpHZ7X0IUZVKS8ekdkVITjdszF9jCztO+0TH01WpOrH+ZHze4i5fjZsStwpTyVE/3JJKTtt0/1aM5Qfgk4/RkfiGJVr1XJLpLU+2xl/Nw1GX0Vhzwc/8Al1Kf+2Vx0qD8lf8A+UbCws5eSVOX0kTwleHmpTt62J1Xazv9C7LmczsovPK0nYlGnrZmenrpcjXhGPv/ANirXbW5RUqlXwRuyUM0L1ehkhG+l/dkMunhT9iSpvy6Hw34j2MlSrSvHoyrjqVKPjlr6IrfG2m+zor6tkvitRu+SCKPxNTdp+H6nanaxb3Kk1lvv9DEVqua1sg83WVyMpRfhbKNXNpLRkDQTQpIzpHaMq1ow1qSJ/E5aKjBRXuPFVpO+e36FOvUyfhcjFKoq8u28w4SUb209eEXbYUtdWJU5K15XKWDVam7Wv8A5MVQdGs4b8ImZI7W61WqO1kU6tncjUi5211Z2+RtaoWKjPWVs303J0YSfhkkTpVKavYjWcVoKtPLNX8wkNcEl1NOiLlzOK89Etyoss3FO9tPl7/KP5GnXq0/JUlH6Mj8Rr/ikp/74pn2ujL+bhKT/wBl4jeEl0qwf7nYUZeTEx/6k0LA1Zfy3Tn9JolhMRDV0pmZp+JfuPjTccPTUb6vWVivjJz06Gb1M45swGH7ZuU/KjEqnSUc+z3Jz0N/1GrGExMqTy38IpxqIw9bD0ack5LO9zEzzSeVPL78I3vodnOV9dilKTum9UVcRl0i7sVap6lHFTjq1Fk8Sp007WZKsVKnaSbZT1ItqolLYwsnGUo30Z8VSr4PNZKVLr7CxFRQyqXh24piZh8T2dtXdbEqkq7tVlpf0OxoONqsLJ/ivdx9zEUXQrOEnf3XUo0adROyd7aak6SUsuaz/uI4eTfr9CUbOxFNvQlByivzdTYptkKuVWvex2cZNsnhZqLnDxRW9iFmr9y5uZJWvYguvQhB4Wj9oqLLOS+5j/8AyMzFL5e5f5Cxbjb5S5GtUj5ZyX6kcdX6zzf7lceJpyXjw1L6rQvhpfgqQ+juKlQl5cRZ/wB0T7HUf8upTqfSZLCV470p/sNW3044eo4xWV2sVajk80nmk/UTu9TZkpXXCjRrKlny/oOpKnJ+Kz6o/mN3kShLoQnllqfaWl4d/UjUahN9WUaDlSlPouCZhJ05WVTWJ8RpdhVtF5oyV1whOxmvqRm1K6Yr4zLG+r0MXg54WaVRaPZmTQZGPqWsZvFfqU5+b1fQwuIpwTzXu+h8RdGUKfZ3U9bowblGd47dT4o4VI0qsd5bkJyjsztnmcrK73KVm7rclW7KrKKSy+hUaqTclHKvQjEtbQitN9TCp3jlX1PidFUqqlBWjPp7l7DlqZX+J2MoiF1Bx9RVaVDVxVapbT8sSdSVSWabbfFMUvmLly5fnW4WLFi3y8K9WHkqTX0YsdX/ABSz/wC5XPtUZP7zD0n9NBywk15KlN+zudlRf8vEpf742HhJ38Eqc/8AbIlRqw81OS/Qb4YGKddN7IxuKjGChGWq/L6lSeZtkZFOauYuUakFLTN6o3LO3sQnbTZE2n5SN7iq9n1O0zVHJ9SFHtZrMml62KlGdObTT+psXMNX7OSyq/sLEdph5U6klKPTMQnHO7bdLkk5UXkV310GhizW9j8Pld/UVa0NfMKlUrXm/wDJg+yh5lJSWrdz4h2VXLkt2nVrYhRhezn/AIJ4WeXNB5kXa4XFIUrO52idrRsyniclt0r9DFVVU3evsX9jWRH3ProdpFbakqkn30/nL/J2LFi3KjBy2FR0uYah20nC/j6L1JQs+Wqs1tOX7n2idtbP6o7WL81OP6FOdOL0UkSyz/HY7J9HF/qOEo7xL2JSuUmhJSRVjlegiEZy8qZLD5aanNlPCPKpvwp7C8KjlbQ6soJRau79DEZcRO+TL7lXDZIZ088epCUF5VqWk14VYlRkvQhUlT0KlXOUclld63OyWbfT3IQjl3TRiHTjP7tXISi/xfuYjK4rK9diFLQUbbb+haVR+i6pdTFYVTw7nH+ZHUwsdPLcxNG0rwWnC5cuUo31uKjNvVGXJ5miVT8o9d/9HuXLl/k7FixYt3PhVOnUwsoSllk2VMNVoyUZRzQ/t1K9oVE6b8S9Cv2c4QrQ0v5o+jJ/IKUls2drL6mdP8CLw90KpFbNkvF1RkkugnJPqUJ/aMVDtvKtDGV6V/OnFdETxXoinWzaS09yOV26opOCi9nDWyXoStCTsQzTfhOwvHxSJ4V2vGX7lSlOn542EZhTJyzFzO31FKx2mphaq6/uTrRhSdm3Ha3oQqZdiVSUnoKlUltCRHB1X6L6s+xwXnrwEsHSvmlKq/bYeNS0pUYxJV6kt5f6zbm2MphKjhePqPGVo3UKsvdnatyvKzM7G78Ywcnoh0rdUKnd2UkOk17jTW/PuZn6kasou63HWzeZF4vozwerE/SoOU3+NFCjKrVjD1Oyp0qcVTsycry+pSbzNP8AQp5KnglZrrc+I4X7PUThfsp+Us/QyS9GdnP8rOyn6HZv1X7mRdZxMsPz/wCCEqcOsx1qf5G/1O3ivLRh+up9qqdMq+iHXqP8bM0vV/0ZYkQhKeyI0pyzWXl39h0penFww1RScZ9LKMipTioKyWYyp7je2hOq8ji/l8DUVKq31tofar1czn4Y7InXcrPqdrZrYw9anGWbf1MXafwyfizOGqkdpP8AMzPL1Zf5Rf0FFeAwuH7ZVZvamrlltqijP7NiHmWeD0ZXo9m1KLzQlqpFWKkr9Sw5O3DM/Uzv1NWWLc2nRlMdAdMa7q0N+GYjNq6KmJfYOn695JsVKT6EouO/9I034bHwqt9nlN2T9bmIqUJO8XZ72kVskp27TP7irKFCEJq8M3QrSstORfhl9ixlMoouTSSu2Rwckrz/AGOzgvwoyR/KTo+g9DB0e2rWey1ZPslG2mm5V2TtZdL7lrlSPCFGUld6I+z5bXROCHHuJCpSfQlFx3XcpQuRp230+pDxJ5Ftpc+zqcWrZpGIoyoVMsv6QgdpkehWead+nC5cvwsZTKWLGFwcqyzPSH/clQ7PZaep1JQUlsSTi7Ph8NtTn2rt6amLxEc1ofrfQVW7FJGmUrWzlGWXMdvK1lZIdR33FU9SpUXTUw1LPK76FZQUdbKNiVZaJJl7vqdk97aFWOVmHw7nHP02JU1HSQ6Eb6f9yNOcX4JfuZpJPtIeH2K0E/FSTy9fbgjDTST08Q6mdalOVo6blHw7HxnxRjLrz7f0EldMcdRxfBIt3UhQzSS9SFWlToRhFfoYrEK7t/gz6mGsnruY1xdTw8FUtGw5t3LkZeo6zsN68KdKVS19L/5IUY/r7icErOP+CXZW8VPX2FRaV6L/AOljqvZ/sdo7kJq+u5OplVkVJ5ihiHCnlHiV1hdka8fRirQ21IzVSPZyllj7dTEzo0cK6dLWclaT43MxCeupSrvXa/uYurn8KdyxYsWLFu9YSLDH/QNDqiqteKjqZSwkZTIKJs7olW0JSZcVd23M+pcsOJbhYtwjVo2zT8LSskdpG3Q7VJme5QpuSzZkrGMs6maPXghvupilYnLN3s0mZdO/YsZTL/Q8GS4pegoQtrURmhGVmjRxTUdD7vLrdS9i0empYktBwsxwMrLFu9YsWJcFKxCpZW6Dr6D1MpSo5tXpHYcaUYRyrxfuRjmjfITpxy3cbI+zKSvTkiScXZ6PjYtxsWIxGrIs3srkaLe7sLC3T8SuVcPUpq7jePquFy/9FJl+NOrGGk43TFUpfr6nbR20Iyvs0hWl+JepUVGFG2vavYsMqxGuNi3ORRq03hVSn4ZJ6SE4U4VPFFvplFaydyTT66ioU8R2abVOyvKXVnxLI8W8l7WW5lLFu6hD8clFEMLGlSj7k2lIU1boUa9vAne72PiXw5LDLE0P+uPcuZi/9BLDyt4tDsY+59mi14W19SpTlTfi7stVxuUoOUcx03szx7rcjOS/mQaFKD82hUjommmmW5tjKWLcL6cLsUvcjWaQ5Z5XZYtyIO0r9SWKnaw6l+p2tyjU106amDqxUJRkvBJFRKM5JbJ965cv/r2FlGnLMypiW/TKiFZXM6f0IUlXTj0K9N0qsoPp3W+MKkoO8ND7TdeOKZ9oXoz7WvQdaM4tPr1K3YqGWjHS+73+SjFzlaJ9myrxLUjTjtkiPCUqi/I7boxGGqUH4vL6mvLdxvhcjL3Fip5MkP3G/wChlK2w5Cm1sQqbmDq5XeP1PiM1OvfrbuS4UqLmr7IVCC3uRwcJLSTMRhZ0tfNH1XGN3sR29/ksLUVH8N5MrYm981rkavsUpXdihQhiaU4S1TMRQ7GvOm/wscSxbkJGUyI7NHZkVbodSxb+h09RVJLy6d1lGKctdjPFx8KViVVXIzTe5Rk5NRXl2PiWG7CpePklwi2hO64X59yUhy00YpMp1MrXsYPEpXUfqjG1VUxMmh8pcbcL/wBE2LCRLup6GZrrqZ3e8ncUovf/AAYB/ewTekup8TyTwT9SxYj8k0WfBXIym1ZOxlyvhf8App91l+NOrljFejuVsW508keFhfJWLcMqIRSJast/UDLFixYUS3yi7l+bCLnsSw8lG61tuPCyjGLk/NsTpuG+39JPur/RVqydF00vQoSd5Q2zKxTl9xkcvFF7G8bb3MTSdCrlf1/pVIX+jfbXCGV6xJYu8vBHKjt8rm9Hc+H4qCaco3kjH1u2xGb+u2x68U+z2FMT/rt8UW43/rl8UiS5OV+hZrdf1quRTi5vQ7HIuClZ6joKorw0ZJOLs9/67oz7OJUr5jP7ma/Uw9a0kY+Gemqi3/rty0L8EyEtSWI+4yfLf//EACsQAQACAgEEAgICAgIDAQAAAAEAESExECAwQVFhcUCBkaFQscHR4fDxYP/aAAgBAQABPyHtg5IQ5b903NewHA5lUfA48c48NIsM3ixeRly+BHFHNXRSjxHlNkei4seI46/Lo9k3Td3d+wtpN02d44HByQ5b94+vYDgcV2J5w1Z5TfgxYoseCHSA6NrNnC9DLi8TkexJ2cTd3duddO0m6b/wA4OSHLb8YxEIdmnfB1NY9x5YseRZfB0n48hgmk2TZHoY8zXYjHRt03dohxt17E1gzgz/AAAhDkhxpN+6Z2SIQ6LhFweOdx1NJ5TZHrCHQPDpbSaM38PDGPG8NdD49SGbpvmztnG3Y2azZN8e6cCEOSHGk27pnZIhDpV9SvE1mNzdHh4PJwOV9BJpNWbI8MYx42mnLaePA9O1Ztm7tnQePTxNZumyPdOBCEOTlt3XXBv1kIc+nQXH0es1Zsjw9IcDoCi56TRmzlj0bTXtgerxNvbODh4dMHDdNneOQ7DbuucW/YIcmnRX0LxNZozZHrDgdWFCKLDNvDGPQbmvbLxh4m3tnByropNJshyj3TkIdWk27J0Mms36yEOXXlUfSN01Zvj2Qcu/Kpc0mjNvDGPQbmvSDPDg+W7ibe2cE253zkZsm6PdOJCHVpNuydDODbrOByvEfYN0mrN8eHg8kIc23FcSazVm/hj0m5rDkfWfV4G3tnBHkj4rlIzdN2O+6cSEOrWbdk6CcG3YIdR9upNZozfyxjwQhDoL4LhrNHhYx6TicH2QrVm/tnBNutJ1N0OWO+6cSEODo1m/dE4tuwdZVF0zWeU2x5Y8kOybazR4GMekmkOm3zHGs1Zv7ZztPDr1uh3Nu6cSHW0m/ZOiHFt2DpDi6RUOLRm2PWEIdg4sTRm+MY9Jvic74noniaM1jf2znbrq8TZD3kcSHQOdJv2Tp4xvHrOpT1KJunnwPLHg4IdhtpNHjYx6SaQ5FqOPoPiaM1Zvj2jrRdJGNndOJCEODnSb9k6kt+wQh0V9XiazRm7l4PJCHLr09pNHheD0nQ7cq6SMTdNvbOCb9dnibp5zd3TmIQ4IcazfsnV1v2CEOVR8V0I1NZo8TwxjyQh1vk0mjwPJ6DgdqF3TZNvbO3+2Tym3unMQhwc6TfsnUVv2Dg7VwNTSaPExjGMeCEOt8mk0eJjw9BwOgbdjIb+2Qh2sUNzd3TiQhCHRrN+ydRW/YIQ7c5aTV4GMYx5IQ5Neik0mrxMeocDoO3SRNk3Tb2zg59OhnMNzZ3TiQhwdGs3j2Cb9ItuwQ7epJrNXiYx4PJCHJr0Mms0eJj1DpHhNuJ5b4Dhm/tnBy6ddR3N/dOJCEIQ517Qm3SDfsEO2nyazR4nhj0kOgvnJrNWb4x4eg4EObfpC5pBlN/dOyq2TRmzunMQhCHOvanWpesh2HXyk1mrxsYxj0nHWPoAzWas3xjw9Qhx8YIOchNZsm7tnO3UAeTR70dEIQ6NOD2DrGvWQ7Fbi4E0m7nMYx4OCHX+MWJqzbGPD1DkdTx4jmOab+2Qh1uHIcPeTohDp04PYO9VIcbdC06gazVm2PDwY8kOjDHRtZ5TbGPD1CHHxhghyHNt/bOd45p1VrDlD3R0wdOnF7B09p2ZDjbtEbWbuB4Yx6CHRBjgYJrNGbIxjHsTeDUHEeQ5hs7ZwcyxNOlazd3o5jgdLxewdPOu1ON+fw65nibpujwxjyQh2LWsGHhYx65w26OcSE0myb+2c7zxh11ZpNn4PEIdLxe7zrtTjfiouvjWaM3Rjwx6CHY4azR42PYHDaLXKb4HJumztnO3Dx6SJpNn4NHWPF7B0864PYON+RdZ2k0eJ4YsY8kOvgY8RYZsjHsSEeYtcS4DB40m+be2cE34LBFyHGs2fg8ch1L2DoxHXaEO2Y2k1Zsjwxj0EOXw4uKXHiavIexITaKPrg3TbHtHBN+Cx0Q41m6D8DHIQ6d7B0cjrtTpO8UXSes2cDyx6CHKtRRcCazVm6MexITebdAIcaTbNvdJvFqLHTxx3fgkQ4EOme4Sadycqz1q6TZN0Y8Megh2K9Zq8x7Ehx36GQ40m6bO6cVmPpoms3fg0QhDqnuEmnF7RyvPMo4+bdNmPDGPQQ7Bek1Zu4PYkOO08echzbJs/FZE0mybv4UEOqe4SOu5ORZjii6PpN03YxjHpIchg5CaTRmzg9iQ4bdNITWbpsj3DsOCazZBl/AiEOR0T3CTTuTl26kKLE1Z59B6TtPdGbuD0PRIcduGnMhxbuJ7JyQ53HHwJpN08vwI4HAh0D3CR13BHw34Liud1NWefB4Y9B1kOHFh5jHrkObx6EhxbuB7hDrOJrNk8o/gYh1p7hJp3J2Bp4+IcM85tGMY9BCE24lFDnqzaMY9W0OgeMeIoQ5t3E9wh1uE1mjPOP4EIdbe6WncnLtNegrj4mrPObdB6CHQnFFz8+BjHrHINTwij4HNu43uHYCDNY8M8o/gYhCHSvdJ1xfxLLeJsnlNuWPQQ6GuY4+U3RjGPZFcFyHGk297IdSCDHiaTzjvvpwOB0r3CTTi/hUVHPE1Z5Tblj0kOqZx85uj3QHBwIc23u5CHNryEJpNJ5TbvpwIQ6Z7hI64v4YG54mrPKb9B7jJwG+B5PZAzDnUIcG7uxwczj4EuKazzm3fTgQhCPK90HXd7dkVNTSeU3jwx6CHKOiHDz4mbdwTmh0jSbuB7Z2HznpPObd9OBCHTvdB1xe3t00ujk2Tym/LHoOoXwOHlxPJ7Q/CePSNJs7qQhxUfIQ4aTy/CgIcseO8ZHXF7vpHF02cXlN3QexuEXDxw8uZjHsF54rUUXEhNJu7ucHFRxxQhz+U3fhAOpe4yOvxOpxw4vKbuGMek5VFwcJrPLiY9obcfGOPgMOLd386oHQec2fhIIcVDwe6zrvT7D84PKbI9sLpLWeXEx4esOhKLiMIsTZwPdOhLgPLSec2d05jgQh0D3Qdd6fWxpxpPObOGPbMwQmk8uBjw9J2QMhNZt7qcE2ii4kGEeHlN3dOY4EIdA9wkdcXumsUcfBRS5rNWbuGPUQiiijigzSeU2Yx6zshxxrNvdzoqPgQhF4efeTohwIdE9wkdcXvt4cz4nBozdGMeohxUwcxNZ5cDHsh2Qms2/iREOF59vdOiHAh0D2TlI64vdXw8eTfiTWaM28MeohzHlJpPKbOD3Q9eiE0m2b/wRxQYMuLNOG7unMQhCHQPZOUj+BanhFHzk0nlNsY9g6siFias3cXrOo+nHSDxpN02fhJxQlxZrNO9nSBwOgeycpHXdnTb6GTSaM28MextHFyiaTRmzwes4HT20fAZpNkGUfw3HDNZp3s6cIdM9k6E67s595p1Q0mjN/DHqONudcmsW5vGPWcDio+kiOpum73DsQOdZr3k6QIdO9k5yOuD2zl2iji6FpNWb48PUdCoooo48uBj1nA68VDjdNn8SR0dO9HRSEOneydCeD2zqmuLmk0mrN/DHqOgUfETSas3jHrOB10kON88vxPHDx170dAIQhDleyTbiR4PbOpCi4KaTR5XqOm25xixNGbRj1nA6K4o+hvnn39+xjXv0dIEIdG9k5SOuD32+oms1eN4es6iDiaTVm0Y9ZwOuVS5c3zz/DZQhxrNZv3TpAhDo3snQHi9s59o+Z8ms1eFjHqONuV8ms1ZtGPWQh1nkHjZPLunSXwIc9e8HIdAdA9k4nF1we2c+3S6ims1eVj3XEeJo8DHrOB0ZRcVCeJunl3zg4+JDnpN+6dIEIdE77odcXve3F86jms1eR7O/KuBNJqzaMeshw34Lrxunn3zpUhy0m/dOBzEIdE77JNuR1xfws3xcWJpwPL0nG/K4prHias3jHsjn24rkONk8++dRjlpN+6dIEOlbdkm014OuL+Chxc7xNHtR1mUeJozeMeyJvx24rmIzRnlHvHBR9MZr3pyHIQhz7dvrw8cXvB1naTTuG3TYxYms2jHh6iHO4+jHGrPOPeOhvguGazfunTBDgmnDbt9eHji95Oramk05Hs7RRRx8NOG3D2CEfHaOKKODF4vKPeOL68azf8AAyEIQhNOG/dnji95I+LjjjjqavcDfSKixPKbxj2DoVwUcUUZpPOPeOqxy1/BpCEIQmkU27s8TWbd4Ou+5q9M9Z0BxdDPbb8HmKbx9BrNWP41jNOL304EIQ5tu7PHB33k63fE07gdghtHsnRnoSgy8TWasfxvGa/gk4HA6Dbuzxxe8nWu64OLlL4ZZ/0S7XC5/wDcT/7iI7/lSjYxb0wji51NOG0eyQ6C+BdHWasfxEkI8z304EIdFt3Z44P4KN9vonlAfpMK/tG4j5P1DrcfxB3ftF2398Wf00+SKAT/AKGRYLj6lCs8TttMYJ5f4EKuOz7RDhH5Ys7P4itj39TL/aCf8IQDYfuJAKGB3mZfwHEwy31E0+8Jv2iEOswYMceUd/i5HRPfTgQhxpw27fXh44PcJ9WdUT+MQyn6bbaQ2flquW+KUiJ/E0LhtQus6lbb2b5mgEqwuXhr6wjCftqP5b9ywrNDIt8ky4P4mxL9Jti55yP6igA7DU8B/PKHcXlcPBhboKgyA0iYwPi7icGng2wtxmt0y3jPeCU1hPsqBoZfOyE7fkUxm09jFp6aDLLmlfJ/Ij1EIdRBgwmk0Y7/AAD6AQjyPfTgQhxpw27W3J4mke1l/MVgfuF/eML+Z8LIybLGz/igNr+Ckbow0uUuPwRohnmiV0CeQT1UU5aW6cBAfTMVqBKg2/UoqDLcKlr7I9Qlrf8AxxSxy2oQ7fiEKq4bizAfFkN6ML9OJCKqkGa/tQTk+y4gov0kdm5YsIpXlk/+4mNbwY5s/oy5WH/oaYfTng/8bAZHY09B0j4uLlpNWP4aOEI8j3whCHSbdvpw8cHsUpfbEP3KK4PckC1D4iOSheNP5mQmmTb+ZnTX2uJeJfafiWs/YwYVj7auBbI+Umi3aX7n7gbgfLFJNkJgBaWEXTPoS7NVLFMfMvAsPcp3Hp9RcF9ifJcMQq/UrjDwlMbEqvqB4/vOYDfYJe/kioOE/IaqZRX9ZlKE9QasTPkn+5vfxGkZ+cTCinvzMJYfAwrOGesXr+iDurKv/ViJERNnBDtMNZ5x/EQQY8zvvpCEIcOuG3bawjxeoLh/yED9/wDUHKv8Ep+U4ms2Wxqf+41afrwT0pE9fc1v3LUEkEyXzK2G/bHq+oS8HMNqEdmESRlbYZ3K7BDJCyijzHoNPtUSy1mscdTuw8jMRbJTkGYUWZ8kKqQ8ohVsUyxMbwQjMhIWyywziWhb/iWK1rzAFEPTP8yup5cpE+LlNoTeKqtD7lxV+0qvT5jIhfZ+mVPaFbH0wq3yeoPSrQx/5Y7t62BhwdlosTyjv8RJDo3f4CIQ4I8d+5HN6go+jMfeO2XtfLA1VWD/ANZl0y85QGAt0ajV+pSWrOfXmLcRspcqR8+ALvX5IgV86o8gj3UdjNoZg7NWjIk8PUGWZrImoTb/AIIBVQ2C8yrzY834lKQKvb+eOiXdpmg7TI+iGL4YHbDNjE860zOPc0ggrLMJpfbDNonp4jehpb4TCs69RRKt6pcUQljMMmFMCFmqr5jif0NS4sD68yksayt/SX4V5hge/wDQwDAfZj8jP0T5lST2JbLf6PiISg6/u/ZydbQy5rNWO/xEEI8rv8BHAhCPDftbzSHN6d7YQTqlRehDmMTXwS5lXH/cMsFvuG+sG2a5OrRvqlys9OPUJwEq5p9zUPwgYtvCoyR4yfEUlWNSPJ9Q24Y8sqehVcdVKlj1An9wdyswW2mTuStA8TLnx8FJjNmVdsBXzp9zEqQJtgeA8x9UrVnlFvKvOYp1U0K0jaxS+Vr9kv7ujABEsU/vFPwwCpQ8RumyGdBP/kh8CAbQIMyTaJZmkR49WrcaBLLuDznyUJC+FwFPMB+mGfiyP8M/9Jl4OgqKKLjWecd/iAIPQ7d9IQhwR4b9rbgc3pD/AEX3Urm8q/5jYk2y/TLTMCiLoK4H/pmHnlrK9RKfwTTVMDgeX1BCZt7MTMr0jln1csOVopcwBawLr+JcbPpWIi9RFjXlMizJ9e5TKzt5YCZJy4PiYucx2ku1H/zFkHzMI0XXIvlj4F6zEjQ3ZqaO9OFxJmijEoamIRt2KNmszIevU3BHzD1Ka30NMTQpTyQZ1fBTH7iq4uTBAtWwswvh8wZG/Ygxq/H/AJiTSiwLL8sBd0K8QTOQrY/Mpar5NxjHDYx2eDf9Q5QF0P5g6Q8RN+RRcCDFieUd/hgcCPLt30hCEOhv2tuByek9aN/UQ8ya/wBx5HO4A9RgrI4JQKDe7z5m9jWYo0MkvmM0fBMwPmumWsQzyYh7XvD4uYdquAr5gov9kpzhmostbga/ZKRLoKwksKmDb/2I4eInX9bI4rQ8TKKCRsltKoS+lKixxXqfiGAtW0zEPVby1KMVV3fuviV6ZX+x+YsqB8R3HkD7m/qW14+JWr65uH2OcSyGJR7C5/cIp7+of2IgoYDD2/MpmpxVSiLTYV0/E2egt/uDvwgTIwf7SF6FLpnzJb48S0pbKHxCrmFn2S0Hv+HgjRov+0LtSt4JvznFQZc0nlNu+dIEOg2/BQhwR1x37W00hzekgEVIz+j/ALTMZXcL7YG7x5hGZPnDMg0X8oR6QBGr9QLZx/YZQYFENT1mAADbKfiAYYYv/iVOEVev5gmkKUu5RbzFM5VisfFTwmbTNRHTn4Yeqpte5HB+pnaS/b9yiR2U5TzXqYEtlFpFIxNGkUhrb/iUzL5LDfsPJ/qN2eV/8fMID+AzAdrTLFj2FxUFHZYTeCy3pPKVFCjJHHSFtX7jzPKF+vpjYw3CKQ66Pq93DDLoX8hmve/1D64XZWI5aQV9y1i2p8JXb0YJXHwjzKKylhr0/RydHXAgwZpPKO++Q6AQ6HbunTB4Isc37W00hxrHqYUyxjqgsn+/Y/1KQsn9EYZ/4TClLVS2mHhAK9XLYxQVq1eYlZ+rk4P5mSZS8e02qzyTOUPwd6lhCs/pE9jws/mLapm38A+oYD4sVfTq5TJwH59Po+Zlpg8nwEWo34Snwbjegt4IhjTzDwfTB+onDwNij2+oQGDhK+q9RF1qUpb2PYOyAB9o/wAIybHct5Dtzv7lYod0c/qbkSlXqIeY+VlkTdZrzf8A1DHAp+5km9NofKQcSn+RQxTGYwP1BeS54X9yz8BpP+GpSxKeVkMvUmSPnrn3S1VCbX3EWeDJ8wAvFYf+v+0YcHQlHBgwYsTVjvvkOyDt+AjkcOuG/baw5vW3g7RSRmBHqfY8MyiC4w3fjZL0NC+ImidBgcrYykhV2Kv2MXSoaVuXx8LwRjeHsSn7sNO5kUV9sSEyL/wiNAOxqFFQF/XPMVrp+5g1RunzPNzsGagK6JeP+ZfhK4Q1cqvs9PiJNZBgfcq7J2+3lWf6UsMOglvoh5gcq/cYVn18TD1ntuLwqWmIFDa9+poIRtG/qU4Ho4+I8XwlHfj5lLVF4VBdC/aXLF+Uwf8AVxKJD0/2IHsHllQij8GUUA/9aiJgLz+EL1HwOChxrPKO++Q5CEOi37p0Q5EeG/aNzTuCWQyvWYjeLZLhY/DtDMRUal80x9Ap1sP2QIB57H3Hh0KHR6qZz7AWQoFD4hkBZVPEZCqKxsnxRKwxNNJ4cBWqJZMEpwR9q3Vm/gPMMDOVfl/ITLX1JX6EqGr+iDtxxpZ8eYZzfk8jX6lbJBX/ANx2E+QRi39pdwtyy9kQeGjCfF+2GoAbG0m8s6e/crmwed8rEW/9W3GHtJv+oIfjGstTek1AWUDoNzQF/LLLfC2zNd6P0doFwOHiasd98h0gdBv3ToBDgjw37R3UbmrpT9VL98qfSVcy4Fa2/A/oTL+FD+wiPt8v/UHJ+gwuSPp/5Y5PGllsXn9q4h/locTPmgM9Myn6xcbl8qiMAIPIRAAu8EcLzK1XwX6+o1N8Yw/n4jUHNpftKgID+wIEVisGWPL/AALhhiABRj+0CNkfB4mEU8YkvX+Cgb9Z/wBEvZ02f8rFUKCiBDLpP/QsE/Tr/pMLE8YNS1drDJuqs/0R/wCoR90RY0vmF/JMGw9EWYcDb6ivd18CNvS/y5OTgcDgPCxNGO++Q6AQ6HfunIcHBy37R3YTKWs/eSWRV7TzBJPA+JdCYD+yV/wewizL76k/5hcYPyn++f7i7z5B/u4f9vXP5UVgLxS/qCiUv6H6mO5T01/uUQFkaioMQn5L/UqNP6Erq9/H/meVfhllxWDyqWBiXAaL3dRBWtlr1volhQ/wipL1qJtlfjx/iIA1Qsf8zDVfpEOKT5f9IQTbwKvu40t89iXMJRZ/bKXXYkH9Sp4fGsf3BmV6Mn79TEYL7MVi238saxnQWPMso9kfUtJqA2pwj1HMRRQZceJox33yEOQh0G/dOBCEODlv2jidwcykPsJQ2KXZ6QPj/mQVLQXuvURS1hyv/kmZJqmn7RM2I+4pX0mMBTrvCWn/ACYIpUvlLhgHUdp91Fm9RWK/U83JWJkS33gQIGkuwoKyluyK0Bb+zDc/+r8wPW34UA0CAOt/coD9uf8AMqOYhUH7Zjf5w/1EYK7b54QAppL+USZOEfs/bDK/4CCXe+2v/wCSzL5Bj7RlQjw3VPHHapn7qXLV8y5DZ5gqFifT5TMaD4uOWagyIV4h6oLNkYC/Cfo6zkOguPE1jvvkIchDoN+6cDgQ4I8N+5O5AXoh+TU9QrvDEWhe6HmUvfy8/uDeC6Dw+5gnZN9/UQx204b/AFAbu2isynAaNVcz1t5q4IQnz7F6qs0v4gew+C/MVcrwoQa/RY3D+GECms2VDHqBwL+sRDKS16jBWMCbCP3UA395j/Ujc8QfRgXnzVUJCyugsp8wXGDBICUaVL9x6qLecfqG4IWhWqoghmfMTRNT2lm7Ww0D5hULPTxE2teFqVO7fMobZIo2wK6zkOC6Gkd98hDkOk37pwOBCEI8Nu4O5UUirJmAtD+kMbfcfFxjgrwI+Xttb3KJkQtqfFxqf0TcpaBqqj4iABv9MvwyrpV9pST5BQ/URLQY2AzKeKsK/vHlP1iHdPFxwxLYWqgjhhrbf48MfcjYT0Gog57yqJQAFpWM0hEZQtjxUITJ9pYLeK1FyiZfwSwIPBGo+1JGP/UxgslMxEJR3X/MvStlHr1CHtiDXolH3S8pxFp8eoVZsGushwOAweGaR3+AQ5CH4JOBwIcHLfuNO4EW1W58xPUCqd8Lca8B+IlNofxM48MR3mXeTPxKCnyVGeMnAlwtK/tqAGjdEef6ESpixv3aw+mEvRzmyI7/ALCWAU9zzX7nmP0ig+AXpMqggmSjB1F7Cz6YSgB8RUv5xSE9x5v9Q/SKjf1KmvcOYIW/aggiqVGUgDtztKD5RPKlNB/UFBNtorVdvWQ4EIQ4ZpHf4BDkIdBv3TgcCHT3/JBiVpb0OoDZRZ4/pLHBE8fmXrR5jV+iKx5epgAyqojaeYx1Mj3KoXhJnMpcquPhiozErS6xGAIdicxgr63mDoy93LEpVDqunxLNK+2XmaP3Mltj7IZX7Fx/4ESjVfxHHLxFECl/Mc8n0TFGXSMiwV84eI1Kk/z8TQSD4EqRs6IrQw6l/wB+od03h+3sEOQhxcZpHf4BDgQhwvfzgcDg6G/5NOom0LjFhQf1+4cZJTyhNozo9xAAXWAr9xGj37jCZ0YuJJrYX3LAQ3UpeOIC7h7pabuASJi4KsRmI6Zbyj8p8k+WfPPmi+4tbjePmMzta9sTivuNLJbqmWK3mwjJTOI1cfuWu2/u5a1MxR9OwQ5CHLwd/gEIQhD8NiEIQ6O3c6d2dJ/mEzHYZi4zU+4cE3VJUKpgr7fMGoOuPMC5UeWoeITGM69Rva6ii7j+HlEJKIHmEgBPVGW/AkSHuzziCo2FasHu5RuDUvJH5+Z65yvcsFYrndxcXk1Uyt0W/RBWSJu7FL++wQ5CEOHi7/BIcCHD+CiEIdPf8kruvS8XiCyA+XuOGv0qjupbI/qYZ9xni5iHvD1C+SqcQ0NJnBheI+aynmM0iIEJpnycRiOS8VmWyE90K/uYcCPhmViqKDXhlPsf1LeVvsGrjWSgAStVbf8AU8fUp8e4yD4UdkhwIcvF/BIQhDh/CRCHS3/JJU/yHrMpKF4GodeDG1P6GcTc1ePmZASMecZHF+iGtOv5C6ZWqbPMw+DPCI08xfcwQZJF0OCE4LfcPlh9oBCXVExFbIUM3DH5SfCaqnPufBBEBsxZdUS19zAv6wTYKyysp4fMGZ6TvskIcCHDxfwSEIQ4fwUQhDo1m/5IG4iioRZif+IQXUWw/wCUo6Lf6ZSwMluYK8B4JqPNLeoivmI83Kd+I56mvLWUiOIJpw1i2ljK87+ICtSjLzcyWlX61PPh7xAFOnNy4ht7PM1OgB5mgWPiZDB6nuyibClmzskIcCHDxfwSEIQ4fwUQhDo0m/5IG5c7gP5TKTPi5/3tJLrqDWk+JQGITzmIPPI1Gr8ROu3ji0Gcy/UxesxT0AJrKyiAXKXLjcZmfiD3ofUw6gPTKJ8Jnqs1QEa4Vz9fRAq58vEIQsV6zGXbouGH4fMyLxfj5ivD0O0QhwOXi/gnAhDh/BxwIdLftnfCYXBfFwCW5MfP0j0wEp4leRw36iu3jUoTfGX1LAeehqCuVr7iEFGPiH4j88z2I/bKMX1i21B8JcXTUJpeYaVMbEwZ4CW/tDToN0wUE3WPuKo9o2aFePMwrB0rzNll15eJqkt69SrLbzqU/iEvyO0IcCHSfwSEIQ4fwMhwIdLftkO8Upug+GDqy2Q7PU0q/mbChoQngzahDTHs8kdzBPHmG8Si614jRjPxFG4PvNInjWVlZWfCFIrCMpaiWL+4NCt/Eriv4hLCiYC8vL4gNg/CiG339+Zjft/+JZozbImiofoRcnhlS9m3bIQh0n8IhD8PIcDghxrN+2Q4e4Yt7t+qmIKxMKLb+oDvoVfJLBk9PZC2m6M48RPld5zEyvRv4iVHNTD6qKe5j0StMR+LgryDC6fBMa8TBNJihV8EKHTxGWUvuO82QusXR5mB0PMSEWBT59y6WtAYA+V1mXqaY26jAD7e2Q4EOHi7/BIQhDo794hCHBzpNu2Q4Y9tC0oK+4iNg5RsD49xcLdDMNHZVllmWGWmoXD+0VsW3wTLJVRDzPG/3HHbcUoNwPmDx/SXAvAEZZZLGDKEQwI0/EU+1nsalBiGfJ6qVkBrxcShfqaOnuUNYrxB08blVvM+njtiHAhw8X8IhCH4UQ4ODnSb9shwx7etmD9S4g+EjAFQZyQ08ryajXYGPIx1ONeX/UFpZDVwXk8Tbl7L9+I0Vp9iIOmf2g+YNpQ8wMRAcNIlQs1LHLCyCwxfmFsNoYPFy3z/ABDAEBxFeC5ihw20eJdvxcuZugVmp95e2QhCHDxfwzg/CSEOFwhxpN+2QhGPcpW7J84fxMSlDglkso01LVcZC4wyHPiUofQjGXtuqMxtaq2OGoyoxU2agWKmRjMTAwPmUuA/UoqYRfMyhbg3PlSzWeOoo2DX1EoeabgpF6qnhIW0FnmUF7Ja4L63Sx2l89shwcvB/CIcH4ScEIQhxp3Zwx7hp5w/uOvHOr8JBQprzmMC9Me5rCDZfqYR8ZqJdSO/iDDGGPwr6gTxD6Mxqm4BuJvUT05KgKS11cMYNl6hpHG0psrEaNSvzqYX+pdZBgnyr3HLEaqeTw8wX4H+5g0ShGk7khwcvF/CIcH4UQhCEIcad2cMe5eKsj4VBo8fHuO45eVyi2pVj5fUuBwtX0woQar5mKPMbD4+YdoOb2eonzZ7hTxGsYrKT4SksYCPyufAha6lQGQOBTcoIVLGIqBdH3DJZmvLEGrX8TwV+5458Iw/aO4Q4IcPF/CIQ4PwU4IQhDjX8C9wN/owzGxLLueuN6istaCVBVtCYcrhixMjSXP+8GQZVfi5Uz4/qUIolQHU9KfFKSsBAHiUiqWS4Z+J8mZ37ZsfPuFdu3iFUKffmFg9wX0MrGJgxKPlHunS8X8MhwfghwQhCHfzhj3G9dF+yJ8ziBKm/P5lMcCV9PuXj93N/EyTe0q2WVq5apRrGJst7pCfUFMf1BDuJON8KR9YPMJaQ94cAJ9TMorU8jUup8YbhjkTyTwPBqX0P59Q4l2RLHy7p0vF/DIcH4QQhCEPwt7lN9BL+5bB+4jomYtxDWPlN7b/AMCG+twONrkyKhN/MSLaurxP1yYYz6IqzKyv7iJSWQYMzhaF3DJzcC3G6DBk4ym3cFQydEMvh4gsbq0eILD/ABGUaAH8dwhDofxp0PfEIQhwfgZw9yofTcMi/wCixTABxqE2qeTExNcW7jDxPiWLnhK1Lv3MUr2Nx3QNxyKFDTmFVAfEpcfESpuA8QZhV2wabIpBfUyrMavFE2TK0Qtg49ym7zmUXrcNz6lrB/qValEax7Zwdd/IfwBCEIfgRDh7hPOu/YIf48QUAIVcsCBsVkodShZ50VLS1LUMHNZqNOYb2ssQtvzKUyX6iL3v+otbnoeCoSBMFW5cblfmVqq/cPcu3iDB8Sw+5ZvUp4lms/KUQZcoCzMro4nycX8S/iHQ/gCEOD8Me74YA/TmWAeNTJ7PcqqYeKxLhYzhVhUKqAVTRLHe6W+aJ5qYi0Qh4bh7w9ZhCLgyk+pUAE8YgfcA1DYoPmbFbnlLUCSsLMiF3iUDsXfPyhDl/AEIcH4Y91guoP3qI36hE1pUOmZN5nlAniA2nyZ6UIjS/ITwAp5PPBXcXN5gF+IA8Q9EAagECYNR4gRrPCGfFQAEc+0t5xADW/mFKUXwOIekb2698flDofwBwcH4Y92qcf5xmpXTLKHmXW1XxEyOr7IbqtD/AMSgNGffqMI2kVZvabe0daB+J4U/SlvcEeYwIYdwioSndTwfMIN7yzLnREoNzINVAHMGHqAWA/cpX/5f4scP4A4PxR7v6H+yoKzMLkhoBStzJssa+EQlLYV4l0vLDer6fiEF+SWiMVnEZ1EvFRIt9TTUWwQv1MyrZmEu4UL8TT5hZnxKLqUKlja7jKIFvBMFEBb8TxEoF6/xYOGP4JDg/CHulZaFPcdCm5p+ojzpLKpb1K6gJTfhmIl3/U1ATWI6x9PiJa/MsFhqPvEeiBGoVAOCkuxPSDCWB8w+cN5wPUorxAtQxe4Ymo22jgEM6R/xp/CEOD8Ie6qX03AByJ/qAwdeZk9rqUDpGX82nNHmfNK/3NTRL5F+xPJPMeMeYCzNwc4JSUh7ykpuo14g3LcQtMAVCr6uaqApglDnJKEpWIAUgvL9EHSB/p/jT+EOl/APdJcFjn6jatIuSw3kQD+gf+4vwYx6L78zKmqSle4DAzueFUQMpuqlcFQ7rlTZ4F8lQwn0gLf643YntlWBc3A28QztL/xp/CEOh/NEMNi98ZhgXh3EP+EzUt1U2t73n5jt7na8Q4aPMoFolesRA1FxmCLNYCXfAQlgmiIIFbn9EGzywz0BDR8VMlRhZKLxPU6/6mVv8cfwzl/ODbz/ANif1jXoRfo1DZYzGsGb9zUGyFm2pKbvRuKisy7/ANxDp+41FPEBcoGfpCjgHuAQmcrMs9Bgrie3LAQ26jSjcuR8Pxj+S/hnL+cfTyS/Nxf4jLE8ocsRMAX5hALX/qHyre9S+qAJHcovxHaVA8anpZb3D3g94CAzUFQS8Q1uXnHBQXTMAN+IK3gT5My1wSkoJqk/jHqplPplvTPmT5nA+GfFxfVPql/iX9kv7n2n2n241lJ90+78E5fziwNVe8YmN+Is26gvif8AMYmVyYCE8oqgKEzBJoPGJl0vpH1eZnyyQ+mHxn1lQWw1z9wgjygCvcLvBCoLCh7iCqgXLUwlJAOLW7/E/wDYz4H8z6f5n1/zPm4J8GW9Z/71K/8AzKe/8T5HGfJH3fzPgf5nxcgfCnwp8L+J8afA/iUeifr/ABB0H8Cn1LemfM/if/Gn/wAqf/E4j5HD/wDYz4j+Z/6mfPD+af7IlQVuYl7PiYJkzmEMJCls/FEsofaWMF8EB8GMOdxPqoHiPwQO5SWT5QgI26Ib4AA+YNzav6Sw9y/5ns3GqX1LPQtK/wAnUp9Sn1LemfFPinwT458M+mHwT6Jb2S/slvfIZR8ifPHzR90+3+Z8L/POfx58Hij/AMJPifxPgIB6JR6hxcvtawwfzMNreZqjBT8TzHmBR4iopAqFg3EMDRuonziCj8zUgrgngQIz+ksalJTfmAx4mHmGMLSF4CDDO43wOZXIQzNSwPQf4Ov8Af4A9+swdVKMpa3uOC3TEo+7dwI9stSupi8mkIWDrU2ILMRoy2L1guNcFLQvFwyIrSoN6zBlKgWHBCv/AChgcQ18y+XenXX4df5MH1BfEFnyS3uYcK8Xj5J8hPrnx8b5k+BmfUGX0XEhav8Aa5tcazClW/U2yVLvV9xt/wDiVVAMNy/dLiegxE2qYeJ9OFkp5OD7SmIAamSwns2v1KJePmP2ZtmeZmvy6a6q/wA3Q28RbUzyIwYcMY3wvAk4KYlPUfVPii+rkGvhjB9Uug3/AETCWLTAS1RS4vpK7buXWNamWXySVlxo+IIsg0BMKSlT4RKEUXqFW/CHkZtBbmYFJS7Zun1B1QXPmBv/APCAa4NwQYoouRBBhKIX4E8cBctOBcGVfFki0zLYrHv1EmUL7m96i9/zLjeJdUP2wIMXF7j8QiJuV1qJfLPVBCEgBCqghLDBKb6gvKFLETzqVs+ZeA3cbzuMDH4r+G/kk8bcu5XKqDwIQXoGmynhOeaorWmVo+DLGoI4XKxSCPCeqPcCVyj49/imiUfZLUxoPmVfBixYqYmgmpTKeuG0s+IPkT4onKlfLmFPExue3mUwazPJDUum4ZbdQrTV8VHh/wA658ZlDUeLl1FYecIUDCSC0zLDbgJqCr8wItCOoZjL0mi3mfJH3M994BFtxxUjXqGnlnUGWmdRaMVUrdeQy3pge0CxhWmgjNnwR1ZPIljUX1MDYiIh4MT0dQCgy/iJWOKhfKDmv9TOIYfMVQZ+oM1HLjUIZt/HMr/Em544UJEHi+WCngipSbYu5nUkssH8st7l2lwoOTY2z4Jfwg2DZH9Qo/lmkr9zFVWXQW0JowxarFeU9ekK1Kghqsz5qCKbiwabMRGSkZ+E93BbhLlkngSUyQ3fmCfEsm5ZuPqlVlb8w+EL1D5YmfmARBI/xM3UwfiaZdnFEpfcS5B9T/ZFLP8AQT/VFm0f1wkPvHYf8ktLxoPmaeG2EZly5cthBOi4eebseCYh00QRRqZ+A74Ra2omGFcyOz3AYV5MUAitX5ldcHojd8S7TQHDaxG1EFd0v4lsxStA+GaZgpbYrrZ8nqPmp9xbhaDEMMMfy6P4m8VMC9S6PUdHzML6msY6AfNxkWRbhtj6sqT2IeqWaIPpMkPZCycwXiDpEyvLFghl+JlDMU1iN/JBO2GClnntzPWzYSeZ/SEwwn+KTV/Rj/QDM/uKiz3w9p/w7klCJlt42X49T7nQSxmoywPKJCKlH0bYCmrCVvDGa/aCXC2Z8naAUMEqYaQLIiqdwBVxTEtR7lpTDYyopAXibGY6iUvcHuYUVGqiUVzuVOGEn8ZmyqzMquG3G419kVuIauYfccVkRp5JsCkQUhXdwjzKeGVGIYMB4CfEwamLRTBnMDMzFMGPxFeoXEJfLctQtZmcUwbmOhV8k2tnm4Uf9yUJ7GZIBEUoSMKH6DGM3EHOPmVy4b0fzNMPxlKlwxlpjdGz3Egg9qZoRCOh+xUel6n/AANy5l01mav3Ktu8ZVPfrX1+o5QR+Ye2LBmbPO420Z0WvUMswit4G0MplQl/fmWzBUCv7wVciE1EVMoaNe4AyL8Sx/WxqhTKVFfKHIp8tQX9UYLU+X1PcHKRgUi6eJcMTZ6mCH+FLiBb/ZNoRbljVkC0uYsMeiB4EH2v3FR75VjAPubwNQOJS4GIqH5ixBpyzIoQvnJg0JE9Ov7h2eZk32xiMbVzIhurgIFwoYK8yzCOfiY+4O3XH3PDLLv0Qs1gznbMxWXykUwcbZuY1F/7QcOX+4Nd/NEv8MWr1PPGpMRlFyGpRTS1+YgQu6pQvsCNXbg1D+RHWIErh6ntP5Fy+LAl7GHntSr+KGPff9qTRPiNQ32JhZ4m3ItUTB7RBU/cdTmnxCwoA/mAt/hxgglIgtMy56l3zvmPtd/Evr/US8sNGA+YV8LHwKXhwDuHZTXiK3iqpBgGkX7lGtobGUtsPOdy6cJA+Iro/cXklH5T/wAJBotisWDyxBsICXZPixPcb3BeWJHxCLQbMyqrJKRTmLzSZ5Sj1LWXjxNqitfbLS70CWFYTaCrD1+n1DMMCEHnQR3iDVyrCX9al34lll0RRCEr1eqrUPvRoD6gqrrf38RJnIH1G1D2n7UJk4DvEpFQamryzHVgGMcLdLpWWc78wHzHIHMUaxQ2d9D/AIJ6Hh4RWkfiXZ6pCIFh5f8AUi396H8kNK/iv+HgoZHOJSIAANePcDpdttEw8zSs1LZZGAXUOux/GBPiruGY3MyFon1E0zzNkE9lLbnxLmnbUSx/JDYcXlmcOA4ZZP3TByxMnhY/XmDaw2RwdvJFoTylM7iw2xNgT1KMFkmk9xCPlRbzqHqhbcbuQvawakRAXBvcVG4q1p7lLhqHWo/uDlXYXMJ9kZmNdqm5gPkBNsc7lfEe5RnOSkD+0Kwpyf8AiKEjN1CFsuWpSNPm4EiG543dplmc3a9fuXcAD4heFiafMQVDR/4IpQGkY6hur62weh34htLLY5vXzPBuFlqkh3A2b6Hl5fy3oey/p1cTr9NHgj5M19Rgz/JMva+G/wDhg1m6vD/U/rHVAjWvhlqWQx+NTaKzcPFdn/mQBFmqZm6ZNSzdKfBBTXyPcpIHqQyShkYYJ4DAPqMU10eo7agIa/gNs8ohdrcMXP8AU2MHwHxKBV3FXSPyStXHsilXB7h2P5lwyZnoSlfM9mHDBZW/mKwDE3iN5gTMsrH5KLN8+uBbkLB6+Yw3S7+Y453uaXKwvy+oyY+X1h4a9mUg6RcGR9qD8pSBHFMGQAjx9zNQoeSbOF9eYHFrd3DnebvcRyK2kAVtm+VfM/108fMHL3jw98MKsuXdY+CV7hjUN7B8wxjfuMTxOsPHmAF/m9R7D+VUqJEjwxI9u4Je6JUtACH+5kZHzZ/qM2v+A/3K3+NqQ4zPgb/uFWL0WP5JRUMUrEuhlmKxXiNlzSApDXUrXplaGj4xcolNSh3SCqanufLso8RKhBeIaLhdlylSP4Qqxf0Oo1iGF8Q9kRjMsAcM8uEk6rashDI8bEulpj2ZhkAQyF08ZRTaPqsxqrP2l8pf1AdH/LKYntiWMsBeY6hFygohmj6PMSi/zksHbHqFEbeDxKgI224dbvrwYfM+AmJbMlXvVEerwWGlLFYeZUBVsUCf14lcFRs8xRc4fEU1uWZZ2S5zQ1Dfgm4Jszk9QAknxmVsebJnVWLMkynmAz2kwg+0TAHgZi5qorzAWA8nzXDH8VcuX2qiRJUSVKgld+4h/NJA4L9QcGy8qSB4++DPAPxxi7AaQPIWf1MNQ+hUx1m5c3iErE+V8RCgEZPtPhcUViW2A8X5YRJdj/VT6EMz5S84xBLstD4l2QglBuVtEajqP2P+JectQKjqDgC/AgC99MsXf6iPmrB1eZda2aSU5uIr+p4P3GwS91DGtL8lxONR0uCzaDT4jyYI91mqbuBaZzwu/uXC/Af+IQEAMmoe5Yw/YPqMgvICqmGFflGUZT1MOtxQM+LghKaiGEnYvuLRYreIHPnvCaFmfXCxlXSG4VMFse0IqSE2+0eCBfMFlj+LcOC5cvtVKiRhiokZT8MgGgPQoD41YIJCH5X/AFL2fpNP5h5S3hj+yb/1V/zGn97KLiVfJHjKw9ifIElkmZziiMPBhl5xNcMXbbKAOcq9Ryd3ldytdWvUckZJdgqF0W3cqb5XMqhLx5lGj+Yrkrn19RKvtHIfMyRJMmWPUHPK3MrNlEa/mNq3jkZYsFk3xuI3YK9wCEc+4ZV53fuBQyvRDacHXGPcwkLh4DxEgKPCVn1J+s3MEz/yb3Hqgbr3GcwdoZJvCE+7mSi0wnBN4d9V4eYOIGR4gyRMAbg2S+PmNqxggTBi/UN4+RGvBi7Pn3EntteLlM9kHl/BuXBh0BcuX2qjFcExm8r8Cur+9VmgI9HGs/4/8YFvzuJ/cF18AkMDe+ieZj3CfUVjuhlz78QUf9z2X1L8bfL7jWHj1KW6P1qNzCBo/mGVERqxfs2blO/vMT1HGMrv9z3xFeftVtUYapqhhgsMs75UAjTIF19emBwAMCi69F/qINS3meTpCzAdiDHa0wEPNqGl+s0+IsOLewI5LwXZGMXmDCSxWRmXMERzFyhJYe5mCsl61CzeYwil17QJ7PzDYJfl8wVbt6J6sD2xT5Jgbo9HA9A8Fy5cvi/wbly4MuEXLlwZfYTmuKlInjaV2but1v4i+avcE4gFb+v3HY9RE32LgzXyL6V/gin/AISWzI+7jay75Kl5ZkLZIJRIB4IIou/U+NQWy8uVuo+9vEsaFseWJGlm09x0OQW8eZSjP54mWQtUNSjUviiWdI+WXa/2mfRdgP8AmW1JuxMu6e7xEJSvNwy1PCkbFwSEMv8AuIRnl8wVfm2lBW0fUQNMNq8kZtQX58xN0lp640loqI1UqWRS/cQMD7g/9ol5X0EOggy5cuX+NcuX0hcuXL4ealROqpXLeXlugnGPffxFqo/+Sp9lN4Mv6I07n/pZWsfgaRfuYKU+xGhf6cQ9DQIyPmVGEY/9RBlUlaolQ8ETSh1TLFr+3x+oguB4G4muQtahb2m7jMrV4qFVVPKzyKviKrXNB5R+k+XiKotNxBzqUBdzBjXuNwYe6qzEmaU6yliWrfwiXtRMwMzjP1Kmw3yMACD3XifBA6wDS4+qF+ot74OghycXLly5cuXL4uXzcH8G5cuXLly5fS8E4rm8a6alETGM70ZH3K9A58jGulNWQL1cdZeSxuii39bwyFX/AEjtBH579vbCawAe0elDHaD6YZa/1MH9DLZsvdMBlK/c3aMLDy2Hme5SG8beJVMtoxlEyJ39M+Z/E/8AhQaH1PtmfIxRFTv+MJWM/GI27v7veW8eH/VUm+/li2/5pfUdFQ5P8LcuXLly5cuDwxJUdduzN4dbp7mVdC3Ab2r1NbhvMREUMPX0yrHbxm5UsH6ghpTybZ4KrdOfx3GomI9y9ttv3RgDBX4g3FjykAnKqPz4hacAb354hff80s7X8M6h3b/KuXLly5cuXLl9Fdgg2ZSRcV7WYSyaoMV9TSs1P/u5/wCwjX7mEpYoR8S4BpQPSlrmLlpXcqfA6vzKDbKtSjpSrNy1XBpnyhvvqOwK8P8Ab1aQmmyiFFH57RzUCBCJzXcfz7ly+Lly5fbsujhF8PIlODqtv8xVIW0a/UY3e2LqGmOdHk4SP1yS33D3hTFbvX1KxhUethAeZ/SZKGP2S4pD/UCrxfUCqdyshFWcvBGt0mPQlbZbj5aP1Hc/cBZW669MMYD9Sia4pq6xEdTLFotmPvo9C2egh4I/kfUuupjHj9xh94+zsVAlSpUCVDfFf59SwOUb2Wql1CM3MAyhOFHjeWjC8P5i8VnqloDGJ7c9kU8Hqdh/0iqb5YLSwj/JGyxr4qWKoHyJiIFgbo38sVez8rA/7RhWT3CuylgfLFD6AN0kcft2ZpV8rIMZo1mo1qUaC7mNA+HzNEq9RsCejhirV8nIiTjdjhtAez4epY534rU+0qplEmDo+yA8Gc9FSpUCVKlSuahKf/gDEvnOFPAQkFg8WMb2qpYHar2lTpl0r18wta5iMPlqOSjXkjiOJsqMJd7l/cGsowFtVW4jaXFLKa3GGJ8oPZHxtPdF6Tco6/4Z5HY2/KN/QfE8w9G5Trj0xXnMTY1dlkXdDFXd1PIJ+GLaVHb6lV/wrv7YzIRU8clNQl/IgTDNlWm8f7l0QBvL1vVK5CDntgJ8Jt/mL7KKTzKMeMMJhkkYRaAREdhLLBab+4qi8GiDSoGr+0ytuUdytYieIuU8gZm6qQGCpmN5azmHrCFGM3FtAslWkX74+eFE6LlE3f7ivMqVyLCgXRPLKh0VLQcIBK9QlcLiYuMf89cqY7jAjr/tM1c9EXbp7MyiieGJ7ljQvEfIpPpFtXqbyJ4eaZSoSmVKlIipSNW5cZfE3S3jce4OXbMtsyiC9syrzHC9NU5QEwLrE8sitZihsKpdxyKGEeKeBASiUhwAUYNpl8TXEOg9Qrcst+zIMIOFQMx3KjKnifcf8/fAxcGEIFbq0gRu2+//AFKLGD5uA3AfM8wK2WUSJRV4DzKMEsSV8VKepSVK6GJHEealVGzxyBH+5kFULrs+Iq0Ae2pr/gbhQn5wkKPsmzjcpDiqEqVweJfaWMyl+uZ4pj+564wtQb5ag4UmnR8kM8W+GDhNHjzz4/zhagbmYvA1Y+WZZf2qU0b0mmEvi5SvzGzDwUmcXeiF2zHURmzxmNIrdXKkX2ZVohIxipUewkqV4HHqOaXTiXbViKZYmVuPMdGywgiohwSoEzMEaGmUhr7lm1XBej+pmYDQT7YS1czloDqseYe8qw48cPDzX+UrOL8+ID4N58zJuvqUh9vEGQNn+Js7X88scSzg3mAWfrLVfIGGefJ6h7t/cC4bmRkjw9k2KJGMY9ipUCBGHCtlav34G7D9TAxyHRBaLWjqbSswg4z0HFxzKIy5gz4TMqhNTaP29RBRg30HRbB/zj3tLHOZvH6l1LBmsPb/AJJQyaGp652iS2ILUV+5i3X9wGUYMKUbmGTD5ix7VcHOsGksKizTGWDa4HzKAWNzwUmKxtov30RTK4eKlSwYmPqnzQpqmVbYS0vmEEUSiUSj1Meum49l/wAexHi5Raod5Lu/MRMu2CweXpd/cxAgU2z4MNQ5RLxcRu3oymL0fD64Uxjhr4PeYRTMUpszNZcR6CirIAwp2HvxGoMAKe+NdHnouLMcxIQYjhXTU88PVfFzxLly5cvqr/F1KlIcW9kzDmpzY+iG6HzAGiRRgzj5EPoOTHqU4bxI994H7pkj8IMSKrEwD4i0wi+u+Di5fZeH3PHYv/KHFQlzJ5OEjG++BxuJclfpRlZS5+oQg1GP4FE4UQTxwBtzGK7Fw6DssY96/wDI3L4ekZj0fUcKYcMe8MUXg4LHovi+gj1H9xi/mp4gRAFxksvY7TH8S+b/AMgOgm8SP4Yy4MGXxceq+cA9srw1xUuJq7mSvWcH+uRTqQHYeGV1vcv/ACiSpXAeGPD+PcZfXdI+obVvDKqiFr43LJ4lkNBXRfN8vL/+EOKlQIR/wVy+B0rgzKGWWN5gvbf/AMGdBwdL+bfQzCJwbmEINMLS/wD8edb/AIIkqUQ7mSVwcXyZZ6VHaD/8c/4TZzhFl9NyvmbDNNeY91E+Yu+lis6H/wCHP8C9++gNtXEwuj3GF4NmagCsN9V//gSHW/4m5cWpfSKizJCMpZY3LPxf/8QAKRABAAICAgICAgIDAAMBAAAAAQARITEQQVFhIHEwgZGhscHR4fDxQP/aAAgBAQABPxD4a+G06RRQ5axVHU0Zu4eGEOd504uoCRW5vj8Ti448x4JYJpmmLZMCJY5g4qnxCz++bWIouRVHKGZyaq4lgRXUZggVM+fxMcHmLBxLjwF5izKou+HnE4gcSxMUzntCOAn/AH4x/AQeNEeo9RXUzqHJNYa4s5n+SP5d+cm3BFjh1Bhm75E6425lNCb5vj8nmOniskqj1Fkm5N48E6yk1gxBUliXnFFMXBmigkUcUep0gupgIKqJmk2xxzbxWGoxRwlkeYscZTVNTUATOLBUtiDEp4CuX9mMeO4/Egc3WLU1TKp14GuITH80d/A47+TNprwNfIdTRmz4kODgsHxFtr5E34ti1HkmxM6mITqzUjmjiY3zBXgt0WZgRTJGBzHNIoo9RQ8EzrixQ0+ajbE4WOKMdMcdxQah1DSJHcFpxHESbIq4yx4eT5k9TcmpDgnSPE1gpSyNH3x+efltx04aQz8DqbJu+JDgm014GDi2R+ZR4juZ14i1Hh5lwR6qYEceZomUboFJx+yPMWZE9o7iwYuKj1FqOHqZgw6ixHbinuR4MWPgPhExY7S4Y3JsVNiYRWQYxB/BCxxi8HDz3wctE6zrOhNCdJpNeDL64P5WbfAnXB8Sb8deQgZgglYhjZ8jgimnHrDDlBSjyc7cNeC1NRjyQKJmFRYJ0nTixmoqSrhtHhrFGDPeLEcermITERXUrBqaTdMoCvu4PzCqxU2IbEGILZO6HEWo8R1FxH+/H8Jy2JkkOY6RYnWaE1jymcx/P8R8b+G/ywEOHU1m2PxOCbEeI49cDtQ5x5Pk1qKLCZpOkwolHEtEzImIaUNrHLaM0h4MN1zOPJFHqYCZCPBDUWUzn/ejuMWYpXuJHgUG5tMUmhDkg1DUySGOThZSEX8Jy3IskEDBDRMqgqazVgkN/ljuPJ8E+BN48chDeIahDUGas2Rj8CEJtx2K4PUeU2xnfxJrNo8EeCWpOrKURTRFqbzXgc4qjjLaMdTtyOTebTrcd1NCPBMRcRUqJi4rg74b8NRjNXAOZvNyDUNpNydRlcTedPBCpf24/B5vg4E3m5OsBAhwQ1UdhNJsguVX3s2/B98vG/Ed8gQhDUDEOU2R+Jwbj4LU0m023NseD4tZtxWCKxOkdVzDuuCozHUygds6HBjNJtwQm3Hci1Moep1mCCiuP6kUHhvFHzFjMYzg6mKR5ILCVJDek9JqijqP+CCQi/OuDgTcmiaEVVLAl2pjNYcQQP8AKzaP4uuN5pxXEIY4IQRuj8Dk5ukWOJygzjv5tOXpMSBji8nBanSOOpvh4ZtGaTSHg+D3mVQ4R1U1EeJdIa+CZcV8xeHiUKLJFqDVR3NCHJBmOmXiP+KLBxXH4TgTaUQuqLJNEyqDEOIMMxkf75u/Lvy68BhvggcW+PxOCbnDrNOOybYnwYQ5t4osTBiyTVDqbRZIpWIM4NsNeKMZpxMeGx8N1mNTRHpl1RXDA+yptizFiKOY8M2mnB54m4iuo/EWp1mDLxHlx/78T5nBy2miCwmpOk6zQmRBBZf3M3x+e/h1Np0+FCCEIQwMo/E52mE68NY7U2R+RwI8nDQhWpoXMQzERZijxBxN815h3HnYcHqbTabxajwSyEGoQlYRd6iym3NceGLPAJvibSlR54HqLUN1xv45m8Pw64IcCG5WkeBDdTFIME0OLqGGb95v+4/E/A047wQIEC4ECDhMd/A4JvNydZrHNk3R38jiTeOZEol1R4JlUxqLXFpMl8DDGKKLmHBx5nWPJNBnWMorjapRD+Ng6jGMUa8N4sk0QWkIqI6h1A1AgfxcisZfzOBCap0mpDqPBOnFgwzftMF8CHHfw642nT4YeoQQPgT8SEOfSCCZEGfA+JxIooplMXFxuOfTgBqd02jHXEx4HHrFqdZoTGo0qPUyJuif0TbwdRZiy4xm/IeY9TJFVTIRzcg1GowkOen8BN+CHJDqYhOk0RRYjqHKZP2gxe+Hg/DtOnO+AxQhqCN0Y/AhxuTbh6zWbJsj8jipvHFqeswTpOk68NI8TNwRFQc8aTSecYfArUTiap0mxOsOJvjqTzizyPCxm8WIam81Q6jqpcx+OOpGIqHjKxnfzOJNpiI8kpROk6zSKXGUhIr7o/ieNvkQ3w0hHG+PxIc3qacBNk2R38jfBTabRVKGAs0l1RYOG/Fv45ygjiacTGHJ1guuKwTpDknSLEecb+iZP74KdcLjxvwHBZJqTb3OspidYsS8SkFwl4eX4HEhOsWSWamxcWo8RTrhC5Ffd8SHz2+UgzwIcG6O+XghCYTY4dJpN82R38jicNybE2m01nWWK4bHFvhiKVTtcWYsRRxQ3yPjqeZqTYiyRYzNZtj2R58M5UxjHjeaTSbEOYdQYQVUvc0ihHl9cisfh38Dh7cNydJoTrBdTXPC8TJyqf7EfwPw2nX4baHEMQl8G6O/h38WxFNCObpsj8OuD4LY59iVxBqdeGs0gzgjQXNhw9onxanSYi50nWKazbBcMXx3ZogzmPO86TSbR5ItTVBg4awwYmH0RERUH5OuCBNIRTciyRYQ2kNEyJrLxN35quptOvwpHiEIwZQxty8HwaoczpAzfN0fwhFSTpHkiBI8kWSZpOkOprN8G2DKoIIIODwMc23CqJ1mxBmaxZRWHqPOuIzErg87xwcTaLJFbGu50mTioYTNcmH5kCE0hw3JsTVOkeIsRYlwWpik1+IvnbieUQQSoEEDLH5HwXSdIYM4Mo/I5CPJFqVxMIsxanSPEeprN8NzWRBGawxjCEXHaOPBNE2IsxYjhX9HxmY87cFibx0kZZceEeoqY8EYQwmb4syfmQhuEOG5Nyak1I9RYmkGZQNfmVtOvIPgCEGUGWMeHghxtNyes6caXm7w1828IqY9Tpx6xZiURcNalLzCe2KKKazaO5iEODyRxruK6lcEwqYpsmH0RbOfUUeTc04rM2OJFIgEaR3xU38cQeHl+BwITVOk6zGp15wzNQxFP8u00mnAQQMCHCynedviQhw2I9QcHlN35HkYTcnSdIHEGCOpYEzEeo8TZDE5zbhaXrgzaHPvHQTNJgEWonEaWKK/og2TaGPBjwbjmkHMNzBGOUNhxYR8RnL8SZ3w/I+A3I6qZBNSPBHxGbq4vFR43+LadZpymBKhxsnebfIhyqpoRaiynaP4UiwnS5gk0JqqPzDqCalzKG1BMfzQ7iQchzCDjj6Tc4DJfAwCLU1m6XDlL9x4PDDcUd1DmbBBikLBMBDRMWLPFZcxPL8SHAhuPCZCKxFqLUV8qXmplS/LtHqa/Anw3Tt8xyeTg8EeIs52j38XhRQmiPU6EdBHggnWPBNDmCO374JwNzFxHg47xZmQQ6lQg1cyEw6gpzH4G1weGE68miM6TMTEJmjtm3HZBxF5dS/gQ5KPM3JiVFHWKaQ1NsNxNOPD+EizxePhRhzqzvNviQhw3J1mmJvN82Y/GuDgTRNibF8WKXMkmxMaiwRTNmczX3TePDXiw+B2m5DkhwQ3WOKxmZcBwcV8do5icm5vyaYzAx0kWptDmYRVFnLtcw83wY8PBCbQhxC4xUhoJqRxYgzdCQFLl5v5m/h3HCE6jNWDfzEIOZuR4ixFUWc2Y/M4EfBrltXEYqKK64Ko7mzh/wBqbRR51+JucOsGAh1MWKZvgbYo4xjz3NuR4TKorqaHAFcRzFlL8ccPxeSHAhwC6hxDxFNOCizguRpflN87qLgcs1ZTM2+RxtNzg64Kd38A4HAuOYI7Di6jwMc1m+4Z7/uKJFyKS6g82xFqbkwCLUVkq5oiWMUWMeSY8VKhwshMBGFLBrEulxZx3HOTv8BDgPDVGYlHELBER4gzfDIZx/Ib+CWeQhHU7TtNvkQ4bR8XiLKZXHfzOGk35CXnj6Q1UeCOOzicut54Lxy4M75uPMeos2mYTRKYZRpUNkENR4eTc3mvF0JlJiIlCXqKKDcdKL8OncONocNUVJMGO5046wcTdDcqn8evwHDSLhtw050Z2m8fiQ4bcRqDie4989fA4E2ixzsmOJ6ijzHFxG2bxizaOLGHJtFrgYCaor4rP6+C15jwxODfHpNeJFCbk1JrD3wGo849vAd89x5ODEIcipjAI6ItcNOOrDcRTj+Q+BPLpHjRnebPxIQhOs0mE1myd49/MhCOLBzCnSHBHqJZpFwBqHbgx8Hg5to9R6uPEXA1NsUMnNJ948MYw3yOdI6EWrgwcm3Dzi40/B+JCHBZmBLK4PBHia8FAgMo/kPieLxNQjNWbs2+RCHwjizmVzb5kObx+4qlWEUVJMBEalhmaE0j5EeC4PBzbxNkepaodTSGpvg4BrMI74Yxnc2hhnWPCKHgmXBQJgplbBJ4fg64IQhCPMWSOkmYQVXBxR8IJPy6+Rv5wkI6mrNn5jg478hjtHfzIQ4axVyDMTVHmKkjxyQw7fArHg5tpuTVMRBxWI4UHfNO4RjGdzaaxcHjFkmhDOptFN8PGtozfzIQ4bR5ItTUmhHiLgOQh/ITbjv8Ia4OpqzZ4PwIQ41+FE4rGPx74ITabE3miGdLm0p+4tTBwFcjAzHceLuXwcCLMWSG6hohoghqYHK3lMI8XwWXmLPF8Bj4mKR4RQccOk3cPB8Hh+Yhw3nSPUqCYiYIo4+EGYeO+K/Dt8sDg6mjBl4PwOTmw47Zsx47+DwQimYj4niZo3EyR5iij+nPLN+DHFfJwJtHkj0RWEHG6Jg4Ld8EcvG0WDi8kGSHMaE1hrmOUEhnNvwkIcm4RaI8E1ORtRQ2G07fC8fgN8gg5iEdTVgyztGPwIQ+Az4N2MfmQeG5FmbR0RzUhzxDETgQjZwExPgJ05cBAEmMrieZ1DHcNvH+82hOuGdzVOk0nSXUmsVCYDgYTZw982fwkIa4bzciyVNSaHHWKLhjU7S/xm5scenAzaEGdQWM2Zt8iEOD4LHDux3+A3DhsRRQoVkeo8zJFiNZcI1G6MTEGPgPgMEiyLKgmA4hxMCLEbPw/aa8TaTLGJGMl1R+eBNnD3/f4hCHDaPU3KmhFqOLgUWSGY3fkc98nDTg8TeHgTqas2Zsx+BCEOO/Jvnf8I4N8cWPMdmIJ047EeI6Ib+iCdkY8d+Q5NpsTCpiImiOay1TXhDGzaDhjxvNJvNpQhFgmQjsJpx0R24biUf3GOPwENwm03mKQ5IcEeo8R8FmE2Q2xuj756/Abm5yrEeZpwI6mrNmbR+JDcOO/Ks53/CIQizFbFNJoRai1MhLCXwxjFRjqbzfkhy7keSWonWHUGIMM14TWbZjuPDzuTSHE2I8k1S6mYhHdTGXibI7sm/7jvm/iQ+BvHkjupqjjjuKOEK4Nnw6/B3z9OBla4GY6mjO82jv4HBy2Io5vmFzb5a4IQ3FkmvF4IsEWCLEeZiIPJeyMeG/JuEJucRqDBBjgcTVmCBS47R3yed50nSHMuSAokWCKgmLh9pumMt/3GPLv4nChN4dR1UpDgcVQjEx58Wzl/CTedJrw0i5niZjNn8AhNp0j5feO/mQhDg1ms0moy1EtU2JiEUb4MztijNeV/A3htJWEGCZExYsSqTWFlFjidx5eN5WKG2YJLg4GBHFcCLKZT6zz+B3ycDh1j1Fgi0RYjgxYjygjf8AfL8X4G5ucHgi4jiR1MBnabR+JCHNny9X5HkhCLCLEOIcENBMBFgg0zQmkygMRvjHhpHg4G5vNSUQmFcGSQYmjNY2TSbR3wZ1zjNDhvHk4NYXHeDibuPm/uMeO+Hg4Icm06zNLKnWOP3FHiLKDMYL8u/N15jUGLEzItx3HlnU7hvjedYsnHf+OIRZODwlFRmpjRER6iwRYmyacQx5HghDgqqYCPU1RQYyGaxs+4zfPI/DaaEUoEWSYYsCao4cRTfHPd9x/D1DgcVqZCapo4tYosTRg4Tvk+J8NiPPxQlZjqdodzZjH4HO/DrNZtmseOuTkhCbEWCOZhHqWxMOK4jxNk04xij4PJw6xalAS4I5rj4hiKWjjjGPPc2mhNoqEeprDAS2KgZiijygic/uJ+IhCbw2kE6zUj1HBixNWZkf2uLj+Lab8OnwQXGMTO82jH4EITfj04b5pGOvmQ4dTRHHgi1Os0j1LgRvceUE/wBqLMeDyQhFmakrSKwlmGqgxDGkbosx5/EYtIck0JUEzRYJmj1yeMvubR/AQYQm8GSYRaqao+IYpumn4Geb+F5Jp8KOHUwnebcvy3m3NvnaMY/M5XBxWCLUeuItIaEvEWcOJx+6L1NJ3jzqEJtwF1DgODVNMRZRYjZF8B+NYnSdYtTrHQR1HgmMU3xzWf3Hfw7+Ry2iwmiYiLUfEuKwzWP7X5d5sR8ekXN1xO5s8PyIsx5+A9vxDjaLJwVJNEwEeCUQahG+KGH3RixHw83w2mQgATETTMJMUWcNkHFw0ncdR+PXgskeSdYKqdI8EcOW7vuMfl1ycjcVVNDMhMqhxNIpiiwzMgZcvzrnebnxJTaOodzvN4/I5bHwbtNvwnLWLE6TeL0RuJUkSk1iy4n96bTIm/DyTbhuStlgJfEeJiR5TSN02Z2iZjw8PDTj0maTpNCPJFiLMNTbDEU/uPC/gGDng3HkjwRZItR4igzFFhmjwHh/E8zYmvBxTfhudp3m/D8u5vNuDxBGnzd8d8EWY9EwEeS4RYqBBmCFQRR24Yf2I7mnN+CizN4LJVUpRCXNYcoMRlDe5pwx4eNoscuCTcmqLJHggzFUZIuB/kjvh/AQ3CEeSLUyEwExcRlMUVqasHynk4eN50mp8ump2j3N+H4nG825tOD+A4OHSKqgXFtMRNDHmK5rDnNY/scjw/AizFmLBNSOqmiYOE+CbRcOo8PG8WIo8kWSPU1TaIpM2INzZFI190d/Dvh4OCEONydIqSYiYIocJ5TJzZH8B8b1NfgRjh1NGd5s/IhCbTbhqcHePzYcE3m06zcioJpixE3Hgms2wwx+6MF8GPBwQ3HQmiYiLBDcSoKhQdyeWbcvw2mXHePJc6zUiozHxoIoFyzHubMfj5+BCE7jzMw4PBHiKXFuPKZqbvzOk0PgXiE6mrDubMfh1D4didJpFlwdvyfjvOt8DhNUGYOIe4Mcm/tRYsQMeElcjfAtRamKPJGTbMEKlM34Xh42mMVMeSZCao8EybmNRYiiyi3TKiMTl+RqLgmKR6iyRYIopcWbpvm78u06x4I4ouIy8TSdptw8X8dibzTnazb8e8eSdIqDKamqaJuQwFTfFD+5wYovDCHAZtOkKwhUTNx2KONk259R4eN+TYm5OtzQ4WxxKLY8YQfg/IhCEWYsEeo9RTedRmk2zb+XbhqfBuDxiM7TZ4ficbE6cjxO82+L8tpikWSYpG2R6lSRagURYR8gGaTaM6jwcDceYsEzEsILSd8GZBDfBmbcu+HjflGSOkiuotRaqaQ1FFwxQWYe/j38SEITaPEWo8EXG+Gs2wZ/l2+PqacNMzRmjN4/I5aOJxDias2+ffF8tipjUeSDJHrzNE1RamKLPgYKLLdR3H4iE3iwTMTUj1CqFeOGz4TH4YRRzYmxNSNiNZxq5dEvEcLXLv8AEQhDgWI9RYI8RUQb4MbJu/AfHbj088cuC4BiazRm/wAx46TYmpzjubfiIRZItEWZqj1G4iwR5jxFnHUN33BGdo7jHghw2nSIudY6ribYoK1x2ncY7jHkuO82IqSO9TBPM6yiFo4RcC8ffzYQhxsRajio4nccNcRpzfHXHUfmcbTrwwjzM4IZWJrNGbvzOW8dV5mU0nabfkbEWo6EwEcepoiuOLKZw2fAMdzfwEUdI6Sao8keMxZcTFTfh3GO+GE2m/HYiyTciiuotRyyLiL4T3x1wfE5KmPJFNUd1HHLiwzZBSj+Pubczm81hrh1NJqzf8TYh1NII1ZvOvyPWaILIaji1xYosorhsjwUY8kIRUxUEFpCkWvMWOAoPL7jz8CZ+Z2m0cpgYivgceEVGEd/M46hCEJtHkmriUccuLEWU2/kJtxXmZ/HupqzV/BHBNyaFQzCO03+Dz18CdIsEeEWIWI9RZLmXgUqW+PvgxjHi4MOJZI8l8SqOyboqgrX3DFwuIxjD4qVMy4juDBcaRRZi45k756+B8CEIJfEUUWo7Y4TWbZs/IcNZ15XH8PvDlHh+Brk8JmEsTKNJv8AjJ0mhMWLEWo6qaI88XZitTfNMxjvgx4vkodVNCVVNMRGbFDd98N+HUfgcrzxVRTg9ZvOkXEdwFkPK/gIcuvFxRc9Jtgynf53ixRRT3nU1mQzZ+JojwiGCNGbv4zfHUm0VR3ME1RxzJjhteGMYx4OW8eomo1rhWSxcDfFNuGPJDfDYmqPMUO6lFRrXB+YsRS1jbi/kckNw4KYDicUUvE1m6bMeH8jr4jmvA2TCLEOGas3fhNzciwj1HMaM3+L8jjoTeDEVVFqLJHqOPOPKOVjqMYx4IcaINMriPUeeYvKbPv4C+JxWZtFKUltTOo+o8RRccYwM/jIQ4YRxamIi4rxHRMlDDD8prPCCqmMeCDFDagq5u+G4fAmaTVM4x2m8eH8BxeCb8ekeTg9cSzm2PPhRjGXycLDiqrizxxw8M2x4Ed/E3xUK4szCKql1czZMGIsprGz+E5OTmiPMXie/AYsTdxO/wAhw0K+HeJlXHZUGGbfmeoQmKTIJuRJOGbvL+K9RZJmKi1MxwYpgjjOW6XGMYxhCEM8S1HqLJHSQsTpRWRvm3Jj8DfEm8epclzpK8SwmfgUzcGJ2fxkOMY8x5mxHHHDUUWU3Y/kN8dZvxM0gqOONkzfyN8EN8VgmJGFlNkYR/EWo9RZI4osRRajhFDdHh4PwIMeY7CLBHrjxR2TVvmsIx1L4OFDgVS6MRExinnF5i4izhjt+MhuEHM3m5OkWo4oMdx5TZ+T7+Zx05lXFY4LE0Zsj8jlRUEeItxq8TBj+Hbg9TrFwVnE4jtFamz7jG4xj8SbzAIsRQZmkwI8M38GMY/A4kVM9ZkI4Sr7mNR7gVwPKOOz+Mhx3FTFFqLXFXDXDZN2O/w98k3ms6cg4BNWaM2fM52mhHidpozd/JtNp1mvw/SaxZRYYCrZRcJDUT6IaTfSjnIPSguv5n/IJ3/+3iZKz/8At1FGlX/tqIr+4RKNh9koOyAVkl1Q6mMsjqMhm94MYx+ByOmOLUyHCDwEl4xNvB2fxkOCb8dTjpNeR4Zuzbl/CTea/A6YihqDE0Zu+Jx1ztNCPPHVm3By89/DabEyJgEGo7X2IwwfdKkEAgl4CABf9zCd/VEWrZauhbj7dzED8ImFQUnOXuOCpWmkUqla4jzM2XR+49XCr0muos0iN0r/AJKSvQWLeWHDwwIzVPpi6KwtGMPULxTP8TbFPbFQt9LQf8yxHCxt4xBpVFC3r7l0iMO8aHGxSpW9JHMeH4nDSPMeSPUcVMapFTwYJmTInd+YmxOnH7xRRRZozdmz+Qm814rPFxZhxaM2fgONo8OJBwzd5fwBDSTygjC/tgx+1/6oIFrtdfrcFDdeh+2UnvJY+iH0BdqLcZ10t914jUWKrqfcdVgI5V2ywh+Af0SuCcWqLLpu3Ax5gWxlDiYsn/UQoX2f+QQSHr/wSzufQikqfpAjtQrY+yIEodBI/mFd1ii1DBRIx3PBTxH2XDAkZsUfpJQJ9n8gEzWy1WfYwh5bj+iERKrM4Q53im+4tC+dA/ipm0pSAL5pgNqLNX94g66sr+4IKj8nSbTcjyTXiqqYr4NGLOKOz8ZCEI8zRHideLimkbTNmbv5Cbx8NuIxwMTJTtMVw/E474hg4XCym7+EJZArX9mIC+tk9L/5Aq98O/mYbWgB9BisexZJ+2AiZQKz7ZXhuv68Qsu3Q/7mK2PKXMfW+CUcbqjUNJl1aUS0XFlj+ValqjYFhioVOye4T1KmOzzAKBkLCSyo2psf7SyWh9MuZ4qu/V2z+xw/2wHejW1viGBy8qv5hyFEBs+IxpT1bVy3k2B1FQSNmTCogQeQw0Y8rXta/hxCdRqwI/csg33R/UvaPRG4SADWVgbbfuVKLsJifs1Ceuq/Y1/YRyfZMB8DcNgAV/s39kSnnaDDcWucscGEIsy8RZxw2eb/AAEIQ5XUcwR6jiiwzdm/5Cb8uLzEIqGYjN/zOdpmIMRxCwzf51cE+ORH7jSMs4N6O/3H4C3RTg4DYoL+9f4lNgkbd8Lz/EuiRdoz+ZWirUO7aK7ZZ/V6wbsb2Q9hFbCj+56sf5ia2lTWAlUpnNLn7GlqP8pVotzHabept12RM178RcNODGRHSg78wXP28CEXE32i7byG1LzIoW7hTUmdVL6PwUYOQWf7AQxL54amtZzgt+4iovRIJjbrO/mC1W1aIl2TkGf4QKx7FJ/JM4ehLT2bGFUjwL/JmG/CAVMsgwhoQw8iR/A7lBDsE6ZQIcYnvLI+oWDKTH9Gv1mM2KkKR8JyUIsk6TeXqOqqdZ5R1N81jZ/IQhwy5XiPiWI8MyuH8YhubxTXn0OBM40fwRzvMR5jixNZt8kVS56gRgenuX1s9wNeGBke6i7SIQft8EUVJAP2X/qL+gAV6AiiADvqOdS7D+ek77Qatr7gq4PTNRiLL2Mqc3hl6De7z+5pEy86j4eiCy03XqDofYxYVB2ErgntJU3A9C1LxqGWxtnxABTctcEFfW5PvxBIBO5/KVpnU6/1HthKNp9XFYBVydMWCk1gj0XnMTKIqU3LkGfPiWUOXfuVgSraammSWF0dtRAngS9dsJFhvKJ/yK8YKtH6ZgXXhR/uOgTn/DYm0lA7tNiIHPkfP6YR1AGn9QqKGbE/9MMuZeFrwjpj/Ue38X1MaJhC8Pjwf5i2VlULYnwFmLU3ixFqPMWIMyZnG78ZCEOCyRYixFxUXEWGd5u/AfHfk25yDM1hwzbH4MIc7TQqPEdRTf41modrblqGzejohf3X9k+2pr5LOPd8w7KXKs/cEvxWFv5gWbPbQXWDzMm8lhLX66/cz7ETK+zTF71lBBLuiLomAKyYajtQAgUfzPSlpbCAl/3M+8eqzAu7Cw68yvnYG4FpbtEYRvIkB6MaZiBL5LEBmHc9fTzF9i+M9wBqLzt9rFQ5Odo7vQQbQIMo0Bpf9Sl5cNE/7lLT4bgQwXQ69wWzKqgPfTGUHUbGWkGXlf0fczX0pqnryvRLL0xdN8K3AIzgUif1vC6fImobsq5oeE7gr1aAWP3AQGrYPBIMou+g+nZCg+heXkxFU2XdPczNNYJfkGoghlroHXmO9Kk6HQ7lw6lLkf8AxLiBpb6OfpLZ+SaS7eQyPiWXjjSbTQj1cWIv4i4iFnxNnJPrl38SEOC1HHOkfDSPE7zd8n57RcFmKPHIcTRm35nHfIaxcTtN/ieX8TFy/wAXMP7pinTX3Ut5NJ8Es5xA+XLFKhrlogtC1o0H/n0StpZQtF4PUFIAPGPMtmqtDDHFWjolHEeRGua6vSy9BBszfWZleobh+YsZNqNZgEk1a6PJZQjXTa/REzJDq+oUhCxVDVQVy90VBIS2cdfRGrvd0RLiihNMHpEilPqo7cCmwPtiJ4d2x9ol6o2u7l4n3VG59Ix9CBo7PBHxgRGCl5Jh8qn+8wEgDm3E+6MJEpGgvSHvzCwqqv8AbZ+oqETRFPfbHaZZsDv6iYsXDFmkdXFab7HhjUjKTfsHcyrR+w9h5Jmsf0/CdQ7JC6j79J6mZQRqTr6j5cqqt5rz/mYwcL7uIoy3Oxs/sjqUpmCL/gYi2jPoVf1y2JqRZJglXBohVR04rI3/AISXiHG4a4OKOKLgWPE7fmNvjusNcNZozfH5HwlYTWOpo/LeEKvf21FqHJFVZ2lTygdgbT9kv1sEdHawNaGuhr78iWhOAm3y/fuUupu1QJoEKoiCQRYF07YUpKiBDpo8TQWz1GY8Gbwy82IApD27xLeIVQBrCeDA7JXClOqYoDC9RLGLsp6piFhFBoDlXqHb54FA6D3Bp0d3FJvX3HQAp/mGVnNks0FdZjO6jmouvMpjoZoxg7HzMe+LGCQSLVtk8blYrWUqq3iLJPoi2TAAuCuq1mUSKNHRK7A3YTt5eGPEILm4z6VKmgr1eE+/MwwBm69kCfKX+X09RKaLtq+8BAKwCuRmv9CV6UcY/wBPibm01H+iS4iVCQ4PTuoXSbeVfEAGLP8AzpiKqrHeP8j56hrc/wBkEo5w/hFH9sdEV4XlRv8AiV44yvTUOGqax64NUUxJXLHNI3fmODnWOOKLEWJpMr/MbTQj5jjkrTNGb/jvg+FoTWdTVm/xZ6kX7NP+YcOEeV6H9MVWwanvGf6iAn2ijQnW4TKwBkexezo9Tedtqbeo/CFHUKtShZrT7qjIyEyMp9W7gLuYFFeBl7QUuHVtOnxBFSnClhHePFLDIBn9zXqDffsiU0fOu6IJagXxXZG/f0r/ACfyEJuSro7V/wALKxZMpg884ZvMcbJuyFtUgb4vt9EZtWW32k9lGriK30YZzZ7Mj6mRIIlivHo1CnjAB+Ttf0y56adqLjwDQmTuAooNGy/Z2PmBKYGHgfcsYY0Ev5X3CCniwtC+IEab4U8CFyIN3TAHi6mZRJfT1fZ5hVJtbfgvwzcAotHsSmu3sfbCYqAHlN8XEXQZFWP9G8SwAy8Ar3URKnuevF9kJvihoFde/UTCq183h8ShFRXSt/vuUgt54Xr9zrt0hdMGbanNUUf3QfuLvb29rb8E6izHFxYIZR2+DbxfxPw9udRxR1FZO03fl2nSdOQ4l1FBBom/8don951NGb/HBuEZMb5IoPOKP0YTPNdy9+v9TXsGZUNMsyKmF/tmKyxAdSqqGhOng9yoI9lX2e6L13L9GMeqp/KQ5GokBavJd/cNl0B6h/1BYq12fceDbKsh7RnvktW7wqH55YKhuEAL6tahpFQKFT01UwsdSfb5PuCxBuDlah6NEGqzFfKNLiIF8gDeFfx/LDWY0sOz+YXC0dCRVVfeR8R10At1l1LkhyAIVlBhP6YfIdx4nOk/gz4RgYa1R821HWdR16fDFuVoOmMTYdUuwxjwnnA6/wBRUmKtdsHe0jdwErwaR2eyDSDwY9PQ9xlRhc0Cs9F4xLGW1ZrxKb1YDW/5on72/g6Fs+4aw9u8ZeoOEyJx+q1HsHppzf1CRgUuGbGLaFIDSnb5f8SxtFvs+fqGJXZ4Wj5/sbhuE2ipii4HqOjjsjzmRG78Pcvg4OL1HFxfB1NGZ3N35Km/I/MGYpcXmYJcM3x+JDnVNXHrHBv8qwz1p8idiYSAhQ3de7P9sBdC0OUeH1KUF9IXb34lkLJoBlHsgKECgB1LOUyAehPXuWseF1bYPX9GIINQqS6YTqHI29j4TEDXgGKTsndjhzFokDRC2LXogg2XANO+j+pnVrVtV19nrp6gH5sERhbDYL7lo3YhQXY7GrWKHzLcXTVq3AwjdBqo76C+iFubAqZgalldFB9ECdFsEqhgZnSt8G8+JcksLe19LMwn4t97vpTNv1DBa1E0w8IeQuyJFUCVSsm7XOquKFCQOs+Tw+yIrQV4h2/3uC7IvKN9v9PcoEsArCdnZDeGIoB9rNTnR9u/8KhDgaJdBuZsGNFNoMh6ZVLXWLI58y1roxLPMF1B3TQ+KjpKbCWPBMD1iPpbt39P/YIgQq1w+EbsfUNhLRyjF7G00p+oOlrUlv0aPuZLoVteV1AoBWjtej/bBOWV3XS3b5/hErngcN48RalD8CKmWOKG7h57+RDg4uPUceCKEXE0mr+a2mk043qacD1BGrwvxJ3zscAomiaM3+LDEt86sj0xFwadMFp4DOMMNE2xs/nqLBMi5Z+v+Rml20XQtyHqAQXM0AIDm2iMqkkjSfQfTE7arR7+p2KTzEUyf0SxSWAM5xLbgNCgN5O4C9EmYay6dslB+2ebzqdn6TY9MKq2fECrnXzmJCV6on8zOYJaDemumAJYSmHwLlI8cFDtHwvPqKwwPEMpMyATQ2vPNuI+ph2U8P7/AIlozKaoBwSAuDeIbCwMm6ZtTZLhxr7Ab6whe6xA7AHo4jBF0yEf2O5ecwzGR4vz4lwdqKHO/T61DyJhsWg6I3vZOwmF1U0ACBVLu23MEYatHWXMHencJgWBkAdPhh69SbUdF9wIpQWwO1PBAk3cq/2xBdwUkf4NMBgCkf5bn+JZ4vdlr+iUQFgDh+otWxGqXZ72+scHcIQiyTURw3HwMg5izjsjd+Qzwcr1Os1jqLjWDD8h/BvFOnAcLxHHiLDN8Y8vBzq5LxNZt+AZLsbjAN+qjwipoyNS8cWMv7ev3LDp6P7gVvPoRQ3d0P0ZpjIe6inQw19QMFiFB0X/AGAuD3/gEaUnSKYkwUbfa2VVGSCQ5SutRVritEe/IywV3b3GeYphSpohddUxRj/EEV2eIKMfIHgZXoIy8EvvbIrweJThH194cY93DFQLS0B/QQ3fdKAfYsfoImIFKgUaBgpoNQDmQq1RLfCrgtoLmrxFI5CAApwDs9xRRMdGwsvpqWIKNo2tmarLMdyu5dR7O1Tb7j2yCgaTr7F7IQJLDrdjNx9Znea9W/1Km0EY/wBZVKsRkufw7nRYqa/tn+o4A+g/65/mG3BsXV/ol1bWVvB1HspLCVQBX9TvghqHDpFHMkceocVQ3fI+LCHG3FxxYivhdTWaM2fl2JqRYizwcHHDImrxPPXB8NubNZt82NLGzMsyRhnIE/YiMxTFYUr68MGZtnIfrxATWXXm8dj7Jdrzsu+rv7JYTexL/Y/ZBDZzQB+ty1K9PX8YTLUiML4szG2FuCH6RI3DvUfyIwNU+x/wn9wG9OXb/SjLFE81v6gs86gH21O6oXp+rIjtvAbfBHfw7h2RmngZ7lm4M6olCBsVTnDBmcXOer6bMxqVyDT6L9ZhUiyQwBb+4EL6o/yHqL6go8Ft9t1F14VfVupcWcC0v3UvAHf+aZYUOr0fwYZ9gEB+0/xCpEtA6QzWWD9uVY/kCFGsMGV7o1/czkIgJQ/c7AIS2/qiYElL0/Vors7w1B+wn2kBUIyK99k+2EG60Vf3LBVkrof+9RgV5hnYle5tgX+y/AahHFqOKOLiGZMcN34T8Cooo8xTqLE0Zs/C/DaakwI8wcEcNRR1O82x4fia42jpIajw2+TGKmZiVnWkgetMCQsQ1m1f5xCejbipeLO4EU9l4YB2ey5ouojEHP2fqWjorPasT+zGN07CvFA/uhxxug/wBB2lkrP5H9Rbxky/hP8AMoCNizfgjR+4qDcisP4DNVJ9ZeK6j87kpoUw1Yt/kJVRO7l+gTFDTYKft1mW1JNsV6tY8ql6ySzmp5UeHOIFhgbwf2sLQYsur+ViliNX/wBo5uNLhfVDEcAzcv2BCKaEqjrcKMIcDh/zcHG2QID9dpifqmv2VQn9qQekLYYYBpZeigJVuxRn/aFwBI/cy5MElQJDXjp9ZlkzjQF7z9QlygQb/wDETZaRkAdQ6RctmiUR0eADt9ytO/si1/2bckIam8UUUulHAYTNihu/KQ+DeI4+Fx4jw/mN5qces04jjgzvNvyIc7RZinUyJtx18Hg3GO00ciUp+mVwZYxR7R9m5g8gutjs/wCSsYrYxfR3MUSSLS8P/wBCZSnlRYpJSw2wbwNRyuG0s/hivQE1iy813KcseyqQcf8AYn2alP7ad8auP0TFBKA54QljUs8DhMNS8gv9oWMvDAYY83EY3YZLPV5l8ZsCqZwD4YUbrswj6+EK9OYL4g/YezMDAZvJ6h95VDhd2wqKFGA4tNLurl2bw9ry0RGGT1noVhhusKBgHbY6hYCB3jHAN11Lt+pSuDury+pjA1arRWhb/UXo7RA+j1+opdLqicY8mfMbgXVbv3XT6gUh80Q+l8w+phpiDKelcSuPgCtFACLDNh/KYf8A5FIm5+7UDuYFez/ox5IQizHSRYijiuDXMLKbvynG3F5I5pHFLxHiaP5jeaz2mRwcOGjHhmzh+B8DcWSdIuJrNn5vG3B+o0RjbCvGTGdvec1Hrhj/ABVeKhR9iFsV2PMQJgkYuzTzUeoy6am60mfxNke9FlgorrUeF+YUPVtgeoXBVVnT9GYOANWg+7qoDIFwF/gF/wBxkE2XD6Xud43Yr+otuqY/zETYFd0S00KFDUcGaaoqZiV0r/CWnXKL4C9MckYtNHiUzA6KpuIi1n9xBBHuVlQPMFwhWrguiNAUhO3hWGqzAqXtUI+nuWM+lB/TUKBAjAeuGfuUxJQwsTxPDFG9dQkFHYiO1zl28sFU5WsLw8viJQo7FvzT1EypQEWHtjs2S09sepLSoqu2LS1E8Xl+BCE2nSKo488Ay48Q5TdH8LyPLfioo4S5jNGbPy7xYmk0i+EWJo8T8T4G49TWLiLE2nfxeVWC8ooOafNQ/T111hXml/iG4EFhP/TuKxbxBvP+txZyCrIvVdVCAVtI4a+4YiBsZo/fcLeQQYUW7qahtOUUPim5nQK0rKx2I6uyqf8AtH+ggQzQuxiJHgbpYDqUxCooIt2vJqKBc5LmKQtdpcfl46MzD0Cqmj6jV1GyxXncKthdbKNNeYVgZfRLVztRAn7nQg8Q+2LuEEBfn/sFFQOcOjMoIMedth6fUZpBieX6gu2pQoeHZHLRszUIBSrwvEHUXWaG/cvxFj4XsffqVeSt4WOR7Y6IB3/Ew9RQQTNeiVK4/tBFSntHq05YkGFQekcMA09Y+BCDN+LxHFKuC49zdN34nghwcNZ0jiihNJozZ/LtNeGvBw4Op2mz4Z+Bx3N4oWPE2+Lw8bVGVgTboFfw1UGSIu7N9p/U0kw9Qf4K6iAKRwFu6yJ4gpCi8I7M35x/DDpbiqdnuZEg0hd+4Fs7yUr+I0GndT+olEWmEH3DxrbTT+ZawasCX07gyR05ahfcljWQlY24HRkjYYXQZtzcIeWbB/lChRZRq/uY+KatmWlKhWdX9ygGqDNPBDtE9lblaXsomxQ+TuWxk5vN/UyliXID7lOGLDe3/wB7lhR5oD7IqjKpQgJu3jzAoM0mH61EiDaMh6DEwWDBRCWpam+mYY6of+9x1u7aqc0bfUSJ1bPJVSodT4ZWZCbF5yDTGc2ir5fgQ+CqOLjiJeI8TdN34H5EOdRcl8NH8o8NYouQgx1O83cvx+uDfBYizSbfidjLKyGweCxiIONbqv8AL/sT7G4ZOFfVGITYyR6xtptx3LXgpndHRfczBDZyNbrxEKoGjp79kCtNo8jzO+s2bammftGQsClHUUIDEvBLOaohZ913C/H4H2ruYHrdE/aINNPLKdXmbDn/AJNlDIY5mabmGxqOXVM0EuBvwISf8R70sKN+47Jh02v7tigqNHAAT1DB0BDNUOUneMSLJ4gFg1glWD9QJwBbbNejk7z0f+YpLGjowFtGg15ZTLMekGaP+wEVMmwL7gIlHDv6lAZVYXqv+ygoq1KUKCPwOD4JR8RxweIspu56/EcE24qOPMWoMxR4m/zfm04bRw1FDUGzMG+LuMfmR5IsY41ZtxfxeaAgfGuif5nRsst0vAxnKAvDGH2XuHiWWBv7B5ioBLYH/HX3EhExNK+/EoAloGwP+QABsgwgwQ2DbIMIX4hl0tgSkXXyxqI5hVDxGpEqUBaphLVKC4HcAFsJr/KUf+UQhNQl/wDUYf8AUA2z+49bWmPdgDy6gq2/kMKkbp3BryqtJjf3FXWKLV/XmXHcC9q6P4JlVgKo5XwxNgqbOj7ioAm1MxAotAfoz8SEJtzKOo4MuKaTd+c4OPMeI4pcU0m3x8/gJrFxXwLonfkY/A5JtwM0gzDl+QviCCxwc/oZlPRWWY9dwjiDTlorD1S5Jcf3oqab9wdAgKpsW+lXKqOUM0oFpectsA+DyK/UVKrwAYWrqBRsOaPU0gH1iYAH2Rd0fqKGpmBYM1cDVikIEKZshCtFqeyPgMSXGmPNyxCNQtR4mcN11cYjcLfF6GAAvK/qpa4GmOmpnSW7f2epmExYtfSDGildmk9nn3MnBIGb9yjzSeoExGxxUFk7Q+24/AhqHKuVRctX8s8kOKijixB59vj1w/I46RzrNIQZc0eZj8D4PMeJ1NPlY/AX7bXamj+rgA87tdjsOoEXlqhpe2Hj042ReMd2NTApChQFot0EvbLu7Wrv+5p1UEUqvPuLYsDTeQ9z9Vwqz6jXAKuoWIRs76htDojZshnZ6hHDiC1BpbmAaiuljdMrOo9hntgrQ59wbfmOoMeQUdeY0rVC2a7EzoK3Q4rUMdkC1PEFaqt0Ppg6KiwTR2K7jJk9Yo8RtQUmQfH+4VmQtPJ69wWgB5Nbho3ZMGnNdTD+EHgq/ibhCE1jzFFiKDwsRYZu/mIQ5nHFwuOz+U3xMcVFiHBNX8lvNYTSb/F+IJAiX9GZYVnLax9PTFU4cNZP1DS4Fs9Pr73CuD5fpcWHwAuwzZ1nTK5BtgZX15xAVhCUEbDdWfzHBCxfJgruxtzFIUXuW8LHiBz3zqI7DUJkzL9U4hAU+rlxO9wbQwTBUyZ1HqWfJLLsIho4epUlH3EAMvcGl12EXcD1cbDZjBO2VgKitYeL8SoKcoB1bgiWA7MPojk/AA7V03KIAhnisO//ADASk6a7iKdNR5Y8fcUCa0vglTbMPoxL+BCEOVRYizyU7Tf8ZyQh8zKKbflN/EtYQ42fCfgQ3wTaKXiPE3+L8bmG49tANrWH/EBbNm6aQ8e5gusOVdD7MGBkS7NHiPCyFyE+usxktnhO4gaCoWFf5bl+9NJGryOLSWaAuGIhsI1RnMSOE9RL3AMwRNVKJRAg0zzpQWZREYqyGfBGVljzFU1ec4mFLIT7RtwDuvEaNAtfUTW9laIPNiTLLOk8xJCy3rAYxhaLXQTEuLbr2lNAo+1dnqACbKvqBWk/bVS52HQ7CO39vyIQiii4KKXyb/jOSEPg3wI+G34Cb+BHnl6cCEubvwRDnYihHNvxaIosrvUmQ+kYJUNgLA7Q8HUNlUNtWeZWKnqW02vIxX5Il9u8/eoD6c0AOMgYuiYUaW1zXuEJirJsjXdY1GKW7FaiM4ZKisCKeYQULiTb30MO66iTtgmLX3DzJNbkjUYxMQV+43uX4lARoDP3AwCf4lgIq8ytb2GzLOrjdg3mVhVJs1VaqNEKoJ6CJy6GRdNHp7nd1J4fmu5iniDA+nxB2m5VlvxKUhQrK7gWaEHtSKUt/YcXHfxOCHyKMGaRbmz8X8JCHBTbgoPLs/hPgTb4iahxr8J+B8HmKDUU2/FqMTkG7BHH6Jag+d9CpQctHLBsvrMCqeo4bSb6U0d39eYoEDE3ti5mgpK3DePUvy/ttn9xt0lpAOW8vcrqMG0xB6ZaWGte5aaftHoY+4BC0pLX0w2jZMWm5nVlMV3Uv+3iUFoG4UA2WUuRmqhnVlxAMD4Y7VIQfJTF2B4TShdVLWQmqA+DEBU+H+IUEWhQtX19VKoEFNFW2/RFrtK7FZlv/Uqry2itOmfLLYltTTDRKo7MdRcRbduVfUfibhCHBzaPgMGLhj3Nvwd/MhNPhFB5dvn1wfAm804KLEG4cav4I+G81g4im06/FmOBvtH8ikzaRYIHa/cv3NXWHfsiAM4WkfX9QSiK4A+2ADwsszOBO6jBlJnUPiUClVuvUVJU8jxKpdlTCJNjFFsiljUpbzKrljr8QDTuUDXcBIiw2gjI35IYxLy1uIzVQ9ILAN3iKzU00p+4ooFD+0bNH0bY7M35xHszP8ugPo7hm70CXwfHdnfUPmW7Q3fR4EQKQ9QHfdAvj1iIhcLl9sso9CEZFUSvVb+RwQhNoo4rhmBHXDbk+b8SEHhpwGDHjt+R56TbgNHJc2fgCHO81gx4m34xmigPNtk0COQ+fUVThVQxth8sCxOPeBx3io34op6eCVJBW8V4/uozIzyGT+93Mf277UdTNAJoNS0FW0ojrCx58xUAghV1v7lgoHueJl56ndVn3Ls3A4y19xI7a+49yRGSEKwRiVT3amKiYHNp1MvU0BlYGhs0ukfZE6bmk3UxxFLyYgditgNf8iuAWpdDRg/cxKRJRQyn7l4EpYpA8HudkjWT1d3/AFL1cM5r3M7iu558yxA2fZfn1wQ5FiPhcWI7vkfwPw3CHJpwUI8Nn4yVz1m8eOFB43Tdw/C+Dg4PBCa/Hv5rRme7YE/ZKmbQHu+42LC2y/0P5liVtSaPcveqQYFYL6B8SkMB1Fdn8HBrJwv1HNNio29VCJR7sN+I22iseCUxkyzBXQX7cJMcbpqD5K1deIIqinqaav6hnf8AlMl0xqtVcTCklwogEi6tiqs/azqG4t2BsVSfUzpYbWGrUT+5QpbTJ6+5gkqw0s8VC1inDJqJD3hTnrzFtCPDAcDXsbjtzvh4ZQKlFlMr43mfYZj8jghyLguFiLc2+XXzIcGofAKEdcN/ym+LxBjg8CHwh+RztxNTSb/N5IqIWH5VkfD0mqBf4v8AiXuayFh6frcZZzyKKLzE0ClEspU1AWUaa/y8QCNhYqRa4lbMMcgBtW8my/zFpp4v/UAihlq9xAOKDtUTylL23D2V9QBZlOzNI1KziJxUK1MkBQHOkjuCqlCUv1GqS0E9jB77mYAdlMDDa6jaAgdtD/MxCjlvdALczEjAmivKxYtS+bMf6lvCVD2+zxMbBst2niGQlW1GbG0dHc97AfQ18iHJwc2i4XHidpt87+RwQhCKEUGPHZ+L8mdQ4KoooQuWybIx5OTgm00mk1/JPEJD62qsBftQwXrVY4UDNPWYKmQq8Hwxt4jBQ+/MAaDShSN7fP3Mj7xH+R9QH3YMAPXiBvctjK6KmbCnl2epYec+IkBE+9wfAsFT6KNwx7iaoxEvpAMAqByFQPSwJQV4gigoY7DqJja84gzDBhqFUmBdrfMEEEMsnk/XqYLFB6XH+iJcKxsDOKe5aXFKK1ljo6mVH7o8LDoHq+pfQp6z1LMqCF9C3EfWpV+ZwQijhxNcKK7m35TghDkOBHXHb8nXIjjz8F1wbPD8jkeAzSbcnw6jybjWTzBAKfzER68z/ohjCpRgmtHmHrQMllAyepbKDS7v7dw0BTF4D7liF6L3dFyplWOa3W5UHAml4/mDlsrscV9QlzEUkK2lf1P88EMGp0+Y+A7kS+pluo4W/qawIdkbJcSiMOyw6sYf7iAvpRbA5rXtefr3Dmi5sW/3LgrS3TUBliXTjHmBmwXYor7mjCqhtMbzAoFqfejr3CFRqso/lEAmy31FtYKfa1+A4IRZ4kcHhR7m3wI818e4cEN8hwI8N/8A8BtFHHFybcP4TgTSb/Hv57SBTZhPTdR11V+x0SPaXMhdvUEOfY7o16QW+6FF+SKqCK3gbslVfWg4v/5AJdiRHD39Qq5GOQf+o5CC60siBbU+JsUv6hJT95jVV4iwaruAMLDuUNXLlqyhLlZHQELOS5SGFwqpQCBem4Azp/ULtEdAs0GbmOIVq2eRM1C3Wc3G5hF0FsiKWazVuvN6gtEB3TLGwXIV+oUpGZeZEwXfbH5nBDlIopc047f/AICEUU2hw6/DPyJtD4BcL4to/MhwbhBjr8opBAHqiH+SWRKgEwib9JBK01Kf5jKBqvPdn1KpsYr10v6jspILf3LiWjXr2fctk4UPI9y+z15htVxx6igvT1BN0J4e4J8NRIp9wiCLi7kUeO5bdteJ1hnzCpeYhdK8QUo3CvTMyDZMwNwrpQHbAN2Y1HZVkug7gTXCuukfeA4UAxCg5Wpl9sxrZ/SYK9jPcVmqvFviagUCHmhU/wAVH8RDiahuDLjxx2/L1yQhFwuKdcd2P4eviPkC48TaO/wHBvgTT8Dr41uX9Rsf5qHQI5HzL1KKS3f1+pkVc7Uu1+jGU0q2wtUfrJHpCKHbcvcIpppPHqUDBqTY+x7IK4xpYwpprtlaYbfWJiqWO1uC7R+oxFGagF9MLTX1mNFtRDpxAdXZB6zB2JXmyTdaEyXEae/EFRCpvEBZTPqZVVcZtsYLa9DXliSJV3rqWgojgFBfqBtqCy0eP3ENyFxCLOK26RglnNBlYxLT/dfxkOA8DLxNeG35WHBCHIcOuG7H8p8Q0igzRm/4yEImPg7+D8CPiKHWXTcZZM5r1ZuGABNlzV9ym2jQunn/AMwbNGhoWCTh/jKBBFrF2+E7lEI0r1LvLQFVe4q4mQWXXgh/aKRCDWXzBqdsaGseXGSpf4hV1XUOUvk8QSz1EXd3LKVUGqw0Ophd13FsByRL214K3AsGmumVHKotvJ9QZJa/lhZNn7HqIu+UmUNACAhRTUZgLqoVj+FqP4zkUIMGacH/APAQhDgQZczm7H8F/iAcCaTaO/xEODB834ufsB+mEUgjvIY5lUDy8TLXVoyV/wDYwtTWTL0Sg4q7Fj6f1KcHNn7cHqMdJvb+qgbEFjYV0B1FiseqiUTZy6/cK30mJgistrOopoVGvV7lrDFQKUhFgMzIoQ9XCxmfUw0cvUBpLNhGS8QHQUaxCwpvqFIArd9StBbVYo+5SoHomqikQKFOkgRQNKO5ciI96QVV28B4grrSH0Y/1+E5EUIQ4eO35u+CEIQ4Ia4b/OuHkhCD4AQ40m/D8zg5GbR/HkkojTtrbof4/wARrpMM0jt8AzrdPmDWFCwp/wBwylWk0uUh88iTt7f9R6vKtovIymTc8MH3AYeQwsLQuqJMh5lL4rG/7Q1NhrBiCrTfuVdjAWsSz1MFgmSQRPAYAGVj+4BYLu7b+pjVMde4tlA3FWZyH7gpV4MHqUFMrbGChoWXEFti6ICsjPI/xE0Fpvq6qEFtBolghlHsF2xXSlQ+38BDghuEIQ4dcNvynwIQ4E1xpxd/heOuD4EmkNS48TeO4/geCEeD+MaYBEaTNgZftYn19zUAWeggDCQBsNU4i9SaS5KdR0T19PuJyjTMnVXvMTogytM/V+IScl16iM9FTtgFkrabZcJSdRjxuBhjxO4dpj9wPW4KUygEq3qCrt7g3ZghTGYJftHTaeg1GpbK0viEdl0sv9xssR/iOigZK1cwApNDn9wZQUKDoWXINvfqU+pf9pX+4tv4Dk4IoMNS8ReLv/8ACQhyHGnF5v4nByfAHA57x+ZyQhH8wcrYvFrfyMVYXW0hgS7M4r68xRmKLB9MxKJwuvqMGqWVQnVS7KwG3SGa+239wgQF0f5jBGYC3kWSlqa84qoeTIazEvgLcdfJ1dRJKJKebP3FLBKlUQMWFEtKGPMSuSriK1oumJFSqQ4AZSmWOFTBimZEM59kYcGpanRBm7W6O42KEbqZSDEx4A3HAd9ffdQ7ENeP9xm7L/Av/iPz6hOuCEOBDh4u/wAxwQhCbQg8acH8pwIocDgzdjv8RDh18Tw/NSqi1pXwfZcIFK/3ENDOqOmapY6dQqinLHcL+oIwMhSeQ+JW0rVZj7ktQqsxdndvmBoAoHdeYi1l6O9xYASrd+4TBDxncAWzTdxQ0+mPUDJUEYR+pe3UZFgYt5cSo3T+owqhqD+A3KFGO3r6mByrUJD+xqOoVB0S4W21MzdRvrbFFlenudZYtPtjax/6xCBVm/Q/8x/AQ5IQhB4eLv8A/AQ4IQYocj+U4HAhDlux+ZyQhHk/j3wHa99Sp5DSSwWFuJgTIbPcqushZsdRQkPahsJShTF9dRQErsf2x5g8AtTMtgMFR/ErLZDUyy014l10vqVOUsWbCKpTGmhQX1MsqPqEo6bahqdmgjE0WpdIA6GIVCQdl9QRlSRMg8B/zNsFlUFzIqjREJMruZQeV/6gFAK/1DBBSfOWv9fhN8kIQhDh4O//AMBDghDgMWOL8D8JCHDSG5ly3j+Ih8gfi+pBhXkg24CNOyy8zWroV/yAtDkpP9zCIP0WKggobac/3Corlv06r3KwkFTav+wcUrq4V5vzDth2uK5DswDFvUJVUVV/7mHQAfzMutwDHUKqgzOwIA2zYFhg9QK2uA6qCKCD3L7UFMeoAi2VK8TO4gVWIvlgAxS8sYIcDTUHIIGV3cpF1la1EXlcEvJUbwuf9/hPiQeBhHg//gIcEOCDNeD+UhDfIRcbTdj+Mh+d67P4McWh3zYY4Cl6p4iNTawPZ1P+SwwXKF6CxbMRgIUwVn0uGNVZUumzxGArbs1cYaGdbyH/ACBYCAzZuOuwYt6jQOTSOo2VVzN/5gi5U6vqZNS0KDqoi2M+4NFC3EOVDCvQGIqUlFWd+2DWAzd5rxCsmbyBmLtRt6I4WULGoIY29QFZDt7gUv1KwGVgsInKd0r8JDghCEIQY8H85DkhCEJpwfykIcDgl8d2P4iEI8H5dfLJqUslX9kr9VMmRLt6l8B6fEF2izb3KpXSzcr3DHQK2ENBNmxoeJcrgSjVm/5lmYWKjSOkpz41FFkBgou5YLeFR4IX6j0hNztq68sBrj3MBqEyGevEqmxXUFVQrLdSUdmtEwpb406lwKv9hgCw76I0GUHboleM4gVoGwP8zAjh78ERAqiB9dsZ+1z6t/CQ4N8EIQnUvHB//AQ4OBhDkfykIcFCE6jm8d/jIcL8H8OCRMB4e+QfwwG4ZGOAMo6GY4t0+pQcapde4KwrLDAt3FNp2Cy8zq0Vm7a6IIktLWVwE2y+uodFgtwTBmUpQovMRYAq7it1KLczhuiXGRR9RS0rBxIKgBpjBQj4gTQADPqdoTd6jCyOfqXopbX3NhQxUQLbatrqXFQrsOoeOEReqUdnkr+I57hCEHPwP5zjXBCEIReL+UhqG4MGK4ct4/jOuXPxfwmfX3oCn+oMLm24rwMsxKbEkDEvpMNwxAHVDT6YsC0gph9XK8gFoYuakq6dTWPIs8yoRRDKLQK+RqFBYY6iDgEHYCGMq4iCjTohSlxK3i7cS+wJXTDACxtiVQL/AGsMBbb3Bo2C7blk6Jd+oKYNj9VDWsXl9w3uHk7YaZFnKeI9vAVh7UPxHJyQh/8AjCE65IQhHi/lNw1CG4crnbh3+Mhw/mGhfBQUD9ixE/hUcV91GlkaIl3MdJnbAoVQr37iIYOJb+UrlG1Nf5gSE3ro9wj61O5ZKj1LbdLeYNlscpc7jZs1FVssJVZZdox73CoB3dxA/wAoX36gSlqeiYNZjZEmwrREdNLNOyCr0L234h2qKFqwo5jv1CLrRiNbg15N1/Ud/hIfAhCEOW3xp8T0P8T/AORD/wANP/gQ/wDGT2p7sP8A6p6T+Yf/AHTzf2h5YIB4EH4fxCn/AISkB8s9jF+2e7+U/wDc/kIQhuHwaTZj+M5fk/gJiFbilrfSEUIi1uPezLEMNFd/7iB7UdIR2/za8wwQAuhcEK7SWz+4XmVo3Xb7gA6WnVd3FhpbuBNGvEHrLffiX0tmYLXC2v7SkFKuGp+4zg2O0f1eo8Dp6ggBN25qZKxFqwv+CG10r2nUBNHHXUFNhdeSAFllbIZgpdEcc5m1X/lBv/FPMH6T1yOyses/cKc/2TyfwsOz+KVNy92A9wf/AByA/wDgnm/kgfT4Yr7/AMsP/sgHSeOT/wCLiUzR/piWoqtfwSjw/iFdB/EbmblszEZUripUSViVKlSpUqVKgSvyEIQhwNcacX418jlHwyzt/EF1/FL9fzp/9xL9SC6iEx/Rxgnf+SemfpCqQfoQdg/uN/oovoV/uEKdXUBhp0xFx5BHu4bYXUaB7R37i27u2V5+pSkFm1Z+pvRQpZzEaZMxQlbarrzcYo0dy3niIdCpm9peY3BqYAfJII4gtDfbCYpQ7ji4y9uWMlW1VFbQrC/VrIpqFBx9RDSKxWq7titTYOlHlmW9z+1/8Ro4iRHio8MqVElSpUqVKiSokSVEnUZUrio++HhJUSVKlVKjKlc1H4U+Jbwz3P4nvfxP/nT2Z78H7wT/AM4eB/MPB/Kf/Wns/lCYRirX+IPw/iB/+JTs/iKb/ph/8KH/AJCHa/zh3DgPu+4r8v3A+j+4FM/8PAtfwQHEUBr+KA1/BDwP4lPBLrBPtLEHO5fuXHXFStR3KxAAsA8oJRNCQHhS4rD9VM1VjxALW/ImuN7D3MRAHo8ReYXiLNsbpEmVDqJOh9+oUvlInKL6gpTg3mGbt9XA3f8ACCFoPFwdCtag5cG1YhVIA3i7gCXbxGr9tHiC1eeiW3h2Z/uZSnwqCpQTI3MiNFnuJoG/8RrMLo/uMuUGe+/9xIkrEqMeSBEiSpXfFcViVEjEiZiRL7iEqo+vhWYkrhXiErOZXDqVK4qIxncIB4h8O4XKhCEDkhwualVCG4HyDi53Di4PBCpcJfBgzGPrg0h2gfpuZ8KV7qn+4h0b3cDGhRQwLCDwXBl4Sg0wW0WQkcwoxvMa9Kro1XiUoWQ7S0HTeZcMB8xKoazcaKLXcDZKTzBuFLRcVnPcDZKx3M0CYgOi3cqJ6xiDFKLWe4dBYORgAt6YF5YlQlmoNA63FalHqApbl1GVFKE8GIyokqNRBjFdSqmZXFRJUfqVwxiSomZUTgmYkrESJiJK+FSonmVE4f7lQIRIyoSuK4IEqVCEPgQhDglwYQ4u9DF6UMxO2oh2gg+zFKB+Eq6SnpPViPYRDUV9GNUeWFW/4ogco/UCA8zCRlXNEPEVtGjbmis/mG6DHgiswsruO5NtK6jzzHphLiALtbABRXStzOEC6zuUipfd7KmPo+qgLwHu8kV3Zd+5dZd/URd3v6lGsOIGTZLBtV78QGqWvcpti2g15Y0I1qKTBO8yrQ+4SRLax6gKl2JUN3tGiTQl1C7dW7iyV3m854TE+4kyiJElSoE9IH8ypUZWZUrMSVmVGJE49R5qJE+KTM6lSs8VKrn64qVKlSpUDECVwQgXAlQhKgQc5gx6JGyhWCMIW7l/mH4nhELogCgJ14gbxE/uGLZhnvPJqA9xbqp5IK6CAmjAdIrssWZ/gj1gy/QkUMpBaH8QNu4NkwQX5aicOxiWXcuau9wLWA2vf1GKrWjm/UxYF8eEi1RbDEAotgURXNDzuIiEPLKQVRrxAWg3cRyFsKWFRaAZYNFRx7RcDTVeZaHpKC7Ioe46KCLcAoButEbJo8EWm0OvUyHRo8yko0RkGSv0QawLqHuOscMJ9RzKlRgYlcuJuZneJUqJuJElRIkZUqVDXNRI64qdQMxuMfhU7n3KxcqVK4qVKhycHJAhV1YS+BbBHxMsWD4hkJzBDhDzAIj7gMBBnMGDq4qBmmF2MenM9MtyTIzA3B0uX8RK1EvGID7mPmNG2D8xu19SKZjXrC9wfv77gNC306iUl2i0RrDXawKZfSZI4rFvepucf1BMnfmXhBG4Fh8aiOartJsAld3CAsAy3fvUTKEpIB7g9iQqUZcYq2nczDb9Q2RvddxEoUuIEyy8xktXeiZPBCVTZR94/wBygTMSo5mvuXz3KuBXDw8PFZlSp/aVXCZiURIkrivEY8Yncd/E6lYzCqZ9TTBj5jnipUqVElQlSpUCVzUCtG4mP2RKqsC3ELJZBxBtuJF9RxMv2zyJS5g1AS9XeiWaTHODDRFOkm4CaOiFcJBeWJiElZ1BBalbDHmDkCS5RKW10ihqJXUStJE+IOzZp1YyfxG0rXcvcgGZRax2QB32KTzMyXmM+YkN7zGYh1N0RBpbY9Esmz3LBFUKKcJguL6yvxBtvLxqALrHuCUWVGGSARQ/7HiNXAaW9mUZHLv3G2YGCSBR1M7LUPWRGUBn7jLTY/dOonI19cLzGZlX3DDHUYx1AvgjOoRiRIhKiYiRJWYlPDKlTqO4SpUX1KuJE5OP1HfFSpVSpUrgJWJUIchaB3CQLefiXlhXuU8yqgiVyillMA6JrcAg7gvuIdkHzKGNrCjKdVYa7gATOFpkVnRABQnTGRQrCrnuTniL5vLdQY5hWXf9Qvm1UvwIoi6fG9I5Ul21CqlSI6lESr/ijnBEdIRsh/EuO2tR1iISCmix16jRUNtV2RmVulLiZZupTgFXf+ogZQTNkTYGV3HR/tC2IFTtsuUiWWwsyECZ0CCP8YuF9koZdYqCWi1/JlsFVepRptmElQqLMoDYURUUwj0VbPolDpGJRUdxMSpVaiXKjM9/Bn64dT1KlVHgedx8pUSNd8JmVwyoxPM7muDuaity8c9cMXjECBKlSpUqEJUebqUFKpR9yzvNz0DMi1AauK8xbmbxNkIFMxeTmN2244ixalZeeoZkQP2RF3PqOgCZw30ysALB3M2lRRkEoJQxDnWy1mOBsO46VFL6DEqUWYl6G0CZrqKfEqLemI7H1UWVSovdkCvHV8eZR4J7h2ANLRYuemWoPgFrdRFwMPVl1NLVKZ8SxowSVSAd+5fIEw+/qZS1GH9wuw29dQQm+mcyotQ/z+opCvQy1WUZjY9xUykENNPudIn2wRnLqKKGTZCgbWOYZAVgJ0eZlKtGpV+HiyUwXY7jRAzKw3e5QYMBuOsmoDdEJvlTUWbX9o5VHghmmP7JngPJuPJReXHDQV7KlibOQ4qVBxuEuXLuP3HUSyViPiNs7jGMYx4XM74cxvUGGtTq5if4j9S+OowJXDzXLqXysXKz0RsPcRQSkaSZ3BRBCNykRDKErO2OZF6jGqD4uGhCrTzBIRgJlnm7UgCoPUpN5WbCXwS+XDWIw0b9wv8Agpbz2/AS6KfoRQoagiJN4Ro9lXfiZG8iMBL9pGnqWeuQulQkKuuz6YnbchSTEvV3UvWZmPT7h2mMeDhpkSOMuvHibxop3FuNfzKSK2dFxBAeDmty0iWddwXU0NEzQtmkGrlorh/cF3C/2JERf/HiKCt+42UUYMsleo+EYi4D9wkFREjcgiTsdOoyoVdoGSAKGDMINimIcGPBDM/ghYql7B2/lh4HIRxBitxiqKO/M0dHUbP5UCBEUFU9VMGqmUJb5PsktDLQtkSUnin/ABLfEeq/5lviHZp/UvMd5CD9PplC4YYYlXAqNRmuHU+obY1Ej3GMThnWI8VGqwRmtQfEvxx++GM6iw+bHfDwvDfk2J1BkNofYU7PiLyXqq/p7gCyKiG8xl1f1KdalmeoA1Kz1k8coZCXyxWJtFxFu6hPx5kXA51LsWaGPOILDm/EUB2guZZUjfbFoQHF9MdAZLq8RiFBplfOoycl3cIQwMkJzblbzGYZ6Is1+vUZSIeyRAGnJRBgDbUWlSmdSqYWFwCXKj/s9t1Lh+Vnd+pWAULyi2MzCo6ZqFB77gh0Y2VyWHcpZT/VMOj7QtQtxCWA6isLax6fMpIYO4ciC+vMSLC5mLIl1PKIXFmZeRTEUim/UWlKXIozL3H2NdVCaJbcsE6dwqtMvZon7YgASH6bQZ8szlQrc5iFlxEW3Nrog7ujCnxv1FAZ8i4y4xptAEVWjYwbZJYsTpcv6lpXdYhcCf8A6DChBImKBmgxNNiYj7gFXmUXV9S2Gq0LV/hgLvSi4YorSafQ7/UtKU7sn9RSmPDf5T0zx1E/c/qbZ3H3GJmVK/ng40xJ0RxuLeZqO8RJW+NRfWI3RFzUfNy51H3yfK4cLFi5jhN4IXQB/BsQ8FYDg+SMaPEVi287kRkGwUkO9B15i76lrCbLtbzL7esLvwV0Ry0B0HUtkdyhabZYsIznfRLOmYIUMLZijFzsMSnuDacEyUm67hKYPm7jEIUhNqxiMGgaFR2w/wDrmOHD0xIWGehGYmqY31NZht/timBarBe5eCJVwz4mDzXRbqABrSNkKh17MkZV4IaUojLOnTKE4Ihgj/kl6CguUnQ79wVK7NiRLSjq4Uo+G2olrtKWkNS9dl+IxaWvuALtUo2FPplItrDmGbzBYQsTqIXFDNxb4HG/EOqse5vJfMeiv9RKNpvuOTSAR1BFG94cEcNEUmooazqpUambRLn2Vh0Pki/bDW6na9sxZEJWrirgYq3Y3UOGLIv5IpryFt6IayCPCvwRysKtlZ+4wVOPZtr6R/IirbbQEFbIVc26j58Rl6LHpQ2JVeTuPkcpsdEpM4TgVBFAMe46Euw2MMcu0lv1L0QNVklbvGimn+GOkTJhlQRMRj7ix1KMSuzhZuXGV6lPUp7grqVw+P7jfmf4hjrh++O4yvEOGVKlVGLmLjMWLGGGBB3Sh/qBWZWNfVD/ADcuU+j/ABZj9kultMYN6wZl0femP8wZXMK+0HMvU7IWLEPbGUUzfQ+o0BQ9CWoAAVgQbAMLWnxGeUR7JYQKbV3jzG1n3jBE6VG2GwiKHiGREPH8IaFowINNH+5XAN9IYEANZVHUWT9kE30XxDyoMnRzCeAysW8UR8dBC18IiwRWwR3Syi2P0nvOalY1/UNhsNIyKFJNQ+zLDWDcWIiX+nqLx2Kouo1bh07YY2mqvMqtEh3LFlEYososHtzBmW2pVjKERclEqOkpY5DqDYVdeIqlx3URbFleX3KVufLBLaz9S7KCe/Mypfb4nsGD6I1fQWj7Ys95lKt5gclAbs7V3Kg31GVBpVfshTKVjQ13Citm1P8AJK1JNqY6rwwR8OeCvfuNqSEZPt9xEse61+5UShYXsDac5Y/hGpUXUNS/olYCzKyrY3bG7StZASF0B8wSApRsO4KaiXOitws5HTcM1UVZlYatKbDn9xC7Ua9wFn7Q4Fjl0kCsRWTs+yIRx1HUBmpjuOXESd4jDBq5WLYz98JFxccxJ1qPip+pbLi74uBiPqffPcIxjuJwbjHgxYitz35pUz/22/SWR90la/7WRcJ1gyHi1/xAlNdCX8DFGtO1p/JAxijpKjNXSTYdGNC8yteteF9B6JV4V+Zber3S9wsal2aoEtTz9Si1Bsmf3gYOCT1LsZeWbQoH8RaIL0zBCt0E3Frc1aQjt/wQi1cqvqCNLGBmfUv6pC3S4SpVwFkpbq6BqY/ws80uGCh0lpgNHbwIcAtzsTEGG6fb9QbhkMj1MfLreoGht9FwwFk59+IngCFd7hBqV+4UAAu7gbdrxLpDAqMEWIMIUQZ+4VbB6hAP3mWgOqCu5if3CXCzxES2CE14MREo7g8QNwDEroZVMCpDdIY327WoIwZSF7vYeotByWhD+IqLSlBQfUNjIc/9SkrEyeoioFUKKxpAznphqobB8xTE9iX7j5AjgLv9RCdvYkKZreQPh7YI4Ku7R1aBNS1Yq4joweaKreXcJ6HmV8HFSPuODcEgBV2j78zDGdCo0aBeosUuIACUbtiHC1FqyLwwmCgCM9X5PUfcf4iZgyxxH3ubTzHeiaEunzLndxT3FxCOo6lx17mJ3iOdS5cuD7xBi+OO+HEY5iYgiVGdTKMXLxadwZrD8EP4uJFCdPP7q5ov+Ufw2QRop07+wf6gAUwFfxp/mMiI06PNpjdOPS/5QlqCXbChf2Xx6gIl22lL9RhVfKzOTuPwZQaDpby+I+SMNAik+UdfUWmABRj+It0RssH/ABHL8WFefMaVr/8ARi6xsrqMDeUaA6rysVza6KB4j1lVlmULV/Z1LQ8qleivMUY+DS40wdLdrt4PEpVA2MegDdTDSKr8pKsx0XkhiuAywMcKoDpfqX20MbyuUFsfuERUYMNJU1kEgkrHb1HhGfcRa/4hDkkHaVCSXTxqCXnaEHRQUVRDFUB79niWEWQhyvKxCNVA7ITAqPUBj9o34dBj0fqKuePWf++Zk0CB3TAcKRTeX7g+NNGdRLvglKYlL+jfyqumbkHLY/uX6LejcXAQbHAxUO2Cpbv1MCZ0y69p1LYP2wKgkuFkPVQqbddNm50l6T0TrfuCnEAzp3S4iaqDw1Fr0PcIMLfLMyrO4TKuu0V5qj1DXk4G1vAr6jAO1o0qyWeagp3F/cY27jjzcZnxKoblP6heyPdT6mb1PUYvUXWJ96iYfEf743BlyyX8PqfcYkrPB5AI74IwVGPztlwZ5hS/qHkNVCPGDAQQVrv7lf1HVGasH0BjSrst+mLFjulqT/CkoVnZ/uCauGQBrzLzlzELZQHQZEwpzK0vol11Cl8FKFe8xsP9bF5uD22QNjARM6Q0T3B6u8OPZ8RbTcCrPn7lUvllZ9ESCBagfxL3V8P+DH0qtf4MZBsP/gEGxKC0/gIqAqI8KPZb++oBtsWJRPTHQh7xBGEYCz6ILpF9w83/AMhuJZu2CJKhsc/tD2JYzj6RE0xMGjRleBX+Jlgo1DG6nVkTD8iwmg6b/pMSBqv+QjoyGgKMRalFXBTymCJnh4E6rySsVLAsPuAvevUHoXnbFUWO86le7kq/kZZx7NEdnTGzpoDdl6ihSmyVaW+ITIKYvle4gfXd+8tBqZtiGCUxddRgGLNsVfEuUkVbsZRfCJ/YiVUqLu3j1ERW8imO/qMCeRkGKKQAjhLuPUlTVap0SoxbYaogjRD5csVbWSCM9xkxfDApwUxlLVSq17v0P93HMFblPHD3mB4/uViOvcXPuHuOjl17jkxHGMTzc9Svcf7J/mOc9wgvKcBly+oT643KieY0lsWN9z0xli3rMUR/LaQpCTRNlB/FwP0Kz+UuZrvKr9Cn9RrZ3Yaf0yw6DCT+aSLAk5C5/CjLhQrfvu0yTE2P6RibgyrwxcG4Nssc3oW20Hx7jKwneV9vV1iXsq+RLBlabwe6zLPzUdHj+juC7hCbtrT6x6mNi63Vb9wIEzQLGyAGvMUHtCxepcAe8SoFAPgao25x3DZPbTIOGnQxiWUUjozByrFB5h8Vaha56qH40KWwvun+zuJrjWarqNgGzVj+OHQfTCtpC4+Rtw8HiFFBHIzsN0TJ3IMhZVxwKjxZDd/UeyI7yIVXjIkIYGVKtsmWYNM1WaggF31FQwMt+hvFfcVhcMoPyP8A0g310CJ0k7OxjHOFLTkH2SwQO23TTp+4WJNWl+Fiisi1JCD87gFqUBHpGCDsEyhpvSwFW2JB7NauW3ItpbK8eodbxY1l6ItllZS/Z/yLCusG2ukQ73Br1ATFURyrq+ItWQWtYIrjnlXcFl8hc46AHF7dRXK+ztm+wyphzFxFrU/UfuNl9RcsXWIvncXWYy87g4i4xLj5Jq/c7l5qVKvNQ4gIZwk8mDBlxeLn64oqJiJbLZT1Gs8/c8EQ2RJX/wCAU7jjY0ncyg+6Yv6m2CUGB8ZIIp7t33ao7mPE/oBf5himVTT7sIrowUZCeKoxkLWwx/JF6M6Y/wAy3U7lNevkzd0dZxvxO30ZA340QKm/nx+pQQUbKmPUt13FJdrxK8yMW6JZ4VQU0D+Nzs9ZYgEQbGyeYsCzTsl/TFFqTN3cTSmL+Xb9wJhEwBpaGu8xxk7U3EQhVZO0xKU3EwEPOGr4oshqh0/6lrWRlbTVNj2PqbQKXlmN+Nj4/wBy/fJWqGcfXUKKDTP0kftNmYBwfpBF4csv0RYIETwYA4qspdru5WZWiW+bv+pScVCTqrzJSDLytt0X9wYrYZNeQlbk6Ku6GTzEm/IoOFNQJkOqK9v3G1xtmvIuPma32WmZXllvUGs1cLLRffQQeUi1fMyRNM4A8xZABWWJ2xjmHVLf1e4ItgdzMc9FSk9EZ/hKGzQJR91FLXwDLLg1zN68LEm3CfaHf+ozFFZVHQeD1FH76mDiN2lzANVg9xYv9xUyx6lneov8S8y+8MfuXuL4ls64Ywqqg7gwghZ5IQe0IPfkuDiDOvcTFxrUXhIlgOMVEzLqI9TwsQ1FmxiRPydcEOORTUFGzDHxbPC/3Dn2Kv8AkgooDtV+bi2UuQn7rKUgGz+wFkrwG6U/w0ynQw0pSd0wDSKiCrxEXzrsbYV9zAjyDVuuxoeI95N2bS3f8sEin+yPz3ONPBYFzWFbGKHf3AkGYesq3V4GECwUjMKU4MVz9xWEVYuPLgkgVQdxI9Xto79RsiSOx1YQgg4Tg7I5WmY667PMCQ1RjfhPDLJV0FUtV0OoCBZmvHV+YFgFVoHns+6mcrfPhleF/DBlSNdp2x1CZl1UMsZhe66X/EfWFWpX4AlEDr8MsJ/zFsinHTpTzAoLlgfUEwQv+gIrW0k0xvVa7VhhTXUPQqrrxHaWZFhhXEZIiI7E/wBww9bIpVVHEEJOz7+6mHB5IWDAWGF9sHdLBk/axVLDasnUs7Mf3BFX94L+4PEN1GHF0LC0YY/pF9xtVS4S9+Z1wQdnUNep/REbqVjzN6mpfF8CCVg+AzhJwqVLi+IsKjkjEvqWH1EpiXio/wAokf2j2UxEfBiHUUdSvwNWwbXUILbMYUX4mOulJTKH01HqIqkTJHaFfI4t5iCJslXoaoVVK5/az/Mu3t3ZtA0KgJUXjRrJhP1aQv8AifcTgs/qXDJE28D0RGtm1LYZqhaCCi7/AMZVlh7WC1U2tAiEldBav/suDgfJefUMCVJS+j+otvDOIH/KFTt0INPYYxBC8gQ+/sgNBLDkPvzApf8A3a3KcJHRnHEUTpaSZVrtDP2l2RqjdDrMehi6gvomyNQsBLsijR/f6ini7lv1B4KNga6M+IQyN+h/4gxkNHJ7/iNH2JG0GgHCO3T5xkYzouVP4RkkoEpfit1BTTBYbgTemqiqpZcSZGLV+pZ3ZCaf4lg2dD/1uGoDfegv1Hiic54vMGLMXH+ILFXB9o+W+Qfcv+5dMub++fvxCr/7OpqXPHwv4DDhHDDcLQkgPniZwgTEyJ34jkjeLrWJQ+vcbmeahlMol6iW63HozPTENjE9SokQSNcsYUL+YmyDoCynsGvMrHttsAHFPnzN85Mm2ht2D+pfgac2lfnGp/WooWhXrZ1yGcrSuviKbIZBpn2/5EtcbF3Gch+wxVVKV4hZaI467TxeXzDIoIDNAUtYvCv6jAE58Q9dI4cCxV9F8TPOmTpf/kT6uKEcAtpKP9S/+k2XReCElB6oP3GkiDVDI/7iq6jEq8DAdr0sr96iNrEHCmvLCAkDdGn7mMlMQQJmunUySQwepTUqdXVy4uFZd/qADNFCidWmnr9xL8+gJQjxKwidEFZNUoqsw4fI5fuvkD+4Dwuiorm7EpelcsDAlg1aj58zvEwxiK0q9rcGaRJWcQOG039Q3PCGCYHqOzGLTbxCnAtFhG3C+I5YiZzMfuWdy/WIfB+RLgwg8ucrCTMla6iks71BBqWQZ8zJ8RYkWZTcMI9wq8/wQD9m+NfUxeP7mP3AMW2RXWYHmYO0XS6Hj3HHwQNLXndeoVLVDAfruG2lit1mXZn7lcPsV0Lg/ll/c1smZFq8tSrKH7pOwNUK/MKdwHRfuEdn7zAJhoGZRjTxiZZLvJBRQf2gUoK0CSgtTg3ChqKlkO3+IpwyhzeHKdN/1BxUmtgLz/75ggtqWYv2Ql6iVaH/AH35ilRk3Cmn2H+JaY/lQRKddZQoCh1ZUxWgeklFAvKJSaNeFYoLl7vnqFlTUFITG0W8spFE7t/lEyhGP8PqTGsPFop3l4v4JIN6h+swBOA4+uF7xH+o3uozvPFwYOGDBqW1Ly+YtsX+YNYYJ54MB+PrklwWDNocZlDmmHqZLlwCe4i5lM7ox7hCm/cr1cJVYiR4J1GNwyDrMTRTPb5igf3Sj+Zb6GRgC0X9sTHsWuNqgidMAjpeY/dC11VeBNt+4WMKFzAZbiIkvQg609Ax2hqDEY1bmO//AM2451gqv+rlffR+8MFd+5Q4uGrPgiD0CpV+SAHUk6aLX3dQFb2VW0Nu80nqLFNHi4xan7R3l9svzLl8EfwkqVCNO5pdYgY+5WZRcqBuBTcrMezqJjMqPqVxmoLx1NMMuy5dy/EvxDLB/Dfzvi4Mw4EEHtCST3h5rFBhi7qL3ti9ZhZxtlD9+YmH/ErEodExujjPmbx3ZZSERHsUX6MrLlNhgKjb06l0vLtx7LwjZMEVRdj0+BpPMdYh35i1GLWYV5g7u0+ma8v3L+mvd6jZJXtYKJdRZsZUqVK/A4gN5/ggtdl19RLZWRHk+IlaDYwQ7RSTcL+f1iCx3Q3qonrPZ4rn9ny2zMXdS6i0q6H4azBA8yocDuv9Qmi/3KNSs5gZmmagFZlfzO46zOpXCTr3DjT3GoeIPGoOMS/EPkb4IfjuXLhBBAwx9wztmTngO5cHBFxmX5IOKqP0Q/uBq42agImXUS8Qa1ZRh1F0qrcUMV68QWk7wv4tAKZVA2CAvY3/ADA1Vds2F4t1fmNplzETOoUbKEvixpYX7RtUiSu4IsPlaovqeFgerj94p7V6ivabXXpf+Rq2Wea3M2g7qMsqdskUnQaZZICyOw6PtgHG6jJD9dQtqAnaBtJoEvi4P6RBUNIhgrsnZKNJNo4ZbBbxtEtUR0i3uZlntWI3RzC3+QjQX9K5C2iWrYDQ0OzCYyirCC2WAHtWXwqDXmsDHk+BKlQIcAg0hGXUMgDMC7UxG8nAK8Ymi417ly7F35mOH/25vqV4lSqeUgfzP/b4YruHPXz7nfN864eL5OCXL47lwfEGH3HrML8WeONyq4rPqUFaHubFqpPJ4iDH+E9PvgU7Y0lqHUb7Im0ixGqjqYizSMSLqZtTRUQhk8Hg9whVCwL9K91cWVQqRZnBvkHJ/ENDWmty8Qi7axVDhfaCwikXoOqN+7g45vAFYiNg2YVun2Riddrgf3LJT9MNFoT7Zj4gvdX9no1MwJy2FfbGVhd9qqbKm1EwRD7VT68wQ0ESeQs76jUybVYK6JZQXhkqJLVbM53WZpWRcZy1UCvQ7lJags6+1f7loKTkZHsPH3LfVatUQK6xhL1fqLBVIFvrL447u4JXDMr+XiACi+FZFkUg0pF79ytIJ7TcJ5/zK1Z4vSa/klSpUIIHFhJTqGEBKzmA9QTGS3qZA1WCaNRpyFSzzXqXF94g/wAS5174XOCuL/cajEjb7m5WOKlcvHfzPzXDgzwS4Qgy/wCZ4jncJ/iBcC9/1MWMR6W6KGNYdQWQs9RuyRGVxUHuCwxHqFr6ieD3LLZG32wAp0hyzVxy1BMZ4Dph6JWkFuRIgmWqN8vGPWZkKlK2L3PMxpLDk8R4Cu0tr+5ksRLJS0p9PmHEDgyGZAg7vuUIkV7U8H+4UwPCeD2EwMtiingx15W0KNebgBBmpKvt59StjqVgbePO4wL0AOA9QiMpyUP3BtlquYfdy4rDF+oELlZivJMYqJMA8E3b5awC9gkJCoSsx0ngh2pKjBsq+ngw3HzWHZEoykJazGh1Ghc4VuopPFO5ZBVtmXq4KClvEK9QjCBnpKgeojVZitGJhtNEBjUAC4Pg1+obTdrBq8ixrePqP9x3u5+43VPGZc7mtcDTP7mPMzwxyQnUDHJ8j4ry8v4fqHAww1c0l54uE+pm4OfcGt5CV/sGK6YCKKl9xNgMBAP1cItHuqiAt6iNly01YF+Jpsw93AGwzjHUDFtsfDC97fywX6CXY8ngLmerPfUP5CFjFoV/iWVH7TrkmKozAKL9MDsnqgo4XBQeWWCg71SAryuX9y0DPcD2s6lQt0NlhAoRqHVepbDcSyDadfcuI4ZOFDVv3LpiOWMKXgaLhuyWiLcegseg0jD17pu/L5j4S0RJbAtkTJFWnP8AMaUGTcuNQNQIzPUu9MzaSK+p5J4ECOhBV1X8TTUvNdxcFepWDpP7m64f6mSlRv8AcY6jojM/zNQw5mEnWo71NS53F87j/c7nXJxr4n49fE+PXwP4ly6+oNzMuD9y8Q1vMBvrxGZGhIdeoMw6+oQsCZU0B5WVTdtDn91AOji1/v3PAeGS/fcbgBdFfJOojIdCiP7OoikpOtnCvcuSwvcsbIB/4izfEKkKBUboKNtly7YQeVxHuAG9RUxZy2eYrJBalK8fwy3NINC47iXW37jVi7lBBxbXsh9EXMygpr+o8rrBNv6hUdKTQ/qMpIAbJ6Ig0aCkYQSCuJCdku6IWaguiHZiIIW+SIADoR6m61Vsr5lWs/lHAbsE/tNfuG9FSjZCbPMo/Uxlp3n9zLLJqYWQ1r+Yq87mTAMeomP6QUYiU6iW33EzHxG6lSpXU1HcWouZcJ+/3F64/mdTP8z6/wDyHzH4EJj3CD5qDBxces3BzFqDiye0YfcuvMcrNQQxuXFjOQGsOE9QSS7UUV4Okt5A9ifcMdoK2PuEQRGko1n9wQBYCjdseYUvErsqzq+oaGMtMCmqjbqHYJRqH0jRiQi+JZlkaKhb1ji2CdwSgncN0fbUtVT1bM+oMrrQt7exLoexV+jfcqDbsNP+kXN6yLucHR0QwbCsFSlq8wtgViNTWYUgzqEFIc6IB9PE1wWvr3EtqK2X5fMtiiyHX/lHYIehzDDMwe7hX7lWQCXB2XVOz9xOlep2WyjZDjYP6lmyvcO4Tr3G3ALjpFMS8f8AYo+0fFY8xAx1Es9RMPcSVuzESVRncqbaiZlUT/E6lcOZ5JcMQxHcPi/A/D38KnUOeoVD64/zM8VCGrgG1TQBlhiVmg3+5jCV6GKZox1L/mCsPyX0MwgtQVO97uABI6pw0+IUcCcKMNQ5eyN1hu4AghApdn3GlIBtQneIndbwVfqova3JYJ/2HdD1TrYnTM91uVDJGmuC5ixZ1Gt/7mJRCtslU1FeonpijF0NSjpKAGrlrEiOyUL+4ZfRdMxoXLFuz/s+40dHiAmGUZuBz3AdSs4hvhRpxAGRi+6A1H1PHdKO8dRdssVgD1KQSgrygNLYLIj1n+peqKo2KKRzkY4ljvILUP6mEqv3O8MV0w6mACiwLrR0sV4UDdzS+5hyG+sxKdlf44dar9wVAzKmkqqZXiJjUxcTzHGtxN0crx9QfPiXDnuZ/wDynFfG/uXjEOLo3M4bopr2nuCQsiWLv3UaL32oRwW0WLruVtWXd0NJ7J1o6/Dpjdy3tgUxLFc4jbkBZQwWeIhNCssQJyC0rf3HFiQBIkaXr0dKijxJYpc1ALkDfAKb8C9QqolwfgFjlnUSVwl8CMk888Za1PWoGqV3r/EAQlq0w6mLJg9CS+zPPenw+oisqsK6bhTJiKQMkSwiQbl4l3W2WDmBbm2dVKZcRaJ4gYoT7NxRYtoNkXVfcSm0c35gbGZTVunuF6mt44Lhtj13FYBXcVu2pvOJtA7i2TcrLE8zvN1MVfiUepWf8RJUqVfT/ETJiJzUqPj5Hwvi/kfhxXBK+F+OCWepYdyqAMS6idrDAUD9IqVAsarJAbMBybaCjuWdSOl6/qJXt1DyOSP+JlToghc+iepl+opwvDhmUwm0hB/FerB9nUVShjZlt+oDfrbH064nuLmXGPDyHCq4DPuV7njK3o/UU1wndu19Ey4RwrMtYkPkZRaMst0BhPpzBjLVdOn9kpps+pe5fdQs6gxu5XncFZ8yl64CvUEjll6kIsvCXOFKxSCszHqMW2uLeCYqR9xHqLW1f7hfgJkqleZQNP3LOgIuHqtxy21Vxa3FXdoaYtQfMX61FzXcs/csaK7hU13LsrqCsYmup3haldymvUSfU+5USJwQ/NfNzqXxXwuE+4S8Ee5eYPAxUEzJ1LWJuVlj5gq1bB0vFSvVclu5ey39zBBK7gy4hNrvp7eJXjYpltdSgW1VhBBnNeqGB1sPMJfcWmc9dd3/ABAb1LG30IAdJuKI23iKXmLL88XO5bCDL4uDKOsQSwsrDLvKVgmBtLjUJWHCeIKonjAZ/ldR+N0MRuoLqszPe4x/99TRiemo7n1BqEKRTxm3gEKZmAGav7miqxL/AF3HX3HHGYlLxGl7PuBvd01cvOYuG2mONxVwO4N+f5nh1L85gDcva43+vE9tSmcwUBuLHP8Aji4xpdxJUTplSkh+E4+vxm4RnXH1P3wS48EJWIBBTMp4JY6gdTzxoE1iAmqyw12eJo/zKsbSUULRtiGlNvSPVh+0THQu1/qCh3vEtg/Zcq4vT4D2uPggLxAmOqiXBUVixYsuX7ly4MJcu4cC5fdw3pE2CQTheKzAiDG6s9xP2B+4+Bl92TSLT4Z2Stlb1EzWZ3nM73D+Uc1qKXnO5p6mUZ94CPvMXMHZLq7uvETu4h3BmJff1EmVZi3aeOiM3Fz5jneotEvhd/cGDq5fiXmLiYphnDLxE9ECvESJZEvb+Hf5jm+Pvi4W4mZ3xe5up1GlYhTAQBMSpZFJmZ7i8/xGxfO5hKwiAqvHcvuKLywnqPtgF786Yw++rh8D/cV7M8Oc3iKV3GLmdcXLly4MGXiEPuAQC44qNaxLMIP6jGsCtoSMilzPu4UxDUU+4ZMzKf7i+oM0X1H+EWu4N9xS6g54PuLojv1EJ2RMUuJWKq5szBjqCurn9JZmVifcSJFv6i4mYzJxcvqdJcumXWJcuYm5WcSuCdfhuX+X6ly8HmX4+JCV4nVXDV3B5FvzF53M1Rphr1PW4FvpgruBN9z7TCtypXbN9SqUrWfEe4r4vDHm88XBgwcQb4KSA7hUYamIy1u4sRSdRUSp6SyoUyWQuXjMPDqKpoJ7WAgOa6Dp5mA9mzZBwRNaope5Vkf5g5lCtQ3nfFXKzjD5hKwsHncREuVudeZXh/nhPUfUTxEqVjipplsuXBl3Lm1y/cE/G1+J+BD3wy5cuXDxB4GXCXeKhHCVBuDnMc9Rx5qGr6ZevMO06lzccRhDmZi+oAv+ICsxC78xeosYyviS+CXBgwZRNOQYuO00/uW0S85l5g4rqXTAS5RBZtUFywCwXowlgNPd6hXooHkPTKStsMbuXhKS7p6l8OyV1LxqL5lv7ir6j/UGY2lfxGxj/cqVfcSmBngjw8svEuXLmmZcuW+ficn4zjr474Ma5JpnfNvBBzLh/EvOJelZhc6gwg53HMyJXG0sZUF1F8RZisivBjGMfgblfA4ILBgy5e4u50Ijf6jlLg4gweLxD2BcZkBDsPqDXAlK2/cT3JTWV9Sx49jpOoFYompeYUX/ALj1MPcHzLzibX1P8cC3P9SqMRLuDoiZxKzqJvxExuVuJmV5muox47zz/jjvg9cd/hf/AMzO4zEuG5rg4+pvPBuGyFdxZMSsPqfyh23DKe5hkjtzFi4jGMedcHJx1wQg8EJcvEWXFzFl3Ll5uDfcRF6ihiKS6l1MlRQbjvHUQWMs9JBvwxzF9Qcsub4slwc+oo15jllZ1E/c0V3KxTqJ4icdzzGo6zy8dxgwYf8A6X4+vh9TqdQfXA8Dxrhag4g67zByxYfHc8VMIMfJHBH6izF88MZfNz6hDg+JCX5jGXiO4zcJcYGXHcFwKi7ICPZLGZ0swj4JQOoiq6iwZf8AMWXvzFxLzFljiVPc0R3iPuJ1GoCSoepUTHDHi6jyS/8A8nUv8N/Mh8NNO4QhCG8T2qG4PiDcTNGoxm0Yxi83wQ5GEOCEOGMYx4vHG+QgCkrWZgJdsJoI1KRxLEBuYQcTKDn1LgaAWLVsaxHP5Al3MzuXF6i+ZdkfUZU/cSuHfuPuMrzK4SVDg/Kzr8l8XD4dTHF8HHfwMQhn7hLPq4Z7zB4PuXWuDHcYx46+BzfBDghB5SM7xGPB7mo+ocXFgkDMUWs8YMGpcWYQUxrb4gMBfmLuejBYKKQXGTNj1Y8plIy6i6Zcu7uXLhvMvqMZjMp4TPH38Hi4fG+H5dfKpXzYS+Tioy4cMubhDGoeYQh1wGENcO9R8sdxjH5HwOCEIeuCDw5jv1Hkca+A1FuXmDL4vEIuD4i5hhosmF1hKrdnzDEzqVNRWb7gTDBTsi3Fgx9RamUHxxc3N3P1w9zZHlxHzO/g/F/C8nHXw6+J8znvj7hCHVQy/UNykXTCXwviLFzwWMYy48/XyOCHwY5jGX5mONS5fFy5fAy5cvMw4DC3OtRWLaivcYFsZW2YYSWzg9QbTLuXLiyyXxcGXw9TeJqMTEY8/wD//gADAP/Z',
    'ðŸ¢': 'data:image/jpeg;base64,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Y2zg7MsGd2hXXOYKEEgWrImomt6iLQImAkR0UpnWmULJaQZiwBasxspWbqNYJtLTfGDqwrEoazpWqULAANenhkRvnFJRXTPNOd3zTc2qghaqWiVFUSgBSZkREQFAAAAAAAAAAAAAEohMVKJEoi6sKvQnRirNJ0VmLmO7h6Mb0wnEmDeCJCLEAIkiZgi9JIkETAvSYmIAVaImITAFC8UTAFWVmWBYJiBQkmbUzqo1kABaoupMFoKzapAqYASQsKzeIiYqWqUAAAAAAAAAAAAAABMBMJCJExIQgkRO+BNUEipRIRBMTJBBMSImNYytaik1smJEJCASgAmJEAtEIJEChJACUQSTCViBJSWqYslMSwLAAAAEwLTRF5zF1BaIUAAAAAAAAAAAAAAAAAAJIlBKJIkAJRJBESRSQAAIkAQkiZiJrMEomomAmJITAkIBKABe1b51XO1bBNkTAXpvLXPXKVErkCEiZg0rMMiaRMQFAAAAAAAAAAAAAAAf/9oADAMBAAIAAwAAACETzzyjzTTjTzyDzyzyDzzTzjRgzTSTy5Zsv7zzzp77TzTyxbzzhxBzzSCzTzzzywwzzzzzzyxThyzzzzTzzzzzSRzzzDxyz7OWrYKeldsV/wA8k88888s8c4484sUk08880888o888888U888U888c8cMYYc4Y88ojZOr5dflJVves+088888Ukss488o84o8w8U0888888888Y88808888s0888I8840OtPzFBXz41lmy6+yc88800swsM0k888048wM08c888c8888cIc8488408888848cs51xJFLu3xpnfjry888wUc880U8s408884Y8c8848s88k88c8s88Q888s88kI0848OREZZfr2v9JtJf8AHPPDHNNPHPPHGFKNPPPJPGPPCPLMMLLPPPPLFLPPNIFPOGHPFFD7CXf41x2QS63mLPPPHJOGLPJPLPPDHPPMHPPPOPLLMHOPLPPPPMPHPNCPGJHGNHLeINC7x1+XU1q4/LPLLBGGOOOPLMJPFJODNDGPJPNLPPPPPMHPCMOPPNMPPNPPHKgyMKJQV7aWaW/S9PPPLNBCCHPPLPOCPNPNPPEHDPDNLPOPPNPMPDGJALAALHOPNvnHEIICGSYZVfedzivPKHFGPHKEOPPHAENPPPOOHNDPPOPODNPHNPOAHPLFLCLPN9gX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',
  };

  const heroColors = {
    'ðŸµ':'linear-gradient(135deg,#d4e8bc,#b8d4a0)',
    'ðŸ¥›':'linear-gradient(135deg,#f0e6d3,#ddc9ae)',
    'ðŸ«':'linear-gradient(135deg,#e8d0b8,#d4b894)',
    'ðŸ«':'linear-gradient(135deg,#c8d8ee,#a8c0e0)',
    'â˜•':'linear-gradient(135deg,#d4c0a8,#b8a088)',
    'ðŸ¢':'linear-gradient(135deg,#f0d8c0,#e0c0a0)',
    'ðŸ¥›ðŸ¢':'linear-gradient(135deg,#f5ede5,#e8ddd0)',
  };

  function openDetail(name, emoji, price, desc, type) {
    window._activeMerchant = 'oya'; // mark as Oya
    if (typeof window.updateBottomNav === 'function') { currentScreen = 'detail'; window.updateBottomNav(); }
    detailBasePrice = parseFloat(price.replace('RM ',''));
    detailQty = 1;
    currentDetailType = type;
    // Reset soy milk selection when opening detail
    window._selectedSoymilk = 'none';
    window._selectedComboSoy = null;
    resetSoymilkUI();
    resetOdenAddons();
    // Reset combo radio UI
    ['matcha','classic','butterfly','pandan'].forEach(function(k) {
      var radio = document.getElementById('combo-radio-' + k);
      var row   = document.getElementById('combo-radio-' + k + '-row');
      if (radio) { radio.style.background = '#fff'; radio.style.borderColor = 'var(--beige)'; }
      if (row)   { row.style.borderColor = 'var(--beige)'; row.style.background = '#fff'; }
    });
    var bd = document.getElementById('combo-total-breakdown');
    if (bd) { bd.style.display = 'none'; bd.innerHTML = ''; }
    document.getElementById('detail-emoji').textContent = emoji;
    document.getElementById('detail-name').textContent = name;
    document.getElementById('detail-desc').textContent = desc;
    document.getElementById('detail-cat').textContent = type === 'oden' ? 'Oden Selection' : type === 'combo' ? 'Today\'s Combo' : 'Soy Milk Series';
    const _heroImg = document.getElementById('detail-hero-img');
    if (_detailHeroImages[emoji]) {
      _heroImg.src = _detailHeroImages[emoji];
      _heroImg.style.display = 'block';
      document.getElementById('detail-emoji').style.display = 'none';
      document.getElementById('detail-hero').style.background = '#111';
    } else {
      _heroImg.style.display = 'none';
      _heroImg.src = '';
      document.getElementById('detail-emoji').style.display = '';
      document.getElementById('detail-hero').style.background = heroColors[emoji] || heroColors['ðŸ¥›'];
    }
    document.getElementById('qty-num').textContent = '1';
    document.getElementById('detail-total').textContent = price;
    document.getElementById('oden-options').style.display  = type === 'oden'  ? 'block' : 'none';
    document.getElementById('combo-soymilk-options').style.display = type === 'combo' ? 'block' : 'none';
    window._detailName  = name;
    window._detailEmoji = emoji;
    window._detailPrice = price;
    const notesEl = document.getElementById('detail-notes');
    if (notesEl) { notesEl.value = ''; notesEl.style.borderColor = 'var(--beige)'; }
    const countEl = document.getElementById('notes-count');
    if (countEl) countEl.textContent = '0';
    goTo('detail');
  }
  window.openDetail = openDetail;

  function selectPill(el, group) {
    el.closest('.option-pills').querySelectorAll('.option-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    updateDetailTotal();
  }
  window.selectPill = selectPill;

  function toggleIngredient(el) {
    el.classList.toggle('selected');
    const chk = el.querySelector('.ingredient-check');
    chk.textContent = el.classList.contains('selected') ? 'âœ“' : '';
  }
  window.toggleIngredient = toggleIngredient;

  function changeQty(delta) {
    if (window._activeMerchant === 'mad') {
      window._madDetailQty = Math.max(1, (window._madDetailQty || 1) + delta);
      document.getElementById('qty-num').textContent = window._madDetailQty;
      const base = window._madDetailBasePrice || 0;
      document.getElementById('detail-total').textContent = 'RM ' + (base * window._madDetailQty).toFixed(2);
    } else {
      detailQty = Math.max(1, detailQty + delta);
      document.getElementById('qty-num').textContent = detailQty;
      updateDetailTotal();
    }
  }
  window.changeQty = changeQty;

  function updateDetailTotal() {
    let base = detailBasePrice;
    let extra = 0;
    const soymilkPrices = { matcha: 7, classic: 3, butterfly: 5, pandan: 5 };
    const sel = window._selectedSoymilk || 'none';
    if (currentDetailType === 'oden' && sel !== 'none') {
      extra = soymilkPrices[sel] || 0;
      base = detailBasePrice - 1; // oden -RM1
    } else if (currentDetailType === 'combo') {
      const comboSel = window._selectedComboSoy;
      if (comboSel) {
        // combo total = oden (7 - 1 = 6) + soy milk price
        base = 6 + (soymilkPrices[comboSel] || 0);
      }
    }
    // Add-on ingredients: RM 1.00 each (oden type only)
    const addonTotal = (currentDetailType === 'oden') ? getAddonTotal() : 0;
    document.getElementById('detail-total').textContent = 'RM ' + ((base + extra + addonTotal) * detailQty).toFixed(2);
  }

  // â”€â”€ Oden Add-On Ingredients â”€â”€
  var _odenAddons = {
    cheese_sausage: { name: 'Cheese Sausage', emoji: 'ðŸ§€', qty: 0 },
    enoki_mushroom: { name: 'Enoki Mushroom', emoji: 'ðŸ„', qty: 0 },
    white_radish:   { name: 'White Radish',   emoji: 'ðŸ¥¬', qty: 0 },
    fish_cake:      { name: 'Fish Cake',       emoji: 'ðŸŸ', qty: 0 },
    fish_ball:      { name: 'Fish Ball',       emoji: 'âšª', qty: 0 },
  };

  function resetOdenAddons() {
    Object.keys(_odenAddons).forEach(function(k) {
      _odenAddons[k].qty = 0;
      var el = document.getElementById('addon-qty-' + k);
      if (el) el.textContent = '0';
    });
  }

  function changeAddon(key, delta) {
    if (!_odenAddons[key]) return;
    _odenAddons[key].qty = Math.max(0, _odenAddons[key].qty + delta);
    var el = document.getElementById('addon-qty-' + key);
    if (el) el.textContent = _odenAddons[key].qty;
    updateDetailTotal();
  }
  window.changeAddon = changeAddon;

  function getAddonTotal() {
    return Object.values(_odenAddons).reduce(function(sum, a) { return sum + a.qty; }, 0);
  }

  // Combo soy milk selector
  var _comboSoyNames  = { matcha: 'Matcha Soy Milk', classic: 'Classic Soy Milk', butterfly: 'Butterfly Pea Soy', pandan: 'Pandan Choco Soy' };
  var _comboSoyEmojis = { matcha: 'ðŸµ', classic: 'ðŸ¥›', butterfly: 'ðŸ«', pandan: 'â˜•' };
  var _comboSoyPrices = { matcha: 7, classic: 3, butterfly: 5, pandan: 5 };

  function selectComboSoy(key) {
    window._selectedComboSoy = key;
    ['matcha','classic','butterfly','pandan'].forEach(function(k) {
      var radio = document.getElementById('combo-radio-' + k);
      var row   = document.getElementById('combo-radio-' + k + '-row');
      var isSelected = k === key;
      if (radio) { radio.style.background = isSelected ? 'var(--matcha)' : '#fff'; radio.style.borderColor = isSelected ? 'var(--matcha)' : 'var(--beige)'; }
      if (row)   { row.style.borderColor = isSelected ? 'var(--matcha)' : 'var(--beige)'; row.style.background = isSelected ? 'rgba(140,180,90,0.07)' : '#fff'; }
    });
    // Update breakdown
    var bd = document.getElementById('combo-total-breakdown');
    if (bd) {
      var syPrice = _comboSoyPrices[key] || 0;
      bd.style.display = 'block';
      bd.innerHTML = 'ðŸ¢ Oden Set <s style="color:#aaa;">RM 7.00</s> â†’ <b style="color:var(--matcha);">RM 6.00</b> &nbsp;+&nbsp; ' + _comboSoyEmojis[key] + ' ' + _comboSoyNames[key] + ' RM ' + syPrice.toFixed(2) + '<br><span style="color:var(--matcha);font-weight:700;">Total: RM ' + (6 + syPrice).toFixed(2) + '</span>';
    }
    updateDetailTotal();
  }
  window.selectComboSoy = selectComboSoy;

  // Soy milk radio selector
  var _soymilkData = {
    none:      { name: null,                     price: 0, emoji: null },
    matcha:    { name: 'Matcha Soy Milk',        price: 7, emoji: 'ðŸµ' },
    classic:   { name: 'Classic Soy Milk',       price: 3, emoji: 'ðŸ¥›' },
    butterfly: { name: 'Butterfly Pea Soy',      price: 5, emoji: 'ðŸ«' },
    pandan:    { name: 'Pandan Choco Soy',       price: 5, emoji: 'â˜•' },
  };

  function resetSoymilkUI() {
    ['none','matcha','classic','butterfly','pandan'].forEach(function(k) {
      var radio = document.getElementById('soymilk-radio-' + k);
      var row   = document.getElementById('soymilk-' + k + '-row');
      if (radio) { radio.style.background = '#fff'; radio.style.borderColor = 'var(--beige)'; }
      if (row)   { row.style.borderColor = 'var(--beige)'; row.style.background = '#fff'; }
    });
  }

  function selectSoymilk(key, el) {
    window._selectedSoymilk = key;
    resetSoymilkUI();
    var radio = document.getElementById('soymilk-radio-' + key);
    var row   = document.getElementById('soymilk-' + key + '-row');
    if (radio) { radio.style.background = 'var(--matcha)'; radio.style.borderColor = 'var(--matcha)'; }
    if (row)   { row.style.borderColor = 'var(--matcha)'; row.style.background = 'rgba(140,180,90,0.07)'; }
    updateDetailTotal();
  }
  window.selectSoymilk = selectSoymilk;

  // Open detail from Today's Special (marks that a soy milk was pre-selected context)
  function openDetailTodaySpecial(name, emoji, price, desc, type) {
    openDetail(name, emoji, price, desc, type);
  }
  window.openDetailTodaySpecial = openDetailTodaySpecial;

  function addToCart() {
    // Detect if this detail was opened from Mad Drink Lab
    const isMad = window._activeMerchant === 'mad';
    let base = isMad ? (window._madDetailBasePrice || detailBasePrice) : detailBasePrice;
    let qty  = isMad ? (window._madDetailQty || detailQty) : detailQty;
    let customText = '';
    if (!isMad) {
      if (currentDetailType === 'oden') {
        customText = Array.from(document.querySelectorAll('#oden-options .ingredient-item.selected .ingredient-name')).map(e => e.textContent).join(', ');
        // Append add-on ingredients to custom text
        const addonParts = Object.values(_odenAddons).filter(a => a.qty > 0).map(a => '+' + a.name + ' Ã—' + a.qty);
        if (addonParts.length) customText += (customText ? ' Â· ' : '') + addonParts.join(', ');
      }
    }
    const merchantNote = (document.getElementById('detail-notes').value || '').trim();

    // Handle combo type: oden + chosen soy milk, oden -RM1
    if (!isMad && currentDetailType === 'combo') {
      const comboSel = window._selectedComboSoy;
      if (!comboSel) {
        // No soy milk chosen â€” alert user
        const bd = document.getElementById('combo-total-breakdown');
        if (bd) { bd.style.display = 'block'; bd.innerHTML = '<span style="color:#c0392b;">âš ï¸ Please select a soy milk first!</span>'; }
        return;
      }
      const odenItem  = { name: 'Oden Set', emoji: 'ðŸ¢', price: 6, qty: qty, custom: 'With ' + _comboSoyNames[comboSel], note: merchantNote };
      const soyItem   = { name: _comboSoyNames[comboSel], emoji: _comboSoyEmojis[comboSel], price: _comboSoyPrices[comboSel], qty: qty, custom: 'Combo deal Â· Oden -RM1', note: '' };
      cart.push(odenItem);
      cart.push(soyItem);
      updateCartUI();
    } else if (!isMad && currentDetailType === 'oden' && (window._selectedSoymilk || 'none') !== 'none') {
      // Oden with soy milk add-on
      const sel = window._selectedSoymilk;
      const soymilkPrices = { matcha: 7, classic: 3, butterfly: 5, pandan: 5 };
      const soymilkNames  = { matcha: 'Matcha Soy Milk', classic: 'Classic Soy Milk', butterfly: 'Butterfly Pea Soy', pandan: 'Pandan Choco Soy' };
      const soymilkEmojis = { matcha: 'ðŸµ', classic: 'ðŸ¥›', butterfly: 'ðŸ«', pandan: 'â˜•' };
      const addonCost = getAddonTotal();
      cart.push({ name: window._detailName, emoji: window._detailEmoji, price: base - 1 + addonCost, qty, custom: customText + (customText ? ' Â· ' : '') + '+' + soymilkNames[sel], note: merchantNote });
      cart.push({ name: soymilkNames[sel], emoji: soymilkEmojis[sel], price: soymilkPrices[sel], qty, custom: 'With Oden combo', note: '' });
      updateCartUI();
    } else {
      const addonCost = (!isMad && currentDetailType === 'oden') ? getAddonTotal() : 0;
      const item = { name: window._detailName, emoji: window._detailEmoji, price: base + addonCost, qty: qty, custom: customText, note: merchantNote };
      if (isMad) {
        const mc = window._madCart || [];
        const existing = mc.find(i => i.name === item.name);
        if (existing) { existing.qty += qty; } else { mc.push(item); }
        window._madCart = mc;
        if (typeof window.updateMadCartUI === 'function') window.updateMadCartUI();
      } else {
        cart.push(item);
        updateCartUI();
      }
    }

    const btn = document.querySelector('#screen-detail .cta-btn');
    btn.textContent = 'âœ“ Added!';
    btn.style.background = '#5a7d3c';
    setTimeout(() => {
      btn.textContent = 'Add to Cart ðŸ›’';
      btn.style.background = '';
      goBack();
      if (isMad) window._activeMerchant = null;
    }, 800);
  }
  window.addToCart = addToCart;

  function quickAdd(e, name, price, emoji) {
    e.stopPropagation();
    cart.push({ name, emoji, price, qty: 1, custom: 'Standard' });
    updateCartUI();
    const btn = e.target;
    btn.textContent = 'âœ“'; btn.style.background = '#5a7d3c';
    setTimeout(() => { btn.textContent = '+'; btn.style.background = ''; }, 600);
    document.querySelector('.cart-icon-wrap').style.animation = 'cartBounce 0.4s ease';
    setTimeout(() => document.querySelector('.cart-icon-wrap').style.animation = '', 400);
  }
  window.quickAdd = quickAdd;

  function updateCartUI() {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const fc = document.getElementById('floating-cart');
    document.getElementById('cart-badge').textContent = count;
    document.getElementById('cart-total-display').textContent = 'RM ' + total.toFixed(2);
    document.getElementById('cart-label').textContent = count + (count === 1 ? ' item' : ' items');
    fc.style.display = count > 0 ? 'flex' : 'none';
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CART
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function renderCart() {
    const list = document.getElementById('cart-list');
    let total = 0, html = '';
    if (cart.length === 0) {
      html = `<div style="text-align:center;padding:60px 24px;color:var(--text-muted);">
        <div style="font-size:48px;margin-bottom:12px;">ðŸ›’</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-mid);margin-bottom:6px;">Your cart is empty</div>
        <div style="font-size:13px;">Add items from the menu to get started</div></div>`;
    } else {
      cart.forEach((item, i) => {
        total += item.price * item.qty;
        html += `<div class="cart-item" style="animation-delay:${i*0.05}s">
          <div class="delete-swipe" onclick="removeItem(${i})">ðŸ—‘</div>
          <div class="cart-item-img">${item.emoji}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-custom">${item.custom || 'Standard'}</div>
            ${item.note ? `<div style="font-size:11px;color:var(--milo);background:var(--milo-pale);border-radius:8px;padding:4px 8px;margin-top:4px;display:flex;align-items:center;gap:4px;"><span>ðŸ“</span><span>${item.note}</span></div>` : ''}
            <div class="cart-item-footer">
              <div class="cart-item-price">RM ${(item.price * item.qty).toFixed(2)}</div>
              <div class="cart-qty-ctrl">
                <button class="cart-qty-btn" onclick="cartQty(${i},-1)">âˆ’</button>
                <span class="cart-qty-num">${item.qty}</span>
                <button class="cart-qty-btn" onclick="cartQty(${i},1)">+</button>
              </div>
            </div>
          </div>
        </div>`;
      });
      const discount = (orderType === 'preorder' && preorderDiscountEligible) ? +(total * 0.10).toFixed(2) : 0;
      const finalTotal = +(total - discount).toFixed(2);
      html += `<div class="order-summary-card">
        <div class="summary-row"><span>Subtotal</span><span>RM ${total.toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="summary-row" style="color:var(--green2);font-weight:600;"><span>ðŸŽ‰ Early Bird 10% Off</span><span>âˆ’RM ${discount.toFixed(2)}</span></div>` : ''}
        <div class="summary-row total"><span>Total</span><span>RM ${finalTotal.toFixed(2)}</span></div>
      </div>`;
    }
    list.innerHTML = html;
    const discount = (orderType === 'preorder' && preorderDiscountEligible) ? +(total * 0.10).toFixed(2) : 0;
    document.getElementById('cart-total-bar').textContent = 'RM ' + (total - discount).toFixed(2);
  }

  function cartQty(i, d) { cart[i].qty = Math.max(1, cart[i].qty + d); updateCartUI(); renderCart(); }
  function removeItem(i) { cart.splice(i, 1); updateCartUI(); renderCart(); }
  function clearCart() { cart = []; updateCartUI(); renderCart(); }
  window.cartQty = cartQty;
  window.removeItem = removeItem;
  window.clearCart = clearCart;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  CHECKOUT
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function renderCheckout() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = (orderType === 'preorder' && preorderDiscountEligible) ? +(subtotal * 0.10).toFixed(2) : 0;
    const grandTotal = +(subtotal - discount).toFixed(2);
    document.getElementById('checkout-summary').innerHTML = cart.map(item =>
      `<div class="summary-row"><span>${item.name} Ã—${item.qty}</span><span>RM ${(item.price*item.qty).toFixed(2)}</span></div>`
    ).join('') + (discount > 0 ? `<div class="summary-row" style="color:var(--green2);font-weight:600;"><span>ðŸŽ‰ Early Bird 10% Off</span><span>âˆ’RM ${discount.toFixed(2)}</span></div>` : '');
    document.getElementById('co-subtotal').textContent = 'RM ' + subtotal.toFixed(2);
    document.getElementById('co-total').textContent    = 'RM ' + grandTotal.toFixed(2);
    document.getElementById('co-pay').textContent      = 'RM ' + grandTotal.toFixed(2);
    const _labels = { pickup:'Pick Up', preorder:'Pre-order', delivery:'Delivery' };
    const _icons  = { pickup:'ðŸ›', preorder:'ðŸ“‹', delivery:'ðŸ›µ' };
    document.getElementById('checkout-method').textContent = _labels[orderType] || 'Pick Up';
    document.getElementById('checkout-icon').textContent   = _icons[orderType]  || 'ðŸ›';
    document.getElementById('qr-amount').textContent       = 'RM ' + grandTotal.toFixed(2);

    // Show address field only for delivery
    if(document.getElementById('preorder-group')) document.getElementById('preorder-group').style.display = orderType === 'preorder' ? 'block' : 'none';
    if(document.getElementById('delivery-group')) document.getElementById('delivery-group').style.display = orderType === 'delivery' ? 'block' : 'none';
  }

  function pickSlot(btn, slot) {
    // Write to whichever hidden slot field is visible
    const slotField = document.getElementById('field-delivery-slot') || document.getElementById('field-slot');
    if (slotField) slotField.value = slot;
    // Also write to field-slot and field-delivery-slot (both may exist)
    const fs = document.getElementById('field-slot');
    const fd = document.getElementById('field-delivery-slot');
    if (fs) fs.value = slot;
    if (fd) fd.value = slot;
    document.querySelectorAll('.slot-chip').forEach(b => {
      b.style.background = 'var(--cream)';
      b.style.color = 'var(--text-dark)';
      b.style.borderColor = 'transparent';
    });
    btn.style.background = 'var(--matcha)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--matcha)';
  }
  window.pickSlot = pickSlot;

  function pickAddress(addr) {
    document.getElementById('field-address').value = addr;
    document.querySelectorAll('.addr-chip').forEach(c => c.classList.remove('selected'));
    event.target.classList.add('selected');
  }
  window.pickAddress = pickAddress;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  SCREENSHOT UPLOAD + AI VERIFICATION
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let screenshotFile   = null; // raw File for Storage upload
  let paymentVerified  = false;

  function handleScreenshotUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    screenshotFile = file;

    // Preview only â€” compress for display
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
      const preview = document.getElementById('upload-preview');
      preview.src = previewUrl;
      preview.style.display = 'block';
      document.getElementById('upload-placeholder').style.display = 'none';
      document.getElementById('upload-zone').classList.add('has-image');

      const resultCard  = document.getElementById('ai-result');
      const resultTitle = document.getElementById('ai-result-title');
      const resultRows  = document.getElementById('ai-result-rows');
      const paidBtn     = document.getElementById('paid-btn');

      resultCard.style.display = 'block';
      resultCard.className = 'ai-result pass';
      resultTitle.textContent = 'ðŸ“Ž Screenshot uploaded successfully';
      resultRows.innerHTML = `
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

      paymentVerified = true;
      paidBtn.disabled = false;
      paidBtn.style.opacity = '1';
      paidBtn.style.cursor = 'pointer';
      paidBtn.textContent = 'âœ“  Confirm & Submit Order';
    };
    img.src = url;
  }
  window.handleScreenshotUpload = handleScreenshotUpload;


  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  PAYMENT â†’ FIRESTORE (no Storage needed)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  async function markPaid() {
    if (!screenshotFile || !paymentVerified) return;

    const btn = document.getElementById('paid-btn');
    btn.textContent = 'â³ Saving orderâ€¦';
    btn.style.background = 'var(--milo)';
    btn.disabled = true;
    document.getElementById('waiting-banner').style.display = 'flex';
    document.querySelector('.waiting-text').textContent = 'Saving your orderâ€¦';

    const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount    = (orderType === 'preorder' && preorderDiscountEligible) ? +(subtotal * 0.10).toFixed(2) : 0;
    const grandTotal  = +(subtotal - discount).toFixed(2);
    const customerName  = document.getElementById('field-name').value.trim()  || 'Customer';
    const customerPhone = document.getElementById('field-phone').value.trim() || '-';
    const customerSlot  = orderType === 'preorder'  ? (document.getElementById('field-slot')?.value || '') : null;
    const customerAddr  = orderType === 'delivery'  ? (document.getElementById('field-address')?.value.trim() || '') : null;
    const deliverySlot  = orderType === 'delivery'  ? (document.getElementById('field-delivery-slot')?.value || '') : null;

    try {
      // Upload screenshot to Firebase Storage
      let screenshotUrl = null;
      if (screenshotFile) {
        const storageRef = ref(storage, 'oya_payments/' + Date.now() + '_' + (currentUser?.uid || 'guest') + '.jpg');
        await uploadBytes(storageRef, screenshotFile);
        screenshotUrl = await getDownloadURL(storageRef);
      }

      const foodTotal    = grandTotal;
      const serviceFee   = 0;
      const deliveryFee  = 0;
      const platformComm = orderType === 'delivery' ? +(foodTotal * 0.04).toFixed(2) : 0;
      const merchantNett = +(foodTotal - platformComm).toFixed(2);
      const riderEarning = 0;

      const orderData = {
        code:          'SOD-' + String(Date.now()).slice(-4),
        name:          customerName,
        phone:         customerPhone,
        type:          orderType,
        address:       customerAddr,
        slot:          customerSlot,
        deliverySlot:  deliverySlot,
        items:         cart.map(i => ({ emoji: i.emoji, name: i.name, price: i.price, qty: i.qty, custom: i.custom || 'Standard', note: i.note || '' })),
        total:         grandTotal,
        foodTotal,
        discount,
        serviceFee,
        deliveryFee,
        platformComm,
        merchantNett,
        riderEarning,
        status:        'new',
        rider:         null,
        paymentMethod: 'TNG',
        paymentStatus: 'paid',
        merchantId:    'soy_oden',
        merchantName:  'Oya',
        userEmail:     currentUser ? currentUser.email : null,
        userName:      currentUser ? currentUser.displayName : null,
        screenshotUrl: screenshotUrl,
        timestamp:     serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      currentOrderId = docRef.id;
      if (currentUser) {
        updateDoc(doc(db,'users',currentUser.uid),{ orderCount: increment(1), lastOrderAt: new Date().toISOString() }).catch(()=>{});
      }
      if (discount > 0) {
        try { await setDoc(doc(db,'settings','preorderCounter'), { count: increment(1) }, { merge: true }); } catch(e) {}
        preorderDiscountEligible = false;
      }
      startStatusTracking(currentOrderId);
      goTo('success');
      cart = []; screenshotFile = null; paymentVerified = false;
      updateCartUI();
      document.getElementById('success-order-code').textContent = 'Order #' + orderData.code;

    } catch (err) {
      console.error('Submit error:', err);
      btn.textContent = 'âŒ Failed â€” try again';
      btn.style.background = '#E8654A';
      btn.disabled = false;
      document.getElementById('waiting-banner').style.display = 'none';
      document.getElementById('ai-result').className = 'ai-result fail';
      document.getElementById('ai-result').style.display = 'block';
      document.getElementById('ai-result-title').textContent = 'âŒ Submit Failed';
      document.getElementById('ai-result-rows').innerHTML =
        '<div style="font-size:12px;color:var(--text-muted);padding:4px 0;">' +
        'Error: ' + err.message + '<br>Please try again.</div>';
    }
  }
  window.markPaid = markPaid;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  LIVE STATUS TRACKING (Firestore realtime)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  function startStatusTracking(docId) {
    if (unsubscribeStatus) unsubscribeStatus();
    const orderRef = doc(db, 'orders', docId);
    unsubscribeStatus = onSnapshot(orderRef, (snap) => {
      if (!snap.exists()) return;
      renderLiveStatus(snap.data());
    });
  }
  window.startStatusTracking = startStatusTracking;


  function getOrderSteps(order) {
    if (order.type === 'delivery') {
      return {
        steps: [
          { key:'new',        icon:'ðŸ§¾', label:'Order Confirmed', desc:'Payment received â€” thank you!' },
          { key:'preparing',  icon:'ðŸ‘¨â€ðŸ³', label:'Preparing',       desc:'Your order is being made fresh' },
          { key:'ready',      icon:'â³', label:'Waiting for Rider',desc:'Order ready â€” assigning rider now' },
          { key:'delivering', icon:'ðŸ›µ', label:'On the Way!',      desc:'Rider is heading to you now ðŸš€' },
          { key:'done',       icon:'ðŸŽ‰', label:'Delivered!',       desc:'Enjoy your order! ðŸµ' },
        ],
        statusOrder: ['new','preparing','ready','delivering','done'],
      };
    } else {
      return {
        steps: [
          { key:'new',       icon:'ðŸ§¾', label:'Order Confirmed', desc:'Payment received â€” thank you!' },
          { key:'preparing', icon:'ðŸ‘¨â€ðŸ³', label:'Preparing',       desc:'Your order is being made fresh' },
          { key:'ready',     icon:'âœ…', label:'Ready!',           desc:'Please come collect at counter ðŸ˜Š' },
          { key:'done',      icon:'ðŸŽ‰', label:'Done!',            desc:'Enjoy your order from MIDI! ðŸµ' },
        ],
        statusOrder: ['new','preparing','ready','done'],
      };
    }
  }

  function renderLiveStatus(order) {
    const { steps, statusOrder } = getOrderSteps(order);
    const curIdx = statusOrder.indexOf(order.status);

    document.getElementById('live-status-steps').innerHTML = steps.map(step => {
      const sIdx     = statusOrder.indexOf(step.key);
      const isDone   = sIdx < curIdx;
      const isActive = step.key === order.status;
      const isPending = sIdx > curIdx;
      return `<div class="status-step">
        <div class="status-dot ${isDone?'done':isActive?'active':'pending'}">${isDone?'âœ…':step.icon}</div>
        <div class="status-info">
          <div class="status-name" style="color:${isActive?'var(--matcha)':isPending?'var(--text-muted)':'var(--text-dark)'}">${step.label}</div>
          <div class="status-desc">${step.desc}</div>
        </div>
        <div class="status-time" style="color:${isActive?'var(--matcha)':'var(--text-muted)'}">
          ${isActive?'â— Now':isDone?'âœ“':''}
        </div>
      </div>`;
    }).join('');

    // Show rider info when delivering
    const riderBox = document.getElementById('rider-info-box');
    if (riderBox) {
      if (order.rider && order.type === 'delivery') {
        riderBox.style.display = 'flex';
        document.getElementById('rider-info-name').textContent  = order.rider;
        const phoneEl = document.getElementById('rider-info-phone');
        phoneEl.href = order.riderPhone ? 'tel:' + order.riderPhone : '#';
      } else {
        riderBox.style.display = 'none';
      }
    }

    // Show delivery proof photo when done
    let photoBox = document.getElementById('delivery-photo-box');
    if (!photoBox) {
      photoBox = document.createElement('div');
      photoBox.id = 'delivery-photo-box';
      const steps = document.getElementById('live-status-steps');
      if (steps && steps.parentNode) steps.parentNode.appendChild(photoBox);
    }
    if (order.status === 'done' && order.deliveryPhotoUrl) {
      photoBox.innerHTML = `
        <div style="margin-top:16px;border-radius:16px;overflow:hidden;background:var(--white);box-shadow:var(--shadow-sm);border:1px solid rgba(232,221,208,0.6);">
          <div style="padding:12px 14px 8px;font-size:12px;font-weight:700;color:var(--text-muted);">ðŸ“¸ Delivery Photo</div>
          <img src="${order.deliveryPhotoUrl}" style="width:100%;display:block;max-height:260px;object-fit:cover;" alt="Delivery proof">
        </div>`;
    } else {
      photoBox.innerHTML = '';
    }
  }
  window.refreshStatus = () => {}; // no-op, Firestore handles it

  function openDeliveryPhoto(url) {
    const modal = document.getElementById('delivery-photo-modal');
    document.getElementById('delivery-photo-fullimg').src = url;
    modal.style.display = 'flex';
  }
  window.openDeliveryPhoto = openDeliveryPhoto;

  function closeDeliveryPhoto() {
    document.getElementById('delivery-photo-modal').style.display = 'none';
  }
  window.closeDeliveryPhoto = closeDeliveryPhoto;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  RATING & REVIEW
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let currentRating = 0;
  const ratingLabels = ['', 'ðŸ˜ž Poor', 'ðŸ˜ Fair', 'ðŸ™‚ Good', 'ðŸ˜Š Great', 'ðŸ¤© Excellent!'];

  function setRating(val) {
    currentRating = val;
    // Update stars
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.val) <= val);
    });
    // Update label
    document.getElementById('rating-label').textContent = ratingLabels[val];
    // Show tags, textarea, submit button
    document.getElementById('quick-tags').style.display = 'flex';
    document.getElementById('review-text').style.display = 'block';
    document.getElementById('submit-review-btn').style.display = 'block';
    document.getElementById('submit-review-btn').disabled = false;
  }
  window.setRating = setRating;

  function toggleTag(el) {
    el.classList.toggle('selected');
    // Append tag text to textarea if selected
    const ta = document.getElementById('review-text');
    const tag = el.textContent.replace(/^[^\w]+/, '').trim(); // strip emoji prefix for cleanliness
    if (el.classList.contains('selected')) {
      ta.value = ta.value ? ta.value + ', ' + tag : tag;
    } else {
      // Remove tag from textarea
      ta.value = ta.value.split(', ').filter(t => !t.includes(tag.split(' ')[1] || tag)).join(', ');
    }
  }
  window.toggleTag = toggleTag;

  async function submitReview() {
    if (!currentRating) return;
    const btn = document.getElementById('submit-review-btn');
    btn.textContent = 'â³ Submittingâ€¦';
    btn.disabled = true;

    const comment = document.getElementById('review-text').value.trim();
    const selectedTags = [...document.querySelectorAll('.quick-tag.selected')].map(t => t.textContent.trim());

    const reviewData = {
      orderId:    currentOrderId || null,
      merchantId: 'soy_oden',
      merchantName: 'Oya',
      rating:     currentRating,
      comment:    comment || null,
      tags:       selectedTags,
      userName:   currentUser ? currentUser.displayName : 'Anonymous',
      userEmail:  currentUser ? currentUser.email : null,
      timestamp:  serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'reviews'), reviewData);
      // Show thank-you state
      document.getElementById('rating-card').innerHTML = `
        <div class="review-thanks">
          <div class="review-thanks-icon">ðŸ™</div>
          <div class="review-thanks-title">Thank you for your review!</div>
          <div class="review-thanks-sub">Your feedback helps Oya serve you better âœ¨</div>
        </div>`;
    } catch (err) {
      console.error('Review error:', err);
      btn.textContent = 'âŒ Failed. Try again';
      btn.disabled = false;
    }
  }
  window.submitReview = submitReview;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  ORDER HISTORY
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let historyUnsubscribers = [];

  async function loadOrderHistory() {
    const list = document.getElementById('orders-list');
    list.innerHTML = `<div class="orders-loading">â³ Loading your ordersâ€¦</div>`;

    if (!currentUser) {
      list.innerHTML = `<div class="orders-empty">
        <div class="orders-empty-icon">ðŸ”’</div>
        <div class="orders-empty-title">Sign in to view orders</div>
        <div class="orders-empty-sub">Login or sign up to track your order history</div>
      </div>`;
      return;
    }

    try {
      const q = query(
        collection(db, 'orders'),
        where('userEmail', '==', currentUser.email),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        list.innerHTML = `<div class="orders-empty">
          <div class="orders-empty-icon">ðŸ“‹</div>
          <div class="orders-empty-title">No orders yet</div>
          <div class="orders-empty-sub">Your order history will appear here</div>
        </div>`;
        return;
      }

      list.innerHTML = '';
      snap.forEach((docSnap, idx) => {
        const order = docSnap.data();
        const card = buildHistoryCard(docSnap.id, order, idx);
        list.appendChild(card);
        // Subscribe to live updates for each order
        const unsub = onSnapshot(doc(db, 'orders', docSnap.id), (s) => {
          if (!s.exists()) return;
          updateHistoryCardStatus(docSnap.id, s.data());
        });
        historyUnsubscribers.push(unsub);
      });
    } catch (err) {
      console.error('History load error:', err);
      list.innerHTML = `<div class="orders-empty">
        <div class="orders-empty-icon">âš ï¸</div>
        <div class="orders-empty-title">Couldn't load orders</div>
        <div class="orders-empty-sub">${err.message}</div>
      </div>`;
    }
  }

  function buildHistoryCard(id, order, idx) {
    const card = document.createElement('div');
    card.className = 'order-hist-card';
    card.id = 'hist-card-' + id;
    card.style.animationDelay = (idx * 0.06) + 's';

    const statusLabels = { new:'Confirmed', preparing:'Preparing', ready:'Ready!', delivering:'On the Way!', done:'Done' };
    const statusClass  = { new:'status-new', preparing:'status-preparing', ready:'status-ready', delivering:'status-delivering', done:'status-done' };
    const typeIcon = order.type === 'delivery' ? 'ðŸ›µ' : order.type === 'preorder' ? 'ðŸ“‹' : 'ðŸ›';
    const typeLabel = order.type === 'delivery' ? 'Delivery' : order.type === 'preorder' ? 'Pre-order' : 'Pick Up';
    const date = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleDateString('en-MY', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'â€”';

    const itemsHtml = (order.items || []).map(i => {
      const customLine = (i.custom && i.custom !== 'Standard') ? `<div style="font-size:11px;color:#9ca3af;margin-top:1px;">${i.custom}</div>` : '';
      return `<div class="order-hist-item"><div><span>${i.emoji} ${i.name} Ã—${i.qty}</span>${customLine}</div><span>RM ${(i.price * i.qty).toFixed(2)}</span></div>`;
    }).join('');

    // Build address/slot info block
    let infoHtml = '';
    if (order.type === 'preorder' && order.slot) {
      infoHtml = `<div style="font-size:13px;color:var(--text-mid);padding:6px 0 4px;border-top:1px solid var(--beige);margin-top:4px;">ðŸ“… Slot: <strong>${order.slot}</strong></div>`;
    } else if (order.type === 'delivery') {
      if (order.address) infoHtml += `<div style="font-size:13px;color:var(--text-mid);padding:6px 0 2px;border-top:1px solid var(--beige);margin-top:4px;">ðŸ“ Address: <strong>${order.address}</strong></div>`;
      if (order.deliverySlot || order.slot) infoHtml += `<div style="font-size:13px;color:var(--text-mid);padding:2px 0 4px;">ðŸ“… Slot: <strong>${order.deliverySlot || order.slot}</strong></div>`;
    }

    card.innerHTML = `
      <div class="order-hist-header" onclick="toggleHistCard('${id}')">
        <div class="order-hist-icon">${typeIcon}</div>
        <div class="order-hist-info">
          <div class="order-hist-code">${order.code || 'Order'} <span style="font-size:10px;font-weight:500;color:var(--text-muted);">${typeLabel}</span></div>
          <div class="order-hist-meta">${date} Â· RM ${order.total?.toFixed(2) || 'â€”'}</div>
        </div>
        <div class="order-hist-status ${statusClass[order.status] || 'status-new'}" id="hist-status-badge-${id}">
          ${statusLabels[order.status] || order.status}
        </div>
      </div>
      <div class="order-hist-body" id="hist-body-${id}">
        <div class="order-hist-items">${itemsHtml}</div>
        ${infoHtml}
        <div class="order-hist-total"><span>Total Paid</span><span>RM ${order.total?.toFixed(2) || 'â€”'}</span></div>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Live Status</div>
        <div class="order-hist-steps" id="hist-steps-${id}"></div>
      </div>`;

    // Render initial status steps
    setTimeout(() => renderHistSteps(id, order), 0);
    return card;
  }

  function toggleHistCard(id) {
    const body = document.getElementById('hist-body-' + id);
    body.classList.toggle('open');
    if (body.classList.contains('open')) {
      // Re-render steps when opened
      const card = document.getElementById('hist-card-' + id);
      // steps already rendered via live listener
    }
  }
  window.toggleHistCard = toggleHistCard;

  function updateHistoryCardStatus(id, order) {
    const statusLabels = { new:'Confirmed', preparing:'Preparing', ready:'Ready!', delivering:'On the Way!', done:'Done' };
    const statusClass  = { new:'status-new', preparing:'status-preparing', ready:'status-ready', delivering:'status-delivering', done:'status-done' };
    const badge = document.getElementById('hist-status-badge-' + id);
    if (badge) {
      badge.textContent = statusLabels[order.status] || order.status;
      badge.className = 'order-hist-status ' + (statusClass[order.status] || 'status-new');
    }
    renderHistSteps(id, order);
  }

  function renderHistSteps(id, order) {
    const el = document.getElementById('hist-steps-' + id);
    if (!el) return;
    const { steps, statusOrder } = getOrderSteps(order);
    const curIdx = statusOrder.indexOf(order.status);

    const stepsHtml = steps.map(step => {
      const sIdx     = statusOrder.indexOf(step.key);
      const isDone   = sIdx < curIdx;
      const isActive = step.key === order.status;
      const isPending = sIdx > curIdx;
      return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;">
        <div style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:${isDone?'var(--matcha-pale)':isActive?'var(--matcha)':'var(--cream2)'};">
          ${isDone ? 'âœ…' : step.icon}
        </div>
        <div style="font-size:13px;font-weight:${isActive?'700':'500'};color:${isActive?'var(--matcha)':isPending?'var(--text-muted)':'var(--text-dark)'};">
          ${step.label}
        </div>
        ${isActive ? '<div style="margin-left:auto;font-size:11px;color:var(--matcha);font-weight:700;">â— Now</div>' : isDone ? '<div style="margin-left:auto;font-size:11px;color:var(--text-muted);">âœ“</div>' : ''}
      </div>`;
    }).join('');

    const riderHtml = (order.rider && order.type === 'delivery')
      ? `<div style="display:flex;align-items:center;gap:10px;background:rgba(122,158,90,0.08);border:1.5px solid rgba(122,158,90,0.25);border-radius:12px;padding:12px 14px;margin-top:10px;">
           <span style="font-size:22px;">ðŸ›µ</span>
           <div style="flex:1;">
             <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Your Rider</div>
             <div style="font-size:14px;font-weight:700;color:var(--text-dark);">${order.rider}</div>
           </div>
           ${order.riderPhone ? `<a href="tel:${order.riderPhone}" style="background:var(--matcha);color:#fff;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;text-decoration:none;">ðŸ“ž Call</a>` : ''}
         </div>`
      : '';

    const photoHtml = (order.status === 'done' && order.deliveryPhotoUrl)
      ? `<div style="margin-top:12px;">
           <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">ðŸ“¸ Delivery Photo</div>
           <div onclick="openDeliveryPhoto('${order.deliveryPhotoUrl}')" style="cursor:pointer;border-radius:14px;overflow:hidden;position:relative;">
             <img src="${order.deliveryPhotoUrl}" style="width:100%;max-height:160px;object-fit:cover;display:block;" alt="Delivery proof">
             <div style="position:absolute;inset:0;background:rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;">
               <div style="background:rgba(0,0,0,0.5);border-radius:100px;padding:6px 14px;font-size:12px;font-weight:700;color:#fff;">ðŸ” Tap to view</div>
             </div>
           </div>
         </div>`
      : '';

    el.innerHTML = stepsHtml + riderHtml + photoHtml;
  }

  // Unsubscribe all history listeners when leaving orders screen
  function cleanupHistoryListeners() {
    historyUnsubscribers.forEach(u => u());
    historyUnsubscribers = [];
  }


  const _origGoTo = window.goTo;
  window.goTo = function(screen) {
    // Clean up history listeners when leaving orders screen
    if (screen !== 'orders') cleanupHistoryListeners();
    _origGoTo(screen);
    if (screen === 'notes') { notesActiveTab = 'All'; loadNotesFromFirestore(); }
    if (screen === 'profile') {
      loadProfile();
    }
    if (screen !== 'profile') {
      profileUnsubscribers.forEach(u => u());
      profileUnsubscribers = [];
    }
    if (screen === 'orders') {
      loadOrderHistory();
    }
    if (screen === 'success') {
      // Reset rating card
      currentRating = 0;
      const card = document.getElementById('rating-card');
      if (card) {
        card.innerHTML = `
          <div class="rating-card-title">How was your experience? â­</div>
          <div class="rating-card-sub">Rate Oya's stall â€” takes 10 seconds!</div>
          <div class="star-row" id="star-row">
            <button class="star-btn" data-val="1" onclick="setRating(1)">â­</button>
            <button class="star-btn" data-val="2" onclick="setRating(2)">â­</button>
            <button class="star-btn" data-val="3" onclick="setRating(3)">â­</button>
            <button class="star-btn" data-val="4" onclick="setRating(4)">â­</button>
            <button class="star-btn" data-val="5" onclick="setRating(5)">â­</button>
          </div>
          <div class="rating-label" id="rating-label"></div>
          <div class="quick-tags" id="quick-tags" style="display:none;">
            <button class="quick-tag" onclick="toggleTag(this)">ðŸµ Great drinks</button>
            <button class="quick-tag" onclick="toggleTag(this)">ðŸ¢ Fresh oden</button>
            <button class="quick-tag" onclick="toggleTag(this)">âš¡ Fast service</button>
            <button class="quick-tag" onclick="toggleTag(this)">ðŸ’° Good value</button>
            <button class="quick-tag" onclick="toggleTag(this)">ðŸ˜Š Friendly staff</button>
            <button class="quick-tag" onclick="toggleTag(this)">ðŸ“¦ Nice packaging</button>
          </div>
          <textarea class="review-textarea" id="review-text" placeholder="Share more about your experienceâ€¦ (optional)" style="display:none;"></textarea>
          <button class="submit-review-btn" id="submit-review-btn" onclick="submitReview()" style="display:none;" disabled>Submit Review</button>`;
      }
    }
  };
