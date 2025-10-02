// chatapp.js - Fixed  chat with MongoDB user data + Firebase chat/presence

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
  getFirestore,
  doc, updateDoc, setDoc, serverTimestamp,increment,
  collection, query, where, onSnapshot, orderBy, addDoc, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase, ref, set, onDisconnect, onValue, off } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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
  currentUserMongoId: null,
  typingTimeouts: {},
  typingListeners: {},
  partnerPublicKeys: {},
  keyGenerationAttempts: 0,
  maxKeyGenerationAttempts: 3
};

let currentVerificationData = null;

// ==================== IMPROVED TYPING INDICATORS ====================

function setupTypingIndicator(conversationId, partnerUid) {
  if (!conversationId || !partnerUid) return;
  
  console.log('🔔 Setting up typing indicator for:', conversationId, 'partner:', partnerUid);
  
  // Clean up previous listener for this conversation
  if (state.typingListeners[conversationId]) {
    try {
      state.typingListeners[conversationId]();
    } catch (error) {
      console.warn('Error cleaning up previous typing listener:', error);
    }
    delete state.typingListeners[conversationId];
  }
  
  // Clear existing typing indicator for this conversation
  const existingIndicator = $(`#typing-indicator-${conversationId}`);
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Listen for partner's typing status in Realtime Database
  const typingRef = ref(rtdb, `typing/${conversationId}/${partnerUid}`);
  
  const typingListener = onValue(typingRef, (snapshot) => {
    const isTyping = snapshot.val();
    console.log('🔔 Typing status update:', isTyping ? 'Typing...' : 'Not typing');
    
    const typingContainer = $("#typing-container");
    if (!typingContainer) {
      console.warn('❌ Typing container not found');
      return;
    }
    
    const indicatorId = `typing-indicator-${conversationId}`;
    let existingIndicator = $(`#${indicatorId}`);
    
    if (isTyping) {
      if (!existingIndicator) {
        console.log('🔔 Showing typing indicator');
        const typingEl = document.createElement('div');
        typingEl.id = indicatorId;
        typingEl.className = 'typing-indicator';
        typingEl.innerHTML = `
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span class="typing-text">${$("#partner-name")?.textContent || 'Partner'} is typing...</span>
        `;
        typingContainer.appendChild(typingEl);
        
        // Auto-scroll to show typing indicator
        const messageContainer = $("#message-container");
        if (messageContainer) {
          setTimeout(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
          }, 100);
        }
      }
    } else {
      if (existingIndicator) {
        console.log('🔔 Hiding typing indicator');
        existingIndicator.remove();
      }
    }
  });
  
  // Store the listener for cleanup
  state.typingListeners[conversationId] = typingListener;
}

function handleUserTyping(conversationId) {
  if (!conversationId || !state.user) {
    console.warn('❌ Cannot handle typing: missing conversation or user');
    return;
  }
  
  const typingRef = ref(rtdb, `typing/${conversationId}/${state.user.uid}`);
  
  // Set typing status to true
  set(typingRef, true);
  console.log('🔔 User started typing in conversation:', conversationId);
  
  // Clear existing timeout
  if (state.typingTimeouts[conversationId]) {
    clearTimeout(state.typingTimeouts[conversationId]);
  }
  
  // Set timeout to clear typing status after 2 seconds of inactivity
  state.typingTimeouts[conversationId] = setTimeout(() => {
    set(typingRef, false);
    console.log('🔔 User stopped typing in conversation:', conversationId);
  }, 2000);
}

function cleanupTypingIndicators() {
  // Clear all typing timeouts
  Object.values(state.typingTimeouts).forEach(timeout => {
    if (timeout) clearTimeout(timeout);
  });
  state.typingTimeouts = {};
  
  // Remove all typing listeners safely
  Object.entries(state.typingListeners).forEach(([conversationId, listenerRef]) => {
    if (listenerRef && typeof listenerRef === 'function') {
      try {
        listenerRef();
      } catch (error) {
        console.warn(`Error removing typing listener for ${conversationId}:`, error);
      }
    }
  });
  state.typingListeners = {};
  
  // Clear all typing indicators from UI
  const typingContainer = $("#typing-container");
  if (typingContainer) {
    typingContainer.innerHTML = '';
  }
}

// ==================== IMPROVED MESSAGE STATUS (READ/DELIVERED RECEIPTS) ====================

async function updateMessageStatus(conversationId, messageId, status) {
  if (!conversationId || !messageId) return;
  
  try {
    const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
    
    // Check if user has permission to update this message
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      console.warn('Message not found for status update');
      return;
    }
    
    await updateDoc(messageRef, {
      status: status,
      statusUpdatedAt: serverTimestamp()
    });
    console.log(`✅ Message ${messageId} status updated to: ${status}`);
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.warn('⚠️ Permission denied for message status update');
    } else {
      console.error('❌ Error updating message status:', error);
    }
  }
}

async function markMessagesAsRead(conversationId) {
  if (!conversationId || !state.user) return;

  try {
    console.log("📖 Marking messages as read in conversation:", conversationId);

    const messagesQuery = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy("createdAt")
    );

    const querySnapshot = await getDocs(messagesQuery);
    const batchUpdates = [];

    querySnapshot.forEach((docSnap) => {
      const msg = docSnap.data();

      // ✅ FIXED: Use senderId consistently
      if (
        msg.senderId !== state.user.uid &&
        (msg.status === "sent" || msg.status === "delivered")
      ) {
        batchUpdates.push(
          updateMessageStatus(conversationId, docSnap.id, "read").catch((error) => {
            if (error.code === "permission-denied") {
              console.warn("⚠️ Permission denied updating message:", docSnap.id);
            } else {
              console.error("❌ Error updating message:", error);
            }
          })
        );
      }
    });

    if (batchUpdates.length > 0) {
      await Promise.all(batchUpdates);
      console.log(`✅ Marked ${batchUpdates.length} messages as read`);
    }
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
  }
}


function getStatusIcon(status, isOwnMessage) {
  if (!isOwnMessage) return '';
  
  switch (status) {
    case 'sent':
      return '<span class="status-sent">✓</span>';
    case 'delivered':
      return '<span class="status-delivered">✓✓</span>';
    case 'read':
      return '<span class="status-read">✓✓ <span class="status-blue">●</span></span>';
    default:
      return '<span class="status-pending">🕒</span>';
  }
}

// ==================== STYLING ====================

function addChatStyles() {
  if ($('#chat-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'chat-styles';
  style.textContent = `
    /* Typing Indicators */
    .typing-indicator {
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-style: italic;
      color: #999;
      font-size: 14px;
      background: #f0f0f0;
      border-radius: 18px;
      margin: 5px 60px 5px 10px;
      width: fit-content;
      animation: fadeIn 0.3s ease;
    }
    
    .typing-dots {
      display: flex;
      gap: 3px;
    }
    
    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #999;
      animation: typingBounce 1.4s infinite ease-in-out;
    }
    
    .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typingBounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Message Status Icons */
    .message-status {
      font-size: 12px;
      margin-left: 8px;
      opacity: 0.7;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    
    .status-sent { color: #999; }
    .status-delivered { color: #999; }
    .status-read { color: #34B7F1; }
    .status-blue { color: #34B7F1; }
    .status-pending { color: #FFA000; }
    
    /* Professional message bubbles */
    .message {
      margin: 8px 0;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      max-width: 70%;
    }
    
    .message.sent {
      align-self: flex-end;
      margin-left: auto;
      flex-direction: row-reverse;
    }
    
    .message.received {
      align-self: flex-start;
    }
    
    .message-content {
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      max-width: 100%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .message.sent .message-content {
      background: #DCF8C6;
      color: #000;
      border-bottom-right-radius: 4px;
    }
    
    .message.received .message-content {
      background: #FFFFFF;
      color: #000;
      border-bottom-left-radius: 4px;
      border: 1px solid #f0f0f0;
    }
    
    .message-time {
      font-size: 11px;
      color: #999;
      margin-top: 4px;
      white-space: nowrap;
    }
    
    .message.sent .message-time {
      text-align: right;
    }
    
    /* Modal styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
    }
    
    .modal-content {
      background-color: #fefefe;
      margin: 5% auto;
      padding: 20px;
      border-radius: 10px;
      width: 80%;
      max-width: 500px;
    }
    
    .close-modal {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .close-modal:hover {
      color: black;
    }
    
    /* Contact list styles */
    .contact-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    
    .contact-item:hover {
      background-color: #f5f5f5;
    }
    
    .contact-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #25D366;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .contact-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ==================== SESSION STORAGE UTILITIES ====================

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}


function base64ToArrayBuffer(base64) {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.error("Base64 to ArrayBuffer conversion error:", error);
    throw new Error("Invalid base64 string");
  }
}

function getSessionData(key) {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session data:', error);
    return null;
  }
}

function setSessionData(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting session data:', error);
  }
}

// ==================== AUTHENTICATION HELPER FUNCTIONS ====================

async function getJWTToken() {
  try {
    return sessionStorage.getItem('token') || 
           sessionStorage.getItem('jwtToken') || 
           sessionStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting JWT token:', error);
    return null;
  }
}

async function getCurrentUserData() {
  try {
    let userData = getSessionData('user') || 
                   getSessionData('currentUser') || 
                   getSessionData('userData');
    
    if (!userData) {
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
    
    return userData;
  } catch (error) {
    console.error('Error getting current user data:', error);
    return null;
  }
}

async function ensureFirebaseAuth() {
  try {
    if (auth.currentUser) {
      return auth.currentUser;
    }

    const token = await getJWTToken();
    const userData = await getCurrentUserData();

    if (!token || !userData) {
      console.warn('No token or user data available');
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

    if (!data.success || !data.firebaseToken) {
      throw new Error('Failed to get Firebase token from server');
    }

    const userCredential = await signInWithCustomToken(auth, data.firebaseToken);
    return userCredential.user;

  } catch (error) {
    console.error('Firebase auth error:', error);
    return null;
  }
}

async function initializeChatWithFirebase() {
  try {
    const firebaseUser = await ensureFirebaseAuth();
    
    if (firebaseUser) {
      state.user = firebaseUser;
      console.log('✅ Firebase user authenticated:', firebaseUser.uid);
      return true;
    } else {
      console.warn('❌ Firebase authentication failed');
      return false;
    }
  } catch (error) {
    console.error('Firebase chat initialization failed:', error);
    return false;
  }
}

// ==================== STORAGE UTILITIES ====================

async function storePrivateKey(uid, privateKeyBase64, publicKeyBase64) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/keys/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firebaseUid: uid,
        privateKey: privateKeyBase64,
        publicKey: publicKeyBase64,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to store keys");

    console.log("✅ Keys stored in MongoDB (Police model) for user:", uid);
  } catch (error) {
    console.error("❌ Error storing keys in MongoDB:", error);
  }
}

async function getPrivateKey(uid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/keys/${uid}`);
    const data = await res.json();

    if (!data.success || !data.privateKey || !data.publicKey) {
      console.warn("⚠️ No keys found for user:", uid);
      return { priv: null, pub: null };
    }

    return { priv: data.privateKey, pub: data.publicKey };
  } catch (error) {
    console.error("❌ Error fetching keys from MongoDB:", error);
    return { priv: null, pub: null };
  }
}

function isValidBase64(str) {
  if (typeof str !== 'string') return false;
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
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
}

function getCurrentUserInfo() {
  return getSessionData('currentUser');
}

// ==================== CRYPTO UTILITIES ====================

async function generateKeys() {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );
    return keyPair;
  } catch (error) {
    console.error("Key generation error:", error);
    throw error;
  }
}

async function exportKey(key, format = "spki") {
  try {
    const exported = await crypto.subtle.exportKey(format, key);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Key export error:", error);
    throw error;
  }
}

async function importPublicKey(base64Key) {
  try {
    if (!base64Key || typeof base64Key !== 'string') {
      throw new Error("Invalid public key format");
    }
    
    // Clean the key - remove any PEM headers/footers and whitespace
    let cleanKey = base64Key
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, '')
      .trim();

    console.log("Importing public key, length:", cleanKey.length);
    
    // Validate base64
    try {
      atob(cleanKey);
    } catch (e) {
      throw new Error("Invalid base64 encoding in public key");
    }

    const binaryKey = base64ToArrayBuffer(cleanKey);
    
    const publicKey = await crypto.subtle.importKey(
      "spki",
      binaryKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["encrypt"]
    );
    
    console.log("✅ Public key imported successfully");
    return publicKey;
  } catch (error) {
    console.error("❌ Public key import error:", error);
    console.error("Key that failed:", base64Key?.substring(0, 100));
    throw new Error("Failed to import public key: " + error.message);
  }
}

async function importPrivateKey(base64Key) {
  try {
    if (!base64Key || typeof base64Key !== 'string') {
      throw new Error("Invalid private key format");
    }
    
    const binaryKey = base64ToArrayBuffer(base64Key);
    
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256"
      },
      true,
      ["decrypt"]
    );
    
    console.log("✅ Private key imported successfully");
    return privateKey;
  } catch (error) {
    console.error("❌ Private key import error:", error);
    throw new Error("Failed to import private key: " + error.message);
  }
}

async function encryptMessage(publicKey, text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      data
    );
    
    return arrayBufferToBase64(encrypted);
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
}

async function decryptMessage(privateKey, encryptedBase64) {
  try {
    if (!privateKey) throw new Error("No private key available");
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') 
      throw new Error("Invalid encrypted data");

    const cleanBase64 = encryptedBase64.replace(/\s/g, '');
    
    // Better base64 validation
    try {
      atob(cleanBase64);
    } catch (e) {
      throw new Error("Invalid base64 encoding in encrypted message");
    }

    const encryptedData = base64ToArrayBuffer(cleanBase64);

    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("❌ Decryption failed:", error);
    
    // Try with historical keys if available
    const historicalResult = await tryDecryptWithHistoricalKeys(encryptedBase64);
    if (historicalResult) {
      return historicalResult;
    }
    
    // More specific error handling
    if (error.toString().includes("OAEP") || error.toString().includes("decrypt")) {
      return "[Encrypted message - Key mismatch. Please reset encryption keys from the menu.]";
    } else if (error.message.includes("base64")) {
      return "[Encrypted message - Corrupted data]";
    } else {
      return "[Encrypted message - Decryption failed]";
    }
  }
}
// Add this new function to handle historical key decryption
async function tryDecryptWithHistoricalKeys(encryptedBase64) {
  if (!state.user) return null;
  
  try {
    console.log("🔄 Attempting to decrypt with historical keys...");
    
    const keysToTry = [];
    const currentUserId = state.user.uid;
    
    // Add current key first
    const currentKeys = getPrivateKey(currentUserId);
    if (currentKeys.priv) {
      keysToTry.push({ 
        key: currentKeys.priv, 
        source: 'current',
        uid: currentUserId
      });
    }
    
    // Look for historical key backups
    const historicalKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('historical-keys-') && key.includes(currentUserId)) {
        try {
          const keyData = JSON.parse(localStorage.getItem(key));
          if (keyData.privateKey) {
            historicalKeys.push({
              key: keyData.privateKey,
              source: 'historical',
              timestamp: keyData.timestamp,
              uid: currentUserId
            });
          }
        } catch (e) {
          console.warn('Invalid historical key format:', key);
        }
      }
    }
    
    // Sort historical keys by timestamp (newest first)
    historicalKeys.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    keysToTry.push(...historicalKeys);
    
    // Try each key
    for (const keyInfo of keysToTry) {
      try {
        const privateKey = await importPrivateKey(keyInfo.key);
        const cleanBase64 = encryptedBase64.replace(/\s/g, '');
        const encryptedData = base64ToArrayBuffer(cleanBase64);
        
        const decrypted = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privateKey,
          encryptedData
        );
        
        console.log(`✅ Successfully decrypted with ${keyInfo.source} key`);
        return new TextDecoder().decode(decrypted);
      } catch (e) {
        console.log(`❌ Failed with ${keyInfo.source} key`);
        // Continue to next key
      }
    }
    
    return null;
  } catch (error) {
    console.error("Historical key recovery failed:", error);
    return null;
  }
}

// ==================== FIXED FINGERPRINT GENERATION ====================

function isValidHexString(hexString) {
  return /^[0-9A-Fa-f]+$/.test(hexString.replace(/\s/g, ''));
}

function cleanFingerprint(fingerprint) {
  // Remove all non-hex characters and ensure proper formatting
  return fingerprint.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
}

function formatFingerprint(hexString) {
  // Ensure we have a valid hex string
  const cleanHex = cleanFingerprint(hexString);
  if (cleanHex.length !== 64) {
    console.warn('Invalid fingerprint length:', cleanHex.length);
    return hexString; // Return original if invalid
  }
  
  // Format as groups of 4 characters
  return cleanHex.match(/.{1,4}/g).join(' ').toUpperCase();
}

async function generateFingerprint(publicKeyBase64) {
  try {
    console.log("🔑 Generating fingerprint from public key");
    
    if (!publicKeyBase64 || typeof publicKeyBase64 !== 'string') {
      throw new Error("Invalid public key format");
    }

    // Clean the key - remove any PEM headers/footers and whitespace
    let cleanKey = publicKeyBase64
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, '')
      .trim();

    console.log("Cleaned key length:", cleanKey.length);
    console.log("Key starts with:", cleanKey.substring(0, 20));

    // Validate base64
    try {
      const binaryKey = base64ToArrayBuffer(cleanKey);
      console.log("Binary key length:", binaryKey.byteLength);
    } catch (e) {
      console.error("Base64 validation failed:", e);
      throw new Error("Invalid base64 encoding in public key");
    }

    const publicKey = await importPublicKey(cleanKey);
    
    // Export to SPKI format to get consistent binary representation
    const spkiBuffer = await crypto.subtle.exportKey("spki", publicKey);
    console.log("SPKI buffer length:", spkiBuffer.byteLength);
    
    // Create SHA-256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", spkiBuffer);
    console.log("Hash buffer length:", hashBuffer.byteLength);
    
    // Convert to hex string with proper validation
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexString = hashArray.map(b => {
      const hex = b.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    console.log("Raw hex string:", hexString);
    console.log("Hex string length:", hexString.length);
    
    if (hexString.length !== 64) {
      throw new Error(`Invalid hash length: ${hexString.length}, expected 64`);
    }
    
    if (!isValidHexString(hexString)) {
      throw new Error("Generated hash contains invalid hex characters");
    }
    
    const formatted = formatFingerprint(hexString);
    console.log("✅ Generated fingerprint:", formatted);
    return formatted;
  } catch (error) {
    console.error("❌ Fingerprint generation error:", error);
    console.error("Public key that failed:", publicKeyBase64?.substring(0, 100));
    return "ERROR: " + error.message;
  }
}
// ==================== MONGODB INTEGRATION ====================

async function getUsersFromMongoDB() {
  try {
    const token = await getJWTToken();
    
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

    if (!data.success) {
      console.error("Failed to fetch users:", data.message || data);
      return [];
    }

    return data.users || [];

  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
}

async function fetchUserProfile(firebaseUid) {
  if (!firebaseUid) return null;

  const cachedProfiles = getSessionData('userProfiles') || {};
  if (cachedProfiles[firebaseUid]) {
    return cachedProfiles[firebaseUid];
  }

  try {
    const token = await getJWTToken();
    if (!token) {
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
        return data.user;
      }
    }
  } catch (err) {
    console.error("Error fetching user profile:", err);
  }

  return null;
}

// ==================== USER PROFILE MANAGEMENT ====================

async function ensureUserProfile() {
  let userInfo = getCurrentUserInfo();
  
  if (userInfo && userInfo.name && userInfo.name !== 'Anonymous User') {
    state.currentUserMongoId = userInfo.mongoId;
    // Update the UI with the actual username
    updateUserDisplay(userInfo.name);
    return userInfo.name;
  }

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
    // Update the UI with the actual username
    updateUserDisplay(userInfo.name);
    return userInfo.name;
  }

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
  // Update the UI with the actual username
  updateUserDisplay(displayName);
  return displayName;
}

// Add this new function to update the user display
function updateUserDisplay(userName) {
  const currentUserNameEl = document.getElementById('current-user-name');
  if (currentUserNameEl) {
    currentUserNameEl.textContent = userName;
  }
  
  // Also update the header avatar if needed
  const headerAvatar = document.getElementById('headerAvatar');
  if (headerAvatar && !headerAvatar.src) {
    // You can set the avatar image here if you have it
    const userInfo = getCurrentUserInfo();
    if (userInfo && userInfo.profilePic) {
      headerAvatar.src = userInfo.profilePic;
    } else {
      // Set initials as fallback
      headerAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
    }
  }
}

// ==================== PROFILE DROPDOWN ====================

function setupProfileDropdown() {
  const profileDropdown = $(".profile-dropdown");
  const dropdownContent = $(".dropdown-content");

  if (!profileDropdown || !dropdownContent) {
    console.warn('Profile dropdown elements not found');
    return;
  }

  profileDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    dropdownContent.style.display = "none";
  });

  dropdownContent.addEventListener("click", (e) => e.stopPropagation());

  const logoutBtn = $("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/login.html';
      } catch (error) {
        console.error("Logout error:", error);
        showError("Failed to logout. Please try again.");
      }
    });
  }
}

// ==================== IMPROVED KEY MANAGEMENT ====================

async function validateKeyPair(publicKey, privateKey) {
  try {
    const testMessage = "key_validation_test_123";
    console.log("🔑 Validating key pair...");
    
    const encrypted = await encryptMessage(publicKey, testMessage);
    console.log("Encrypted test message length:", encrypted.length);
    
    const decrypted = await decryptMessage(privateKey, encrypted);
    console.log("Decryption successful:", decrypted === testMessage);
    
    return decrypted === testMessage;
  } catch (error) {
    console.error("❌ Key validation failed:", error);
    return false;
  }
}

async function ensureUserKeys(uid) {
  if (!uid) {
    console.error("No UID provided for key generation");
    return;
  }

  console.log("🔑 Ensuring keys for user:", uid);

  if (state.keyGenerationAttempts >= state.maxKeyGenerationAttempts) {
    console.error("❌ Maximum key generation attempts reached");
    showError("Key setup failed after multiple attempts. Please refresh the page.");
    return;
  }

  state.keyGenerationAttempts++;

  // 1. Check MongoDB for stored keys
  const existing = await getPrivateKey(uid);
  if (existing.priv && existing.pub) {
    try {
      console.log("🔑 Found existing keys in MongoDB, validating...");

      const privateKey = await importPrivateKey(existing.priv);
      const publicKey = await importPublicKey(existing.pub);

      const isValid = await validateKeyPair(publicKey, privateKey);

      if (isValid) {
        state.userKeys = { privateKey, publicKey };
        console.log("✅ Existing keys validated and loaded");

        await updatePublicKeyInFirestore(uid, existing.pub);
        state.keyGenerationAttempts = 0;
        return;
      } else {
        console.warn("❌ Key validation failed — will not overwrite keys in MongoDB.");
        showError("Stored keys are invalid. Please contact support to reset encryption keys.");
        return;
      }
    } catch (error) {
      console.error("❌ Error importing stored keys:", error);
      return;
    }
  }

  // 2. No keys in MongoDB → generate once and store
  try {
    console.log("⚠️ No keys found. Generating new encryption keys...");
    const keyPair = await generateKeys();

    const pubBase64 = await exportKey(keyPair.publicKey, "spki");
    const privBase64 = await exportKey(keyPair.privateKey, "pkcs8");

    const isValid = await validateKeyPair(keyPair.publicKey, keyPair.privateKey);
    if (!isValid) {
      throw new Error("Key validation failed after generation");
    }

    // Save permanently in MongoDB
    await storePrivateKey(uid, privBase64, pubBase64);

    // Update Firestore so others can send messages
    await updatePublicKeyInFirestore(uid, pubBase64);

    state.userKeys = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };

    state.keyGenerationAttempts = 0;
    console.log("✅ New encryption keys generated and stored in MongoDB");
  } catch (error) {
    console.error("❌ Error generating new keys:", error);

    if (state.keyGenerationAttempts < state.maxKeyGenerationAttempts) {
      console.log(`🔄 Retrying key generation (attempt ${state.keyGenerationAttempts})...`);
      setTimeout(() => ensureUserKeys(uid), 1000);
    } else {
      showError("Failed to set up encryption keys. Chat functionality will be limited.");
    }
  }
}


function backupHistoricalKeys(uid, privateKeyBase64, publicKeyBase64) {
  try {
    if (!uid || !privateKeyBase64) return;
    
    const backupKey = `historical-keys-${uid}-${Date.now()}`;
    const backupData = {
      privateKey: privateKeyBase64,
      publicKey: publicKeyBase64,
      timestamp: Date.now(),
      uid: uid
    };
    
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    console.log("✅ Historical keys backed up:", backupKey);
    
    // Clean up old backups (keep only last 5)
    const historicalKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('historical-keys-') && key.includes(uid)) {
        historicalKeys.push(key);
      }
    }
    
    if (historicalKeys.length > 5) {
      historicalKeys.sort(); // Sort by timestamp (oldest first)
      const keysToRemove = historicalKeys.slice(0, historicalKeys.length - 5);
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log("🧹 Cleaned up old key backups");
    }
  } catch (error) {
    console.error('Error backing up historical keys:', error);
  }
}

async function recoverEncryptionKeys() {
  if (!state.user) return;
  
  try {
    console.log("🔄 Attempting to recover encryption...");
    
    // Clear partner key cache to force refresh
    state.partnerPublicKeys = {};
    
    // Clear local keys and regenerate
    localStorage.removeItem(`priv-${state.user.uid}`);
    localStorage.removeItem(`pub-${state.user.uid}`);
    state.userKeys = null;
    state.keyGenerationAttempts = 0;
    
    await ensureUserKeys(state.user.uid);
    
    // Refresh current conversation
    if (state.currentConversation) {
      const convRef = doc(db, "conversations", state.currentConversation);
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        openConversation(state.currentConversation, convSnap.data());
      }
    }
    
    showError("Encryption keys recovered. Please ask your partner to resend any undecryptable messages.");
  } catch (error) {
    console.error("Recovery failed:", error);
    showError("Recovery failed. Please refresh the page.");
  }
}

async function updatePublicKeyInFirestore(uid, publicKeyBase64) {
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      publicKey: publicKeyBase64,
      keyVersion: Date.now(),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    console.log("Public key updated in Firestore for user:", uid);
  } catch (error) {
    console.error("Error updating public key in Firestore:", error);
  }
}

// ==================== SECURE FILE ENCRYPTION ====================

// Generate AES key for file encryption
async function generateFileEncryptionKey() {
  try {
    return await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  } catch (error) {
    console.error("❌ File encryption key generation failed:", error);
    throw error;
  }
}

// Encrypt file with AES-GCM
async function encryptFile(file) {
  try {
    console.log("🔒 Starting file encryption for:", file.name);
    
    // Generate encryption key
    const key = await generateFileEncryptionKey();
    
    // Generate IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Read file as ArrayBuffer
    const fileBuffer = await readFileAsArrayBuffer(file);
    
    // Encrypt file content
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      fileBuffer
    );
    
    // Export key for storage
    const exportedKey = await crypto.subtle.exportKey("raw", key);
    const keyBase64 = arrayBufferToBase64(exportedKey);
    const ivBase64 = arrayBufferToBase64(iv);
    
    // Calculate file hash for integrity verification
    const fileHash = await calculateFileHash(fileBuffer);
    
    const encryptionMetadata = {
      algorithm: "AES-GCM-256",
      iv: ivBase64,
      key: keyBase64,
      originalSize: file.size,
      encryptedSize: encryptedContent.byteLength,
      timestamp: Date.now()
    };
    
    console.log("✅ File encrypted successfully");
    
    return {
      encryptedData: new Blob([encryptedContent], { type: 'application/octet-stream' }),
      encryptionMetadata: encryptionMetadata,
      fileHash: fileHash
    };
    
  } catch (error) {
    console.error("❌ File encryption failed:", error);
    throw error;
  }
}

// Decrypt file with AES-GCM
async function decryptFile(encryptedBlob, encryptionMetadata) {
  try {
    console.log("🔓 Starting file decryption");
    
    if (!encryptionMetadata || !encryptionMetadata.key || !encryptionMetadata.iv) {
      throw new Error("Missing encryption metadata");
    }
    
    // Import encryption key
    const keyBuffer = base64ToArrayBuffer(encryptionMetadata.key);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    // Import IV
    const iv = base64ToArrayBuffer(encryptionMetadata.iv);
    
    // Read encrypted blob as ArrayBuffer
    const encryptedBuffer = await readBlobAsArrayBuffer(encryptedBlob);
    
    // Decrypt file content
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encryptedBuffer
    );
    
    console.log("✅ File decrypted successfully");
    
    return new Blob([decryptedContent]);
    
  } catch (error) {
    console.error("❌ File decryption failed:", error);
    throw error;
  }
}

// Calculate file hash for integrity verification
async function calculateFileHash(arrayBuffer) {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error("❌ File hash calculation failed:", error);
    throw error;
  }
}

// Read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Read blob as ArrayBuffer
function readBlobAsArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// Enhanced file validation
function validateFile(file) {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 'text/plain',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`);
  }
  
  if (file.size === 0) {
    throw new Error("File is empty");
  }
  
  return true;
}

// Secure file upload function
async function uploadAndSendFile(file) {
  if (!state.user || !state.currentConversation) {
    showError("Cannot send file: not in a conversation");
    return;
  }

  try {
    // Validate file
    validateFile(file);
    
    const token = await getJWTToken();
    if (!token) {
      showError("Authentication required");
      return;
    }

    console.log("🔒 Encrypting file...");
    
    // Encrypt file client-side
    const { encryptedData, encryptionMetadata, fileHash } = await encryptFile(file);
    
    // Get conversation data for verification
    const convRef = doc(db, "conversations", state.currentConversation);
    const convSnap = await getDoc(convRef);
    
    if (!convSnap.exists()) {
      throw new Error("Conversation not found");
    }

    const convData = convSnap.data();
    const partnerUid = convData.participants.find(p => p !== state.user.uid);
    
    if (!partnerUid) {
      throw new Error("No partner found in conversation");
    }

    // Create FormData for secure upload
    const formData = new FormData();
    formData.append('file', encryptedData, `encrypted_${file.name}`);
    formData.append('conversationId', state.currentConversation);
    formData.append('senderId', state.user.uid);
    formData.append('fileHash', fileHash);
    formData.append('encryptionMetadata', JSON.stringify(encryptionMetadata));

    // Upload encrypted file
    const uploadResponse = await fetch(`${BACKEND_URL}/api/secure-upload/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      throw new Error(uploadResult.message || 'Secure upload failed');
    }

    console.log("✅ Encrypted file uploaded to MongoDB");

    // Get partner's public key for metadata encryption
    const partnerPublicKey = await getPartnerPublicKey(partnerUid);
    
    // Prepare file metadata for encryption
    const fileMetadata = {
      type: 'secure-file',
      fileId: uploadResult.fileId,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      encryptedSize: uploadResult.size,
      url: uploadResult.url,
      encryptionMetadata: encryptionMetadata, // This contains the decryption key
      fileHash: fileHash,
      uploadedAt: uploadResult.uploadedAt
    };

    // Encrypt file metadata with partner's public key
    const encryptedContent = await encryptMessage(partnerPublicKey, JSON.stringify(fileMetadata));

    const messageData = {
      senderId: state.user.uid,
      content: encryptedContent,
      fileMetadata: fileMetadata, // Store unencrypted metadata for sender
      createdAt: serverTimestamp(),
      recipients: [partnerUid],
      status: 'sent',
      type: 'secure-file'
    };

    // Add secure file message to conversation
    const messageRef = await addDoc(
      collection(db, `conversations/${state.currentConversation}/messages`), 
      messageData
    );

    // Update conversation
    await updateDoc(convRef, { 
      lastMessage: `Sent a secure file: ${fileMetadata.originalName}`,
      lastUpdated: serverTimestamp() 
    });

    // Increment unread count
    await incrementUnreadCount(partnerUid, state.user.uid);

    console.log("🔒 Secure file sent successfully");

  } catch (error) {
    console.error("❌ Secure file upload error:", error);
    showError("Failed to send secure file: " + error.message);
  }
}

// Secure file download with decryption
async function downloadSecureFile(fileMetadata, messageId) {
  try {
    if (!fileMetadata || !fileMetadata.fileId) {
      throw new Error("Invalid file metadata");
    }

    const token = await getJWTToken();
    if (!token) {
      showError("Authentication required");
      return;
    }

    console.log("🔒 Downloading encrypted file...");

    // Download encrypted file
    const response = await fetch(`${BACKEND_URL}/api/secure-upload/file/${fileMetadata.fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Secure download failed');
    }

    const encryptedBlob = await response.blob();
    
    console.log("🔓 Decrypting file...");
    
    // Decrypt file client-side
    const decryptedBlob = await decryptFile(encryptedBlob, fileMetadata.encryptionMetadata);
    
    // Verify file integrity
    const decryptedBuffer = await readBlobAsArrayBuffer(decryptedBlob);
    const calculatedHash = await calculateFileHash(decryptedBuffer);
    
    if (calculatedHash !== fileMetadata.fileHash) {
      throw new Error("File integrity check failed - file may have been tampered with");
    }

    // Create download link
    const url = window.URL.createObjectURL(decryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileMetadata.originalName;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    console.log("✅ Secure file downloaded and decrypted");

    // Update message status to read
    if (messageId) {
      await updateMessageStatus(state.currentConversation, messageId, 'read');
    }

  } catch (error) {
    console.error('❌ Secure download error:', error);
    showError('Failed to download secure file: ' + error.message);
  }
}

// Enhanced file message display
function displaySecureFileMessage(msg, messageId, container, partnerUid) {
  const div = document.createElement("div");
  const isOwnMessage = msg.senderId === state.user.uid;
  div.classList.add("message", isOwnMessage ? "sent" : "received");

  const content = document.createElement("div");
  content.classList.add("message-content", "secure-file-message");

  let fileMetadata = null;
  
  if (isOwnMessage && msg.fileMetadata) {
    // For sent messages, use unencrypted metadata
    fileMetadata = msg.fileMetadata;
  } else {
    // For received messages, decrypt the content
    try {
      const decryptedContent = decryptMessage(state.userKeys.privateKey, msg.content);
      fileMetadata = JSON.parse(decryptedContent);
    } catch (error) {
      console.error("❌ Failed to decrypt secure file message:", error);
      content.innerHTML = `
        <div class="file-error">
          <div>🔒 Secure File</div>
          <div class="error-text">Decryption failed</div>
        </div>
      `;
      div.appendChild(content);
      container.appendChild(div);
      return;
    }
  }

  if (fileMetadata) {
    content.innerHTML = renderSecureFilePreview(fileMetadata, isOwnMessage);
    
    // Add click event for secure download
    const downloadBtn = content.querySelector('.download-secure-file');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => downloadSecureFile(fileMetadata, messageId));
    }
    
    // Add security indicator
    const securityBadge = content.querySelector('.security-badge');
    if (securityBadge) {
      securityBadge.title = "End-to-end encrypted file";
    }
  }

  const time = document.createElement("div");
  time.classList.add("message-time");
  time.textContent = msg.createdAt ? 
    formatMessageTimestamp(msg.createdAt) : 
    "Sending...";

  if (isOwnMessage) {
    const status = document.createElement("div");
    status.classList.add("message-status");
    status.innerHTML = getStatusIcon(msg.status || 'sent', true);
    div.appendChild(status);
  }
  
  div.appendChild(content);
  div.appendChild(time);
  container.appendChild(div);
}

function renderSecureFilePreview(fileMetadata, isOwnMessage) {
  const { mimeType, originalName, size, encryptedSize } = fileMetadata;
  
  const fileIcon = getFileIcon(mimeType);
  const fileSize = formatFileSize(size);
  const encryptedSizeFormatted = formatFileSize(encryptedSize);
  
  return `
    <div class="secure-file-preview">
      <div class="file-header">
        <span class="security-badge">🔒</span>
        <span class="file-security">End-to-End Encrypted</span>
      </div>
      <div class="file-content">
        <div class="file-icon">${fileIcon}</div>
        <div class="file-info">
          <div class="file-name" title="${originalName}">${originalName}</div>
          <div class="file-details">
            <span class="file-size">${fileSize}</span>
            <span class="encrypted-size">(Encrypted: ${encryptedSizeFormatted})</span>
          </div>
        </div>
        <button class="download-secure-file" title="Download and decrypt securely">
          ${isOwnMessage ? '📁' : '⬇️'}
        </button>
      </div>
    </div>
  `;
}

// ==================== USER PRESENCE ====================

function setupUserPresence() {
  if (!state.user) return;
  
  const statusRef = ref(rtdb, `status/${state.user.uid}`);
  onDisconnect(statusRef).set({ state: "offline", lastChanged: Date.now() });
  set(statusRef, { state: "online", lastChanged: Date.now() });
  console.log('✅ User presence system activated');
}

// ==================== IMPROVED CONVERSATIONS ====================

async function listConversations() {
  if (!state.user) return;

  try {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", state.user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        const container = document.getElementById("contacts-list");
        if (!container) {
          console.warn("Contacts list container not found");
          return;
        }

        container.innerHTML = "";

        if (snap.empty) {
          container.innerHTML = `<p class="no-conversations">No conversations yet. Start a new chat!</p>`;
          return;
        }

        for (const docSnap of snap.docs) {
          try {
            const data = docSnap.data();
            const partnerUid = data.participants.find((p) => p !== state.user.uid);

            // Fetch partner info
            let partnerName = "";
            let partnerPic = "";

            if (data.participantNames && data.participantNames[partnerUid]) {
              partnerName = data.participantNames[partnerUid];
            } else if (data.participantInfo && data.participantInfo[partnerUid]) {
              partnerName = data.participantInfo[partnerUid].name || `Officer-${partnerUid.substring(0, 6)}`;
              partnerPic = data.participantInfo[partnerUid].profilePic || "";
            } else {
              const partnerProfile = await fetchUserProfile(partnerUid);
              if (partnerProfile) {
                partnerName = partnerProfile.name || `Officer-${partnerUid.substring(0, 6)}`;
                partnerPic = partnerProfile.profilePic || "";
              } else {
                partnerName = `Officer-${partnerUid.substring(0, 6)}`;
                partnerPic = "";
              }
            }

            const lastMessage = data.lastMessage || "No messages yet";
            const unreadCount = data.unreadCounts?.[state.user.uid] || 0;

            // Create contact element
            const el = document.createElement("div");
            el.classList.add("contact-item");
            addPartnerIdToContact(el, partnerUid);
            el.innerHTML = `
              <div class="contact-avatar">
                ${partnerPic ? `<img src="${partnerPic}" alt="${partnerName}" />` : partnerName.substring(0, 2)}
              </div>
              <div class="contact-details">
                <h4>${partnerName}</h4>
                <p>${lastMessage}</p>
              </div>
              <span class="unread-badge" style="display: ${unreadCount > 0 ? "inline-block" : "none"};">
                ${unreadCount}
              </span>
            `;
            el.onclick = () => openConversation(docSnap.id, data);
            container.appendChild(el);
          } catch (convError) {
            console.error("Error rendering conversation:", convError);
          }
        }
      },
      (error) => {
        console.error("Conversations listener error:", error);
        if (error.code === "permission-denied") {
          showError("Please refresh the page to reload conversations");
        }
      }
    );

    // Save unsubscribe function to state for cleanup
    state.listeners.push(unsubscribe);
  } catch (err) {
    console.error("Failed to list conversations:", err);
  }
}


async function openConversationById(conversationId) {
  try {
    const convRef = doc(db, "conversations", conversationId);
    const convSnap = await getDoc(convRef);
    
    if (convSnap.exists()) {
      openConversation(conversationId, convSnap.data());
    } else {
      showError("Conversation not found");
    }
  } catch (error) {
    console.error('Error opening conversation by ID:', error);
    showError("Failed to open conversation");
  }
}

async function openConversation(convId, data) {
  if (state.user && state.user.uid) {
    const partnerUid = data.participants.find(p => p !== state.user.uid);
    if (partnerUid) {
      await resetUnreadCount(state.user.uid, partnerUid);
    }
  }

  if (!state.user || !state.userKeys?.privateKey) {
    showError("Cannot open conversation: user not authenticated or keys not ready");
    return;
  }
  
  // Clean up previous listeners
  state.listeners.forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') unsubscribe();
  });
  state.listeners = [];
  
  cleanupTypingIndicators();

  state.currentConversation = convId;
  
  // Update UI
  const chatArea = $("#chat-area");
  const noChatSelected = $("#no-chat-selected");
  const messageContainer = $("#message-container");
  
  if (chatArea) chatArea.classList.remove("hidden");
  if (noChatSelected) noChatSelected.classList.add("hidden");
  if (messageContainer) messageContainer.innerHTML = "";

  const partnerUid = data.participants.find(p => p !== state.user.uid);
  
  let partnerName, partnerPic;
  
  if (data.participantNames && data.participantNames[partnerUid]) {
    partnerName = data.participantNames[partnerUid];
  } else if (data.participantInfo && data.participantInfo[partnerUid]) {
    partnerName = data.participantInfo[partnerUid].name;
    partnerPic = data.participantInfo[partnerUid].profilePic;
  } else {
    const partnerProfile = await fetchUserProfile(partnerUid);
    partnerName = partnerProfile ? partnerProfile.name : `User-${partnerUid.substring(0,6)}`;
    partnerPic = partnerProfile ? partnerProfile.profilePic : '';
  }

  const partnerNameEl = $("#partner-name");
  const partnerAvatarEl = $("#partner-avatar");
  
  if (partnerNameEl) partnerNameEl.textContent = partnerName;
  if (partnerAvatarEl) {
    partnerAvatarEl.innerHTML = partnerPic ? 
      `<img src="${partnerPic}" alt="${partnerName}" />` : 
      partnerName.substring(0,2);
  }

  updatePresenceStatus(partnerUid);
  setupTypingIndicator(convId, partnerUid);

  const messagesQuery = query(
    collection(db, `conversations/${convId}/messages`), 
    orderBy("createdAt", "asc") // Ensure ascending order
  );
  
  const unsubscribe = onSnapshot(messagesQuery, async (snap) => {
    const container = $("#message-container");
    if (!container) return;
    
    // Clear container but keep track of existing messages to avoid duplicates
    const existingMessageIds = new Set();
    const messageElements = container.querySelectorAll('.message');
    messageElements.forEach(el => {
      if (el.id) existingMessageIds.add(el.id);
    });
    
    let lastDate = null;
    let hasNewMessages = false;
    
    // Create an array to sort messages properly
    const messages = [];
    
    snap.docs.forEach(docSnap => {
      const msg = docSnap.data();
      messages.push({
        ...msg,
        id: docSnap.id,
        timestamp: msg.createdAt ? msg.createdAt.toDate().getTime() : Date.now()
      });
    });
    
    // Sort messages by timestamp to ensure proper sequence
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Clear container if we have new messages
    if (messages.length > messageElements.length) {
      container.innerHTML = "";
      lastDate = null;
    }
    
    // Process messages in correct order
    for (const msg of messages) {
      const messageId = msg.id;
      
      // Skip if message already exists (unless it's an update)
      if (existingMessageIds.has(messageId) && !hasNewMessages) {
        continue;
      }
      
      hasNewMessages = true;
      const currentDate = msg.createdAt;
      
      // Add date separator if needed
      if (currentDate) {
        if (shouldShowDateSeparator(lastDate, currentDate)) {
          const separator = createDateSeparator(currentDate);
          container.appendChild(separator);
        }
        lastDate = currentDate;
      }
      
      // Display the message with proper sequencing
      await displayMessage(msg, messageId, container, partnerUid);
    }
    
    // Scroll to bottom if there are new messages
    if (hasNewMessages) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
    
    // Mark messages as read when conversation is opened
    markMessagesAsRead(convId);
  });

  state.listeners.push(unsubscribe);
}

async function displayMessage(msg, messageId, container, partnerUid) {
  // Create message element with unique ID
  const div = document.createElement("div");
  div.id = messageId;
  
  const isOwnMessage = msg.senderId === state.user.uid;
  div.classList.add("message", isOwnMessage ? "sent" : "received");

  const content = document.createElement("div");
  content.classList.add("message-content");

  let messageText = "";
  let decryptionError = null;
  
  // Handle secure file messages
  if (msg.type === 'secure-file') {
    await displaySecureFileMessage(msg, messageId, container, partnerUid);
    return;
  }
  
  if (isOwnMessage) {
    // For sent messages, use plainText if available
    if (msg.plainText) {
      messageText = msg.plainText;
    } else if (msg.content) {
      try {
        messageText = await decryptMessage(state.userKeys.privateKey, msg.content);
      } catch (error) {
        messageText = "[Your encrypted message - decryption issue]";
        decryptionError = error.message;
      }
    } else {
      messageText = "[Your message]";
    }
  } else {
    // For received messages, always try to decrypt
    if (msg.content) {
      try {
        messageText = await decryptMessage(state.userKeys.privateKey, msg.content);
      } catch (error) {
        console.error("❌ Decryption failed for message:", messageId, error);
        messageText = "[Encrypted message - decryption failed]";
        decryptionError = error.message;
        
        // Try to refresh partner's public key
        setTimeout(async () => {
          try {
            console.log("🔄 Attempting to refresh partner's public key...");
            delete state.partnerPublicKeys[partnerUid]; // Clear cache
            await getPartnerPublicKey(partnerUid);
          } catch (e) {
            console.error("❌ Could not recover partner key:", e);
          }
        }, 2000);
      }
    } else {
      messageText = "[Encrypted message]";
    }
  }
  
  content.textContent = messageText;

  // Add decryption error tooltip if there was an error
  if (decryptionError) {
    content.title = `Decryption Error: ${decryptionError}`;
    content.style.border = "1px solid #ff4444";
    content.style.background = "#fff0f0";
  }

  const time = document.createElement("div");
  time.classList.add("message-time");
  time.textContent = msg.createdAt ? 
    formatMessageTimestamp(msg.createdAt) : 
    "Sending...";

  // Add status for own messages
  if (isOwnMessage) {
    const status = document.createElement("div");
    status.classList.add("message-status");
    status.innerHTML = getStatusIcon(msg.status || 'sent', true);
    div.appendChild(status);
  }
  
  div.appendChild(content);
  div.appendChild(time);
  
  // Append to container - messages will be in correct order due to sorting
  container.appendChild(div);
}

// ==================== SEND MESSAGE WITH TYPING INDICATOR ====================

async function sendMessage() {
  if (!state.user || !state.currentConversation) {
    showError("Cannot send message: not in a conversation");
    return;
  }

  const input = $("#message-input");
  const text = input ? input.value.trim() : '';
  if (!text) return;

  if (input) input.disabled = true;
  const sendBtn = $("#send-btn");
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.value = "";

  try {
    const convRef = doc(db, "conversations", state.currentConversation);
    const convSnap = await getDoc(convRef);
    
    if (!convSnap.exists()) {
      showError("Conversation not found");
      return;
    }

    const convData = convSnap.data();
    const partnerUid = convData.participants.find(p => p !== state.user.uid);
    
    if (!partnerUid) {
      showError("No partner found in conversation");
      return;
    }

    // Get partner's public key
    const partnerPublicKey = await getPartnerPublicKey(partnerUid);
    const encryptedContent = await encryptMessage(partnerPublicKey, text);

    const messageData = {
      senderId: state.user.uid,
      plainText: text, // Store plaintext for sender's display
      content: encryptedContent, // Encrypted version for recipient
      createdAt: serverTimestamp(),
      recipients: [partnerUid],
      status: 'sent'
    };

    const messageRef = await addDoc(
      collection(db, `conversations/${state.currentConversation}/messages`), 
      messageData
    );
    
    await incrementUnreadCount(partnerUid, state.user.uid);
    // Update status to delivered after a delay
    setTimeout(async () => {
      await updateMessageStatus(state.currentConversation, messageRef.id, 'delivered');
    }, 1000);
    
    await updateDoc(convRef, { 
      lastMessage: text, 
      lastUpdated: serverTimestamp() 
    });

    console.log("Message sent successfully");

  } catch (error) {
    console.error("Send message error:", error);
    showError("Failed to send message: " + error.message);
  } finally {
    if (input) {
      input.disabled = false;
      input.focus();
    }
    if (sendBtn) sendBtn.disabled = false;
  }
}

async function getPartnerPublicKey(partnerUid) {
  // Check cache first
  if (state.partnerPublicKeys[partnerUid]) {
    return state.partnerPublicKeys[partnerUid];
  }
  
  try {
    const partnerUserSnap = await getDoc(doc(db, "users", partnerUid));
    
    if (!partnerUserSnap.exists()) {
      throw new Error("Partner user document not found");
    }
    
    const partnerData = partnerUserSnap.data();
    if (!partnerData.publicKey) {
      throw new Error("Partner public key not found");
    }
    
    console.log("✅ Retrieved partner public key, length:", partnerData.publicKey.length);
    
    // ✅ FIXED: Better error handling for key import
    let publicKey;
    try {
      publicKey = await importPublicKey(partnerData.publicKey);
    } catch (importError) {
      console.error("❌ Failed to import partner public key:", importError);
      
      // Try to clean and re-import
      const cleanKey = partnerData.publicKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s+/g, '')
        .trim();
      
      publicKey = await importPublicKey(cleanKey);
    }
    
    // Cache the key
    state.partnerPublicKeys[partnerUid] = publicKey;
    return publicKey;
  } catch (error) {
    console.error("❌ Error getting partner public key:", error);
    
    // ✅ FIXED: Retry mechanism for partner key retrieval
    if (!state.partnerKeyRetries) state.partnerKeyRetries = {};
    state.partnerKeyRetries[partnerUid] = (state.partnerKeyRetries[partnerUid] || 0) + 1;
    
    if (state.partnerKeyRetries[partnerUid] <= 3) {
      console.log(`🔄 Retrying partner key retrieval (attempt ${state.partnerKeyRetries[partnerUid]})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getPartnerPublicKey(partnerUid);
    }
    
    throw new Error(`Failed to get partner public key after 3 attempts: ${error.message}`);
  }
}

// ==================== DATE DISPLAY ====================


function formatMessageTimestamp(timestamp) {
  if (!timestamp) return "Sending...";
  
  try {
    const messageDate = timestamp.toDate();
    const now = new Date();
    
    // Create date-only objects for accurate comparison (ignore time)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // WhatsApp-style formatting
    if (messageDay.getTime() === today.getTime()) {
      // Today - show only time
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (messageDay.getTime() === yesterday.getTime()) {
      // Yesterday
      return 'Yesterday';
    } else if (isThisWeek(messageDate)) {
      // This week - show day name
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older - show date
      return messageDate.toLocaleDateString([], { 
        day: 'numeric', 
        month: 'short', 
        year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return "Sending...";
  }
}

function shouldShowDateSeparator(previousDate, currentDate) {
  if (!previousDate || !currentDate) return true;
  
  try {
    const prev = previousDate.toDate();
    const curr = currentDate.toDate();
    
    // Create date-only objects (ignoring time) for proper comparison
    const prevDateOnly = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
    const currDateOnly = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate());
    
    return prevDateOnly.getTime() !== currDateOnly.getTime();
  } catch (error) {
    console.error('Error in date separator comparison:', error);
    return true;
  }
}

function createDateSeparator(timestamp) {
  try {
    if (!timestamp) {
      // If no timestamp, use current date
      const separator = document.createElement('div');
      separator.className = 'date-separator';
      separator.innerHTML = `<span>Today</span>`;
      return separator;
    }
    
    const date = timestamp.toDate();
    const now = new Date();
    
    // Create date-only objects for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let dateText;
    if (messageDay.getTime() === today.getTime()) {
      dateText = "Today";
    } else if (messageDay.getTime() === yesterday.getTime()) {
      dateText = "Yesterday";
    } else if (isThisWeek(date)) {
      dateText = date.toLocaleDateString([], { weekday: 'long' });
    } else {
      dateText = date.toLocaleDateString([], { 
        day: 'numeric', 
        month: 'long', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
    
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    separator.innerHTML = `<span>${dateText}</span>`;
    return separator;
  } catch (error) {
    console.error('Error creating date separator:', error);
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    separator.innerHTML = `<span>Today</span>`;
    return separator;
  }
}

function isThisWeek(date) {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    return date >= startOfWeek;
  } catch (error) {
    console.error('Error in isThisWeek:', error);
    return false;
  }
}

// ==================== FIXED START NEW CHAT FUNCTIONALITY ====================

function setupNewChatModal() {
  const newChatBtn = $("#new-chat-btn");
  const newChatModal = $("#new-chat-modal");
  
  if (!newChatBtn || !newChatModal) {
    console.warn('New chat modal elements not found');
    return;
  }
  
  // Open modal
  newChatBtn.addEventListener("click", async () => {
    newChatModal.style.display = "block";
    await loadUsersForNewChat();
  });
  
  // Start chat button
  const startChatBtn = $("#start-chat-btn");
  if (startChatBtn) {
    startChatBtn.addEventListener("click", () => {
      const userSelectionList = $("#user-selection-list");
      const selectedUserId = userSelectionList ? userSelectionList.value : null;
      if (selectedUserId) {
        startNewChat(selectedUserId);
        newChatModal.style.display = "none";
      } else {
        showError("Please select an officer to start a chat");
      }
    });
  }
  
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

  } catch (err) {
    console.error("Error loading users:", err);
    userList.innerHTML = `<option value="" disabled>Error loading users. Please refresh.</option>`;
  }
}

async function startNewChat(partnerMongoId) {
  if (!partnerMongoId || !state.user) {
    showError("Cannot start chat: missing partner or user data");
    return;
  }

  console.log('Starting new chat with partner:', partnerMongoId);

  const cachedProfiles = getSessionData('userProfiles') || {};
  let partnerFirebaseUid = null;
  let partnerProfile = null;

  // Find partner profile in cache
  for (const key in cachedProfiles) {
    if (cachedProfiles[key]._id === partnerMongoId) {
      partnerProfile = cachedProfiles[key];
      partnerFirebaseUid = partnerProfile.firebaseUid;
      break;
    }
  }

  // If not found in cache, try to fetch from MongoDB
  if (!partnerFirebaseUid) {
    try {
      const users = await getUsersFromMongoDB();
      partnerProfile = users.find(user => user._id === partnerMongoId);
      if (partnerProfile) {
        partnerFirebaseUid = partnerProfile.firebaseUid;
        cachedProfiles[partnerFirebaseUid] = partnerProfile;
        setSessionData('userProfiles', cachedProfiles);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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
    console.log('Opening existing conversation:', existingConv.id);
    return openConversation(existingConv.id, existingConv.data);
  }

  const currentUserInfo = getCurrentUserInfo();
  const userName = currentUserInfo ? currentUserInfo.name : "You";
  const partnerName = partnerProfile ? partnerProfile.name : `User-${partnerFirebaseUid.substring(0,6)}`;

  const convData = {
    participants: [state.user.uid, partnerFirebaseUid],
    participantNames: { 
      [state.user.uid]: userName, 
      [partnerFirebaseUid]: partnerName 
    },
    participantInfo: {
      [state.user.uid]: {
        name: userName,
        profilePic: currentUserInfo?.profilePic || ''
      },
      [partnerFirebaseUid]: {
        name: partnerName,
        profilePic: partnerProfile?.profilePic || ''
      }
    },
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    lastMessage: "Chat started"
  };

  try {
    console.log('Creating new conversation...');
    const convRef = await addDoc(collection(db, "conversations"), convData);
    console.log('New conversation created:', convRef.id);
    openConversation(convRef.id, convData);
  } catch (error) {
    console.error('Error creating new conversation:', error);
    showError("Failed to create new chat. Please try again.");
  }
}

// Update presence status
function updatePresenceStatus(firebaseUid) {
  if (!firebaseUid) return;

  const userStatusRef = ref(rtdb, `status/${firebaseUid}`);
  onValue(userStatusRef, (snapshot) => {
    const status = snapshot.val();
    const dot = $("#presence-dot");
    const text = $("#status-text");
    
    if (status?.state === "online") {
      if (dot) {
        dot.classList.add("online"); 
        dot.classList.remove("offline");
      }
      if (text) text.textContent = "Online";
    } else {
      if (dot) {
        dot.classList.add("offline"); 
        dot.classList.remove("online");
      }
      if (text) text.textContent = "Offline";
    }
  });
}

// ==================== VERIFY IDENTITY FUNCTIONALITY ====================

async function verifyIdentity() {
  if (!state.currentConversation || !state.user) {
    showError("Please select a conversation first");
    return;
  }
  
  if (!state.userKeys?.publicKey) {
    showError("Encryption keys not ready. Please wait...");
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
    const partnerUid = convData.participants.find(p => p !== state.user.uid);
    
    if (!partnerUid) {
      showError("Partner not found in conversation");
      return;
    }
    
    // Get partner's public key with improved error handling
    let partnerPublicKeyBase64;
    try {
      const partnerUserSnap = await getDoc(doc(db, "users", partnerUid));
      
      if (!partnerUserSnap.exists()) {
        throw new Error("Partner user document not found in Firestore");
      }
      
      const partnerData = partnerUserSnap.data();
      partnerPublicKeyBase64 = partnerData.publicKey;
      
      if (!partnerPublicKeyBase64) {
        throw new Error("Partner's public key not found in their user document");
      }
      
      console.log("✅ Retrieved partner public key, length:", partnerPublicKeyBase64.length);
    } catch (error) {
      console.error("❌ Error getting partner public key:", error);
      showError("Could not retrieve partner's security key. They may need to reload their chat.");
      return;
    }
    
    // Generate fingerprints
    console.log("🔑 Generating fingerprints...");
    const partnerFingerprint = await generateFingerprint(partnerPublicKeyBase64);
    const ourPublicKeyBase64 = await exportKey(state.userKeys.publicKey, "spki");
    const ourFingerprint = await generateFingerprint(ourPublicKeyBase64);
    
    // Validate fingerprints
    if (partnerFingerprint.startsWith("ERROR") || ourFingerprint.startsWith("ERROR")) {
      showError("Failed to generate security fingerprints. Please try again.");
      return;
    }
    
    showVerificationModal(partnerFingerprint, ourFingerprint, $("#partner-name")?.textContent || "Partner");
    
  } catch (error) {
    console.error("❌ Error verifying identity:", error);
    showError("Failed to verify identity: " + error.message);
  }
}

function showVerificationModal(partnerFingerprint, ourFingerprint, partnerName) {
  const modal = $("#verification-modal");
  
  if (!modal) {
    console.error('Verification modal not found');
    return;
  }

  // Clean and validate fingerprints
  const cleanPartnerFp = cleanFingerprint(partnerFingerprint);
  const cleanOurFp = cleanFingerprint(ourFingerprint);
  
  const partnerNameEl = modal.querySelector('#verification-partner-name');
  const fingerprintEl = modal.querySelector('#verification-fingerprint');
  
  if (partnerNameEl) partnerNameEl.textContent = partnerName;
  if (fingerprintEl) {
    // FIX: Show YOUR fingerprint (not partner's) so you can compare with what partner sees
    fingerprintEl.textContent = formatFingerprint(cleanOurFp);
    fingerprintEl.style.fontFamily = 'monospace';
    fingerprintEl.style.letterSpacing = '1px';
  }

  // FIX: Store fingerprints correctly - partner's fingerprint is what you should compare against
  modal.dataset.partnerFingerprint = cleanPartnerFp;
  modal.dataset.ourFingerprint = cleanOurFp;

  const comparisonResult = modal.querySelector('#comparison-result');
  if (comparisonResult) comparisonResult.innerHTML = '';

  const compareTextarea = modal.querySelector('#compare-fingerprint');
  if (compareTextarea) {
    compareTextarea.value = '';
    compareTextarea.placeholder = 'Paste partner\'s fingerprint here (without spaces)';
  }

  // FIX: Update instructions to be clearer
  const instructions = modal.querySelector('#verification-instructions');
  if (instructions) {
    instructions.innerHTML = `
      <p><strong>Instructions:</strong></p>
      <ol>
        <li>Share <strong>your fingerprint</strong> (shown above) with your partner</li>
        <li>Ask your partner to share <strong>their fingerprint</strong> with you</li>
        <li>Enter your partner's fingerprint below to verify</li>
      </ol>
      <p><strong>Your fingerprint:</strong> ${formatFingerprint(cleanOurFp)}</p>
    `;
  }

  setupVerificationModalEvents(modal);
  modal.style.display = 'block';
  
  console.log("🔑 Fingerprints for verification:");
  console.log("Your fingerprint (show this to partner):", formatFingerprint(cleanOurFp));
  console.log("Partner's fingerprint (enter this to verify):", formatFingerprint(cleanPartnerFp));
}

function setupVerificationModalEvents(modal) {
  const compareBtn = modal.querySelector('#compare-btn');
  const compareTextarea = modal.querySelector('#compare-fingerprint');
  const comparisonResult = modal.querySelector('#comparison-result');
  
  if (compareBtn && compareTextarea && comparisonResult) {
    compareBtn.onclick = () => {
      // FIX: Compare entered fingerprint with PARTNER's fingerprint (not your own)
      const enteredFingerprint = cleanFingerprint(compareTextarea.value);
      const expectedFingerprint = modal.dataset.partnerFingerprint; // This should be partner's fingerprint
      
      if (!enteredFingerprint) {
        comparisonResult.innerHTML = '<p class="verification-error">Please enter your partner\'s fingerprint to compare.</p>';
        return;
      }
      
      if (enteredFingerprint.length !== 64) {
        comparisonResult.innerHTML = '<p class="verification-error">Invalid fingerprint length. Should be 64 characters.</p>';
        return;
      }
      
      if (!isValidHexString(enteredFingerprint)) {
        comparisonResult.innerHTML = '<p class="verification-error">Fingerprint contains invalid characters. Use only 0-9 and A-F.</p>';
        return;
      }
      
      console.log("🔍 Comparing fingerprints:");
      console.log("Expected (partner's):", expectedFingerprint);
      console.log("Entered (what partner gave you):", enteredFingerprint);
      
      if (enteredFingerprint === expectedFingerprint) {
        comparisonResult.innerHTML = '<p class="verification-success">✅ Fingerprints match! Identity verified.</p>';
      } else {
        comparisonResult.innerHTML = `
          <p class="verification-error">❌ Fingerprints do not match.</p>
          <div class="fingerprint-comparison">
            <p><strong>Your fingerprint (you show this):</strong><br><code>${formatFingerprint(modal.dataset.ourFingerprint)}</code></p>
            <p><strong>Partner's fingerprint (they show you):</strong><br><code>${formatFingerprint(expectedFingerprint)}</code></p>
            <p><strong>You entered:</strong><br><code>${formatFingerprint(enteredFingerprint)}</code></p>
          </div>
          <p class="verification-warning">Make sure you are comparing the correct fingerprints:</p>
          <ul>
            <li>Your partner should see: <code>${formatFingerprint(modal.dataset.ourFingerprint)}</code></li>
            <li>You should see from partner: <code>${formatFingerprint(expectedFingerprint)}</code></li>
          </ul>
        `;
      }
    };
  }

  const confirmBtn = modal.querySelector('#confirm-verification');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (comparisonResult.innerHTML.includes('✅')) {
        alert('✅ Identity verified successfully! This conversation is secure.');
        modal.style.display = 'none';
      } else {
        alert('⚠️ Please verify that the fingerprints match before confirming.');
      }
    };
  }

  const cancelBtn = modal.querySelector('#cancel-verification');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }

  const closeBtn = modal.querySelector('.close-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
}

// ==================== UNREAD MESSAGE COUNT FUNCTIONALITY ====================

async function incrementUnreadCount(partnerUid, currentUserUid) {
  try {
    if (!partnerUid || !currentUserUid) {
      console.warn('Missing UIDs for unread count update');
      return;
    }
    
    const userUnreadRef = doc(db, "userUnreadCounts", partnerUid);
    
    // Use setDoc with merge: true to handle both create and update scenarios
    await setDoc(userUnreadRef, {
      [currentUserUid]: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Unread count incremented for partner:', partnerUid);
  } catch (error) {
    console.error('❌ Unread count update failed:', error);
    // Don't block message sending for this non-critical feature
  }
}

async function resetUnreadCount(currentUserUid, partnerUid) {
  try {
    if (!currentUserUid || !partnerUid) return;
    
    const userUnreadRef = doc(db, "userUnreadCounts", currentUserUid);
    
    // Use setDoc with merge: true
    await setDoc(userUnreadRef, { 
      [partnerUid]: 0,
      updatedAt: serverTimestamp() 
    }, { merge: true });
    
    console.log('✅ Unread count reset for partner:', partnerUid);
  } catch (error) {
    console.error('❌ Unread count reset failed:', error);
  }
}

function setupUnreadCountListener(currentUserUid) {
  if (!currentUserUid) return;
  
  console.log('👂 Setting up unread count listener for user:', currentUserUid);
  
  const unreadRef = doc(db, "userUnreadCounts", currentUserUid);
  
  const unsubscribe = onSnapshot(unreadRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.log('No unread counts document found for user');
      // Create initial document if it doesn't exist
      setDoc(unreadRef, { updatedAt: serverTimestamp() }, { merge: true });
      return;
    }
    
    const data = docSnap.data();
    
    Object.entries(data).forEach(([partnerId, count]) => {
      // Skip non-count fields like 'updatedAt'
      if (typeof count === 'number' && partnerId !== 'updatedAt') {
        console.log(`🔔 Unread count update: ${count} from ${partnerId}`);
        
        if (count > 0) {
          showUnreadBadge(partnerId, count);
        } else {
          hideUnreadBadge(partnerId);
        }
      }
    });
  }, (error) => {
    console.error('❌ Unread count listener error:', error);
  });
  
  state.listeners.push(unsubscribe);
}

function showUnreadBadge(partnerId, count) {
  // Find the contact item for this partner
  const contactItems = $$('.contact-item');
  contactItems.forEach(item => {
    // We need to find which contact item corresponds to this partnerId
    // Since we don't store partnerId in DOM, we'll need to track it differently
    // Let's add data-partner-id attribute to contact items when we create them
    if (item.dataset.partnerId === partnerId) {
      let badge = item.querySelector('.unread-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'unread-badge';
        badge.style.cssText = `
          background: #25D366;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 12px;
          font-weight: bold;
          margin-left: auto;
          min-width: 18px;
          text-align: center;
        `;
        item.querySelector('.contact-details')?.parentNode?.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'block';
    }
  });
}

function hideUnreadBadge(partnerId) {
  const contactItems = $$('.contact-item');
  contactItems.forEach(item => {
    if (item.dataset.partnerId === partnerId) {
      const badge = item.querySelector('.unread-badge');
      if (badge) {
        badge.style.display = 'none';
      }
    }
  });
}

// Helper function to add partnerId to contact items
function addPartnerIdToContact(contactElement, partnerUid) {
  if (contactElement && partnerUid) {
    contactElement.dataset.partnerId = partnerUid;
  }
}

// ==================== FILE UPLOAD SETUP ====================

function setupFileUpload() {
  const uploadBtn = $("#upload-btn");
  const fileInput = $("#file-input");
  const fileUploadModal = $("#file-upload-modal");
  const modalFileInput = $("#modal-file-input");
  const sendFileBtn = $("#send-file-btn");
  const cancelFileBtn = $("#cancel-file-btn");
  const filePreview = $("#file-preview");
  const fileName = $("#file-name");
  const fileSize = $("#file-size");

  if (!uploadBtn || !fileInput) {
    console.warn('File upload elements not found');
    return;
  }

  // Open file input when upload button is clicked
  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  // Handle file selection from main file input
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      showFileUploadModal(file);
    }
  });

  // Handle file selection from modal file input
  if (modalFileInput) {
    modalFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        showFilePreview(file);
      }
    });
  }

  // Send file button in modal
  if (sendFileBtn) {
    sendFileBtn.addEventListener("click", async () => {
      const file = modalFileInput?.files[0];
      if (file) {
        await uploadAndSendFile(file);
        if (fileUploadModal) fileUploadModal.style.display = 'none';
        // Reset inputs
        if (fileInput) fileInput.value = '';
        if (modalFileInput) modalFileInput.value = '';
        if (filePreview) filePreview.classList.add('hidden');
      }
    });
  }

  // Cancel file button in modal
  if (cancelFileBtn) {
    cancelFileBtn.addEventListener("click", () => {
      if (fileUploadModal) fileUploadModal.style.display = 'none';
      if (fileInput) fileInput.value = '';
      if (modalFileInput) modalFileInput.value = '';
      if (filePreview) filePreview.classList.add('hidden');
    });
  }

  // Close modal when clicking outside
  if (fileUploadModal) {
    fileUploadModal.addEventListener("click", (e) => {
      if (e.target === fileUploadModal) {
        fileUploadModal.style.display = 'none';
      }
    });
  }
}

function showFileUploadModal(file) {
  const fileUploadModal = $("#file-upload-modal");
  if (fileUploadModal) {
    showFilePreview(file);
    fileUploadModal.style.display = 'block';
  }
}

function showFilePreview(file) {
  const filePreview = $("#file-preview");
  const fileName = $("#file-name");
  const fileSize = $("#file-size");

  if (filePreview && fileName && fileSize) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePreview.classList.remove('hidden');
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📎';
}

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log('🚀 Starting chat application initialization...');
    
    // Add fingerprint comparison styles
    const style = document.createElement('style');
    style.textContent = `
      .fingerprint-comparison {
        background: #f5f5f5;
        padding: 10px;
        border-radius: 5px;
        margin: 10px 0;
      }
      .fingerprint-comparison code {
        font-family: monospace;
        background: #fff;
        padding: 5px;
        border-radius: 3px;
        display: block;
        margin: 5px 0;
        letter-spacing: 1px;
      }
      .verification-success {
        color: #25D366;
        font-weight: bold;
      }
      .verification-error {
        color: #ff4444;
        font-weight: bold;
      }
      .verification-warning {
        color: #ff9800;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
    
    const firebaseAuthSuccess = await initializeChatWithFirebase();
    
    await ensureUserProfile();
    
    if (!firebaseAuthSuccess) {
      showError("Chat authentication failed. Some features may not work.");
    }

    setupProfileDropdown();
    addChatStyles();
    setupNewChatModal();
    
    // ✅ FIXED: Add secure file upload setup
    setupFileUpload();
    
    const verifyIdentityBtn = $("#verify-btn");
    if (verifyIdentityBtn) {
      verifyIdentityBtn.addEventListener("click", verifyIdentity);
      console.log('✅ Verify Identity button setup');
    } else {
      console.warn('❌ Verify Identity button not found');
    }
    
    if (firebaseAuthSuccess && state.user) {
      await ensureUserKeys(state.user.uid);
      setupUserPresence();
      await listConversations();
      // Setup unread count listener
      setupUnreadCountListener(state.user.uid);
    }

    const sendBtn = $("#send-btn");
    const messageInput = $("#message-input");
    
    if (sendBtn) {
      sendBtn.addEventListener("click", sendMessage);
    }
    
    if (messageInput) {
      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
      });
      
      messageInput.addEventListener("input", () => {
        if (state.currentConversation) {
          handleUserTyping(state.currentConversation);
        }
      });
    }

    console.log("✅ Chat application initialized successfully");

  } catch (err) {
    console.error("❌ Boot error:", err);
    showError("Chat failed to load. Please refresh the page.");
  }
});

// ==================== UTILITY FUNCTIONS ====================

function showError(msg) {
  console.error('Error:', msg);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff4444;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    max-width: 80%;
    text-align: center;
  `;
  errorDiv.textContent = msg;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

// Make functions available globally
window.startNewChat = startNewChat;
window.verifyIdentity = verifyIdentity;
window.sendMessage = sendMessage;
window.recoverEncryptionKeys = recoverEncryptionKeys;
window.openConversationById = openConversationById;
window.resetEncryptionKeys = function() {
  if (state.user) {
    localStorage.removeItem(`priv-${state.user.uid}`);
    localStorage.removeItem(`pub-${state.user.uid}`);
    state.userKeys = null;
    state.keyGenerationAttempts = 0;
    ensureUserKeys(state.user.uid);
    showError("Encryption keys reset. Please restart the conversation.");
  }
};
window.resetBothUsersKeys = async function() {
  if (!state.user || !state.currentConversation) {
    showError("No active conversation to reset keys");
    return;
  }
  
  try {
    // Get partner UID
    const convRef = doc(db, "conversations", state.currentConversation);
    const convSnap = await getDoc(convRef);
    const convData = convSnap.data();
    const partnerUid = convData.participants.find(p => p !== state.user.uid);
    
    // Reset local keys
    localStorage.removeItem(`chat-keys-${state.user.uid}`);
    state.userKeys = null;
    state.keyGenerationAttempts = 0;
    
    // Clear partner key cache
    if (partnerUid) {
      delete state.partnerPublicKeys[partnerUid];
      delete state.partnerKeyRetries[partnerUid];
    }
    
    // Regenerate keys
    await ensureUserKeys(state.user.uid);
    
    showError("Encryption keys reset. Please ask your partner to refresh their page.");
    
  } catch (error) {
    console.error("Error resetting keys:", error);
    showError("Failed to reset keys: " + error.message);
  }
};