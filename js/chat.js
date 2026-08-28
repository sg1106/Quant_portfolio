/**
 * chat.js — ResumeLLM Chatbot Frontend Controller
 */

// Toggle Chat Window
function toggleChat() {
  const panel = document.getElementById('chat-panel');
  const fab = document.getElementById('chat-fab');
  if (!panel) return;
  
  panel.classList.toggle('active');
  
  if (fab) {
    if (panel.classList.contains('active')) {
      fab.classList.add('panel-open');
    } else {
      fab.classList.remove('panel-open');
    }
  }

  // Scroll to bottom on open to ensure messages are visible
  if (panel.classList.contains('active')) {
    setTimeout(scrollToBottom, 200);
    const input = document.getElementById('chat-input');
    if (input) input.focus();
  }
}

// Scroll chat message zone to the bottom
function scrollToBottom() {
  const messagesZone = document.getElementById('chat-messages');
  if (messagesZone) {
    messagesZone.scrollTop = messagesZone.scrollHeight;
  }
}

// Simple Markdown-like string parser to HTML
function parseMarkdown(text) {
  // Escape HTML tags to prevent XSS (since we insert content via innerHTML)
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Parse links: [link text](url) -> <a href="url" target="_blank">link text</a>
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Parse headings: ### Header or ## Header -> <div class="section-title">Header</div>
  escaped = escaped.replace(/^###\s+(.+)$/gm, '<div class="section-title">$1</div>');
  escaped = escaped.replace(/^##\s+(.+)$/gm, '<div class="section-title">$1</div>');
  escaped = escaped.replace(/^#\s+(.+)$/gm, '<div class="section-title">$1</div>');

  // Parse bold text: **text** -> <strong>text</strong>
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Parse bullets and lists
  let lines = escaped.split('\n');
  let inList = false;
  let inOrderedList = false;
  let resultLines = [];

  for (let line of lines) {
    let trimLine = line.trim();
    if (trimLine.startsWith('- ') || trimLine.startsWith('* ')) {
      if (inOrderedList) {
        resultLines.push('</ol>');
        inOrderedList = false;
      }
      if (!inList) {
        resultLines.push('<ul>');
        inList = true;
      }
      resultLines.push('<li>' + trimLine.substring(2) + '</li>');
    } else if (trimLine.match(/^\d+\.\s+/)) {
      if (inList) {
        resultLines.push('</ul>');
        inList = false;
      }
      if (!inOrderedList) {
        resultLines.push('<ol>');
        inOrderedList = true;
      }
      let match = trimLine.match(/^\d+\.\s+(.+)$/);
      resultLines.push('<li>' + (match ? match[1] : trimLine) + '</li>');
    } else {
      if (inList) {
        resultLines.push('</ul>');
        inList = false;
      }
      if (inOrderedList) {
        resultLines.push('</ol>');
        inOrderedList = false;
      }
      if (trimLine !== '') {
        resultLines.push('<p>' + line + '</p>');
      }
    }
  }

  if (inList) resultLines.push('</ul>');
  if (inOrderedList) resultLines.push('</ol>');

  return resultLines.join('\n');
}

// Append message (user or bot) to the chat window
function appendMessage(sender, text, isRawHtml = false) {
  const messagesZone = document.getElementById('chat-messages');
  if (!messagesZone) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'chat-bubble';
  
  if (isRawHtml) {
    bubbleDiv.innerHTML = text;
  } else {
    // Parse markdown elements for rendering
    bubbleDiv.innerHTML = parseMarkdown(text);
  }

  msgDiv.appendChild(bubbleDiv);
  messagesZone.appendChild(msgDiv);
  scrollToBottom();
}

// Show/hide typing indicator
function setTyping(isTyping) {
  const messagesZone = document.getElementById('chat-messages');
  if (!messagesZone) return;

  const existingIndicator = document.getElementById('typing-indicator-container');
  
  if (isTyping) {
    if (existingIndicator) return; // Already showing
    
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'chat-msg bot';
    indicatorDiv.id = 'typing-indicator-container';
    
    indicatorDiv.innerHTML = `
      <div class="chat-bubble" style="padding: 0.6rem 0.9rem;">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    
    messagesZone.appendChild(indicatorDiv);
    scrollToBottom();
  } else {
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }
}

// Handle submitting chat form
async function handleChatSubmit(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const inputEl = document.getElementById('chat-input');
  if (!inputEl) return;

  const question = inputEl.value.trim();
  if (!question) return;

  // Clear input
  inputEl.value = '';

  // Append user message
  appendMessage('user', question);

  // Show typing indicator
  setTyping(true);

  // Determine API endpoint dynamically (uses Hugging Face Space backend when deployed)
  let apiURL = 'https://sg1106-llm.hf.space/ask';
  if (window.location.protocol === 'file:' || 
      (window.location.port === '7860' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
    apiURL = 'http://127.0.0.1:7860/ask';
  }

  try {
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: question }),
    });

    const data = await response.json();
    setTyping(false);

    if (response.ok) {
      appendMessage('bot', data.answer);
    } else {
      let errMsg = data.error || 'Oops, I encountered an error while retrieving the answer.';
      if (data.code === 'missing_pdf') {
        errMsg = 'The RAG pipeline is offline because the Resume PDF was not found in the server folder. Please upload "swastik_resume.pdf" and restart the Flask app.';
      }
      appendMessage('bot', `⚠️ **Error:** ${errMsg}`);
    }
  } catch (error) {
    console.error('Chat error:', error);
    setTyping(false);
    appendMessage('bot', '⚠️ **Connection Error:** Could not reach the AI server. Make sure the Flask app is running locally.');
  }
}

// Handle clicking on a quick-suggest question
function sendSuggestedQuestion(event, questionText) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const inputEl = document.getElementById('chat-input');
  if (!inputEl) return;

  inputEl.value = questionText;
  handleChatSubmit(event);
}

// Voice Speech Recognition setup
let recognition = null;
let isListening = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech Recognition API not supported in this browser.");
    return null;
  }
  
  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isListening = true;
    const micBtn = document.getElementById('chat-mic-btn');
    const input = document.getElementById('chat-input');
    if (micBtn) micBtn.classList.add('listening');
    if (input) {
      input.placeholder = "Listening...";
      input.focus();
    }
  };

  rec.onend = () => {
    isListening = false;
    const micBtn = document.getElementById('chat-mic-btn');
    const input = document.getElementById('chat-input');
    if (micBtn) micBtn.classList.remove('listening');
    if (input) {
      input.placeholder = "Ask a question...";
    }
  };

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = transcript;
      handleChatSubmit();
    }
  };

  rec.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    setTyping(false);
    if (event.error === 'not-allowed') {
      appendMessage('bot', "⚠️ **Microphone Permission Denied:** Please enable microphone access in your browser settings to use voice input.");
    } else if (event.error === 'network') {
      appendMessage('bot', "⚠️ **Voice Input Network Error:** Chrome's speech recognition requires an active internet connection. Please verify your internet connection, or try using **Safari** (which uses macOS's local offline dictation engine).");
    } else {
      appendMessage('bot', `⚠️ **Voice Input Error:** ${event.error}`);
    }
  };

  return rec;
}

function toggleVoiceInput() {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }

  if (!recognition) {
    appendMessage('bot', "⚠️ **Not Supported:** Your browser does not support voice input. Please try Chrome or Safari.");
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }
}
