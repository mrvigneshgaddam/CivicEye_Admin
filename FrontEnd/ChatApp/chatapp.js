// chatapp.js - Fixed WhatsApp-style chat with MongoDB user data + Firebase chat/presence

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
  getFirestore,
  doc, updateDoc, setDoc, serverTimestamp,
  collection, query, where, onSnapshot, orderBy, addDoc, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA4jEkTJpjY98Btsqm2A-_5ycQBUvvGTuA",
  authDomain: "civikeye-chat.firebaseapp.com",
  projectId: "civikeye-chat",
  storageBucket: "civikeye-chat.firebasestorage.app",
  messagingSenderId: "18367232043",
  appId: "1:18367232043:web:3590ccd8a59f772e95d26e",
  measurementId: "G-CRTF4KNR3E",
  databaseURL: "https://civikeye-chat-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const BACKEND_URL = 'http://localhost:5000';

// Utility Shortcuts
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const state = {
  user: null,
  userKeys: null,
  currentConversation: null,
  listeners: [],
  currentUserMongoId: null
};

let currentVerificationData = null;

// ==================== IMPROVED SESSION STORAGE UTILITIES ====================

function getSessionData(key) {
  try {
    const data = sessionStorage.getItem(key);
    console.log(`🔍 SessionStorage get ${key}:`, data ? 'Exists' : 'Null');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session data:', error);
    return null;
  }
}

function setSessionData(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    console.log(`💾 SessionStorage set ${key}:`, value ? 'Success' : 'Null');
  } catch (error) {
    console.error('Error setting session data:', error);
  }
}

// ==================== IMPROVED AUTHENTICATION HELPER FUNCTIONS ====================

async function getJWTToken() {
  try {
    const token = sessionStorage.getItem('token') || 
                  sessionStorage.getItem('jwtToken') || 
                  sessionStorage.getItem('authToken');
    
    console.log('🔑 JWT Token retrieval:', token ? 'Found' : 'Not found');
    return token;
  } catch (error) {
    console.error('Error getting JWT token:', error);
    return null;
  }
}

async function getCurrentUserData() {
  try {
    // Comprehensive user data retrieval from multiple possible keys
    let userData = getSessionData('user') || 
                   getSessionData('currentUser') || 
                   getSessionData('userData');
    
    if (!userData) {
      // Try to parse from sessionStorage directly with different keys
      const userString = sessionStorage.getItem('user') || 
                         sessionStorage.getItem('currentUser') ||
                         sessionStorage.getItem('userData');
      if (userString) {
        try {
          userData = JSON.parse(userString);
        } catch (e) {
          console.warn('Failed to parse user data from sessionStorage');
        }
      }
    }
    
    if (userData) {
      console.log('✅ User data loaded successfully:', {
        id: userData.id || userData._id,
        name: userData.name,
        email: userData.email,
        firebaseUid: userData.firebaseUid
      });
    } else {
      console.warn('⚠️ No user data found in sessionStorage');
    }
    
    return userData;
  } catch (error) {
    console.error('Error getting current user data:', error);
    return null;
  }
}

async function ensureFirebaseAuth() {
  try {
    if (auth.currentUser) {
      console.log('✅ Firebase user already authenticated');
      return auth.currentUser;
    }

    const token = await getJWTToken();
    const userData = await getCurrentUserData();

    console.log('🔄 Firebase auth check:', {
      hasToken: !!token,
      hasUserData: !!userData,
      userData: userData
    });

    if (!token || !userData) {
      console.warn('❌ No JWT token or user data found');
      return null;
    }

    const res = await fetch(`${BACKEND_URL}/api/auth/get-firebase-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        email: userData.email,
        firebaseUid: userData.firebaseUid 
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log('🔑 Firebase token response:', data);

    if (!data.success || !data.firebaseToken) {
      throw new Error('Failed to get Firebase token from server');
    }

    const userCredential = await signInWithCustomToken(auth, data.firebaseToken);
    console.log('✅ Firebase auth successful:', userCredential.user.uid);
    return userCredential.user;

  } catch (error) {
    console.error('❌ Firebase auth error:', error);
    return null;
  }
}

async function initializeChatWithFirebase() {
  try {
    console.log('🔄 Starting Firebase authentication...');
    
    const firebaseUser = await ensureFirebaseAuth();
    
    if (firebaseUser) {
      state.user = firebaseUser;
      console.log('✅ Firebase chat initialized successfully');
      return true;
    } else {
      console.warn('⚠️ Firebase auth failed, continuing with limited functionality');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase chat initialization failed:', error);
    return false;
  }
}

// ==================== STORAGE UTILITIES ====================

function storePrivateKey(uid, privateKey) {
  try {
    localStorage.setItem(`priv-${uid}`, privateKey);
    console.log(`💾 Private key stored in localStorage for ${uid}`);
  } catch (error) {
    console.error('Error storing private key:', error);
  }
}

function getPrivateKey(uid) {
  const key = localStorage.getItem(`priv-${uid}`);
  console.log(`🔑 Private key retrieval for ${uid}:`, key ? 'Found' : 'Not found');
  return key;
}

function storeCurrentUserInfo(userInfo) {
  if (!userInfo) return;
  
  const data = {
    uid: userInfo.firebaseUid || userInfo.uid,
    mongoId: userInfo._id || userInfo.id || userInfo.mongoId,
    name: userInfo.name || 'Anonymous User',
    email: userInfo.email,
    profilePic: userInfo.profilePic || ''
  };
  setSessionData("currentUser", data);
  console.log('💾 Current user info stored in sessionStorage:', data);
}

function getCurrentUserInfo() {
  const userInfo = getSessionData('currentUser');
  console.log('👤 Current user info retrieved from sessionStorage:', userInfo);
  return userInfo;
}

function addVerifiedPartner(partnerId) {
  const verifiedPartners = getSessionData('verifiedPartners') || [];
  if (!verifiedPartners.includes(partnerId)) {
    verifiedPartners.push(partnerId);
    setSessionData('verifiedPartners', verifiedPartners);
  }
}

// ==================== FIXED CRYPTO UTILITIES ====================

async function generateKeys() {
  return crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
    true,
    ["encrypt","decrypt"]
  );
}

async function exportKey(key) {
  const spki = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(spki)));
}

async function importPublicKey(base64OrPem) {
  try {
    // Strip PEM headers if present
    let clean = base64OrPem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, ''); // remove all whitespace

    const binary = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      "spki",
      binary.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  } catch (error) {
    console.error("Error importing public key:", error);
    throw error;
  }
}

async function encryptMessage(pubKey, text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, enc);
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// FIXED DECRYPTION FUNCTION WITH PROPER ERROR HANDLING
async function decryptMessage(privKey, b64) {
  try {
    if (!b64 || !privKey) {
      throw new Error('Missing decryption data');
    }
    
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const dec = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, bin);
    return new TextDecoder().decode(dec);
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
}

// SAFE DECRYPTION WITH FALLBACK
async function decryptMessageSafe(encryptedData, messageId) {
  if (!encryptedData) {
    return '[Empty message]';
  }

  if (!state.userKeys || !state.userKeys.privateKey) {
    return '[Waiting for decryption keys...]';
  }

  try {
    const decrypted = await decryptMessage(state.userKeys.privateKey, encryptedData);
    console.log(`✅ Message ${messageId} decrypted successfully`);
    return decrypted;
  } catch (error) {
    console.warn(`⚠️ Decryption failed for message ${messageId}:`, error.name);
    
    // Return user-friendly message instead of throwing error
    if (error.name === 'OperationError') {
      return '[Encrypted message - key mismatch]';
    }
    
    return '[Encrypted message - decryption error]';
  }
}

async function generateFingerprint(publicKeyBase64) {
  try {
    const key = await importPublicKey(publicKeyBase64);
    const spkiBuffer = await crypto.subtle.exportKey("spki", key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", spkiBuffer);

    // Convert hash to spaced hex
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    const formatted = hex.match(/.{1,4}/g).join(" "); // group 4 chars
    return formatted.toUpperCase();
  } catch (error) {
    console.error("Error generating fingerprint:", error);
    return "ERROR";
  }
}

function compareFingerprints() {
  const enteredFingerprint = $("#compare-fingerprint").value.trim().toUpperCase();
  const actualPartnerFingerprint = currentVerificationData.partnerFingerprint;
  const resultElement = $("#comparison-result");
  
  if (!enteredFingerprint) {
    resultElement.innerHTML = "<p class='verification-warning'>Please enter fingerprint</p>";
    return;
  }
  
  const normalizedEntered = enteredFingerprint.replace(/\s/g, '').toUpperCase();
  const normalizedActual = actualPartnerFingerprint.replace(/\s/g, '').toUpperCase();
  
  if (normalizedEntered === normalizedActual) {
    resultElement.innerHTML = `<p class='verification-success'>✅ Match! Secure connection.</p>`;
    addVerifiedPartner(currentVerificationData.partnerId);
  } else {
    resultElement.innerHTML = `<p class='verification-error'>❌ No match! Security warning.</p>`;
  }
}

// Utility function to copy fingerprint to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showTemporaryMessage("Fingerprint copied to clipboard!");
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

function showTemporaryMessage(message) {
  const msg = document.createElement('div');
  msg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
  `;
  msg.textContent = message;
  document.body.appendChild(msg);
  
  setTimeout(() => {
    if (msg.parentNode) {
      document.body.removeChild(msg);
    }
  }, 2000);
}

// ==================== MONGODB INTEGRATION ====================

async function getUsersFromMongoDB() {
  try {
    const token = await getJWTToken();
    console.log('🔑 Token for MongoDB request:', token ? 'Exists' : 'Missing');
    
    if (!token) {
      throw new Error("JWT token missing - cannot fetch users");
    }

    const res = await fetch(`${BACKEND_URL}/api/officers/chat`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log('👥 Users API response:', data);

    if (!data.success) {
      console.error("Failed to fetch users:", data.message || data);
      return [];
    }

    console.log("✅ Users fetched from MongoDB:", data.users?.length || 0);
    return data.users || [];

  } catch (err) {
    console.error("❌ Error fetching users:", err);
    return [];
  }
}

async function fetchUserProfile(firebaseUid) {
  if (!firebaseUid) return null;

  const cachedProfiles = getSessionData('userProfiles') || {};
  if (cachedProfiles[firebaseUid]) {
    console.log('👤 User profile from cache:', firebaseUid);
    return cachedProfiles[firebaseUid];
  }

  try {
    const token = await getJWTToken();
    if (!token) {
      console.warn('No token available for profile fetch');
      return null;
    }

    const res = await fetch(`${BACKEND_URL}/api/officers/chat/${firebaseUid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        cachedProfiles[firebaseUid] = data.user;
        setSessionData('userProfiles', cachedProfiles);
        console.log('✅ User profile fetched:', data.user.name);
        return data.user;
      }
    }
  } catch (err) {
    console.error("Error fetching user profile:", err);
  }

  return null;
}

// ==================== FIXED USER PROFILE MANAGEMENT ====================

async function ensureUserProfile() {
  console.log('🔄 Ensuring user profile...');
  
  // First try to get current user info from sessionStorage
  let userInfo = getCurrentUserInfo();
  
  if (userInfo && userInfo.name && userInfo.name !== 'Anonymous User') {
    console.log('✅ User info from session storage:', userInfo);
    updateUIWithUserInfo(userInfo);
    state.currentUserMongoId = userInfo.mongoId;
    return userInfo.name;
  }

  // If not found or anonymous, try to get from sessionStorage with different keys
  const userData = await getCurrentUserData();
  
  if (userData && userData.name) {
    userInfo = {
      uid: userData.firebaseUid || userData.uid,
      mongoId: userData._id || userData.id,
      name: userData.name,
      email: userData.email,
      profilePic: userData.profilePic || ''
    };
    
    storeCurrentUserInfo(userInfo);
    state.currentUserMongoId = userInfo.mongoId;
    updateUIWithUserInfo(userInfo);
    console.log('✅ User profile created from session data');
    return userInfo.name;
  }

  // Final fallback - try to get name from Firebase auth
  let displayName = 'Anonymous User';
  if (state.user && state.user.displayName) {
    displayName = state.user.displayName;
  } else if (state.user) {
    displayName = `Officer-${state.user.uid.substring(0, 8)}`;
  }
  
  userInfo = {
    uid: state.user ? state.user.uid : 'anonymous',
    mongoId: null,
    name: displayName,
    email: state.user ? state.user.email : '',
    profilePic: state.user ? state.user.photoURL : ''
  };
  
  storeCurrentUserInfo(userInfo);
  updateUIWithUserInfo(userInfo);
  console.log('⚠️ Using fallback profile:', displayName);
  return displayName;
}

function updateUIWithUserInfo(userInfo) {
  if ($("#current-user-name")) {
    $("#current-user-name").textContent = userInfo.name;
  }
  
  const avatarEl = $("#current-user-avatar");
  const initialsEl = $("#current-user-initials");
  
  if (avatarEl && userInfo.profilePic) {
    avatarEl.src = userInfo.profilePic;
    avatarEl.style.display = "block";
    if (initialsEl) initialsEl.style.display = "none";
  } else if (initialsEl) {
    initialsEl.textContent = userInfo.name.substring(0, 2).toUpperCase();
    initialsEl.style.display = "block";
    if (avatarEl) avatarEl.style.display = "none";
  }
}

async function getUserDisplayName(mongoId) {
  if (!mongoId) return "Unknown User";

  const currentUser = getCurrentUserInfo();
  if (currentUser && mongoId === currentUser.mongoId) {
    return currentUser.name || "You";
  }

  const cachedProfiles = getSessionData('userProfiles') || {};
  for (const key in cachedProfiles) {
    if (cachedProfiles[key]._id === mongoId) {
      return cachedProfiles[key].name;
    }
  }

  return `User-${mongoId.substring(0,6)}`;
}

async function getUserProfilePic(mongoId) {
  if (!mongoId) return '';

  const currentUser = getCurrentUserInfo();
  if (currentUser && mongoId === currentUser.mongoId) {
    return currentUser.profilePic || '';
  }

  const cachedProfiles = getSessionData('userProfiles') || {};
  for (const key in cachedProfiles) {
    if (cachedProfiles[key]._id === mongoId) {
      return cachedProfiles[key].profilePic || '';
    }
  }

  return '';
}

// ==================== PROFILE DROPDOWN ====================

function setupProfileDropdown() {
  const profileDropdown = $(".profile-dropdown");
  const dropdownContent = $(".dropdown-content");

  if (!profileDropdown || !dropdownContent) return;

  profileDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    dropdownContent.style.display = "none";
  });

  dropdownContent.addEventListener("click", (e) => e.stopPropagation());

  $("#logout-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      sessionStorage.clear();
      window.location.href = '/login.html';
    } catch (error) {
      console.error("Logout error:", error);
      showError("Failed to logout. Please try again.");
    }
  });
}

// ==================== FIXED ENCRYPTION KEYS MANAGEMENT ====================

async function ensureUserKeys(uid) {
  if (!uid) return console.warn('No UID provided for key generation');

  // Try to load existing private key from localStorage
  const existingPriv = getPrivateKey(uid);

  if (existingPriv) {
    try {
      console.log('🔄 Loading existing private key from localStorage...');
      
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        Uint8Array.from(atob(existingPriv), c => c.charCodeAt(0)).buffer,
        { name: "RSA-OAEP", hash:"SHA-256" },
        true,
        ["decrypt"]
      );

      // Load public key from Firestore
      const userSnap = await getDoc(doc(db, "users", uid));
      let pubKey = null;
      if (userSnap.exists() && userSnap.data().publicKey) {
        pubKey = await importPublicKey(userSnap.data().publicKey);
        console.log('✅ Public key loaded from Firestore');
      } else {
        console.warn('⚠️ No public key found in Firestore');
      }

      state.userKeys = { privateKey, publicKey: pubKey };
      console.log('✅ Existing encryption keys loaded from localStorage');
      return;

    } catch (error) {
      console.error('❌ Error loading existing keys from localStorage:', error);
      // Continue to generate new keys
    }
  }

  // Generate new keys if existing ones fail or don't exist
  try {
    console.log('🔄 Generating new encryption keys...');
    const keys = await generateKeys();
    const pub = await exportKey(keys.publicKey);
    const privExported = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
    const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privExported)));
    
    // Store in localStorage for persistence across sessions
    storePrivateKey(uid, privBase64);

    // Save public key in Firestore
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { 
      publicKey: pub, 
      lastUpdated: serverTimestamp() 
    }, { merge: true });

    state.userKeys = { privateKey: keys.privateKey, publicKey: keys.publicKey };
    console.log('✅ New encryption keys generated and stored in localStorage');

  } catch (error) {
    console.error('❌ Error generating new keys:', error);
  }
}

// ==================== USER PRESENCE ====================

function setupUserPresence() {
  if (!state.user) {
    console.warn('No user for presence setup');
    return;
  }
  
  const statusRef = ref(rtdb, `status/${state.user.uid}`);
  onDisconnect(statusRef).set({ state: "offline", lastChanged: Date.now() });
  set(statusRef, { state: "online", lastChanged: Date.now() });
  console.log('✅ User presence setup completed');
}

// ==================== FIXED CONVERSATIONS WITH PROPER DECRYPTION ====================

async function listConversations() {
  if (!state.user) {
    console.warn('No user for conversation listing');
    return;
  }
  
  const q = query(collection(db, "conversations"), where("participants", "array-contains", state.user.uid));
  const unsubscribe = onSnapshot(q, async snap => {
    const container = $("#contacts-list");
    if (!container) return;
    
    container.innerHTML = "";
    if (snap.empty) { 
      container.innerHTML = `<p class="no-conversations">No conversations yet. Start a new chat!</p>`; 
      return; 
    }

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const partnerUid = data.participants.find(p => p !== state.user.uid);
      
      try {
        const partnerProfile = await fetchUserProfile(partnerUid);
        let partnerName, partnerPic;
        
        if (partnerProfile) {
          partnerName = partnerProfile.name;
          partnerPic = partnerProfile.profilePic;
        } else {
          partnerName = `Officer-${partnerUid.substring(0, 6)}`;
          partnerPic = '';
          console.warn('⚠️ Using fallback for partner UID:', partnerUid);
        }

        const el = document.createElement("div");
        el.classList.add("contact-item");
        el.innerHTML = `<div class="contact-avatar">${partnerPic ? `<img src="${partnerPic}" />` : partnerName.substring(0,2)}</div>
                        <div class="contact-details"><h4>${partnerName}</h4><p>${data.lastMessage||'No messages yet'}</p></div>`;
        el.onclick = () => openConversation(docSnap.id, data);
        container.appendChild(el);
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    }
  });
  
  state.listeners.push(unsubscribe);
  console.log('✅ Conversation listener setup');
}

// FIXED MESSAGE PROCESSING FUNCTION
async function processMessageContent(msg, messageId) {
  if (!msg.content) {
    return '[No message content]';
  }

  // If it's our own message, show plain text
  if (msg.sender === state.user.uid) {
    return msg.plainText || '[Your message]';
  }

  // For partner's messages, try to decrypt safely
  return await decryptMessageSafe(msg.content, messageId);
}

async function openConversation(convId, data) {
  if (!state.user || !state.userKeys?.privateKey) {
    console.warn('Cannot open conversation: user or keys missing');
    return;
  }

  state.listeners.forEach(u => u()); 
  state.listeners = [];

  state.currentConversation = convId;
  $("#chat-area").classList.remove("hidden");
  $("#no-chat-selected").classList.add("hidden");
  $("#message-container").innerHTML = "";

  const partnerUid = data.participants.find(p => p !== state.user.uid);
  const partnerProfile = await fetchUserProfile(partnerUid);
  const partnerName = partnerProfile ? partnerProfile.name : `User-${partnerUid.substring(0,6)}`;
  const partnerPic = partnerProfile ? partnerProfile.profilePic : '';

  $("#partner-name").textContent = partnerName;
  $("#partner-avatar").innerHTML = partnerPic ? `<img src="${partnerPic}" />` : partnerName.substring(0,2);

  updatePresenceStatus(partnerUid);

  const messagesQuery = query(collection(db, `conversations/${convId}/messages`), orderBy("createdAt"));
  
  const unsubscribe = onSnapshot(messagesQuery, async snap => {
    const container = $("#message-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    for(const docSnap of snap.docs) {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("message", msg.sender === state.user.uid ? "sent" : "received");

      const content = document.createElement("div"); 
      content.classList.add("message-content");

      // Use the fixed message processing function
      content.textContent = await processMessageContent(msg, docSnap.id);
      
      // Add message status indicators for sent messages
      if (msg.sender === state.user.uid) {
        const status = document.createElement("div");
        status.classList.add("message-status");
        
        if (msg.readBy && msg.readBy.length > 0) {
          status.innerHTML = "✓✓"; // Read
          status.title = "Read";
        } else if (msg.deliveredTo && msg.readBy && msg.deliveredTo.length > msg.readBy.length) {
          status.innerHTML = "✓"; // Delivered but not read
          status.title = "Delivered";
        } else {
          status.innerHTML = "🕒"; // Sending
          status.title = "Sending...";
        }
        
        div.appendChild(status);
      }

      const time = document.createElement("div"); 
      time.classList.add("message-time");
      time.textContent = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString() : "Sending...";
      div.appendChild(content); 
      div.appendChild(time);
      container.appendChild(div);
    }
    container.scrollTop = container.scrollHeight;
  });
  
  state.listeners.push(unsubscribe);
}

async function startNewChat(partnerMongoId) {
  if (!partnerMongoId || !state.user) {
    showError("Cannot start chat: missing partner or user data");
    return;
  }

  const cachedProfiles = getSessionData('userProfiles') || {};
  let partnerFirebaseUid = null;
  let partnerProfile = null;

  for (const key in cachedProfiles) {
    if (cachedProfiles[key]._id === partnerMongoId) {
      partnerProfile = cachedProfiles[key];
      partnerFirebaseUid = partnerProfile.firebaseUid;
      break;
    }
  }

  if (!partnerFirebaseUid) {
    showError("Failed to get partner information. Please try again.");
    return;
  }

  // Check if conversation already exists
  const q = query(collection(db, "conversations"), where("participants", "array-contains", state.user.uid));
  const querySnapshot = await getDocs(q);

  let existingConv = null;
  querySnapshot.forEach(doc => {
    const d = doc.data();
    if (d.participants.includes(partnerFirebaseUid)) {
      existingConv = { id: doc.id, data: d };
    }
  });

  if (existingConv) {
    return openConversation(existingConv.id, existingConv.data);
  }

  const partnerName = partnerProfile ? partnerProfile.name : `User-${partnerFirebaseUid.substring(0,6)}`;
  const currentUserInfo = getCurrentUserInfo();
  const userName = currentUserInfo ? currentUserInfo.name : "You";

  const convData = {
    participants: [state.user.uid, partnerFirebaseUid],
    participantNames: { [state.user.uid]: userName, [partnerFirebaseUid]: partnerName },
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    name: `Chat with ${partnerName}`
  };

  try {
    const convRef = await addDoc(collection(db, "conversations"), convData);
    openConversation(convRef.id, convData);
    console.log('✅ New chat started with:', partnerName);
  } catch (error) {
    console.error('Error creating new conversation:', error);
    showError("Failed to create new chat. Please try again.");
  }
}

// ==================== TYPING INDICATORS ====================

function setupTypingIndicator(conversationId, partnerUid) {
  const messageInput = $("#message-input");
  const typingRef = ref(rtdb, `typing/${conversationId}/${state.user.uid}`);
  let typingTimer;
  
  messageInput.addEventListener('input', () => {
    // Set typing status
    set(typingRef, true);
    
    // Clear previous timer
    clearTimeout(typingTimer);
    
    // Set timer to clear typing status
    typingTimer = setTimeout(() => {
      set(typingRef, false);
    }, 1000);
  });
  
  // Listen for partner's typing
  const partnerTypingRef = ref(rtdb, `typing/${conversationId}/${partnerUid}`);
  onValue(partnerTypingRef, (snapshot) => {
    const indicator = $("#typing-indicator");
    if (snapshot.val()) {
      indicator.style.display = "block";
    } else {
      indicator.style.display = "none";
    }
  });
}

function updatePresenceStatus(firebaseUid) {
  if (!firebaseUid) return;

  const userStatusRef = ref(rtdb, `status/${firebaseUid}`);
  onValue(userStatusRef, (snapshot) => {
    const status = snapshot.val();
    const dot = $("#presence-dot");
    const text = $("#status-text");
    
    if (status?.state === "online") {
      dot?.classList.add("online"); 
      dot?.classList.remove("offline");
      if (text) text.textContent = "Online";
    } else {
      dot?.classList.add("offline"); 
      dot?.classList.remove("online");
      if (text) text.textContent = "Offline";
    }
  });
}

// ==================== FIXED SEND MESSAGE FUNCTION ====================

async function sendMessage() {
  if(!state.user || !state.currentConversation) return showError("Cannot send message: not in a conversation");

  const input = $("#message-input"); 
  const text = input.value.trim(); 
  if(!text) return;

  input.disabled = true; 
  $("#send-btn").disabled = true; 
  input.value = "";

  try {
    const convRef = doc(db, "conversations", state.currentConversation);
    const convSnap = await getDoc(convRef); 
    if(!convSnap.exists()) return showError("Conversation not found");

    const convData = convSnap.data();
    const partnerUid = convData.participants.find(p => p !== state.user.uid);
    if (!partnerUid) return showError("No partner found in conversation");

    const partnerUserSnap = await getDoc(doc(db, "users", partnerUid));
    if (!partnerUserSnap.exists() || !partnerUserSnap.data().publicKey) {
      return showError("Cannot send message: partner's encryption key not available");
    }

    const partnerPublicKey = await importPublicKey(partnerUserSnap.data().publicKey);
    const encryptedContent = await encryptMessage(partnerPublicKey, text);

    const messageData = {
      sender: state.user.uid,
      plainText: text,
      content: encryptedContent,
      createdAt: serverTimestamp(),
      recipients: [partnerUid]
    };

    await addDoc(collection(db, `conversations/${state.currentConversation}/messages`), messageData);
    await updateDoc(convRef, { lastMessage: text, lastUpdated: serverTimestamp() });

    console.log('✅ Message sent successfully');

  } catch (error) { 
    console.error("Send message error:", error); 
    showError("Failed to send message"); 
  } finally { 
    input.disabled = false; 
    $("#send-btn").disabled = false; 
    input.focus(); 
  }
}

// ==================== FIXED VERIFICATION FUNCTION ====================

async function setupVerification() {
  const verifyBtn = $("#verify-btn");
  if (!verifyBtn) return;

  verifyBtn.addEventListener("click", async () => {
    if (!state.currentConversation) {
      showError("Please select a conversation first");
      return;
    }
    
    try {
      const convRef = doc(db, "conversations", state.currentConversation);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        showError("Conversation not found");
        return;
      }
      
      const convData = convSnap.data();
      const partnerId = convData.participants.find(p => p !== state.user.uid);
      
      if (!partnerId) {
        showError("No partner found in conversation");
        return;
      }
      
      // Get PARTNER'S public key
      const partnerUserRef = doc(db, "users", partnerId);
      const partnerUserSnap = await getDoc(partnerUserRef);
      
      if (!partnerUserSnap.exists() || !partnerUserSnap.data().publicKey) {
        showError("Cannot verify: Partner's public key not available");
        return;
      }
      
      // Also get CURRENT USER'S public key for comparison
      const currentUserRef = doc(db, "users", state.user.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      
      if (!currentUserSnap.exists() || !currentUserSnap.data().publicKey) {
        showError("Cannot verify: Your public key is not available");
        return;
      }
      
      const partnerPublicKey = partnerUserSnap.data().publicKey;
      const currentUserPublicKey = currentUserSnap.data().publicKey;
      
      // Generate fingerprints for BOTH users
      const partnerFingerprint = await generateFingerprint(partnerPublicKey);
      const currentUserFingerprint = await generateFingerprint(currentUserPublicKey);
      
      // Store both fingerprints for comparison
      currentVerificationData = { 
        partnerId, 
        partnerFingerprint, 
        currentUserFingerprint,
        conversationId: state.currentConversation 
      };
      
      // Update verification modal content with CLEAR instructions - COMPACT VERSION
      const modalBody = $("#verification-modal .modal-body");
      if (modalBody) {
        modalBody.innerHTML = `
          <div class="verification-instructions compact">
            <h4>Identity Verification</h4>
            
            <div class="fingerprint-section">
              <p class="verification-label">📱 Your Fingerprint (Share this):</p>
              <div class="fingerprint-display compact" id="your-fingerprint">${currentUserFingerprint}</div>
              <button class="copy-btn compact" onclick="copyToClipboard('${currentUserFingerprint}')">Copy</button>
            </div>
            
            <div class="fingerprint-section">
              <p class="verification-label">👥 Partner's Fingerprint (Expected):</p>
              <div class="fingerprint-display compact" id="partner-fingerprint">${partnerFingerprint}</div>
            </div>
            
            <div class="verification-comparison compact">
              <p class="verification-label">✅ Verification:</p>
              <textarea id="compare-fingerprint" placeholder="Paste partner's fingerprint here..." rows="2"></textarea>
              <button id="compare-btn" class="verify-button compact">Compare</button>
              <div id="comparison-result" class="compact-result"></div>
            </div>
          </div>
        `;
        
        // Re-bind the compare button
        setTimeout(() => {
          const compareBtn = $("#compare-btn");
          if (compareBtn) {
            compareBtn.onclick = compareFingerprints;
          }
        }, 100);
      }
      
      $("#verification-modal").style.display = "block";
      
    } catch (error) {
      console.error("Error in verification:", error);
      showError("Failed to generate verification code");
    }
  });
}

// Define copyToClipboard in global scope
window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showTemporaryMessage("Fingerprint copied to clipboard!");
  }).catch(err => {
    console.error('Failed to copy: ', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showTemporaryMessage("Fingerprint copied to clipboard!");
  });
};

// ==================== IMPROVED INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log('🚀 Starting chat application initialization...');
    
    // Step 1: Initialize Firebase authentication first
    const firebaseAuthSuccess = await initializeChatWithFirebase();
    
    // Step 2: Ensure user profile is loaded
    await ensureUserProfile();
    
    if (!firebaseAuthSuccess) {
      showError("Chat authentication failed. Some features may not work.");
    }

    // Step 3: Setup UI components
    setupProfileDropdown();
    setupVerification();
    
    // Step 4: Initialize encryption keys (only if Firebase auth succeeded)
    if (firebaseAuthSuccess && state.user) {
      await ensureUserKeys(state.user.uid);
      setupUserPresence();
      await listConversations();
    }

    // Step 5: Setup event listeners
    $("#send-btn").onclick = sendMessage;
    $("#message-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    setupFileUpload();

    // New Chat Modal setup
    const newChatBtn = $("#new-chat-btn");
    const newChatModal = $("#new-chat-modal");
    const userList = $("#user-selection-list");
    const startBtn = $("#start-chat-btn");

    newChatBtn?.addEventListener("click", async () => {
      newChatModal.style.display = "block";
      await loadUsersForNewChat();
    });

    // Close modal handlers
    document.querySelectorAll(".close-modal").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const modal = btn.closest(".modal");
        if (modal) modal.style.display = "none";
      });
    });

    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
      }
    });

    startBtn?.addEventListener("click", async () => {
      const partnerMongoId = userList.value;
      if (!partnerMongoId) {
        showError("Please select a user first");
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = "Starting chat...";

      try {
        await startNewChat(partnerMongoId);
        $("#new-chat-modal").style.display = "none";
      } catch (error) {
        console.error("Error starting chat:", error);
        showError("Failed to start chat. Please check your authentication.");
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = "Start Secure Chat";
      }
    });

    console.log("✅ Chat application initialized successfully");

  } catch (err) {
    console.error("❌ Boot error:", err);
    showError("Chat failed to load. Please refresh the page or check console for details.");
  }
});

// ==================== UTILITY FUNCTIONS ====================

function showError(msg) {
  console.error('Error:', msg);
  // You can replace this with a better notification system
  alert(msg);
}

function setupFileUpload() {
  const uploadBtn = $("#upload-btn");
  const fileInput = $("#file-input");
  
  uploadBtn?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      showError("File upload functionality is not implemented in this demo.");
      e.target.value = "";
    }
  });
}

async function loadUsersForNewChat() {
  const userList = $("#user-selection-list");
  if (!userList) return;

  userList.innerHTML = `<option value="">Loading users...</option>`;

  try {
    const users = await getUsersFromMongoDB();
    userList.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a user";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    userList.appendChild(defaultOption);

    if (!users.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No other users found";
      opt.disabled = true;
      userList.appendChild(opt);
      return;
    }

    const cachedProfiles = getSessionData('userProfiles') || {};
    const currentUser = getCurrentUserInfo();

    users.forEach(user => {
      // Don't show current user in the list
      if (currentUser && user._id === currentUser.mongoId) return;
      
      const opt = document.createElement("option");
      opt.value = user._id;
      opt.textContent = user.name || `User-${user._id.substring(0,6)}`;
      userList.appendChild(opt);

      if (user.firebaseUid) {
        cachedProfiles[user.firebaseUid] = user;
      }
    });

    setSessionData('userProfiles', cachedProfiles);
    console.log(`✅ Loaded ${users.length} users for new chat`);

  } catch (err) {
    console.error("Error loading users:", err);
    userList.innerHTML = `<option value="" disabled>Error loading users. Please refresh.</option>`;
  }
}