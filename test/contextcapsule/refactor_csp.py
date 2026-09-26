import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add missing IDs
html = html.replace('<button class="btn-secondary" onclick="parseConversation()">', '<button id="btn-parse" class="btn-secondary">')
html = html.replace('<button class="btn-ghost-sm" onclick="loadExample()">Load Example</button>', '<button id="btn-example" class="btn-ghost-sm">Load Example</button>')
html = html.replace('<button class="btn-primary" onclick="addManualMessage()">', '<button id="btn-add-msg" class="btn-primary">')
html = html.replace('<button class="btn-ghost-sm" onclick="downloadCapsule()">', '<button id="btn-download" class="btn-ghost-sm">')

# Strip all remaining onclicks and onchanges
html = re.sub(r'\s*onclick="[^"]*"', '', html)
html = re.sub(r'\s*onchange="[^"]*"', '', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix renderMessages onclick issue
js = js.replace('<button class="msg-delete" onclick="deleteMessage(${i})" title="Delete">',
                '<button class="msg-delete" data-index="${i}" title="Delete">')

# Add event listeners at the end
listeners = """

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
"""

if "Event Listeners (CSP Compliant)" not in js:
    with open('app.js', 'a', encoding='utf-8') as f:
        f.write(listeners)
    
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(js.replace('<button class="msg-delete" onclick="deleteMessage(${i})" title="Delete">',
                           '<button class="msg-delete" data-index="${i}" title="Delete">'))

print("Done refactoring CSP violations!")
