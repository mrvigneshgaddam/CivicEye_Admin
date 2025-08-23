document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const debugPanel = document.getElementById('debugPanel');
    const debugStatus = document.getElementById('debugStatus');
    const debugResponse = document.getElementById('debugResponse');
    
    // Check if we're in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.body.classList.add('development');
    }
    
    if (!loginForm || !togglePassword || !passwordInput) {
        console.error('Required login form elements not found');
        return;
    }
    
    // Already logged in? Redirect
    if (localStorage.getItem('authToken')) {
        redirectToDashboard();
        return;
    }

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = this.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
    
    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        if (!emailInput || !passwordInput) {
            showError(loginForm, 'Form elements not found');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const loginBtn = this.querySelector('.login-btn');

        if (!email || !password) {
            showError(loginForm, 'Please fill all fields');
            return;
        }

        // Add loading state
        const originalBtnHTML = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        loginBtn.disabled = true;
        
        // Update debug panel
        if (debugPanel && debugStatus) {
            debugStatus.textContent = 'Status: Making request...';
            debugResponse.textContent = 'Response: Waiting...';
        }

        try {
            // API CALL
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            // Update debug info
            if (debugStatus) {
                debugStatus.textContent = `Status: ${response.status} ${response.statusText}`;
            }

            const responseData = await response.json().catch(() => ({}));
            
            if (debugResponse) {
                debugResponse.textContent = `Response: ${JSON.stringify(responseData, null, 2)}`;
            }

            if (!response.ok) {
                throw new Error(responseData.message || `Login failed with status ${response.status}`);
            }

            // Check if response has the expected data
            if (!responseData.token) {
                throw new Error('No authentication token received from server');
            }

            localStorage.setItem('authToken', responseData.token);
            
            if (responseData.user) {
                localStorage.setItem('user', JSON.stringify(responseData.user));
            }

            // Success animation
            loginBtn.innerHTML = '<i class="fas fa-check"></i>';
            loginBtn.style.backgroundColor = '#4BB543';
            setTimeout(redirectToDashboard, 800);

        } catch (error) {
            console.error('API error:', error.message);
            
            // More specific error messages
            let errorMessage = error.message;
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please check if the server is running on localhost:5000';
            } else if (error.message.includes('status 500')) {
                errorMessage = 'Server error. Please check your server logs for more details.';
            } else if (error.message.includes('status 401')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('status 404')) {
                errorMessage = 'Login endpoint not found. Please check your server routes.';
            }
            
            showError(loginForm, errorMessage);
            loginBtn.innerHTML = originalBtnHTML;
            loginBtn.style.backgroundColor = '';
            loginBtn.disabled = false;
        }
    });

    function redirectToDashboard() {
        // Check if dashboard exists, if not show error
        fetch('FrontEnd/Dashboard/dashboard.html')
            .then(response => {
                if (response.ok) {
                    window.location.href = 'FrontEnd/Dashboard/dashboard.html';
                } else {
                    showError(loginForm, 'Dashboard page not found. Please check your file structure.');
                    const loginBtn = document.querySelector('.login-btn');
                    if (loginBtn) {
                        loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
                        loginBtn.disabled = false;
                    }
                }
            })
            .catch(error => {
                console.error('Redirect error:', error);
                showError(loginForm, 'Cannot redirect to dashboard. Please check your file structure.');
            });
    }
    
    function showError(form, message) {
        const existingError = form.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        errorEl.style.cssText = `
            color: #ef233c;
            margin-top: 10px;
            text-align: center;
            animation: fadeIn 0.3s ease-out;
            padding: 8px;
            background: #fee;
            border-radius: 4px;
            border: 1px solid #fcc;
        `;

        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 500);
        
        form.appendChild(errorEl);
        
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => errorEl.remove(), 300);
            }
        }, 5000);
    }
});

// Chat Application JavaScript

// Mock data for chat conversations
const mockChats = [
  {
    id: 1,
    name: "Officer Smith",
    avatar: "policeman_5600529.png",
    lastMessage: "Case update: Investigation completed for downtown theft",
    time: "2:30 PM",
    unread: 2,
    status: "Online",
    messages: [
      {
        id: 1,
        text: "Hello, I have an update on the downtown theft case",
        time: "2:25 PM",
        sender: "them",
        type: "text"
      },
      {
        id: 2,
        text: "Great! What's the status?",
        time: "2:26 PM",
        sender: "me",
        type: "text"
      },
      {
        id: 3,
        text: "Case update: Investigation completed for downtown theft",
        time: "2:30 PM",
        sender: "them",
        type: "text"
      }
    ]
  },
  {
    id: 2,
    name: "Detective Johnson",
    avatar: "policeman_5600529.png",
    lastMessage: "Need your approval for the arrest warrant",
    time: "1:45 PM",
    unread: 0,
    status: "Away",
    messages: [
      {
        id: 1,
        text: "I've gathered enough evidence for the arrest warrant",
        time: "1:40 PM",
        sender: "them",
        type: "text"
      },
      {
        id: 2,
        text: "Need your approval for the arrest warrant",
        time: "1:45 PM",
        sender: "them",
        type: "text"
      }
    ]
  },
  {
    id: 3,
    name: "Sergeant Williams",
    avatar: "policeman_5600529.png",
    lastMessage: "Team meeting scheduled for tomorrow at 9 AM",
    time: "11:20 AM",
    unread: 1,
    status: "Online",
    messages: [
      {
        id: 1,
        text: "Team meeting scheduled for tomorrow at 9 AM",
        time: "11:20 AM",
        sender: "them",
        type: "text"
      }
    ]
  },
  {
    id: 4,
    name: "Officer Davis",
    avatar: "policeman_5600529.png",
    lastMessage: "Patrol report submitted",
    time: "10:15 AM",
    unread: 0,
    status: "Offline",
    messages: [
      {
        id: 1,
        text: "Patrol report submitted",
        time: "10:15 AM",
        sender: "them",
        type: "text"
      }
    ]
  }
];

// Chat application state
let currentChat = null;
let chatSearchTerm = "";

// Initialize chat application
function initializeChat() {
  populateChatList();
  setupChatEventListeners();
}

// Populate chat list
function populateChatList() {
  const chatList = document.getElementById("chatList");
  if (!chatList) return;

  chatList.innerHTML = "";
  
  const filteredChats = mockChats.filter(chat => 
    chat.name.toLowerCase().includes(chatSearchTerm.toLowerCase())
  );

  filteredChats.forEach(chat => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-item";
    chatItem.onclick = () => selectChat(chat.id);
    
    chatItem.innerHTML = `
      <img src="${chat.avatar}" alt="${chat.name}" class="chat-item-avatar" />
      <div class="chat-item-content">
        <div class="chat-item-header">
          <span class="chat-item-name">${chat.name}</span>
          <span class="chat-item-time">${chat.time}</span>
        </div>
        <div class="chat-item-message">${chat.lastMessage}</div>
      </div>
      ${chat.unread > 0 ? `<div class="chat-item-badge">${chat.unread}</div>` : ''}
    `;
    
    chatList.appendChild(chatItem);
  });
}

// Select a chat conversation
function selectChat(chatId) {
  const chat = mockChats.find(c => c.id === chatId);
  if (!chat) return;

  currentChat = chat;
  
  // Update active chat item
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
  });
  event.currentTarget.classList.add('active');
  
  // Show conversation
  document.getElementById('chatWelcome').style.display = 'none';
  document.getElementById('chatConversation').style.display = 'flex';
  
  // Update chat header
  document.getElementById('chatUserName').textContent = chat.name;
  document.getElementById('chatUserAvatar').src = chat.avatar;
  document.getElementById('chatUserStatus').textContent = chat.status;
  
  // Load messages
  loadMessages(chat.messages);
  
  // Clear unread count
  chat.unread = 0;
  populateChatList();
}

// Load messages in the conversation
function loadMessages(messages) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = "";
  
  messages.forEach(message => {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${message.sender === 'me' ? 'sent' : 'received'}`;
    
    messageElement.innerHTML = `
      ${message.sender === 'received' ? `<img src="policeman_5600529.png" alt="User" class="message-avatar" />` : ''}
      <div class="message-content">
        <div class="message-text">${message.text}</div>
        <div class="message-time">${message.time}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a message
function sendMessage() {
  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();
  
  if (!message || !currentChat) return;
  
  const newMessage = {
    id: Date.now(),
    text: message,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sender: 'me',
    type: 'text'
  };
  
  // Add message to current chat
  currentChat.messages.push(newMessage);
  currentChat.lastMessage = message;
  currentChat.time = newMessage.time;
  
  // Update UI
  loadMessages(currentChat.messages);
  populateChatList();
  
  // Clear input
  input.value = '';
  input.style.height = 'auto';
  
  // Simulate reply after 2 seconds
  setTimeout(() => {
    const replyMessage = {
      id: Date.now() + 1,
      text: generateAutoReply(message),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'them',
      type: 'text'
    };
    
    currentChat.messages.push(replyMessage);
    currentChat.lastMessage = replyMessage.text;
    currentChat.time = replyMessage.time;
    currentChat.unread = 1;
    
    loadMessages(currentChat.messages);
    populateChatList();
  }, 2000);
}

// Generate auto reply
function generateAutoReply(message) {
  const replies = [
    "Understood, I'll look into that.",
    "Thank you for the update.",
    "I'll get back to you on that.",
    "Noted, will follow up.",
    "Copy that, proceeding accordingly.",
    "Received, thank you.",
    "I'll handle this right away.",
    "Good to know, thanks for informing."
  ];
  
  return replies[Math.floor(Math.random() * replies.length)];
}

// Handle message input keydown
function handleMessageKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
  
  // Auto-resize textarea
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Create new chat
function createNewChat() {
  const newChat = {
    id: Date.now(),
    name: "New Contact",
    avatar: "policeman_5600529.png",
    lastMessage: "Start a new conversation",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unread: 0,
    status: "Online",
    messages: []
  };
  
  mockChats.unshift(newChat);
  populateChatList();
  selectChat(newChat.id);
}

// Toggle attachment menu
function toggleAttachmentMenu() {
  const menu = document.getElementById('attachmentMenu');
  const emojiPicker = document.getElementById('emojiPicker');
  
  if (menu.style.display === 'none') {
    menu.style.display = 'block';
    emojiPicker.style.display = 'none';
  } else {
    menu.style.display = 'none';
  }
}

// Toggle emoji picker
function toggleEmojiPicker() {
  const emojiPicker = document.getElementById('emojiPicker');
  const attachmentMenu = document.getElementById('attachmentMenu');
  
  if (emojiPicker.style.display === 'none') {
    emojiPicker.style.display = 'block';
    attachmentMenu.style.display = 'none';
  } else {
    emojiPicker.style.display = 'none';
  }
}

// Insert emoji
function insertEmoji(emoji) {
  const input = document.getElementById('chatMessageInput');
  const cursorPos = input.selectionStart;
  const textBefore = input.value.substring(0, cursorPos);
  const textAfter = input.value.substring(cursorPos);
  
  input.value = textBefore + emoji + textAfter;
  input.selectionStart = input.selectionEnd = cursorPos + emoji.length;
  input.focus();
  
  toggleEmojiPicker();
}

// Attach file
function attachFile(type) {
  let message = "";
  
  switch(type) {
    case 'image':
      message = "📷 Photo attached";
      break;
    case 'document':
      message = "📄 Document attached";
      break;
    case 'location':
      message = "📍 Location shared";
      break;
  }
  
  if (currentChat && message) {
    const newMessage = {
      id: Date.now(),
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me',
      type: type
    };
    
    currentChat.messages.push(newMessage);
    currentChat.lastMessage = message;
    currentChat.time = newMessage.time;
    
    loadMessages(currentChat.messages);
    populateChatList();
  }
  
  toggleAttachmentMenu();
}

// Toggle chat info panel
function toggleChatInfo() {
  const panel = document.getElementById('chatInfoPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    populateChatInfo();
  } else {
    panel.style.display = 'none';
  }
}

// Populate chat info
function populateChatInfo() {
  if (!currentChat) return;
  
  // Populate participants
  const participantList = document.getElementById('participantList');
  if (participantList) {
    participantList.innerHTML = `
      <div class="participant-item">
        <img src="${currentChat.avatar}" alt="${currentChat.name}" class="participant-avatar" />
        <div class="participant-info">
          <h5>${currentChat.name}</h5>
          <span>${currentChat.status}</span>
        </div>
      </div>
      <div class="participant-item">
        <img src="policeman_5600529.png" alt="You" class="participant-avatar" />
        <div class="participant-info">
          <h5>You</h5>
          <span>Online</span>
        </div>
      </div>
    `;
  }
  
  // Populate shared files
  const sharedFiles = document.getElementById('sharedFiles');
  if (sharedFiles) {
    sharedFiles.innerHTML = `
      <div class="file-item">
        <div class="file-icon">
          <i class="fas fa-file-pdf"></i>
        </div>
        <div class="file-info">
          <h5>Case Report.pdf</h5>
          <span>2.3 MB • 2 hours ago</span>
        </div>
      </div>
      <div class="file-item">
        <div class="file-icon">
          <i class="fas fa-image"></i>
        </div>
        <div class="file-info">
          <h5>Evidence Photo.jpg</h5>
          <span>1.1 MB • 1 day ago</span>
        </div>
      </div>
    `;
  }
}

// Toggle chat menu
function toggleChatMenu() {
  // Implementation for chat menu (could include options like mute, archive, etc.)
  console.log('Chat menu toggled');
}

// Toggle chat settings
function toggleChatSettings() {
  // Implementation for chat settings
  console.log('Chat settings toggled');
}

// Setup chat event listeners
function setupChatEventListeners() {
  // Chat search
  const chatSearch = document.getElementById('chatSearch');
  if (chatSearch) {
    chatSearch.addEventListener('input', (e) => {
      chatSearchTerm = e.target.value;
      populateChatList();
    });
  }
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.attachment-menu') && !e.target.closest('.chat-attachment-btn')) {
      document.getElementById('attachmentMenu').style.display = 'none';
    }
    
    if (!e.target.closest('.emoji-picker') && !e.target.closest('.chat-emoji-btn')) {
      document.getElementById('emojiPicker').style.display = 'none';
    }
  });
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeChat();
});
