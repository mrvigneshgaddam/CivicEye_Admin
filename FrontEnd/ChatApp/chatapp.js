// chatapp.js - Complete WhatsApp-style chat with MongoDB user data + Firebase chat/presence

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
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

function showError(msg) {
  alert(msg);
}

// Session Storage Utilities
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

function storePrivateKey(uid, privateKey) {
  setSessionData(`priv-${uid}`, privateKey);
}

function getPrivateKey(uid) {
  return getSessionData(`priv-${uid}`);
}
function storeCurrentUserInfo(userInfo) {
  const data = {
    uid: userInfo.firebaseUid || userInfo.uid,   // Firebase UID
    mongoId: userInfo._id || userInfo.mongoId,   // MongoDB _id
    name: userInfo.name,
    profilePic: userInfo.profilePic || ''
  };
  setSessionData("currentUser", data);  // ✅ consistent
}



function getCurrentUserInfo() {
  return getSessionData('currentUser');
}

function addVerifiedPartner(partnerId) {
  const verifiedPartners = getSessionData('verifiedPartners') || [];
  if (!verifiedPartners.includes(partnerId)) {
    verifiedPartners.push(partnerId);
    setSessionData('verifiedPartners', verifiedPartners);
  }
}

// Crypto Utilities
async function generateKeys() {
  return crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
}

async function exportKey(key) {
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("spki", key))));
}

async function importPublicKey(spki) {
  const bin = Uint8Array.from(atob(spki), c => c.charCodeAt(0));
  return crypto.subtle.importKey("spki", bin.buffer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

async function encryptMessage(pubKey, text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, enc);
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function decryptMessage(privKey, b64) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, bin);
  return new TextDecoder().decode(dec);
}

async function generateFingerprint(publicKeyBase64) {
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    const spkiBuffer = await crypto.subtle.exportKey("spki", publicKey);
    const spkiBytes = new Uint8Array(spkiBuffer);
    const hashBuffer = await crypto.subtle.digest('SHA-256', spkiBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    let formattedFingerprint = '';
    for (let i = 0; i < hexString.length; i += 4) {
      if (i > 0) formattedFingerprint += ' ';
      formattedFingerprint += hexString.substring(i, i + 4);
    }
    
    return formattedFingerprint.toUpperCase();
  } catch (error) {
    console.error("Error generating fingerprint:", error);
    return "Error generating fingerprint";
  }
}

function compareFingerprints() {
  const enteredFingerprint = $("#compare-fingerprint").value.trim().toUpperCase();
  const actualFingerprint = currentVerificationData.fingerprint;
  const resultElement = $("#comparison-result");
  
  if (!enteredFingerprint) {
    resultElement.innerHTML = "<p class='verification-warning'>Please enter a fingerprint to compare</p>";
    return;
  }
  
  const normalizedEntered = enteredFingerprint.replace(/\s/g, '').toUpperCase();
  const normalizedActual = actualFingerprint.replace(/\s/g, '').toUpperCase();
  
  if (normalizedEntered === normalizedActual) {
    resultElement.innerHTML = "<p class='verification-success'>✅ Fingerprints match! Connection is secure.</p>";
    addVerifiedPartner(currentVerificationData.partnerId);
  } else {
    resultElement.innerHTML = "<p class='verification-error'>❌ Fingerprints don't match! Security warning.</p>";
  }
}

// MongoDB Integration Functions
// Line ~180
async function registerUserInMongoDB(user) {
  if (!user || !user.uid) {
    console.error("Cannot register user: missing Firebase UID", user);
    return null;
  }

  // Use email if available, fallback to uid-based placeholder
  const email = user.email || `${user.uid}@anon.civiceye`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/officers/assign-firebase-uid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        firebaseUid: user.uid,
        name: user.displayName || user.name || `Officer-${user.uid.substring(0,6)}`,
        profilePic: user.photoURL || user.profilePic || ""
      }),
    });

    const data = await res.json();

    if (!data.success) {
      console.error("MongoDB registration failed:", data.message);
      return null;
    }

    console.log("MongoDB registration result:", data);
    return data;
  } catch (err) {
    console.error("Error registering user in MongoDB:", err);
    return null;
  }
}



async function getUsersFromMongoDB(currentUid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/officers/chat?exclude=${currentUid}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error("Failed to fetch users:", data.message || data);
      return [];
    }

    console.log("Users fetched from MongoDB:", data.users);
    return data.users; // array of { name, email, profilePic, firebaseUid }
  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
}



async function getUserProfileFromMongoDB(firebaseUid) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/officers/chat/${firebaseUid}`);
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Error fetching user profile by Firebase UID:", error);
    return null;
  }
}

async function getUserProfileFromMongoDBById(mongoId) {
  try {
    const response = await fetch(`/api/officers/profile/${mongoId}`);
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Error fetching user profile by MongoDB ID:', error);
    return null;
  }
}

async function updateUserProfileInMongoDB(firebaseUid, updates) {
  try {
    const response = await fetch(`/api/officers/profile/${firebaseUid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return null;
  }
}

// User Profile Functions
async function ensureUserProfile() {
  let userInfo = getCurrentUserInfo();

  if (userInfo) {
    updateUIWithUserInfo(userInfo);
    state.currentUserMongoId = userInfo.mongoId;
    return userInfo.name;
  }

  // Create default display name if missing
  const displayName = state.user.displayName || `Officer-${state.user.uid.substring(0, 8)}`;
  const registrationResult = await registerUserInMongoDB(state.user);

  if (registrationResult && registrationResult.user) {
    userInfo = {
      uid: state.user.uid,
      mongoId: registrationResult.user._id,
      name: registrationResult.user.name,
      profilePic: registrationResult.user.profilePic || ''
    };

    storeCurrentUserInfo(userInfo);
    state.currentUserMongoId = registrationResult.user._id;
    updateUIWithUserInfo(userInfo);
    return userInfo.name;
  }

  // Fallback for anonymous user
  userInfo = {
    uid: state.user.uid,
    mongoId: null,
    name: displayName,
    profilePic: ''
  };
  storeCurrentUserInfo(userInfo);
  updateUIWithUserInfo(userInfo);
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

// Fetch full user profile by MongoDB ID or Firebase UID, with session caching
async function fetchUserProfile(firebaseUid) {
  const cachedProfiles = getSessionData('userProfiles') || {};
  if (cachedProfiles[firebaseUid]) return cachedProfiles[firebaseUid];

  try {
    const res = await fetch(`${BACKEND_URL}/api/officers/chat/${firebaseUid}`);
    const data = await res.json();
    if (data.success && data.user) {
      cachedProfiles[firebaseUid] = data.user;
      setSessionData('userProfiles', cachedProfiles);
      return data.user;
    }
  } catch (err) { console.error(err); }
  return null;
}


async function getUserDisplayName(mongoId) {
  if (!mongoId) return "Unknown User";

  const currentUser = getCurrentUserInfo();

  // ✅ If it's the logged-in user's mongoId, return their stored name
  if (currentUser && mongoId === currentUser.mongoId) {
    return currentUser.name || "You";
  }

  const firebaseUid = await getFirebaseUidFromMongoId(mongoId);
  if (!firebaseUid) return `User-${mongoId.substring(0,6)}`;

  const user = await fetchUserProfile(firebaseUid);
  return user ? user.name : `User-${mongoId.substring(0,6)}`;
}


async function getUserProfilePic(mongoId) {
  if (!mongoId) return '';

  const currentUser = getCurrentUserInfo();
  if (currentUser && mongoId === currentUser.mongoId) {
    return currentUser.profilePic || '';
  }

  const firebaseUid = await getFirebaseUidFromMongoId(mongoId);
  if (!firebaseUid) return '';
  const user = await fetchUserProfile(firebaseUid);
  return user ? (user.profilePic || '') : '';
}



async function getFirebaseUidFromMongoId(mongoId) {
  if (!mongoId) return null;
  const user = await fetchUserProfile(mongoId);
  return user ? user.firebaseUid : null;
}

// Profile Dropdown
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
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      showError("Failed to logout. Please try again.");
    }
  });
}

// Encryption Keys
async function ensureUserKeys() {
  const priv = getPrivateKey(state.user.uid);

  if (priv) {
    try {
      state.userKeys = {
        privateKey: await crypto.subtle.importKey(
          "pkcs8",
          Uint8Array.from(atob(priv), c => c.charCodeAt(0)).buffer,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["decrypt"]
        ),
        publicKey: null
      };

      const userRef = doc(db, "users", state.user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists() && snap.data().publicKey) {
        state.userKeys.publicKey = await importPublicKey(snap.data().publicKey);
        return;
      }
    } catch (error) {
      console.error("Error importing existing keys:", error);
    }
  }

  try {
    const keys = await generateKeys();
    const pub = await exportKey(keys.publicKey);
    const privExported = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
    const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privExported)));

    storePrivateKey(state.user.uid, privBase64);

    const userRef = doc(db, "users", state.user.uid);

    // ✅ Use setDoc with merge to create if not exists
    await setDoc(userRef, { 
      publicKey: pub,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    state.userKeys = keys;
  } catch (error) {
    console.error("Error generating new keys:", error);
    throw new Error("Failed to generate encryption keys");
  }
}


// Auth & Presence
async function ensureUserAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          try {
            await signInAnonymously(auth);
            return;
          } catch (authError) {
            console.error("Authentication error:", authError);
            showError("Authentication failed. Please refresh the page.");
            reject(authError);
            return;
          }
        }
        state.user = user;
        if ($('#current-user-id')) $('#current-user-id').textContent = user.uid;
        resolve(user);
      } catch (e) { 
        console.error("Auth state error:", e);
        reject(e); 
      }
    });
  });
}

function setupUserPresence() {
  const userStatusRef = ref(rtdb, `status/${state.user.uid}`);
  onDisconnect(userStatusRef).set({ state: "offline", lastChanged: Date.now() });
  set(userStatusRef, { state: "online", lastChanged: Date.now() });
}

// Conversations
async function listConversations() {
  try {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", state.user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const container = $("#contacts-list");
      container.innerHTML = "";

      if (snap.empty) {
        container.innerHTML = `<p class="no-contacts-msg">No conversations. Start a new one!</p>`;
        return;
      }

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const partnerFirebaseUid = data.participants.find(p => p !== state.user.uid);

        // fetch profile
        const partnerProfile = await fetchUserProfile(partnerFirebaseUid);
        const partnerName = partnerProfile ? partnerProfile.name : `User-${partnerFirebaseUid.substring(0,6)}`;
        const partnerPic = partnerProfile ? partnerProfile.profilePic : '';

        const el = document.createElement("div");
        el.classList.add("contact-item");

        const avatar = document.createElement("div");
        avatar.classList.add("contact-avatar");
        avatar.textContent = partnerPic ? '' : partnerName.substring(0,2).toUpperCase();
        if (partnerPic) avatar.innerHTML = `<img src="${partnerPic}" />`;

        const details = document.createElement("div");
        details.classList.add("contact-details");
        details.innerHTML = `<h4>${partnerName}</h4><p>${data.lastMessage || "No messages yet"}</p>`;

        el.appendChild(avatar);
        el.appendChild(details);

        el.onclick = () => openConversation(docSnap.id, data);
        container.appendChild(el);
      }

    });

    state.listeners.push(unsubscribe);
  } catch (error) {
    console.error("Error listing conversations:", error);
    showError("Failed to load conversations.");
  }
}


async function openConversation(convId, data) {
  // Cleanup old listeners
  state.listeners.forEach(unsub => { if (typeof unsub === 'function') unsub(); });
  state.listeners = [];

  state.currentConversation = convId;
  $("#chat-area").classList.remove("hidden");
  $("#no-chat-selected").classList.add("hidden");

  const partnerFirebaseUid = data.participants.find(p => p !== state.user.uid);
  const partnerProfile = await fetchUserProfile(partnerFirebaseUid);
  const partnerMongoId = partnerProfile ? partnerProfile._id : null;

  const partnerName = await getUserDisplayName(partnerMongoId);
  const partnerPic = await getUserProfilePic(partnerMongoId);

  $("#partner-name").textContent = partnerName;
  const partnerAvatar = $("#partner-avatar");
  partnerAvatar.innerHTML = partnerPic ? `<img src="${partnerPic}" />` : partnerName.substring(0,2).toUpperCase();

  updatePresenceStatus(partnerFirebaseUid);
  $("#message-container").innerHTML = "";

  const messagesQuery = query(
    collection(db, `conversations/${convId}/messages`),
    orderBy("createdAt")
  );

  const unsubscribe = onSnapshot(messagesQuery, async (snap) => {
    const container = $("#message-container");
    container.innerHTML = "";

    for (const docSnap of snap.docs) {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("message", msg.sender === state.user.uid ? "sent" : "received");

      const msgContent = document.createElement("div");
      msgContent.classList.add("message-content");

      if (msg.sender === state.user.uid) {
        msgContent.textContent = msg.plainText || "[Your message]";
      } else {
        try {
          const text = await decryptMessage(state.userKeys.privateKey, msg.content);
          msgContent.textContent = text;
        } catch {
          msgContent.textContent = "[Encrypted message]";
        }
      }

      const time = document.createElement("div");
      time.classList.add("message-time");
      time.textContent = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString() : "Sending...";

      div.appendChild(msgContent);
      div.appendChild(time);
      container.appendChild(div);
    }

    container.scrollTop = container.scrollHeight;
  });

  state.listeners.push(unsubscribe);
}


// Start a new chat with a selected user (MongoDB ID)
async function startNewChat(partnerMongoId) {
  if (!partnerMongoId) return;

  const partnerFirebaseUid = await getFirebaseUidFromMongoId(partnerMongoId);
  if (!partnerFirebaseUid) return showError("Failed to get partner info");

  // Check existing conversation
  const q = query(collection(db, "conversations"), where("participants", "array-contains", state.user.uid));
  const querySnapshot = await getDocs(q);

  let existingConv = null;
  querySnapshot.forEach(doc => {
    const d = doc.data();
    if (d.participants.includes(partnerFirebaseUid)) existingConv = { id: doc.id, data: d };
  });


  if (existingConv) {
    return openConversation(existingConv.id, existingConv.data);
  }

  const partnerName = await getUserDisplayName(partnerMongoId);
  const currentUserInfo = getCurrentUserInfo();
  const userName = currentUserInfo ? currentUserInfo.name : "You";

  const convData = {
    participants: [state.user.uid, partnerFirebaseUid],
    participantNames: { [state.user.uid]: userName, [partnerFirebaseUid]: partnerName },
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    name: `Chat with ${partnerName}`
  };

  const convRef = await addDoc(collection(db, "conversations"), convData);
  openConversation(convRef.id, convData);
}

function updatePresenceStatus(firebaseUid) {
  const userStatusRef = ref(rtdb, `status/${firebaseUid}`);
  onValue(userStatusRef, (snapshot) => {
    const status = snapshot.val();
    const dot = $("#presence-dot");
    const text = $("#status-text");
    if (status?.state === "online") {
      dot?.classList.add("online"); dot?.classList.remove("offline");
      if (text) text.textContent = "Online";
    } else {
      dot?.classList.add("offline"); dot?.classList.remove("online");
      if (text) text.textContent = "Offline";
    }
  });
}


async function sendMessage() {
  const input = $("#message-input");
  const text = input.value.trim();
  
  if (!text || !state.currentConversation) return;
  
  input.disabled = true;
  $("#send-btn").disabled = true;
  
  try {
    input.value = "";

    const convRef = doc(db, "conversations", state.currentConversation);
    const convSnap = await getDoc(convRef);
    
    if (!convSnap.exists()) {
      showError("Conversation not found");
      return;
    }
    
    const convData = convSnap.data();
    const messageData = {
      sender: state.user.uid,
      plainText: text,
      createdAt: serverTimestamp()
    };
    
    const encryptionPromises = convData.participants
      .filter(p => p !== state.user.uid)
      .map(async (participantId) => {
        try {
          const userSnap = await getDoc(doc(db, "users", participantId));
          if (!userSnap.exists()) return null;
          
          const pubKey = await importPublicKey(userSnap.data().publicKey);
          return await encryptMessage(pubKey, text);
        } catch (error) {
          console.error("Error encrypting for participant:", participantId, error);
          return null;
        }
      });
    
    const encryptedMessages = await Promise.all(encryptionPromises);
    const validEncryptedMessages = encryptedMessages.filter(msg => msg !== null);
    
    if (validEncryptedMessages.length > 0) {
      messageData.content = validEncryptedMessages[0];
    }
    
    await addDoc(collection(db, `conversations/${state.currentConversation}/messages`), messageData);
    await updateDoc(convRef, {
      lastMessage: text,
      lastUpdated: serverTimestamp()
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    showError("Failed to send message. Please try again.");
  } finally {
    input.disabled = false;
    $("#send-btn").disabled = false;
    input.focus();
  }
}

// File Upload
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

// Verification
async function setupVerification() {
  $("#verify-btn")?.addEventListener("click", async () => {
    if (!state.currentConversation) return;
    
    try {
      const convRef = doc(db, "conversations", state.currentConversation);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) return;
      
      const convData = convSnap.data();
      const partnerId = convData.participants.find(p => p !== state.user.uid);
      
      const partnerUserRef = doc(db, "users", partnerId);
      const partnerUserSnap = await getDoc(partnerUserRef);
      
      if (!partnerUserSnap.exists() || !partnerUserSnap.data().publicKey) {
        showError("Cannot verify: Partner's public key not available");
        return;
      }
      
      const publicKey = partnerUserSnap.data().publicKey;
      const fingerprint = await generateFingerprint(publicKey);
      
      currentVerificationData = { partnerId, fingerprint, conversationId: state.currentConversation };
      
      const modalBody = $(".modal-body");
      if (modalBody) {
        modalBody.innerHTML = `
          <p>Verify this fingerprint with your contact via a trusted channel.</p>
          <p class="verification-instruction">Your Contact's Fingerprint:</p>
          <div class="fingerprint-display" id="verification-fingerprint">${fingerprint}</div>
          <div class="verification-comparison">
            <p class="verification-instruction">Enter the fingerprint from your other device:</p>
            <textarea id="compare-fingerprint" placeholder="Paste fingerprint here..." rows="3"></textarea>
            <button id="compare-btn">Compare Fingerprints</button>
            <div id="comparison-result"></div>
          </div>
        `;
        
        $("#compare-btn").onclick = compareFingerprints;
      }
      
      $("#verification-modal").style.display = "block";
      
    } catch (error) {
      console.error("Error in verification:", error);
      showError("Failed to generate verification code");
    }
  });
}

// Profile Modal
function setupProfileModal() {
  const profileModal = $("#profile-modal");
  const closeBtn = $(".close-modal[data-modal-id='profile-modal']");
  const saveProfileBtn = $("#save-profile-btn");

  if (!profileModal || !closeBtn || !saveProfileBtn) return;

  closeBtn.addEventListener("click", () => {
    profileModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === profileModal) {
      profileModal.style.display = "none";
    }
  });

  saveProfileBtn.addEventListener("click", async () => {
    const name = $("#profile-name")?.value.trim();
    const profilePic = $("#profile-pic-url")?.value.trim();

    if (!name) {
      showError("Name is required");
      return;
    }

    try {
      const result = await updateUserProfileInMongoDB(state.user.uid, { name, profilePic });

      if (result && result.success) {
        const userInfo = getCurrentUserInfo();
        if (userInfo) {
          userInfo.name = name;
          userInfo.profilePic = profilePic;
          storeCurrentUserInfo(userInfo);
          updateUIWithUserInfo(userInfo);
        }

        profileModal.style.display = "none";
        showError("Profile updated successfully!");
      } else {
        showError("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("Failed to update profile");
    }
  });
}

// Load users for new chat
async function loadUsersForNewChat() {
  const userList = $("#user-selection-list");
  if (!userList) return;
  
  userList.innerHTML = `<option value="">Loading users...</option>`;
  
  try {
    const users = await getUsersFromMongoDB(state.user.uid);
    userList.innerHTML = "";
    
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a user";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    userList.appendChild(defaultOption);
    
    if (users.length === 0) {
      userList.innerHTML = `<option value="" disabled>No other users found</option>`;
    } else {
      const cachedProfiles = getSessionData('userProfiles') || {};
      
      users.forEach(user => {
        const opt = document.createElement("option");
        opt.value = user._id; // Store MongoDB ID
        opt.textContent = user.name;
        userList.appendChild(opt);
        
        cachedProfiles[user._id] = user;
      });
      
      setSessionData('userProfiles', cachedProfiles);
    }
  } catch (error) {
    console.error("Error loading users from MongoDB:", error);
    userList.innerHTML = `<option value="" disabled>Error loading users</option>`;
  }
}

// Boot function
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await ensureUserAuth();
    await ensureUserKeys();
    setupUserPresence();
    
    setupProfileDropdown();
    setupProfileModal();
    setupVerification();
    await ensureUserProfile();
    await listConversations();

    $("#send-btn").onclick = sendMessage;
    $("#message-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    setupFileUpload();

    // New Chat Modal
    const newChatBtn = $("#new-chat-btn");
    const newChatModal = $("#new-chat-modal");
    const userList = $("#user-selection-list");
    const startBtn = $("#start-chat-btn");

    newChatBtn?.addEventListener("click", async () => {
      newChatModal.style.display = "block";
      await loadUsersForNewChat();
    });

    document.querySelectorAll(".close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-modal-id");
        if (modalId) $(`#${modalId}`).style.display = "none";
      });
    });

    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
      }
    });

    startBtn?.addEventListener("click", async () => {
      const partnerMongoId = userList.value;
      if (!partnerMongoId) return alert("Select a user first");

      startBtn.disabled = true;
      startBtn.textContent = "Starting chat...";

      try {
        await startNewChat(partnerMongoId);
        $("#new-chat-modal").style.display = "none";
      } catch (error) {
        console.error("Error starting chat:", error);
        showError("Failed to start chat. Please check your Firebase permissions.");
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = "Start Secure Chat";
      }
    });


    console.log("Chat initialized for:", user.uid);
  } catch (err) {
    console.error("Boot error:", err);
    showError("Chat failed to load. Please check the console for details.");
  }
});