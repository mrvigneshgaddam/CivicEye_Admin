// chatapp.js - Complete implementation with presence and security
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  getDoc,
  setDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ===== Helpers =====
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const state = {
  user: null,
  myKeys: { publicJwk: null, wrappedPrivB64: null },
  crypto: { privateKey: null, publicKey: null },
  currentConvId: null,
  currentConvKey: null,
  unsubMessages: null,
  unsubConversations: null,
  onlineUsers: new Set(),
  userStatusListeners: {}
};

const LS_KEYS = {
  WRAPPED_PRIV: 'civikey_wrapped_priv',
  WRAP_META: 'civikey_wrap_meta',
  PUB_JWK: 'civikey_pub_jwk',
};

// ===== WebCrypto utils =====
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = {
  to(b) { return btoa(String.fromCharCode(...new Uint8Array(b))); },
  from(s) {
    const bin = atob(s); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }
};

async function deriveWrapKey(passphrase, saltB64, iterations=250000) {
  const salt = saltB64 ? b64.from(saltB64) : crypto.getRandomValues(new Uint8Array(16)).buffer;
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  const wrapKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['wrapKey','unwrapKey']
  );
  return { wrapKey, saltB64: saltB64 || b64.to(salt) };
}

async function genUserECDH() {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

function jwkStr(jwk) { return JSON.stringify(jwk); }

async function wrapPrivateKey(privateKey, wrapKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey(
    'jwk', privateKey, wrapKey, { name: 'AES-GCM', iv }
  );
  return { wrappedB64: b64.to(wrapped), ivB64: b64.to(iv) };
}

async function unwrapPrivateKey(wrappedB64, wrapKey, ivB64) {
  const wrapped = b64.from(wrappedB64);
  const iv = new Uint8Array(b64.from(ivB64));
  return crypto.subtle.unwrapKey(
    'jwk', wrapped, wrapKey, { name: 'AES-GCM', iv },
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey','deriveBits']
  );
}

async function ecdhSecret(myPrivKey, peerPubJwk) {
  const peerPub = await crypto.subtle.importKey(
    'jwk', peerPubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPub },
    myPrivKey,
    { name: 'AES-GCM', length: 256 },
    false, ['wrapKey','unwrapKey']
  );
}

async function genConversationKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt']);
}

async function wrapConversationKey(aesKey, wrapKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey('raw', aesKey, wrapKey, { name: 'AES-GCM', iv });
  return { wrappedKeyB64: b64.to(wrapped), ivB64: b64.to(iv) };
}

async function unwrapConversationKey(wrappedKeyB64, wrapKey, ivB64) {
  const wrapped = b64.from(wrappedKeyB64);
  const iv = new Uint8Array(b64.from(ivB64));
  return crypto.subtle.unwrapKey(
    'raw', wrapped, wrapKey, { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt']
  );
}

async function encryptMessage(aesKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, aesKey, enc.encode(plaintext));
  return { iv: b64.to(iv), ciphertext: b64.to(ct) };
}

async function decryptMessage(aesKey, ivB64, ciphertextB64) {
  const iv = new Uint8Array(b64.from(ivB64));
  const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, aesKey, b64.from(ciphertextB64));
  return dec.decode(pt);
}

// ===== Presence System =====
async function setupUserPresence(uid) {
  try {
    const userRef = doc(window.firebaseDb, "users", uid);
    
    // Set user as online
    await updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp()
    });

    // Setup disconnect handler
    window.addEventListener("beforeunload", async () => {
      await updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      });
    });

    // Realtime Database presence for better tracking
    const userStatusRef = ref(window.firebaseRtdb, `status/${uid}`);
    const isOfflineForRTDB = {
      state: 'offline',
      lastChanged: serverTimestamp()
    };
    
    const isOnlineForRTDB = {
      state: 'online',
      lastChanged: serverTimestamp()
    };

    await set(userStatusRef, isOnlineForRTDB);
    onDisconnect(userStatusRef).set(isOfflineForRTDB);

  } catch (error) {
    console.error("Error setting up presence:", error);
  }
}

function monitorOnlineStatus(partnerIds) {
  // Clean up previous listeners
  Object.values(state.userStatusListeners).forEach(unsubscribe => unsubscribe());
  state.userStatusListeners = {};
  
  // Monitor online status of conversation partners
  partnerIds.forEach(partnerId => {
    const partnerStatusRef = ref(window.firebaseRtdb, `status/${partnerId}`);
    const unsubscribe = onValue(partnerStatusRef, (snapshot) => {
      const status = snapshot.val();
      if (status && status.state === 'online') {
        state.onlineUsers.add(partnerId);
        updatePartnerStatus(partnerId, true);
      } else {
        state.onlineUsers.delete(partnerId);
        updatePartnerStatus(partnerId, false);
      }
    });
    
    state.userStatusListeners[partnerId] = unsubscribe;
  });
}

function updatePartnerStatus(partnerId, isOnline) {
  const conversations = $$('.conversation');
  conversations.forEach(conv => {
    if (conv.dataset.partner === partnerId) {
      const statusDot = conv.querySelector('.conversation-status');
      if (statusDot) {
        statusDot.className = `conversation-status ${isOnline ? 'online' : 'offline'}`;
      }
    }
  });

  // Update current chat header if this is the active partner
  const currentPartner = $('#partner-name').dataset.partnerId;
  if (currentPartner === partnerId) {
    $('#presence-dot').className = `fas fa-circle ${isOnline ? 'online' : 'offline'}`;
    $('#status-text').textContent = isOnline ? 'Online' : 'Offline';
  }
}

// ===== Security Indicators =====
function renderSecurityIndicators(userData) {
  const securityContainer = document.getElementById('security-info');
  if (!securityContainer) return;

  const security = userData.security || {};
  
  const securityHTML = `
    <div class="security-header">
      <i class="fas fa-shield-alt"></i>
      <span>Session Security</span>
    </div>
    <div class="security-status ${security.ipHash ? 'secure' : 'warning'}">
      <i class="fas ${security.ipHash ? 'fa-lock' : 'fa-exclamation-triangle'}"></i>
      <span>${security.ipHash ? 'Secure Connection' : 'Unverified Session'}</span>
    </div>
    <div class="security-details">
      <div>Last Login: ${formatDate(security.lastLogin)}</div>
      <div>IP Hash: ${security.ipHash || 'Unknown'}</div>
      <div>Device: ${security.userAgentHash ? 'Verified' : 'Unknown'}</div>
    </div>
  `;

  securityContainer.innerHTML = securityHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Never';
  if (timestamp.toDate) return timestamp.toDate().toLocaleString();
  return new Date(timestamp).toLocaleString();
}

// ===== UI Functions =====
function showError(msg) {
  console.error('Security notice:', msg);
  const el = document.createElement('div');
  el.className = 'security-badge secure-pulse';
  el.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${msg}`;
  const mc = $('#message-container');
  if (mc) mc.prepend(el);
  setTimeout(() => el.remove(), 4000);
}

function showSuccess(msg) {
  const el = document.createElement('div');
  el.className = 'security-badge';
  el.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  const mc = $('#message-container');
  if (mc) mc.prepend(el);
  setTimeout(() => el.remove(), 3000);
}

function renderConversationItem(conv) {
  const li = document.createElement('div');
  li.className = 'conversation';
  li.dataset.id = conv.id;
  
  const otherId = conv.participants.find(p => p !== state.user.uid) || 'Unknown';
  li.dataset.partner = otherId;
  
  const isOnline = state.onlineUsers.has(otherId);
  const lastUpdated = conv.lastUpdated?.toDate ? conv.lastUpdated.toDate() : new Date(conv.lastUpdated);
  
  li.innerHTML = `
    <img class="conversation-avatar" src="https://api.dicebear.com/7.x/initials/svg?seed=${otherId}" />
    <div class="conversation-details">
      <h4>${conv.title || otherId}</h4>
      <p>${conv.preview || 'Secure conversation'}</p>
    </div>
    <div class="conversation-meta">
      <span class="time">${lastUpdated.toLocaleTimeString()}</span>
      <span class="conversation-status ${isOnline ? 'online' : 'offline'}"></span>
      ${conv.unread ? `<span class="badge">${conv.unread}</span>` : ''}
    </div>
  `;
  li.addEventListener('click', () => openConversation(conv.id));
  return li;
}

function setPartnerHeader(partnerId, name) {
  $('#partner-name').textContent = name || 'Secure chat';
  $('#partner-name').dataset.partnerId = partnerId;
  
  const isOnline = state.onlineUsers.has(partnerId);
  $('#presence-dot').className = `fas fa-circle ${isOnline ? 'online' : 'offline'}`;
  $('#status-text').textContent = isOnline ? 'Online' : 'Offline';
}

function clearMessages() {
  const wrap = $('#message-container');
  if (!wrap) return;
  wrap.innerHTML = '';
}

function appendMessage({ text, time, mine }) {
  const wrap = $('#message-container');
  const row = document.createElement('div');
  row.className = `message ${mine ? 'sent' : 'received'}`;
  row.innerHTML = `
    <div class="message-content">
      <div class="message-text">${text}</div>
      <div class="message-time">${time ? new Date(time).toLocaleString() : ''}</div>
    </div>
  `;
  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}

function toggleComposer(show) {
  $('#message-input-container').style.display = show ? 'flex' : 'none';
  if (show) {
    $('#message-input').focus();
  }
}

// ===== Firebase Data Operations =====
async function ensureUserAuth() {
  return new Promise((resolve, reject) => {
    window.firebaseAuth.onAuthStateChanged(async (u) => {
      try {
        if (!u) {
          // Try to sign in anonymously
          try {
            await signInAnonymously(window.firebaseAuth);
          } catch (authError) {
            console.error("Authentication error:", authError);
            showError("Authentication failed. Please refresh the page.");
            reject(authError);
            return;
          }
          return;
        }
        state.user = u;
        $('#current-user-id').textContent = u.uid;
        resolve(u);
      } catch (e) { 
        console.error("Auth state error:", e);
        reject(e); 
      }
    });
  });
}

async function ensureUserKeys() {
  // Try local storage first
  const pubJwkStr = localStorage.getItem(LS_KEYS.PUB_JWK);
  const wrappedPriv = localStorage.getItem(LS_KEYS.WRAPPED_PRIV);
  const wrapMetaStr = localStorage.getItem(LS_KEYS.WRAP_META);

  if (!pubJwkStr || !wrappedPriv || !wrapMetaStr) {
    // First-time setup: prompt for passphrase and generate keys
    const pass = prompt('Set a local passphrase to protect your encryption keys (do NOT forget it):');
    if (!pass || pass.length < 6) {
      alert('Passphrase too short. Reload and try again.');
      throw new Error('Missing or weak passphrase');
    }
    
    const kp = await genUserECDH();
    const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
    const { wrapKey, saltB64 } = await deriveWrapKey(pass, null);
    const { wrappedB64, ivB64 } = await wrapPrivateKey(kp.privateKey, wrapKey);

    localStorage.setItem(LS_KEYS.PUB_JWK, jwkStr(pubJwk));
    localStorage.setItem(LS_KEYS.WRAPPED_PRIV, wrappedB64);
    localStorage.setItem(LS_KEYS.WRAP_META, JSON.stringify({ saltB64, ivB64, iterations: 250000 }));

    state.crypto.publicKey = kp.publicKey;
    state.crypto.privateKey = kp.privateKey;

    // Publish public key to Firestore
    const userRef = doc(window.firebaseDb, 'users', state.user.uid);
    await setDoc(userRef, {
      publicKey: pubJwk,
      uid: state.user.uid,
      displayName: state.user.displayName || `User ${state.user.uid.substring(0, 8)}`,
      online: true,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return;
  }

  // Existing user: unlock with passphrase
  const pass = prompt('Enter your passphrase to unlock your encryption keys:');
  const { saltB64, ivB64, iterations } = JSON.parse(wrapMetaStr);
  const { wrapKey } = await deriveWrapKey(pass, saltB64, iterations);
  const privKey = await unwrapPrivateKey(wrappedPriv, wrapKey, ivB64);
  const pubJwk = JSON.parse(pubJwkStr);
  const pubKey = await crypto.subtle.importKey(
    'jwk', pubJwk, { name:'ECDH', namedCurve:'P-256' }, true, []
  );
  
  state.crypto.privateKey = privKey;
  state.crypto.publicKey = pubKey;

  // Ensure public key exists in Firestore
  const userRef = doc(window.firebaseDb, 'users', state.user.uid);
  await setDoc(userRef, {
    publicKey: pubJwk, 
    updatedAt: serverTimestamp(),
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

async function listConversations() {
  const list = $('#conversation-list');
  list.innerHTML = '<div class="spinner"></div>';

  const q = query(
    collection(window.firebaseDb, "conversations"),
    where("participants", "array-contains", state.user.uid),
    orderBy("lastUpdated", "desc")
  );

  // Clean up previous listener
  if (state.unsubConversations) {
    state.unsubConversations();
  }

  state.unsubConversations = onSnapshot(q, (snapshot) => {
    list.innerHTML = '';
    const partners = new Set();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const convItem = renderConversationItem({ id: doc.id, ...data });
      list.appendChild(convItem);
      
      // Collect partners for online status monitoring
      const otherId = data.participants.find(p => p !== state.user.uid);
      if (otherId) partners.add(otherId);
    });
    
    // Monitor online status of all conversation partners
    monitorOnlineStatus(Array.from(partners));
    
    // If no conversations, show setup panel more prominently
    if (snapshot.empty) {
      $('.setup-panel').style.display = 'block';
    }
  }, (error) => {
    showError('Failed to load conversations: ' + error.message);
    console.error('Conversations error:', error);
    list.innerHTML = '<div class="error-message">Failed to load conversations</div>';
  });
}

async function startConversationWith(otherUid) {
  if (!otherUid || otherUid === state.user.uid) {
    showError('Invalid User ID');
    return null;
  }
  
  // Check if conversation already exists
  const q = query(
    collection(window.firebaseDb, "conversations"),
    where("participants", "array-contains", state.user.uid)
  );
  
  const snapshot = await getDocs(q);
  const existingConv = snapshot.docs.find(doc => {
    const data = doc.data();
    return data.participants.includes(otherUid);
  });
  
  if (existingConv) {
    return existingConv.id;
  }
  
  // Fetch peer public key
  let peerDoc;
  try {
    peerDoc = await getDoc(doc(window.firebaseDb, 'users', otherUid));
  } catch (error) {
    showError('User not found: ' + otherUid);
    return null;
  }
  
  if (!peerDoc.exists() || !peerDoc.data().publicKey) {
    showError('Recipient has not set up encryption keys yet.');
    return null;
  }
  
  const peerPub = peerDoc.data().publicKey;

  // Create AES conversation key
  const convKey = await genConversationKey();

  // Wrap for me and peer with ECDH-derived keys
  const myWrapKey = await ecdhSecret(state.crypto.privateKey, peerPub);
  const peerWrapKey = await ecdhSecret(state.crypto.privateKey, peerPub);
  
  const { wrappedKeyB64: myWrapped, ivB64: myIv } = await wrapConversationKey(convKey, myWrapKey);
  const { wrappedKeyB64: peerWrapped, ivB64: peerIv } = await wrapConversationKey(convKey, peerWrapKey);

  const conv = {
    participants: [state.user.uid, otherUid],
    title: null,
    lastUpdated: serverTimestamp(),
    keys: {
      [state.user.uid]: { wrapped: myWrapped, iv: myIv },
      [otherUid]: { wrapped: peerWrapped, iv: peerIv }
    }
  };
  
  const ref = await addDoc(collection(window.firebaseDb, "conversations"), conv);
  return ref.id;
}

async function loadConversationKey(convId, convData) {
  const me = state.user.uid;
  const other = convData.participants.find(p => p !== me);
  
  const otherDoc = await getDoc(doc(window.firebaseDb, 'users', other));
  if (!otherDoc.exists()) throw new Error('Peer key missing');
  
  const peerPub = otherDoc.data().publicKey;
  const wrapKey = await ecdhSecret(state.crypto.privateKey, peerPub);
  const entry = convData.keys[me];
  
  if (!entry) throw new Error('No key for current user in conversation');
  
  const aes = await unwrapConversationKey(entry.wrapped, wrapKey, entry.iv);
  state.currentConvKey = aes;
}

function watchMessages(convId) {
  if (state.unsubMessages) {
    state.unsubMessages();
    state.unsubMessages = null;
  }
  
  clearMessages();
  
  const q = query(
    collection(window.firebaseDb, "conversations", convId, "messages"),
    orderBy("createdAt", "asc")
  );
  
  state.unsubMessages = onSnapshot(q, async (snapshot) => {
    for (const doc of snapshot.docs) {
      const m = doc.data();
      try {
        const text = await decryptMessage(state.currentConvKey, m.iv, m.ciphertext);
        appendMessage({ 
          text, 
          time: m.createdAt?.toDate?.() || new Date(), 
          mine: m.senderId === state.user.uid 
        });
      } catch (e) {
        appendMessage({ 
          text: '[Unable to decrypt]', 
          time: new Date(), 
          mine: m.senderId === state.user.uid 
        });
      }
    }
  }, (err) => {
    showError('Realtime stream failed. Check rules/connection.');
    console.error('Messages error:', err);
  });
}

async function openConversation(convId) {
  state.currentConvId = convId;
  toggleComposer(true);
  
  const noChatElement = $('#no-chat-selected');
  if (noChatElement) noChatElement.style.display = 'none';

  // Highlight active conversation
  $$('.conversation').forEach(n => n.classList.toggle('active', n.dataset.id === convId));

  try {
    const docSnap = await getDoc(doc(window.firebaseDb, "conversations", convId));
    if (!docSnap.exists()) {
      showError('Conversation not found');
      return;
    }
    
    const data = docSnap.data();
    const other = data.participants.find(p => p !== state.user.uid);
    setPartnerHeader(other, other);

    await loadConversationKey(convId, data);
    watchMessages(convId);
    
  } catch (error) {
    showError('Failed to open conversation: ' + error.message);
    console.error('Open conversation error:', error);
  }
}

async function sendMessage() {
  const input = $('#message-input');
  const text = input.value.trim();
  
  if (!text || !state.currentConvKey || !state.currentConvId) return;

  try {
    const { iv, ciphertext } = await encryptMessage(state.currentConvKey, text);
    const msg = {
      senderId: state.user.uid,
      iv,
      ciphertext,
      createdAt: serverTimestamp()
    };
    
    const messagesRef = collection(window.firebaseDb, "conversations", state.currentConvId, "messages");
    await addDoc(messagesRef, msg);
    
    // Update conversation timestamp and preview
    const convRef = doc(window.firebaseDb, "conversations", state.currentConvId);
    await updateDoc(convRef, {
      lastUpdated: serverTimestamp(),
      preview: text.slice(0, 60)
    });
    
    input.value = '';
    
  } catch (error) {
    showError('Failed to send message: ' + error.message);
    console.error('Send message error:', error);
  }
}

// ===== Events & Boot =====
function setupEventListeners() {
  // Sidebar collapse
  const collapseBtn = $('#sidebarCollapse');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('active');
      document.querySelector('.main')?.classList.toggle('active');
    });
  }

  // New chat modal
  $('#new-chat-btn')?.addEventListener('click', () => {
    $('#new-chat-modal').style.display = 'flex';
    $('#new-chat-modal').setAttribute('aria-hidden', 'false');
    $('#new-chat-userid').focus();
  });

  $('#new-chat-close')?.addEventListener('click', () => {
    $('#new-chat-modal').style.display = 'none';
    $('#new-chat-modal').setAttribute('aria-hidden', 'true');
  });

  // Start new chat
  $('#start-chat-btn')?.addEventListener('click', async () => {
    const otherId = $('#new-chat-userid').value.trim();
    if (!otherId) return;
    
    try {
      const convId = await startConversationWith(otherId);
      if (convId) {
        $('#new-chat-modal').style.display = 'none';
        $('#new-chat-userid').value = '';
        await openConversation(convId);
      }
    } catch (e) {
      showError('Unable to start chat. Ensure the user ID is correct and keys are set.');
      console.error('Start chat error:', e);
    }
  });

  // Send message
  $('#send-btn')?.addEventListener('click', sendMessage);
  $('#message-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  });

  // Logout
  $('#logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { 
      // Set offline status before signing out
      if (state.user) {
        const userRef = doc(window.firebaseDb, "users", state.user.uid);
        await updateDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
      }
      
      await window.firebaseAuth.signOut(); 
      localStorage.removeItem(LS_KEYS.WRAPPED_PRIV);
      localStorage.removeItem(LS_KEYS.WRAP_META);
      localStorage.removeItem(LS_KEYS.PUB_JWK);
      window.location.reload(); 
    } catch (err) { 
      console.error('Logout error:', err);
      window.location.reload();
    }
  });
}

async function boot() {
  try {
    await ensureUserAuth();
    await ensureUserKeys();
    await setupUserPresence(state.user.uid);
    await listConversations();
    
    // Load user data for security indicators
    const userDoc = await getDoc(doc(window.firebaseDb, "users", state.user.uid));
    if (userDoc.exists()) {
      renderSecurityIndicators(userDoc.data());
    }
    
    setupEventListeners();
    showSuccess('Secure session initialized successfully');
    
  } catch (e) {
    showError('Security session failed to initialize. Refresh and ensure passphrase is correct.');
    console.error('Boot error:', e);
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', boot);