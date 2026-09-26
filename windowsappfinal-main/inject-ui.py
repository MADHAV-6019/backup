import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Navigation buttons
if 'data-page="rooms"' not in content:
    nav_btns = """
  <div class="nav-sep"></div>
  <button class="nav-btn" data-page="stats">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
    Phantom Stats
  </button>
  <button class="nav-btn" data-page="rooms">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    Rooms
  </button>
  <button class="nav-btn" data-page="settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    Settings
  </button>
  <div class="sidebar-spacer"></div>"""
    content = content.replace('<div class="sidebar-spacer"></div>', nav_btns)

# 2. Add Moods to Home
if 'data-moodtile="hype"' not in content:
    moods = """
  <div class="section-title">Moods</div>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px;">
    <div class="qcard mood-tile" data-moodtile="late-night" style="background:linear-gradient(135deg, rgba(20,20,30,0.8), rgba(10,10,20,0.9)); border:1px solid rgba(255,255,255,0.05); padding:16px; flex-direction:column; align-items:flex-start; transition:all 0.3s; position:relative; overflow:hidden;">
      <div style="font-size:28px; margin-bottom:8px;">😴</div>
      <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Late Night</div>
      <div style="font-size:12px; color:var(--txt3);">Slow & chill</div>
    </div>
    <div class="qcard mood-tile" data-moodtile="hype" style="background:linear-gradient(135deg, rgba(229,57,53,0.1), rgba(10,10,20,0.9)); border:1px solid rgba(255,255,255,0.05); padding:16px; flex-direction:column; align-items:flex-start; transition:all 0.3s;">
      <div style="font-size:28px; margin-bottom:8px;">🔥</div>
      <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Hype</div>
      <div style="font-size:12px; color:var(--txt3);">High energy</div>
    </div>
    <div class="qcard mood-tile" data-moodtile="sad" style="background:linear-gradient(135deg, rgba(30,50,80,0.4), rgba(10,10,20,0.9)); border:1px solid rgba(255,255,255,0.05); padding:16px; flex-direction:column; align-items:flex-start; transition:all 0.3s;">
      <div style="font-size:28px; margin-bottom:8px;">💔</div>
      <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Sad Boi</div>
      <div style="font-size:12px; color:var(--txt3);">Emotional</div>
    </div>
    <div class="qcard mood-tile" data-moodtile="party" style="background:linear-gradient(135deg, rgba(147,51,234,0.3), rgba(10,10,20,0.9)); border:1px solid rgba(255,255,255,0.05); padding:16px; flex-direction:column; align-items:flex-start; transition:all 0.3s;">
      <div style="font-size:28px; margin-bottom:8px;">🎉</div>
      <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Party</div>
      <div style="font-size:12px; color:var(--txt3);">Bangers</div>
    </div>
  </div>
  <div class="section-title">Quick Picks</div>"""
    content = content.replace('<div class="section-title">Quick Picks</div>', moods)

# 3. Add Settings, Stats, Rooms pages
if 'id="page-stats"' not in content:
    pages = """
  <!-- Settings Page -->
  <div class="page" id="page-settings" style="display:none;">
    <div class="lib-header">
      <div>
        <h1 class="page-title" style="margin-bottom:3px; color:#E53935">Settings</h1>
        <p style="font-size:12px;color:var(--txt3)">PhantomBeats Configuration</p>
      </div>
    </div>
    <div style="margin-top:20px; padding:0 24px;">
      <div class="section-title">Playback</div>
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <div style="font-weight:600;">Crossfade</div>
            <div style="font-size:12px; color:var(--txt3); margin-top:2px;">Fade between songs</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span id="crossfade-val-disp" style="font-size:13px; color:var(--txt2);">0s</span>
            <input type="range" id="settings-crossfade" min="0" max="10" step="1" value="0" style="width:120px; accent-color:#E53935;"/>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Page -->
  <div class="page" id="page-stats" style="display:none;">
    <div class="lib-header" style="justify-content:space-between; border-bottom:none;">
      <div>
        <h1 class="page-title" style="margin-bottom:3px; color:#E53935">Phantom Stats</h1>
        <p style="font-size:12px;color:var(--txt3)">Your listening overview</p>
      </div>
      <button class="chip" onclick="downloadStatsCard()" style="background:rgba(229, 57, 53, 0.2); color:#E53935; border-color:#E53935;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save Card</button>
    </div>
    <div id="stats-content" style="display:grid; grid-template-columns:1fr; gap:16px; padding:0 24px;">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px;">
           <div style="font-size:11px; color:var(--txt3); text-transform:uppercase; font-weight:700; margin-bottom:12px;">This Week</div>
           <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
              <img id="stat-top-img" src="" style="width:60px; height:60px; border-radius:50%; background:#1c1c1c; object-fit:cover;" onerror="this.style.display='none'" />
              <div>
                 <div style="font-size:18px; font-weight:700;" id="stat-top-artist">N/A</div>
                 <div style="font-size:12px; color:var(--txt2);" id="stat-top-count">0 plays</div>
              </div>
           </div>
           <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
             <div>
               <div style="font-size:11px; color:var(--txt3);">Time Listened</div>
               <div style="font-size:16px; font-weight:600;" id="stat-total-time">0h 0m</div>
             </div>
             <div>
               <div style="font-size:11px; color:var(--txt3);">Songs Played</div>
               <div style="font-size:16px; font-weight:600;" id="stat-total-songs">0</div>
             </div>
           </div>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; flex-direction:column;">
           <div style="font-size:11px; color:var(--txt3); text-transform:uppercase; font-weight:700; margin-bottom:12px;">Music Personality</div>
           <div style="font-size:32px; margin-bottom:4px;" id="stat-tag-emoji">🎵</div>
           <div style="font-size:24px; font-weight:700; color:#E53935; margin-bottom:4px;" id="stat-tag-name">New Listener</div>
           <div style="font-size:12px; color:var(--txt2);" id="stat-tag-desc">Keep listening to unlock your persona.</div>
           
           <div style="margin-top:auto;">
             <div style="font-size:11px; color:var(--txt3); margin-bottom:6px;">Peak Listening Time</div>
             <div style="font-size:14px; font-weight:500;" id="stat-peak-time">N/A</div>
           </div>
        </div>
      </div>
      <div id="stats-card-capture" style="margin-top:16px; width:340px; background:#1C1C1C; border-radius:12px; border:1px solid #E53935; padding:24px; position:relative; overflow:hidden;">
        <div style="font-weight:700; color:white; font-size:18px; display:flex; align-items:center; gap:8px; margin-bottom:16px;">
           <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#E53935" stroke-width="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
           PHANTOM BEATS
        </div>
        <div style="height:1px; background:rgba(255,255,255,0.1); margin-bottom:16px;"></div>
        
        <div style="font-size:15px; color:white; margin-bottom:8px; display:flex; gap:8px;"><span style="color:#E53935;">🎵</span> <span id="sc-songs">0 songs this week</span></div>
        <div style="font-size:15px; color:white; margin-bottom:8px; display:flex; gap:8px;"><span style="color:#E53935;">⏱</span> <span id="sc-time">0h 0m listened</span></div>
        <div style="font-size:15px; color:white; margin-bottom:8px; display:flex; gap:8px;"><span style="color:#E53935;">🎤</span> <span id="sc-top">Top: N/A</span></div>
        <div style="font-size:15px; color:white; margin-bottom:16px; display:flex; gap:8px;"><span style="color:#E53935;">🎭</span> <span id="sc-tag">New Listener</span></div>
        
        <div style="height:1px; background:rgba(255,255,255,0.1); margin-bottom:16px;"></div>
        <div style="font-size:12px; color:var(--txt3); font-weight:500;">phantombeats.app</div>
        
        <div style="position:absolute; right:-50px; bottom:-50px; width:150px; height:150px; background:#E53935; opacity:0.15; filter:blur(40px); border-radius:50%; pointer-events:none;"></div>
      </div>
    </div>
  </div>

  <!-- Rooms Page -->
  <div class="page" id="page-rooms" style="display:none;">
    <div class="lib-header">
      <div>
        <h1 class="page-title" style="margin-bottom:3px; color:#E53935">Phantom Rooms</h1>
        <p style="font-size:12px;color:var(--txt3)">Listen together with friends in real-time</p>
      </div>
    </div>
    
    <div id="room-actions" style="display:flex; gap:16px; margin-top:20px; padding:0 24px;">
      <div class="qcard" style="flex:1; flex-direction:column; padding:24px; background:rgba(229,57,53,0.1); border-color:#E53935; align-items:center;" onclick="createRoom()">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#E53935" stroke-width="2" style="margin-bottom:12px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <div style="font-weight:700; font-size:18px;">Create Room</div>
        <div style="font-size:12px; color:var(--txt2); margin-top:4px; text-align:center;">Start a synced listening session</div>
      </div>
      <div class="qcard" style="flex:1; flex-direction:column; padding:24px; background:rgba(255,255,255,0.03); align-items:center;">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:12px;"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        <div style="font-weight:700; font-size:18px;">Join Room</div>
        <div style="display:flex; gap:8px; margin-top:12px; width:100%;">
          <input type="text" id="join-room-code" placeholder="PH-XXXX" style="flex:1; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:4px; padding:8px; color:white; font-size:14px; text-align:center; text-transform:uppercase;"/>
          <button class="chip" onclick="joinRoom()" style="background:#E53935; color:white; border-color:#E53935;">Join</button>
        </div>
      </div>
    </div>
  </div>

  <div id="loading-spinner"></div>"""
    content = content.replace('<div id="loading-spinner"></div>', pages)

# 4. Modals and overlays
if 'id="phantom-panel"' not in content:
    modals = """
  <!-- Room Panel -->
  <div id="room-panel" style="position:absolute; top:var(--topbar); bottom:var(--player); right:0; width:340px; background:rgba(10,10,16,.95); backdrop-filter:blur(40px); border-left:1px solid #E53935; z-index:35; transform:translateX(100%); transition:transform .3s var(--ease); display:flex; flex-direction:column;">
    <div style="padding:14px 18px; border-bottom:1px solid rgba(229,57,53,0.3); display:flex; justify-content:space-between; align-items:center; background:rgba(229,57,53,0.1);">
      <div style="font-weight:700; color:#E53935; display:flex; align-items:center; gap:8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
        PHANTOM ROOM <span id="rp-code" style="color:white; margin-left:4px;"></span>
      </div>
      <button class="btn-ctrl" onclick="leaveRoom()" style="margin:0;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    
    <div style="padding:12px 18px; border-bottom:1px solid var(--border);">
      <div style="font-size:11px; font-weight:600; color:var(--txt3); margin-bottom:8px; text-transform:uppercase;">Listeners (<span id="rp-count">1/20</span>)</div>
      <div id="rp-members" style="display:flex; flex-direction:column; gap:6px; max-height:100px; overflow-y:auto;"></div>
    </div>
    
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <div style="padding:12px 18px 4px; font-size:11px; font-weight:600; color:var(--txt3); text-transform:uppercase;">Chat</div>
      <div id="rp-chat-messages" style="flex:1; overflow-y:auto; padding:0 18px; display:flex; flex-direction:column; gap:8px; font-size:13px;"></div>
      <div style="padding:12px 18px; border-top:1px solid var(--border); display:flex; gap:8px;">
        <input type="text" id="rp-chat-input" placeholder="Type a message..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:18px; padding:8px 12px; color:white; font-size:13px; outline:none;" onkeypress="if(event.key==='Enter') sendChat()"/>
        <button class="chip" onclick="sendChat()" style="background:#E53935; color:white; border-color:#E53935; border-radius:50%; width:34px; height:34px; padding:0; display:flex; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </div>
    </div>
  </div>

  <!-- Phantom Mode Panel -->
  <div id="phantom-panel" style="position:absolute; bottom:calc(var(--player) + 10px); right:10px; width:320px; background:rgba(20,20,20,0.98); border:1px solid #E53935; border-radius:12px; padding:20px; display:none; flex-direction:column; z-index:100; box-shadow: 0 10px 40px rgba(0,0,0,0.8); backdrop-filter:blur(20px);">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div style="font-weight:700; color:#E53935; display:flex; align-items:center; gap:8px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
        PHANTOM MODE
      </div>
      <svg style="cursor:pointer; color:var(--txt3)" onclick="togglePhantomMode()" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </div>
    
    <!-- Speed -->
    <div style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; color:var(--txt2);">
        <span>Speed</span> <span id="phantom-speed-val">1.00x</span>
      </div>
      <input type="range" id="phantom-speed" min="0.5" max="2.0" step="0.05" value="1" style="width:100%; margin-bottom:8px; accent-color:#E53935;"/>
      <div style="display:flex; gap:6px;">
        <button class="chip" onclick="setSpeed(0.5)" style="font-size:10px; padding:3px 8px;">Ultra Slow</button>
        <button class="chip" onclick="setSpeed(0.75)" style="font-size:10px; padding:3px 8px;">Slowed</button>
        <button class="chip" onclick="setSpeed(1.0)" style="font-size:10px; padding:3px 8px;">Normal</button>
        <button class="chip" onclick="setSpeed(1.25)" style="font-size:10px; padding:3px 8px;">Fast</button>
      </div>
    </div>
    
    <!-- Pitch -->
    <div style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; color:var(--txt2);">
        <span>Pitch</span> <span id="phantom-pitch-val">0</span>
      </div>
      <input type="range" id="phantom-pitch" min="-6" max="6" step="1" value="0" style="width:100%; accent-color:#E53935;"/>
    </div>
    
    <!-- Bass -->
    <div style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; color:var(--txt2);">
        <span>Bass</span> <span id="phantom-bass-val">0%</span>
      </div>
      <input type="range" id="phantom-bass" min="0" max="100" step="1" value="0" style="width:100%; accent-color:#E53935;"/>
    </div>
    
    <!-- Presets -->
    <div>
      <div style="font-size:12px; margin-bottom:6px; color:var(--txt2);">Presets</div>
      <div id="phantom-presets" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;"></div>
      <div style="display:flex; gap:6px;">
        <input type="text" id="phantom-preset-name" placeholder="Preset name" style="flex:1; background:rgba(0,0,0,0.5); border:1px solid var(--border); border-radius:4px; padding:4px 8px; color:white; font-size:12px;"/>
        <button class="chip" onclick="savePhantomPreset()" style="font-size:10px; padding:3px 8px; background:rgba(229, 57, 53, 0.2); color:#E53935; border-color:#E53935;">+ Save</button>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="sleep-modal" onclick="if(event.target===this)closeModal('sleep-modal')">
    <div class="modal">
      <svg class="modal-close" onclick="closeModal('sleep-modal')" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
      <h2 style="font-style:normal;">🌙 Sleep Timer</h2>
      <p>Stop playing music after a set time.</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="setSleepTimer(5)">5 min</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="setSleepTimer(10)">10 min</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="setSleepTimer(15)">15 min</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="setSleepTimer(30)">30 min</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="setSleepTimer(45)">45 min</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="setSleepTimer(60)">60 min</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white; grid-column:span 2;" onclick="setSleepTimer('end')">End of song</button>
      </div>
      <button class="modal-btn" id="sleep-cancel-btn" style="background:#E53935; display:none;" onclick="cancelSleepTimer()">Cancel Timer</button>
    </div>
  </div>

  <div class="modal-overlay" id="room-modal" onclick="if(event.target===this)closeModal('room-modal')">
    <div class="modal" style="text-align:center;">
      <svg class="modal-close" onclick="closeModal('room-modal')" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/><line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/></svg>
      <div style="font-weight:700; color:#E53935; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:16px;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
        Your Phantom Room
      </div>
      <div id="room-modal-code" style="font-size:36px; font-weight:700; letter-spacing:4px; margin-bottom:4px; cursor:pointer;" onclick="navigator.clipboard.writeText(this.innerText); alert('Copied!');">PH-XXXX</div>
      <div style="font-size:12px; color:var(--txt3); margin-bottom:24px;">(tap to copy)</div>
      
      <p>Share this code with friends</p>
      <p style="font-size:11px;">Room limit: 20 people</p>
      
      <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border); text-align:left;">
        <div id="room-host-name" style="font-weight:600; color:var(--v); display:flex; align-items:center; gap:8px;">👑 <span id="rhn">Host</span> 🎵</div>
      </div>
      
      <div style="display:flex; gap:12px; margin-top:16px;">
        <button class="modal-btn" onclick="navigator.clipboard.writeText(document.getElementById('room-modal-code').innerText); alert('Copied!');">Copy Code</button>
        <button class="modal-btn" style="background:rgba(255,255,255,0.05); color:white;" onclick="closeModal('room-modal')">Close</button>
      </div>
    </div>
  </div>
  <div id="queue-panel">"""
    content = content.replace('<div id="queue-panel">', modals)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("DOM Elements injected")
