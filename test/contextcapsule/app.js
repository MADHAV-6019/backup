/* ============================================================
   CONTEXT CAPSULE — app.js
   Core logic: parse, format, generate capsule
   ============================================================ */

// ─── State ────────────────────────────────────────────────
const state = {
  messages: [],         // { role: 'user'|'assistant'|'system', content: string }
  currentRole: 'user',
  currentFormat: 'structured',
  collapsed: { meta: false, format: false },
};

// ─── Tab Switching ─────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`pane-${tab}`).classList.add('active');
}

// ─── Role Selector ─────────────────────────────────────────
function setRole(role) {
  state.currentRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`role-${role}`).classList.add('active');
}

// ─── Collapse Sections ─────────────────────────────────────
function toggleSection(section) {
  const body   = document.getElementById(`${section}-body`);
  const toggle = document.getElementById(`${section}-toggle`);
  state.collapsed[section] = !state.collapsed[section];
  body.style.display = state.collapsed[section] ? 'none' : '';
  toggle.classList.toggle('collapsed', state.collapsed[section]);
}

// ─── Format Selector ───────────────────────────────────────
function setFormat(fmt) {
  state.currentFormat = fmt;
  document.querySelectorAll('.format-card').forEach(c => c.classList.remove('active'));
  document.getElementById(`fmt-${fmt}`).classList.add('active');
}

// ─── Add Manual Message ────────────────────────────────────
function addManualMessage() {
  const input = document.getElementById('manual-input');
  const content = input.value.trim();
  if (!content) return;

  const msg = { role: state.currentRole, content };
  state.messages.push(msg);
  renderMessages();
  input.value = '';
  input.focus();
}

// Handle Enter key in manual input
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('manual-input');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        addManualMessage();
      }
    });
  }
});

// ─── Render Messages ───────────────────────────────────────
function renderMessages() {
  const container = document.getElementById('manual-messages');

  if (state.messages.length === 0) {
    container.innerHTML = `
      <div class="empty-manual">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <p>No messages yet. Add your first message below.</p>
      </div>`;
    return;
  }

  container.innerHTML = state.messages.map((msg, i) => {
    const roleClass = msg.role === 'user' ? 'user-msg' : msg.role === 'assistant' ? 'ai-msg' : 'system-msg';
    const roleLabel = msg.role === 'assistant' ? 'AI' : msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    const escaped = escapeHtml(msg.content);
    return `
      <div class="message-bubble ${roleClass}">
        <span class="msg-role-tag">${roleLabel}</span>
        <span class="msg-text">${escaped}</span>
        <button class="msg-delete" data-index="${i}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }).join('');
}

function deleteMessage(index) {
  state.messages.splice(index, 1);
  renderMessages();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Parse Pasted Conversation ─────────────────────────────
function parseConversation() {
  const raw = document.getElementById('paste-input').value.trim();
  if (!raw) {
    showToast('Paste a conversation first!', 'warn');
    return;
  }

  const parsed = smartParse(raw);

  if (parsed.length === 0) {
    showToast('Could not parse messages. Try the Manual tab.', 'warn');
    return;
  }

  state.messages = parsed;
  renderMessages();
  switchTab('manual');
  showToast(`✓ Imported ${parsed.length} messages!`);
}

function smartParse(text) {
  const lines   = text.split('\n');
  const messages = [];

  // Patterns to detect role prefixes
  const patterns = [
    { re: /^(You|User|Human|Me)\s*[:>]\s*/i,   role: 'user'      },
    { re: /^(AI|Assistant|Bot|GPT|Claude|Gemini|HackerAI|System AI)\s*[:>]\s*/i, role: 'assistant' },
    { re: /^(System|SYS|Context)\s*[:>]\s*/i,  role: 'system'    },
    { re: /^\[(User|Human|Me)\]\s*[:>]?\s*/i,  role: 'user'      },
    { re: /^\[(AI|Assistant|Bot|GPT|Claude|Gemini)\]\s*[:>]?\s*/i, role: 'assistant' },
    { re: /^\[(System|SYS)\]\s*[:>]?\s*/i,     role: 'system'    },
  ];

  let currentRole    = null;
  let currentContent = [];

  const flush = () => {
    if (currentRole && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content) messages.push({ role: currentRole, content });
    }
    currentContent = [];
  };

  for (const line of lines) {
    let matched = false;
    for (const { re, role } of patterns) {
      if (re.test(line)) {
        flush();
        currentRole = role;
        currentContent = [line.replace(re, '').trim()];
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (currentRole !== null) {
        currentContent.push(line);
      } else if (line.trim()) {
        // Unrecognized but non-empty — treat as user
        flush();
        currentRole = 'user';
        currentContent = [line.trim()];
      }
    }
  }
  flush();
  return messages;
}

// ─── Fetch From Link ───────────────────────────────────────
async function fetchFromLink() {
  const url = document.getElementById('link-input').value.trim();
  if (!url) {
    showToast('Please enter a valid link', 'warn');
    return;
  }

  // Check if we have the Chrome Extension APIs
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
    showToast('Error: This feature requires the Chrome Extension environment with proper permissions.', 'warn');
    return;
  }

  const loader = document.getElementById('fetch-loader');
  const status = document.getElementById('fetch-status');
  loader.classList.remove('hidden');
  status.textContent = 'Extracting conversation...';

  try {
    // 1. Create a background tab
    const tab = await chrome.tabs.create({ url, active: false });

    // 2. Inject the extraction script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectedExtractor
    });

    // 3. Close the background tab
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      console.warn('Failed to close background tab:', e);
    }

    const parsedMessages = results && results[0] && results[0].result ? results[0].result : [];

    if (parsedMessages.length === 0) {
      throw new Error('Could not extract any messages from this page. It might be protected or unsupported.');
    }

    state.messages = parsedMessages;
    renderMessages();
    switchTab('manual');
    showToast(`✓ Fetched ${parsedMessages.length} messages!`);
  } catch (err) {
    console.error(err);
    showToast(`Error: ${err.message}`, 'warn');
  } finally {
    loader.classList.add('hidden');
  }
}

// This function is serialized and run in the context of the background tab.
// It cannot access variables outside its scope.
function injectedExtractor() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds (20 * 500ms)

    const checkDOM = () => {
      attempts++;
      const url = window.location.href;
      let messages = [];

      // ChatGPT Logic
      if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
        const nodes = document.querySelectorAll('[data-message-author-role]');
        if (nodes.length > 0) {
          nodes.forEach(node => {
            const role = node.getAttribute('data-message-author-role');
            const markdownDiv = node.querySelector('.markdown');
            const content = markdownDiv 
              ? Array.from(markdownDiv.querySelectorAll('p, pre, li')).map(el => el.textContent.trim()).filter(Boolean).join('\n\n')
              : node.textContent.trim();
            if (content && ['user', 'assistant', 'system'].includes(role)) {
              messages.push({ role, content });
            }
          });
          if (messages.length > 0) return resolve(messages);
        }
      }

      // HackerAI / Generic Logic
      // Look for typical message containers
      const pNodes = document.querySelectorAll('p, .prose p, [class*="message"] p, [class*="chat"] p');
      
      // If we see content, let's grab it, but wait at least a bit for rendering to finish
      // We will extract if we reach max attempts, OR if we've waited at least 2 seconds (4 attempts) and we see paragraphs.
      if (pNodes.length > 0 && attempts >= 4 || attempts >= maxAttempts) {
        
        // Generic fallback: grab all paragraphs and alternating roles
        const clone = document.body.cloneNode(true);
        // Clean up UI noise
        clone.querySelectorAll('script, style, noscript, nav, header, footer, svg, button, form, input').forEach(el => el.remove());
        
        const textElements = Array.from(clone.querySelectorAll('p, pre, code'));
        
        let currentRole = 'user';
        textElements.forEach(el => {
          const text = el.textContent.trim();
          if (text.length > 20) { // arbitrary threshold to ignore UI fluff
            messages.push({ role: currentRole, content: text });
            currentRole = currentRole === 'user' ? 'assistant' : 'user';
          }
        });
        
        if (messages.length > 0) return resolve(messages);
      }

      if (attempts >= maxAttempts) {
        resolve([]); // Give up and return empty array
      } else {
        setTimeout(checkDOM, 500);
      }
    };

    // Wait a brief moment before first check to let SPA initialize
    setTimeout(checkDOM, 500);
  });
}

// ─── Load Example ──────────────────────────────────────────
function loadExample() {
  document.getElementById('paste-input').value = `You: I'm doing a pentest on a web application and need to test for SQL injection vulnerabilities. Where should I start?

AI: Great question! For SQL injection testing, start with these steps:

1. **Identify input points** — forms, URL params, headers, cookies
2. **Test basic payloads** — try single quotes (') and observe errors
3. **Use automated tools** — sqlmap is excellent for this

You: I found a login form. What's the most common payload to test?

AI: For a login form, try these classic payloads:
- Username field: ' OR '1'='1
- Username: admin'--
- Username: ' OR 1=1--

The goal is to break out of the SQL string and manipulate the WHERE clause.

You: It looks vulnerable! The page returned a database error. What do I do next?

AI: Excellent find! Now proceed carefully:
1. Document the exact payload and response
2. Use sqlmap with --risk=1 --level=1 to enumerate the database
3. Check what data is accessible
4. Report it — don't exploit beyond proof of concept

Remember to only test on systems you're authorized to test!`;
  showToast('Example loaded — click Parse & Import');
}

// ─── Clear All ─────────────────────────────────────────────
document.getElementById('clear-all-btn').addEventListener('click', () => {
  if (confirm('Clear everything? This will remove all messages and metadata.')) {
    state.messages = [];
    renderMessages();
    document.getElementById('paste-input').value = '';
    ['meta-topic','meta-persona','meta-context','meta-continue'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('meta-ai-source').value = '';
    document.getElementById('meta-ai-target').value = '';
    document.getElementById('step-output').classList.add('hidden');
    showToast('Cleared!');
  }
});

// ─── Token Estimation ──────────────────────────────────────
function estimateTokens(text) {
  // ~4 chars per token is a rough but standard estimate
  return Math.ceil(text.length / 4);
}

// ─── Generate Capsule ──────────────────────────────────────
function generateCapsule() {
  const allMessages = collectMessages();

  if (allMessages.length === 0) {
    showToast('Add some messages first!', 'warn');
    return;
  }

  const meta = {
    topic:       document.getElementById('meta-topic').value.trim(),
    aiSource:    document.getElementById('meta-ai-source').value,
    aiTarget:    document.getElementById('meta-ai-target').value,
    persona:     document.getElementById('meta-persona').value.trim(),
    context:     document.getElementById('meta-context').value.trim(),
    continueFrom: document.getElementById('meta-continue').value.trim(),
  };
  const opts = {
    summary:      document.getElementById('opt-summary').checked,
    tokenHint:    document.getElementById('opt-token-hint').checked,
    instructions: document.getElementById('opt-instructions').checked,
  };

  const capsule = buildCapsule(allMessages, meta, opts, state.currentFormat);
  const tokens  = estimateTokens(capsule);

  // Show output
  const outputSection = document.getElementById('step-output');
  const outputPre     = document.getElementById('capsule-output');
  const stats         = document.getElementById('output-stats');

  outputPre.textContent = capsule;
  stats.textContent = `${allMessages.length} messages · ~${tokens.toLocaleString()} tokens · ${capsule.length.toLocaleString()} characters`;
  outputSection.classList.remove('hidden');

  // Animate into view
  setTimeout(() => {
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Pulse the generate button
  const btn = document.getElementById('generate-btn');
  btn.textContent = '✓ Capsule Generated!';
  setTimeout(() => {
    btn.innerHTML = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Generate Context Capsule`;
  }, 2000);
}

function collectMessages() {
  // Use manual tab messages if present, else try to parse the paste area
  if (state.messages.length > 0) return state.messages;
  const raw = document.getElementById('paste-input').value.trim();
  if (raw) return smartParse(raw);
  return [];
}

// ─── Capsule Builder ───────────────────────────────────────
function buildCapsule(messages, meta, opts, format) {
  const now = new Date().toLocaleString();
  const roleLabels = { user: 'USER', assistant: 'AI', system: 'SYSTEM' };

  switch (format) {
    case 'xml':      return buildXML(messages, meta, opts, now, roleLabels);
    case 'markdown': return buildMarkdown(messages, meta, opts, now, roleLabels);
    case 'plain':    return buildPlain(messages, meta, opts, now, roleLabels);
    default:         return buildStructured(messages, meta, opts, now, roleLabels);
  }
}

// ── Structured Format ──
function buildStructured(messages, meta, opts, now, roleLabels) {
  const lines = [];

  lines.push('════════════════════════════════════════════════════════════');
  lines.push('                    CONTEXT CAPSULE');
  lines.push('════════════════════════════════════════════════════════════');
  lines.push(`Generated: ${now}`);
  if (meta.aiSource) lines.push(`From: ${meta.aiSource}`);
  if (meta.aiTarget) lines.push(`To:   ${meta.aiTarget}`);
  lines.push('');

  if (opts.summary) {
    lines.push('━━━ CONTEXT SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (meta.topic)   lines.push(`Topic: ${meta.topic}`);
    if (meta.persona) lines.push(`Your role: ${meta.persona}`);
    if (meta.context) lines.push(`\nBackground:\n${meta.context}`);
    lines.push('');
  }

  if (opts.tokenHint) {
    lines.push(`━━━ CONVERSATION (${messages.length} messages) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  } else {
    lines.push('━━━ CONVERSATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  lines.push('');

  messages.forEach((msg, i) => {
    const label = roleLabels[msg.role] || msg.role.toUpperCase();
    lines.push(`[${label}]`);
    lines.push(msg.content);
    if (i < messages.length - 1) lines.push('');
  });

  lines.push('');
  lines.push('════════════════════════════════════════════════════════════');

  if (meta.continueFrom) {
    lines.push(`CURRENT STATUS: ${meta.continueFrom}`);
    lines.push('');
  }

  if (opts.instructions) {
    lines.push('INSTRUCTIONS FOR YOU (the AI reading this):');
    lines.push('You now have the full context of this conversation above.');
    if (meta.persona) lines.push(`Please act as: ${meta.persona}`);
    lines.push('Continue the conversation naturally from where we left off.');
    lines.push('Acknowledge that you understand the context, then ask what to do next.');
    lines.push('════════════════════════════════════════════════════════════');
  }

  return lines.join('\n');
}

// ── XML Format ──
function buildXML(messages, meta, opts, now, roleLabels) {
  const lines = [];

  lines.push('<context_capsule>');
  lines.push(`  <metadata>`);
  lines.push(`    <generated>${now}</generated>`);
  if (meta.aiSource) lines.push(`    <source_ai>${meta.aiSource}</source_ai>`);
  if (meta.aiTarget) lines.push(`    <target_ai>${meta.aiTarget}</target_ai>`);
  if (meta.topic)    lines.push(`    <topic>${meta.topic}</topic>`);
  if (meta.persona)  lines.push(`    <ai_persona>${meta.persona}</ai_persona>`);
  if (opts.tokenHint) lines.push(`    <message_count>${messages.length}</message_count>`);
  lines.push(`  </metadata>`);

  if (meta.context) {
    lines.push(`  <background>`);
    lines.push(`    ${meta.context}`);
    lines.push(`  </background>`);
  }

  lines.push(`  <conversation>`);
  messages.forEach(msg => {
    lines.push(`    <message role="${msg.role}">`);
    lines.push(`      ${msg.content.replace(/\n/g, '\n      ')}`);
    lines.push(`    </message>`);
  });
  lines.push(`  </conversation>`);

  if (meta.continueFrom) {
    lines.push(`  <current_status>${meta.continueFrom}</current_status>`);
  }

  if (opts.instructions) {
    lines.push(`  <instructions>`);
    lines.push(`    You have received the full conversation context above.`);
    if (meta.persona) lines.push(`    Please adopt this role: ${meta.persona}`);
    lines.push(`    Continue the conversation from where we left off.`);
    lines.push(`    First acknowledge the context, then assist the user.`);
    lines.push(`  </instructions>`);
  }

  lines.push('</context_capsule>');
  return lines.join('\n');
}

// ── Markdown Format ──
function buildMarkdown(messages, meta, opts, now, roleLabels) {
  const lines = [];

  lines.push('# Context Capsule');
  lines.push('');
  lines.push(`> Generated: ${now}`);
  if (meta.aiSource) lines.push(`> **From:** ${meta.aiSource}`);
  if (meta.aiTarget) lines.push(`> **To:** ${meta.aiTarget}`);
  lines.push('');

  if (opts.summary || meta.topic || meta.persona || meta.context) {
    lines.push('## Context Overview');
    if (meta.topic)   lines.push(`**Topic:** ${meta.topic}`);
    if (meta.persona) lines.push(`**AI Role:** ${meta.persona}`);
    if (meta.context) {
      lines.push('');
      lines.push('**Background:**');
      lines.push(meta.context);
    }
    lines.push('');
  }

  const msgHeader = opts.tokenHint ? `## Conversation (${messages.length} messages)` : '## Conversation';
  lines.push(msgHeader);
  lines.push('');

  messages.forEach(msg => {
    const label = msg.role === 'user' ? '👤 **User**' : msg.role === 'assistant' ? '🤖 **AI**' : '⚙️ **System**';
    lines.push(`### ${label}`);
    lines.push(msg.content);
    lines.push('');
  });

  if (meta.continueFrom) {
    lines.push('---');
    lines.push(`**Current Status:** ${meta.continueFrom}`);
    lines.push('');
  }

  if (opts.instructions) {
    lines.push('---');
    lines.push('## Instructions');
    lines.push('You now have the complete conversation context above. Please:');
    if (meta.persona) lines.push(`1. Act as: **${meta.persona}**`);
    lines.push('2. Acknowledge you understand the full context');
    lines.push('3. Continue the conversation from where we left off');
  }

  return lines.join('\n');
}

// ── Plain Text Format ──
function buildPlain(messages, meta, opts, now, roleLabels) {
  const lines = [];

  lines.push('CONTEXT CAPSULE');
  lines.push(`Generated: ${now}`);
  if (meta.aiSource) lines.push(`From: ${meta.aiSource}`);
  if (meta.aiTarget) lines.push(`To: ${meta.aiTarget}`);
  lines.push('');

  if (meta.topic)   lines.push(`Topic: ${meta.topic}`);
  if (meta.persona) lines.push(`AI Role: ${meta.persona}`);
  if (meta.context) lines.push(`Background: ${meta.context}`);
  lines.push('');

  if (opts.tokenHint) lines.push(`--- CONVERSATION (${messages.length} messages) ---`);
  else lines.push('--- CONVERSATION ---');
  lines.push('');

  messages.forEach(msg => {
    const label = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'AI' : 'System';
    lines.push(`${label}: ${msg.content}`);
    lines.push('');
  });

  if (meta.continueFrom) {
    lines.push(`Current status: ${meta.continueFrom}`);
    lines.push('');
  }

  if (opts.instructions) {
    lines.push('--- INSTRUCTIONS ---');
    lines.push('You now have the full conversation context. Continue from where we left off.');
    if (meta.persona) lines.push(`Act as: ${meta.persona}`);
  }

  return lines.join('\n');
}

// ─── Copy to Clipboard ─────────────────────────────────────
async function copyToClipboard() {
  const text = document.getElementById('capsule-output').textContent;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    showToast('Copied to clipboard!');
    setTimeout(() => {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  } catch {
    showToast('Copy failed — please select and copy manually', 'warn');
  }
}

// ─── Download Capsule ──────────────────────────────────────
function downloadCapsule() {
  const text = document.getElementById('capsule-output').textContent;
  const ext  = { structured: 'txt', xml: 'xml', markdown: 'md', plain: 'txt' }[state.currentFormat] || 'txt';
  const filename = `context-capsule-${Date.now()}.${ext}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Downloaded as ${filename}`);
}

// ─── Toast ─────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast   = document.getElementById('toast');
  const msgElem = document.getElementById('toast-msg');
  msgElem.textContent = msg;

  if (type === 'warn') {
    toast.style.background  = 'rgba(251,191,36,0.15)';
    toast.style.borderColor = 'rgba(251,191,36,0.4)';
    toast.style.color       = '#fbbf24';
  } else {
    toast.style.background  = '';
    toast.style.borderColor = '';
    toast.style.color       = '';
  }

  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

// ─── Event Listeners (CSP Compliant) ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  document.getElementById('tab-paste')?.addEventListener('click', () => switchTab('paste'));
  document.getElementById('tab-manual')?.addEventListener('click', () => switchTab('manual'));
  document.getElementById('tab-link')?.addEventListener('click', () => switchTab('link'));
  
  // Paste Actions
  document.getElementById('btn-parse')?.addEventListener('click', parseConversation);
  document.getElementById('btn-example')?.addEventListener('click', loadExample);
  
  // Link Actions
  document.getElementById('fetch-link-btn')?.addEventListener('click', fetchFromLink);
  
  // Manual Actions
  document.getElementById('role-user')?.addEventListener('click', () => setRole('user'));
  document.getElementById('role-assistant')?.addEventListener('click', () => setRole('assistant'));
  document.getElementById('role-system')?.addEventListener('click', () => setRole('system'));
  document.getElementById('btn-add-msg')?.addEventListener('click', addManualMessage);
  
  // Toggles
  document.getElementById('meta-toggle')?.addEventListener('click', () => toggleSection('meta'));
  document.getElementById('format-toggle')?.addEventListener('click', () => toggleSection('format'));
  
  // Format Radios
  document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', (e) => setFormat(e.target.value));
  });
  
  // Generate & Output
  document.getElementById('generate-btn')?.addEventListener('click', generateCapsule);
  document.getElementById('copy-btn')?.addEventListener('click', copyToClipboard);
  document.getElementById('btn-download')?.addEventListener('click', downloadCapsule);
  
  // Delegated event listener for dynamically rendered delete buttons
  document.getElementById('manual-messages')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.msg-delete');
    if (btn) {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      deleteMessage(idx);
    }
  });
});
