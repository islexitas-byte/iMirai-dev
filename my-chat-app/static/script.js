const API_URL = "/ask";
const FEEDBACK_API_URL = "/save-feedback"; // API URL for feedback

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const errorEl = document.getElementById("error");
const emptyStateEl = document.getElementById("empty-state");

let lastUserQuestion = "";
// NEW: Tracks whether the modal was opened by 'like' or 'dislike' button
let initialFeedbackType = null; 
// Word-by-word typing speed
const TYPING_SPEED = 50; 

/**
 * Inserts spaces into the raw HTML string where adjacent tags might cause 
 * concatenation issues (e.g., </strong><strong> becomes </strong> <strong>).
 */
const sidebar = document.getElementById("sidebar");
const collapseBtn = document.getElementById("toggleCollapse");
const expandBtn = document.getElementById("toggleExpand");

function toggleSidebar() {
  sidebar.classList.toggle("collapsed");
  document.body.classList.toggle("sidebar-collapsed");
}

collapseBtn?.addEventListener("click", toggleSidebar);
expandBtn?.addEventListener("click", toggleSidebar);


function cleanupBotHtml(htmlContent) {
    if (!htmlContent) return '';
    
    // Regex to insert a single space between a closing tag (</tag>) and 
    // the immediate opening tag (<tag) that follows.
    return htmlContent.replace(/(<\/[a-zA-Z]+>)<([a-zA-Z]+[>|\s])/g, '$1 $2');
}

// Format: escape HTML, **bold**, and preserve new lines
function formatContent(text, role = "user") {
if (!text) return "";

// For BOT: trust backend HTML and render as-is (this is for final render)
if (role === "bot") {
    return cleanupBotHtml(text);
}

// For USER messages: keep simple formatting (**bold**, new lines)
const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
return withBold.replace(/\n/g, "<br>");
}


// Always scroll latest message into view - FINAL RELIABLE IMPLEMENTATION
// Function in index.html <script> tag
/*** Robust auto-scroll + MutationObserver ***/
/* Replace the existing scrollToBottom() with this version,
and place the observer initialization once (after messagesEl / messages-scroll-area exist). */

function isUserNearBottom(container, threshold = 160) {
// If user scrolled up more than `threshold` px, we won't force scroll.
// threshold helps when typing animation is in progress but user is essentially at bottom.
return (container.scrollTop + container.clientHeight + threshold) >= container.scrollHeight;
}

function scrollToBottom(debugLabel = '') {
const container = document.getElementById('messages-scroll-area');
if (!container) return;
// small debug
try { console.log('AUTO-SCROLL: start', debugLabel, 'scrollHeight', container.scrollHeight, 'clientHeight', container.clientHeight, 'scrollTop', container.scrollTop); } catch (e) {}

// Prefer scrolling the last message into view using scrollIntoView (works well when items change height)
const msgs = container.querySelectorAll('.msg-row');
const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;

// --- FIX 3: PREVENT SCROLL JUMPING ---
// If user intentionally scrolled up a lot, avoid forcing them down
// Lowering the threshold to 20px makes the check stricter to prevent unwanted jumps.
const allowAuto = isUserNearBottom(container, 20);
// --- END FIX 3 ---

// Use requestAnimationFrame twice to ensure layout updated
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
    if (!allowAuto) {
        // If user scrolled up, don't auto-scroll; but log for debugging
        try { console.log('AUTO-SCROLL: skipped because user scrolled up'); } catch (e) {}
        return;
    }

    if (lastMsg && lastMsg.scrollIntoView) {
        // Smooth might cause visible jump during typing; use instant
        lastMsg.scrollIntoView({ block: 'end', inline: 'nearest' });

        // fallback: ensure container bottom
        container.scrollTop = container.scrollHeight;
        try { console.log('AUTO-SCROLL: scrolled to last message'); } catch (e) {}
    } else {
        // fallback: set scrollTop
        container.scrollTop = container.scrollHeight;
        try { console.log('AUTO-SCROLL: scrolled by setting scrollTop'); } catch (e) {}
    }
    });
});
}

/* MutationObserver to auto-scroll when content inside messages changes.
This catches typing animation replacing text, footers appearing, icons inserted, etc.
Initialize this once after DOM is ready.
*/
(function initAutoScrollObserver() {
const container = document.getElementById('messages-scroll-area');
if (!container) {
    // Try again later if container not present yet
    document.addEventListener('DOMContentLoaded', initAutoScrollObserver, { once: true });
    return;
}

// Only create one observer
if (container._autoScrollObserverInitialized) return;
container._autoScrollObserverInitialized = true;

const observer = new MutationObserver((mutations) => {
    // If any child list changes or subtree changes, attempt to scroll
    let relevant = false;
    for (const m of mutations) {
    if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
        relevant = true; break;
    }
    if (m.type === 'characterData' && m.target) {
        relevant = true; break;
    }
    }
    if (relevant) {
    // small debounce to avoid thrashing for many small changes
    if (container._autoScrollTimeout) clearTimeout(container._autoScrollTimeout);
    container._autoScrollTimeout = setTimeout(() => {
        scrollToBottom('observer');
    }, 50);
    }
});

observer.observe(container, { childList: true, subtree: true, characterData: true });

// Also listen for window resize and font-load changes (they can change heights)
window.addEventListener('resize', () => scrollToBottom('resize'));
document.fonts && document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => scrollToBottom('fonts-loaded'));
})();

/**
 * Creates a message row and appends it.
 * @returns {object} Elements needed for the typing effect and controls.
 */
function appendMessage({ role, content, meta, question }) {
if (emptyStateEl) {
    emptyStateEl.style.display = "none";
}

const row = document.createElement("div");
row.className = `msg-row ${role}`;

const avatar = document.createElement("div");
avatar.className = `avatar ${role}`;
avatar.textContent = role === "user" ? "You" : "AI";

const bubbleWrapper = document.createElement("div");
bubbleWrapper.className = "msg-content";
const bubble = document.createElement("div");
bubble.className = `msg-bubble ${role}`;

if (role === 'user') {
    // User messages are rendered immediately
    bubble.innerHTML = formatContent(content, role);
} else {
    // Bot messages are initially empty for typing animation
    bubble.textContent = ""; 
}

bubbleWrapper.appendChild(bubble);

// User message meta
if (role === "user" && meta) {
    const metaEl = document.createElement("div");
    metaEl.className = "msg-meta";
    metaEl.textContent = meta;
    bubbleWrapper.appendChild(metaEl);
}

// Bot message controls (only created, not populated yet)
let footer, likeBtn, dislikeBtn, copyBtn, regenBtn, feedbackMsg;
if (role === "bot") {
    footer = document.createElement("div");
    footer.className = "msg-footer";
    footer.style.display = 'none'; // Hide footer during typing

    // Left side: Meta text / Feedback message
    feedbackMsg = document.createElement("div");
    feedbackMsg.className = "feedback-message";
    feedbackMsg.textContent = "Thank you for your feedback!";
    feedbackMsg.style.display = 'none'; // Initially hidden
    
    const metaLeft = document.createElement("div");
    metaLeft.className = "msg-meta";
    metaLeft.textContent = meta || "PiLog Docs";
    metaLeft.id = 'meta-text'; // ID for easy targeting

    // Right side: actions container - Make feedback actions always visible
    const actions = document.createElement("div");
    actions.className = "msg-actions feedback-actions";

    // Store question for regeneration
    bubble.dataset.question = question;

    // NEW: THUMBS UP
    likeBtn = document.createElement("button");
    likeBtn.className = "msg-action-btn feedback-btn like-btn";
    likeBtn.title = "Good Response";
    likeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;

    // NEW: THUMBS DOWN
    dislikeBtn = document.createElement("button");
    dislikeBtn.className = "msg-action-btn feedback-btn dislike-btn";
    dislikeBtn.title = "Bad Response";
    dislikeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`;
    
    // COPY ICON BUTTON (existing)
    copyBtn = document.createElement("button");
    copyBtn.className = "msg-action-btn copy-btn";
    copyBtn.title = "Copy";
    copyBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" 
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    `;

    // REGENERATE ICON BUTTON (existing)
    regenBtn = document.createElement("button");
    regenBtn.className = "msg-action-btn regenerate-btn";
    regenBtn.title = "Regenerate";
    regenBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <path d="M20.49 15A9 9 0 1 1 12 3v1"></path>
    </svg>
    `;


    actions.appendChild(likeBtn);
    actions.appendChild(dislikeBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(regenBtn);
    
    footer.appendChild(feedbackMsg); 
    footer.appendChild(metaLeft); 
    footer.appendChild(actions);

    bubbleWrapper.appendChild(footer);
}

row.appendChild(avatar);
row.appendChild(bubbleWrapper);

messagesEl.appendChild(row);
// Scroll to bottom after appending new row
scrollToBottom();
return { bubble, footer, likeBtn, dislikeBtn, copyBtn, regenBtn };
}

// index.html <script> section

/**
 * Implements the word-by-word typing animation and final HTML render.
 * @param {string | null} previewHtml - New parameter for instant loading content.
 */
function typeContent(bubbleEl, footerEl, likeBtnEl, dislikeBtnEl, copyBtnEl, regenBtnEl, fullHtmlContent, question, previewHtml = null) {
    
    // 1. Prepare the final HTML content once (crucial)
    const finalHtmlContent = cleanupBotHtml(fullHtmlContent);

    // 2. Extract plain text content for typing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = finalHtmlContent;
    
    const rawText = tempDiv.textContent; 
    const plainText = rawText.replace(/\s+/g, ' ').trim(); 
    const words = plainText.split(' '); 
    
    // 3. Setup typing variables
    bubbleEl.textContent = ''; 
    bubbleEl.dataset.question = question; 
    
    const wordCount = words.length; 
    let wordIndex = 0;
    
    // 4. Start word-by-word animation
    function typeNextWord() {
    if (wordIndex < wordCount) {
        const word = words[wordIndex];
        bubbleEl.textContent += (wordIndex > 0 ? ' ' : '') + word; 

        scrollToBottom(); 
        wordIndex++;
        
        setTimeout(typeNextWord, TYPING_SPEED); 
    } else {
        // 5. Typing finished: Replace the plain text with the final rich HTML
        bubbleEl.innerHTML = finalHtmlContent; 
        
        // --- CRITICAL NEW LOGIC: Append Preview HTML instantly ---
        if (previewHtml) {
            bubbleEl.innerHTML += previewHtml; // Append the file preview HTML
        }
        // ---------------------------------------------------------
        
        // 6. Show the footer with actions
        if (footerEl) {
            footerEl.style.display = 'flex';
            attachBotEventListeners(bubbleEl, footerEl, likeBtnEl, dislikeBtnEl, copyBtnEl, regenBtnEl);
        }
    }
    }
    
    typeNextWord();
}

// ⭐ START OF FIXED FUNCTION ⭐
function attachBotEventListeners(bubbleEl, footerEl, likeBtn, dislikeBtn, copyBtn, regenBtn) {
    const question = bubbleEl.dataset.question;
    
    // Copy Button Listener: Now uses a safe check and a robust fallback
    copyBtn.addEventListener("click", async () => {
    const contentToCopy = bubbleEl.innerText;
    
    // Helper function to show success
    const showCopySuccess = () => {
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 1200);
    };

    // Manual fallback function definition
    function attemptManualCopy(content) {
        try {
            // Use a temporary hidden textarea for document.execCommand('copy')
            const tempEl = document.createElement('textarea');
            tempEl.value = content;
            // Make it invisible and non-disruptive
            tempEl.style.position = 'absolute';
            tempEl.style.left = '-9999px';
            document.body.appendChild(tempEl);
            
            // Select and copy
            tempEl.select();
            document.execCommand('copy');
            
            // Clean up
            document.body.removeChild(tempEl);
            
            showCopySuccess();
        } catch (fallbackErr) {
            console.error("Fallback copy failed:", fallbackErr);
            alert("Copy failed! The browser blocked automatic copy. Please manually select and copy the text. (Hint: Load over HTTPS/localhost).");
        }
    }

    // CRITICAL FIX: Check if the modern Clipboard API exists to prevent TypeError
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            // 1. Attempt to use the modern Clipboard API
            await navigator.clipboard.writeText(contentToCopy);
            showCopySuccess();
        } catch (err) {
            console.error("Modern Clipboard API failed (Permissions?):", err);
            // If modern API fails due to permission, fall through to the manual copy below
            attemptManualCopy(contentToCopy);
        }
    } else {
        // 2. Fallback: If navigator.clipboard is undefined, go straight to manual copy
        console.warn("navigator.clipboard is unavailable. Falling back to manual method.");
        attemptManualCopy(contentToCopy);
    }
    });
    // ⭐ END OF FIXED COPY LOGIC ⭐


    // Regenerate Button Listener
    regenBtn.addEventListener("click", async () => {
    if (!question) return;

    regenBtn.classList.add("regen-loading");
    footerEl.style.display = 'none';
    bubbleEl.innerHTML = `<span style="font-size:0.85rem;color:#6b7280;">Regenerating...</span>`;
    
    setLoading(true, true); 

    try {
        const newAnswer = await callApi(question);
        // Re-use the existing bubble elements for re-typing
        typeContent(bubbleEl, footerEl, likeBtn, dislikeBtn, copyBtn, regenBtn, newAnswer, question);

    } catch (err) {
        console.error(err);
        bubbleEl.innerHTML = `<span style="color:#ef4444;">Error during regeneration.</span>`;
        showError("Unable to get a response from the API. Please check backend logs.");
    } finally {
        regenBtn.classList.remove("regen-loading");
        setLoading(false, true); 
        // Final scroll just to be sure
        scrollToBottom();
    }
    });
    
    // NEW: Feedback Button Listeners
    const handleFeedbackClick = (isLike) => {
        // Determine the explicit type of feedback click
        const feedbackType = isLike ? 'like' : 'dislike';
        // Open the modal, suggesting a high (85%) or low (15%) rating
        const suggestedRating = isLike ? 85 : 15; 
        
        // Pass the feedbackType to openModal
        openModal(footerEl, suggestedRating, feedbackType); 
    };
    
    // THUMBS UP/DOWN logic: opens the modal for rating
    likeBtn.addEventListener('click', () => handleFeedbackClick(true));
    dislikeBtn.addEventListener('click', () => handleFeedbackClick(false));
}


function appendTypingIndicator() {
const row = document.createElement("div");
row.className = "msg-row bot";
row.id = "typing-row";

const avatar = document.createElement("div");
avatar.className = "avatar bot";
avatar.textContent = "AI";

const bubbleWrapper = document.createElement("div");
const bubble = document.createElement("div");
bubble.className = "msg-bubble bot";

const typing = document.createElement("div");
typing.className = "typing-indicator";
typing.innerHTML = `
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
`;

bubble.appendChild(typing);
bubbleWrapper.appendChild(bubble);
row.appendChild(avatar);
row.appendChild(bubbleWrapper);

messagesEl.appendChild(row);
scrollToBottom();
}

function removeTypingIndicator() {
const row = document.getElementById("typing-row");
if (row) row.remove();
}

function setLoading(isLoading, keepIndicator = false) {
sendBtn.disabled = isLoading;
if (isLoading) {
    if (!keepIndicator) {
    appendTypingIndicator();
    }
} else {
    removeTypingIndicator();
}
}

function showError(message) {
if (!message) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
    return;
}
errorEl.textContent = message;
errorEl.style.display = "block";
}
// Add this helper function inside the <script> block
// NEW IMPLEMENTATION: Uses sessionStorage
function getOrCreateSessionId() {
    // 1. Check for the ID in sessionStorage
    let sessionId = sessionStorage.getItem('sessionId');
    
    // 2. If it doesn't exist, create and store a new one
    if (!sessionId) {
        // Generate a simple UUID-like string
        sessionId = 'session-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        
        // Store it in sessionStorage
        sessionStorage.setItem('sessionId', sessionId); 
    }
    
    // 3. Return the ID (either existing or new)
    return sessionId;
}

// index.html <script> section

// Single place that calls your backend
async function callApi(question) {
// NOTE: For a real application, you might want to send history with the question
const sessionId = getOrCreateSessionId();
const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question,sessionId })
});

if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${errorText || res.statusText}`);
}

// --- CRITICAL CHANGE: Return the entire JSON object, not just 'data.answer' ---
const data = await res.json();
return data; // returns { answer: "...", preview_html: "..." } or { answer: "..." }
// -----------------------------------------------------------------------------
}

// UPDATED: Function to send feedback to backend using the stored initialFeedbackType
async function sendFeedbackToBackend(question, rating) {
    // Use the explicitly stored click type (like or dislike)
    const sessionId = getOrCreateSessionId();
    const isThumbsUp = initialFeedbackType === 'like'; 
    const ratingInt = parseInt(rating);

    const payload = {
        'question': question,
        // These values are based on the initial button click, as requested
        'Thumbs_up': isThumbsUp ? '1' : '0', // Corrected key to match FastAPI alias: 'Thumbs up'
        'Thumbs_down': isThumbsUp ? '0' : '1', // Corrected key to match FastAPI alias: 'Thumbs down'
        'Percentage': String(ratingInt), // Percentage is still based on the slider value
        'sessionId': sessionId
    };

    const res = await fetch(FEEDBACK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        throw new Error(`Feedback API failed (${res.status}): ${res.statusText}`);
    }
    
    // Returns successfully if status is OK
    return true;
}

// index.html <script> section

async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    lastUserQuestion = text;
    showError(null);

    // 1. Append User Message
    appendMessage({ role: "user", content: text, meta: "" });

    inputEl.value = "";
    inputEl.style.height = "38px"; 
    
    setLoading(true);

    try {
        // --- CRITICAL CHANGE: API returns the full object (data) ---
        const data = await callApi(text);
        
        const answerHtml = data.answer || "No response content.";
        const previewHtml = data.preview_html || null; // Capture the separate key
        // ----------------------------------------------------------
        
        // 2. Remove loading indicator
        removeTypingIndicator();

        // 3. Create bot message elements (empty bubble)
        const { bubble, footer, likeBtn, dislikeBtn, copyBtn, regenBtn } = appendMessage({ 
        role: "bot", 
        content: "", 
        meta: "PiLog Docs", 
        question: text 
        });

        // 4. Start typing animation and final HTML render
        // --- CRITICAL CHANGE: Pass the new previewHtml key to typeContent ---
        typeContent(bubble, footer, likeBtn, dislikeBtn, copyBtn, regenBtn, answerHtml, text, previewHtml); 
        // ------------------------------------------------------------------

    } catch (err) {
        // ... (error handling remains the same)
        console.error(err);
        removeTypingIndicator();
        // Append a final error message if API fails
        const { bubble, footer, likeBtn, dislikeBtn, copyBtn, regenBtn } = appendMessage({ 
        role: "bot", 
        content: `<span style="color:#ef4444;">Sorry, I encountered an error.</span>`, 
        meta: "PiLog Docs" 
        });
        if (footer) footer.style.display = 'flex';
        attachBotEventListeners(bubble, footer, likeBtn, dislikeBtn, copyBtn, regenBtn);
        showError("Unable to get a response from the API. Please check backend logs.");
    } finally {
        setLoading(false);
    }
}

// Button click
sendBtn.addEventListener("click", () => {
sendMessage();
});

// Enter / Shift+Enter behavior
inputEl.addEventListener("keydown", (e) => {
if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
}
});

// Auto-resize textarea
inputEl.addEventListener("input", () => {
inputEl.style.height = "auto";
inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});

// --- Modal Logic ---
const modal = document.getElementById('feedback-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalSubmitBtn = document.getElementById('modal-submit-btn');
const ratingSlider = document.getElementById('rating-slider');
const ratingDisplay = document.getElementById('rating-display');
const modalForm = document.getElementById('modal-form');
const modalThanks = document.getElementById('modal-thanks');

let currentFooterContext = null; // Stores the footer element of the message being rated

// Color logic for the slider display and visual feedback
function updateRatingDisplay(value) {
    const val = parseInt(value);
    ratingDisplay.textContent = `${val}%`;
    
    let color = 'var(--accent)'; // Green (default)
    ratingDisplay.className = 'rating-value';

    // Use the same thresholds (34% and 67%) for color coding the display
    if (val < 34) {
        color = '#ef4444'; // Red
        ratingDisplay.classList.add('red');
    } else if (val < 67) {
        color = '#f59e0b'; // Yellow
        ratingDisplay.classList.add('yellow');
    } else {
        ratingDisplay.classList.add('green');
    }
    
    // Update CSS properties for track and thumb color for visual feedback
    ratingSlider.style.setProperty('--thumb-color', color);
    
    // Update the track to simulate a fill from 0 to val%
    ratingSlider.style.background = `linear-gradient(to right, ${color} ${val}%, #e5e7eb ${val}%)`;
}

// Initial color setup
updateRatingDisplay(ratingSlider.value);

ratingSlider.addEventListener('input', (e) => {
    updateRatingDisplay(e.target.value);
});

// UPDATED: Added feedbackType parameter
function openModal(contextEl, suggestedRating = 50, feedbackType) {
    currentFooterContext = contextEl;
    initialFeedbackType = feedbackType; // Store the initial click type
    
    modal.classList.add('open');
    modalForm.style.display = 'block';
    modalThanks.style.display = 'none';
    
    // Use the suggested rating to set the slider and update the display
    ratingSlider.value = suggestedRating; 
    updateRatingDisplay(suggestedRating);
}

function closeModal() {
    // When user closes the modal, we do NOT disable buttons in the chat
    modal.classList.remove('open');
    currentFooterContext = null;
    initialFeedbackType = null; // Clear the stored type
    // Reset modal form state
    modalForm.style.display = 'block';
    modalThanks.style.display = 'none';
    modalSubmitBtn.disabled = false;
    modalSubmitBtn.textContent = 'Submit Feedback';
}

modalCloseBtn.addEventListener('click', () => {
    closeModal();
});

// Close modal if backdrop is clicked
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});


modalSubmitBtn.addEventListener('click', async () => { 
    if (!currentFooterContext || !initialFeedbackType) return; 

    const footerEl = currentFooterContext;
    const rating = ratingSlider.value;
    const messageEl = footerEl.closest('.msg-row').querySelector('.msg-bubble');
    
    const question = messageEl.dataset.question || 'N/A';

    // Temporarily disable submit button
    modalSubmitBtn.disabled = true;
    modalSubmitBtn.textContent = 'Submitting...';

    try {
        // 1. Call the new API endpoint with only question and rating
        await sendFeedbackToBackend(question, rating);
        
        // 2. SUCCESS: Permanently disable the Thumbs Up/Down buttons in the chat row
        const likeBtn = footerEl.querySelector('.like-btn');
        const dislikeBtn = footerEl.querySelector('.dislike-btn');
        
        if (likeBtn) { 
            likeBtn.disabled = true; 
            likeBtn.style.opacity = '0.3'; 
        }
        if (dislikeBtn) { 
            dislikeBtn.disabled = true; 
            dislikeBtn.style.opacity = '0.3'; 
        }
        
        // NEW LOGIC: Highlight the button the user initially clicked
        if (initialFeedbackType === 'like' && likeBtn) {
            likeBtn.classList.add('selected-feedback');
        } else if (initialFeedbackType === 'dislike' && dislikeBtn) {
            dislikeBtn.classList.add('selected-feedback');
        }

        // 3. Update the chat row message
        const metaTextEl = footerEl.querySelector('#meta-text');
        const feedbackMsgEl = footerEl.querySelector('.feedback-message');
        
        // Determine color for the "Thank you" message based on the SUBMITTED RATING (slider value)
        const ratingInt = parseInt(rating);
        
        if (metaTextEl && feedbackMsgEl) {
            metaTextEl.style.display = 'none';
            feedbackMsgEl.style.display = 'block';
            
            if (ratingInt >= 67) {
                feedbackMsgEl.style.color = 'var(--accent)'; // Green
            } else if (ratingInt >= 34) {
                feedbackMsgEl.style.color = '#f59e0b'; // Yellow
            } else {
                feedbackMsgEl.style.color = '#ef4444'; // Red
            }
        }

        // 4. Show Thank you message in the modal
        modalForm.style.display = 'none';
        modalThanks.style.display = 'block';

        // 5. Auto-close modal after a delay
        setTimeout(() => {
            closeModal(); 
        }, 1200);

    } catch (error) {
        alert("Failed to submit feedback. Please check your network or API endpoint.");
        console.error("Submission error:", error);
        
        // Re-enable modal form state if submission fails so user can try again
        modalForm.style.display = 'block';
        modalThanks.style.display = 'none';

    } finally {
        // 6. Re-enable the submit button regardless of success/failure for the next attempt/interaction
        modalSubmitBtn.disabled = false;
        modalSubmitBtn.textContent = 'Submit Feedback';
    }
});

// ENHANCEMENT: Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
    }
});
