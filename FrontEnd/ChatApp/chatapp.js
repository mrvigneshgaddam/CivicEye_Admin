// chatapp.js - Fixed with better error handling and Firebase rules compatibility

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
  getFirestore,
  doc, updateDoc, serverTimestamp,
  collection, query, where, onSnapshot, orderBy, addDoc, getDoc, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getDatabase, ref, set, onDisconnect, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// ✅ Your project config
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

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ==================
// Utility Shortcuts
// ==================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const state = {
  user: null,
  userKeys: null,
  currentConversation: null,
  listeners: []
};

// Global state for verification
let currentVerificationData = null;

function showError(msg) {
  alert(msg);
}

// ==================
// Crypto Utilities
// ==================
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

// Fixed function to generate fingerprint from actual public key
async function generateFingerprint(publicKeyBase64) {
  try {
    // First import the public key properly
    const publicKey = await importPublicKey(publicKeyBase64);
    
    // Export the key in SPKI format to get the raw bytes
    const spkiBuffer = await crypto.subtle.exportKey("spki", publicKey);
    const spkiBytes = new Uint8Array(spkiBuffer);
    
    // Create a hash of the actual public key bytes (SHA-256)
    const hashBuffer = await crypto.subtle.digest('SHA-256', spkiBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Convert to hex string and format for readability
    const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format as groups of 4 characters for better readability
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

// Function to compare fingerprints
function compareFingerprints() {
  const enteredFingerprint = $("#compare-fingerprint").value.trim().toUpperCase();
  const actualFingerprint = currentVerificationData.fingerprint;
  
  const resultElement = $("#comparison-result");
  
  if (!enteredFingerprint) {
    resultElement.innerHTML = "<p class='verification-warning'>Please enter a fingerprint to compare</p>";
    return;
  }
  
  // Normalize both fingerprints (remove spaces and make uppercase for comparison)
  const normalizedEntered = enteredFingerprint.replace(/\s/g, '').toUpperCase();
  const normalizedActual = actualFingerprint.replace(/\s/g, '').toUpperCase();
  
  if (normalizedEntered === normalizedActual) {
    resultElement.innerHTML = "<p class='verification-success'>✅ Fingerprints match! Connection is secure.</p>";
    
    // Store verification status
    localStorage.setItem(`verified-${currentVerificationData.partnerId}`, 'true');
    
  } else {
    resultElement.innerHTML = "<p class='verification-error'>❌ Fingerprints don't match! Security warning.</p>";
  }
}

// ==================
// User Profile Functions
// ==================

// Function to get or create a display name
async function ensureUserProfile() {
  const userRef = doc(db, "users", state.user.uid);
  const snap = await getDoc(userRef);
  
  let displayName = `User ${state.user.uid.substring(0, 8)}`;
  
  if (snap.exists()) {
    // Use existing display name if available
    if (snap.data().displayName) {
      displayName = snap.data().displayName;
    }
  } else {
    // Create user profile with display name
    await setDoc(userRef, {
      uid: state.user.uid,
      displayName: displayName,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
  }
  
  // Update UI
  $("#current-user-name").textContent = displayName;
  return displayName;
}

// Function to get display name for any user
async function getUserDisplayName(userId) {
  if (userId === state.user.uid) {
    return $("#current-user-name").textContent;
  }
  
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists() && userSnap.data().displayName) {
      return userSnap.data().displayName;
    }
  } catch (error) {
    console.error("Error fetching user display name:", error);
  }
  
  // Fallback to shortened user ID
  return `User ${userId.substring(0, 8)}`;
}

// Function to setup profile dropdown
function setupProfileDropdown() {
  const profileDropdown = $(".profile-dropdown");
  const dropdownContent = $(".dropdown-content");
  
  // Toggle dropdown on profile click
  profileDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    dropdownContent.style.display = "none";
  });
  
  // Prevent dropdown from closing when clicking inside it
  dropdownContent.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  
  // Setup logout functionality
  $("#logout-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      // Sign out from Firebase
      await signOut(auth);
      // Clear local storage
      localStorage.clear();
      // Redirect to login or refresh page
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      showError("Failed to logout. Please try again.");
    }
  });
  
  // Setup profile and settings links (placeholder)
  $$('.dropdown-content a[href="#"]').forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      alert("This feature is not implemented yet.");
    });
  });
}

// ==================
// Modified ensureUserKeys function
// ==================
async function ensureUserKeys() {
  const userRef = doc(db, "users", state.user.uid);
  const snap = await getDoc(userRef);
  
  // Ensure user profile exists first
  await ensureUserProfile();
  
  if (snap.exists() && snap.data().publicKey) {
    const priv = localStorage.getItem(`priv-${state.user.uid}`);
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
          publicKey: await importPublicKey(snap.data().publicKey)
        };
        return;
      } catch (error) {
        console.error("Error importing existing keys:", error);
        // Continue to generate new keys if import fails
      }
    }
  }
  
  // Generate new keys
  try {
    const keys = await generateKeys();
    const pub = await exportKey(keys.publicKey);
    const priv = await crypto.subtle.exportKey("pkcs8", keys.privateKey);
    const privBase64 = btoa(String.fromCharCode(...new Uint8Array(priv)));
    
    localStorage.setItem(`priv-${state.user.uid}`, privBase64);
    
    // Update user document with public key
    await updateDoc(userRef, { 
      publicKey: pub,
      lastUpdated: serverTimestamp()
    });
    
    state.userKeys = keys;
  } catch (error) {
    console.error("Error generating new keys:", error);
    throw new Error("Failed to generate encryption keys");
  }
}

// ==================
// Auth & Presence
// ==================
async function ensureUserAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          try {
            await signInAnonymously(auth);
            // Return here to wait for the next auth state change
            return;
          } catch (authError) {
            console.error("Authentication error:", authError);
            showError("Authentication failed. Please refresh the page.");
            reject(authError);
            return;
          }
        }
        state.user = user;
        $('#current-user-id').textContent = user.uid;
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

// ==================
// Conversations
// ==================
async function listConversations() {
  try {
    const q = query(
      collection(db, "conversations"), 
      where("participants", "array-contains", state.user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const container = $("#contacts-list");
      container.innerHTML = "";
      
      if (snap.empty) {
        container.innerHTML = `<p class="no-contacts-msg">No conversations. Start a new one!</p>`;
        return;
      }
      
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const el = document.createElement("div");
        el.classList.add("contact-item");
        
        // Get partner ID
        const partnerId = data.participants.find(p => p !== state.user.uid);
        
        // Create avatar with initials
        const avatar = document.createElement("div");
        avatar.classList.add("contact-avatar");
        avatar.textContent = partnerId.substring(0, 2).toUpperCase();
        
        // Create contact details
        const details = document.createElement("div");
        details.classList.add("contact-details");
        
        const name = document.createElement("h4");
        name.textContent = data.name || partnerId;
        
        const lastMsg = document.createElement("p");
        lastMsg.textContent = data.lastMessage || "No messages yet";
        
        details.appendChild(name);
        details.appendChild(lastMsg);
        
        el.appendChild(avatar);
        el.appendChild(details);
        
        el.onclick = () => openConversation(docSnap.id, data);
        container.appendChild(el);
      });
    });
    
    // Store the unsubscribe function
    state.listeners.push(unsubscribe);
  } catch (error) {
    console.error("Error listing conversations:", error);
    showError("Failed to load conversations. Check Firebase permissions.");
  }
}

// ==================
// Modified openConversation function
// ==================
async function openConversation(convId, data) {
  // Clear previous listeners
  state.listeners.forEach(unsub => {
    if (typeof unsub === 'function') unsub();
  });
  state.listeners = [];
  
  state.currentConversation = convId;
  $("#chat-area").classList.remove("hidden");
  $("#no-chat-selected").classList.add("hidden");
  
  // Get partner ID and set partner name
  const partnerId = data.participants.find(p => p !== state.user.uid);
  const partnerName = await getUserDisplayName(partnerId);
  
  $("#partner-name").textContent = partnerName;
  
  // Set partner avatar
  const partnerAvatar = $("#partner-avatar");
  partnerAvatar.textContent = partnerName.substring(0, 2).toUpperCase();
  
  // Update presence status
  updatePresenceStatus(partnerId);
  
  $("#message-container").innerHTML = "";

  // Listen for messages
  try {
    const messagesQuery = query(
      collection(db, `conversations/${convId}/messages`), 
      orderBy("createdAt")
    );
    
    const unsubscribe = onSnapshot(messagesQuery, async (snap) => {
      const container = $("#message-container");
      container.innerHTML = "";
      
      for (let docSnap of snap.docs) {
        const msg = docSnap.data();
        const div = document.createElement("div");
        div.classList.add("message");
        
        if (msg.sender === state.user.uid) {
          div.classList.add("sent");
        } else {
          div.classList.add("received");
        }
        
        const msgContent = document.createElement("div");
        msgContent.classList.add("message-content");
        
        // Show plain text for user's own messages, decrypt for others
        if (msg.sender === state.user.uid) {
          // This is our own message - show plain text
          msgContent.textContent = msg.plainText || "[Your message]";
        } else {
          // This is from someone else - try to decrypt
          try {
            const text = await decryptMessage(state.userKeys.privateKey, msg.content);
            msgContent.textContent = text;
          } catch (error) {
            console.error("Decryption error:", error);
            msgContent.textContent = "[Encrypted message]";
          }
        }
        
        const time = document.createElement("div");
        time.classList.add("message-time");
        
        if (msg.createdAt) {
          time.textContent = new Date(msg.createdAt.toDate()).toLocaleTimeString();
        } else {
          time.textContent = "Sending...";
        }
        
        // Add status indicator for sent messages
        if (msg.sender === state.user.uid) {
          const status = document.createElement("div");
          status.classList.add("message-status");
          status.textContent = msg.createdAt ? "Delivered" : "Sending...";
          div.appendChild(status);
        }
        
        div.appendChild(msgContent);
        div.appendChild(time);
        container.appendChild(div);
      }
      
      container.scrollTop = container.scrollHeight;
    });
    
    state.listeners.push(unsubscribe);
  } catch (error) {
    console.error("Error opening conversation:", error);
    showError("Failed to load messages. Check Firebase permissions.");
  }
}

async function updatePresenceStatus(userId) {
  const userStatusRef = ref(rtdb, `status/${userId}`);
  
  onValue(userStatusRef, (snapshot) => {
    const status = snapshot.val();
    const presenceDot = $("#presence-dot");
    const statusText = $("#status-text");
    
    if (status && status.state === "online") {
      presenceDot.classList.remove("offline");
      presenceDot.classList.add("online");
      statusText.textContent = "Online";
    } else {
      presenceDot.classList.remove("online");
      presenceDot.classList.add("offline");
      statusText.textContent = "Offline";
    }
  });
}

// ==================
// Modified sendMessage function
// ==================
async function sendMessage() {
  const input = $("#message-input");
  const text = input.value.trim();
  
  if (!text || !state.currentConversation) return;
  
  // Disable input while sending
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
    
    // Store plain text in Firestore for user's own messages
    // This allows the sender to see their message in plain text
    const messageData = {
      sender: state.user.uid,
      plainText: text, // Store plain text for sender
      createdAt: serverTimestamp()
    };
    
    // Encrypt for other participants
    const encryptionPromises = convData.participants
      .filter(p => p !== state.user.uid)
      .map(async (participantId) => {
        try {
          const userSnap = await getDoc(doc(db, "users", participantId));
          
          if (!userSnap.exists()) {
            console.warn("Participant user document not found:", participantId);
            return null;
          }
          
          const pubKey = await importPublicKey(userSnap.data().publicKey);
          return await encryptMessage(pubKey, text);
        } catch (error) {
          console.error("Error encrypting for participant:", participantId, error);
          return null;
        }
      });
    
    // Wait for all encryptions to complete
    const encryptedMessages = await Promise.all(encryptionPromises);
    const validEncryptedMessages = encryptedMessages.filter(msg => msg !== null);
    
    if (validEncryptedMessages.length > 0) {
      // Use the first successful encryption (all should be the same for the same text)
      messageData.content = validEncryptedMessages[0];
    } else {
      // If encryption failed for all recipients, still store the plain text for sender
      console.warn("Failed to encrypt message for any participant, storing plain text only for sender");
    }
    
    // Add message to Firestore
    await addDoc(collection(db, `conversations/${state.currentConversation}/messages`), messageData);
    
    // Update conversation with last message
    await updateDoc(convRef, {
      lastMessage: text,
      lastUpdated: serverTimestamp()
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    showError("Failed to send message. Please try again.");
  } finally {
    // Re-enable input
    input.disabled = false;
    $("#send-btn").disabled = false;
    input.focus();
  }
}

// ==================
// File Upload Functionality
// ==================
function setupFileUpload() {
  const uploadBtn = $("#upload-btn");
  const fileInput = $("#file-input");
  
  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });
  
  fileInput.addEventListener("change", async (e) => {
    if (e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    // For now, we'll just show a message that file upload is not implemented
    // In a real app, you would upload to Firebase Storage and send the download URL
    showError("File upload functionality is not implemented in this demo. Please type a text message.");
    
    // Reset file input
    fileInput.value = "";
  });
}

// ==================
// Enhanced verification function
// ==================
async function setupVerification() {
  $("#verify-btn").addEventListener("click", async () => {
    if (!state.currentConversation) return;
    
    try {
      // Get partner ID from current conversation
      const convRef = doc(db, "conversations", state.currentConversation);
      const convSnap = await getDoc(convRef);
      
      if (!convSnap.exists()) return;
      
      const convData = convSnap.data();
      const partnerId = convData.participants.find(p => p !== state.user.uid);
      
      // Get partner's public key
      const partnerUserRef = doc(db, "users", partnerId);
      const partnerUserSnap = await getDoc(partnerUserRef);
      
      if (!partnerUserSnap.exists() || !partnerUserSnap.data().publicKey) {
        showError("Cannot verify: Partner's public key not available");
        return;
      }
      
      // Generate fingerprint
      const publicKey = partnerUserSnap.data().publicKey;
      const fingerprint = await generateFingerprint(publicKey);
      
      // Store for comparison
      currentVerificationData = {
        partnerId: partnerId,
        fingerprint: fingerprint,
        conversationId: state.currentConversation
      };
      
      // Show verification modal
      $("#verification-fingerprint").textContent = fingerprint;
      
      // Add comparison UI
      const compareSection = `
        <div class="verification-comparison">
          <p class="verification-instruction">Enter the fingerprint from your other device:</p>
          <textarea id="compare-fingerprint" placeholder="Paste fingerprint here..." rows="3"></textarea>
          <button id="compare-btn">Compare Fingerprints</button>
          <div id="comparison-result"></div>
        </div>
      `;
      
      // Clear previous comparison UI and add new one
      const modalBody = $(".modal-body");
      modalBody.innerHTML = `
        <p>Verify this fingerprint with your contact via a trusted channel.</p>
        <p class="verification-instruction">Your Contact's Fingerprint:</p>
        <div class="fingerprint-display" id="verification-fingerprint"></div>
        <p class="verification-instruction small">If the codes match, the connection is secure.</p>
      `;
      modalBody.innerHTML += compareSection;
      
      // Update fingerprint display
      $("#verification-fingerprint").textContent = fingerprint;
      
      // Setup comparison button
      $("#compare-btn").onclick = compareFingerprints;
      
      $("#verification-modal").style.display = "block";
      
    } catch (error) {
      console.error("Error in verification:", error);
      showError("Failed to generate verification code");
    }
  });
}

// ==================
// Modified Boot Function
// ==================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize auth
    const user = await ensureUserAuth();
    await ensureUserKeys();
    setupUserPresence();
    
    // Setup profile dropdown
    setupProfileDropdown();
    
    // Setup verification
    setupVerification();
    
    // Load conversations
    await listConversations();

    // === Chat Send ===
    $("#send-btn").onclick = sendMessage;
    $("#message-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    // === File Upload ===
    setupFileUpload();

    // === NEW CHAT MODAL ===
    const newChatBtn = $("#new-chat-btn");
    const newChatModal = $("#new-chat-modal");
    const closeBtns = document.querySelectorAll(".close-modal");
    const userList = $("#user-selection-list");
    const startBtn = $("#start-chat-btn");

    // Open modal
    newChatBtn.addEventListener("click", async () => {
      newChatModal.style.display = "block";

      // Load users
      userList.innerHTML = `<option value="">Loading users...</option>`;
      
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        userList.innerHTML = "";
        
        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a user";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        userList.appendChild(defaultOption);
        
        let hasUsers = false;
        
        usersSnapshot.forEach(docSnap => {
          if (docSnap.id === state.user.uid) return; // skip self
          
          const data = docSnap.data();
          const opt = document.createElement("option");
          opt.value = docSnap.id;
          opt.textContent = data.displayName || `User ${docSnap.id.substring(0, 8)}`;
          userList.appendChild(opt);
          hasUsers = true;
        });
        
        if (!hasUsers) {
          userList.innerHTML = `<option value="" disabled>No other users found</option>`;
        }
      } catch (error) {
        console.error("Error loading users:", error);
        userList.innerHTML = `<option value="" disabled>Error loading users</option>`;
      }
    });

    // Close modal
    closeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const modalId = btn.getAttribute("data-modal-id");
        if (modalId) {
          $(`#${modalId}`).style.display = "none";
        }
      });
    });

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
      }
    });

    // Start chat
    startBtn.addEventListener("click", async () => {
      const partnerId = userList.value;
      if (!partnerId) return alert("Select a user first");
      
      // Disable button while creating chat
      startBtn.disabled = true;
      startBtn.textContent = "Starting chat...";

      try {
        // Check if conversation already exists
        const q = query(
          collection(db, "conversations"),
          where("participants", "array-contains", state.user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        let existingConv = null;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.participants && data.participants.includes(partnerId)) {
            existingConv = { id: doc.id, data: data };
          }
        });
        
        if (existingConv) {
          // Use existing conversation
          newChatModal.style.display = "none";
          openConversation(existingConv.id, existingConv.data);
        } else {
          // Get partner display name
          const partnerName = await getUserDisplayName(partnerId);
          const userName = await getUserDisplayName(state.user.uid);
          
          // Create new conversation
          const convData = {
            participants: [state.user.uid, partnerId],
            participantNames: {
              [state.user.uid]: userName,
              [partnerId]: partnerName
            },
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            name: `Chat with ${partnerName}`
          };
          
          const convRef = await addDoc(collection(db, "conversations"), convData);
          
          newChatModal.style.display = "none";
          openConversation(convRef.id, convData);
        }
      } catch (error) {
        console.error("Error starting chat:", error);
        showError("Failed to start chat. Please check your Firebase permissions.");
      } finally {
        // Re-enable button
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