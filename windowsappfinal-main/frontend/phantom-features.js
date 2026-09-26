// frontend/phantom-features.js

// ══════════════════════════════════════════════════════════════════════════════
// Phantom Mode
// ══════════════════════════════════════════════════════════════════════════════

window.togglePhantomMode = function() {
  const panel = document.getElementById('phantom-panel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  if (panel.style.display === 'flex') {
    loadPhantomPresets();
    if (Tone.context.state !== 'running') {
      Tone.context.resume();
    }
  }
};

function updateRangeFill(el) {
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 100;
  const val = parseFloat(el.value);
  const percent = ((val - min) / (max - min)) * 100;
  el.style.background = `linear-gradient(to right, #9333EA ${percent}%, #333 ${percent}%)`;
}

window.setSpeed = function(val) {
  val = parseFloat(val);
  const el = document.getElementById('phantom-speed');
  if(el) { el.value = val; updateRangeFill(el); }
  document.getElementById('phantom-speed-val').textContent = val.toFixed(2) + 'x';
  if (window.audio) {
    window.audio.playbackRate = val;
  }
};

window.resetPhantom = function() {
  window.setSpeed(1);
  const pPitch = document.getElementById('phantom-pitch');
  if(pPitch) { pPitch.value = 0; pPitch.dispatchEvent(new Event('input')); }
  const pBass = document.getElementById('phantom-bass');
  if(pBass) { pBass.value = 0; pBass.dispatchEvent(new Event('input')); }
};

// Listeners
setTimeout(() => {
  const pSpeed = document.getElementById('phantom-speed');
  if(pSpeed) {
    pSpeed.addEventListener('input', (e) => setSpeed(e.target.value));
    updateRangeFill(pSpeed);
  }

  const pPitch = document.getElementById('phantom-pitch');
  if(pPitch) {
    pPitch.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      updateRangeFill(e.target);
      document.getElementById('phantom-pitch-val').textContent = val > 0 ? '+' + val : val;
      if (window.pitchShifter) {
        window.pitchShifter.pitch = val;
        window.pitchShifter.wet.value = val === 0 ? 0 : 1;
      }
    });
    updateRangeFill(pPitch);
  }

  const pBass = document.getElementById('phantom-bass');
  if(pBass) {
    pBass.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      updateRangeFill(e.target);
      document.getElementById('phantom-bass-val').textContent = val + '%';
      if (window.bassFilter) window.bassFilter.gain.value = (val / 100) * 15;
    });
    updateRangeFill(pBass);
  }
}, 500);

window.savePhantomPreset = function() {
  const nameInput = document.getElementById('phantom-preset-name');
  const name = nameInput.value.trim() || 'Preset ' + Math.floor(Math.random()*1000);
  const presets = JSON.parse(localStorage.getItem('phantom_presets') || '[]');
  
  presets.push({
    name,
    speed: parseFloat(document.getElementById('phantom-speed').value),
    pitch: parseFloat(document.getElementById('phantom-pitch').value),
    bass: parseFloat(document.getElementById('phantom-bass').value)
  });
  
  localStorage.setItem('phantom_presets', JSON.stringify(presets));
  nameInput.value = '';
  loadPhantomPresets();
};

window.loadPhantomPresets = function() {
  const presets = JSON.parse(localStorage.getItem('phantom_presets') || '[]');
  const container = document.getElementById('phantom-presets');
  if(!container) return;
  container.innerHTML = '';
  if (presets.length === 0) {
    container.innerHTML = '<span style="font-size:11px; color:var(--txt3)">No presets saved.</span>';
    return;
  }
  
  presets.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.style.fontSize = '10px';
    btn.style.padding = '3px 8px';
    btn.textContent = p.name;
    btn.onclick = () => {
      setSpeed(p.speed);
      document.getElementById('phantom-pitch').value = p.pitch;
      document.getElementById('phantom-pitch').dispatchEvent(new Event('input'));
      document.getElementById('phantom-bass').value = p.bass;
      document.getElementById('phantom-bass').dispatchEvent(new Event('input'));
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      presets.splice(idx, 1);
      localStorage.setItem('phantom_presets', JSON.stringify(presets));
      loadPhantomPresets();
    };
    container.appendChild(btn);
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// Sleep Timer
// ══════════════════════════════════════════════════════════════════════════════

let sleepTimerInterval = null;
let sleepTargetTime = 0;
let sleepEndMode = false;
let sleepFadeInterval = null;

window.setSleepTimer = function(val) {
  closeModal('sleep-modal');
  clearInterval(sleepTimerInterval);
  clearInterval(sleepFadeInterval);
  
  const disp = document.getElementById('sleep-display');
  document.getElementById('sleep-cancel-btn').style.display = 'block';
  
  if (val === 'end') {
    sleepEndMode = true;
    disp.textContent = '😴 Ends after song';
    disp.style.display = 'block';
  } else {
    sleepEndMode = false;
    sleepTargetTime = Date.now() + (val * 60 * 1000);
    
    sleepTimerInterval = setInterval(() => {
      const left = sleepTargetTime - Date.now();
      if (left <= 30000 && !sleepFadeInterval) {
        startSleepFade();
      }
      if (left <= 0) {
        clearInterval(sleepTimerInterval);
        disp.style.display = 'none';
        window.audio.pause();
      } else {
        const m = Math.floor(left / 60000);
        const s = Math.floor((left % 60000) / 1000);
        disp.textContent = `😴 ${m}:${s.toString().padStart(2, '0')}`;
        disp.style.display = 'block';
      }
    }, 1000);
  }
};

function startSleepFade() {
  const steps = 300; 
  let step = 0;
  const startVol = window.audio.volume;
  
  sleepFadeInterval = setInterval(() => {
    step++;
    const newVol = Math.max(0, startVol * (1 - (step / steps)));
    window.audio.volume = newVol;
    if (step >= steps) {
      clearInterval(sleepFadeInterval);
      window.audio.pause();
      window.audio.volume = startVol; 
    }
  }, 100);
}

window.cancelSleepTimer = function() {
  clearInterval(sleepTimerInterval);
  clearInterval(sleepFadeInterval);
  sleepEndMode = false;
  document.getElementById('sleep-display').style.display = 'none';
  document.getElementById('sleep-cancel-btn').style.display = 'none';
  window.audio.volume = window.state ? (window.state.isMuted ? 0 : window.state.volume) : 0.8;
  closeModal('sleep-modal');
};

setTimeout(() => {
  if (window.audioRaw1) window.audioRaw1.addEventListener('ended', () => { if(sleepEndMode) cancelSleepTimer(); });
  if (window.audioRaw2) window.audioRaw2.addEventListener('ended', () => { if(sleepEndMode) cancelSleepTimer(); });
}, 500);


// ══════════════════════════════════════════════════════════════════════════════
// Phantom Stats
// ══════════════════════════════════════════════════════════════════════════════

function trackStatListener() {
  const state = window.state;
  if (!state || !state.currentTrack) return;
  const stats = JSON.parse(localStorage.getItem('phantom_stats') || '{"history":[]}');
  
  // check if we just added this
  const last = stats.history[stats.history.length-1];
  if (last && last.id === state.currentTrack.id && Date.now() - last.timestamp < 10000) return;

  stats.history.push({
    id: state.currentTrack.id,
    title: state.currentTrack.title,
    artist: state.currentTrack.artist,
    image: state.currentTrack.image,
    timestamp: Date.now()
  });
  
  if (stats.history.length > 1000) stats.history = stats.history.slice(stats.history.length - 1000);
  localStorage.setItem('phantom_stats', JSON.stringify(stats));
}

setTimeout(() => {
  if (window.audioRaw1) window.audioRaw1.addEventListener('play', () => { if(window.activePlayer===window.audioRaw1) trackStatListener(); });
  if (window.audioRaw2) window.audioRaw2.addEventListener('play', () => { if(window.activePlayer===window.audioRaw2) trackStatListener(); });
}, 500);

window.renderStatsPage = function() {
  const stats = JSON.parse(localStorage.getItem('phantom_stats') || '{"history":[]}');
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const weekHistory = stats.history.filter(h => h.timestamp > weekAgo);
  const totalSongs = weekHistory.length;
  const totalMins = totalSongs * 3;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  
  const elTotalTime = document.getElementById('stat-total-time');
  if(elTotalTime) elTotalTime.textContent = `${h}h ${m}m`;
  const elTotalSongs = document.getElementById('stat-total-songs');
  if(elTotalSongs) elTotalSongs.textContent = totalSongs;
  
  const artists = {};
  weekHistory.forEach(s => {
    artists[s.artist] = (artists[s.artist] || 0) + 1;
  });
  
  let topArtist = 'N/A';
  let topCount = 0;
  let topImage = '';
  
  for (const [art, count] of Object.entries(artists)) {
    if (count > topCount) {
      topCount = count;
      topArtist = art;
      const song = weekHistory.find(s => s.artist === art);
      topImage = song ? song.image : '';
    }
  }
  
  const elTopArtist = document.getElementById('stat-top-artist');
  if(elTopArtist) elTopArtist.textContent = topArtist;
  const elTopCount = document.getElementById('stat-top-count');
  if(elTopCount) elTopCount.textContent = topCount + ' plays';
  const elTopImg = document.getElementById('stat-top-img');
  if(elTopImg) {
    if (topImage) {
      elTopImg.src = topImage;
      elTopImg.style.display = 'block';
    } else {
      elTopImg.style.display = 'none';
    }
  }
  
  let tag = 'New Listener';
  let emoji = '🎵';
  if (totalSongs > 100) { tag = 'Phantom Addict'; emoji = '👻'; }
  else if (totalSongs > 50) { tag = 'Vibe Catcher'; emoji = '✨'; }
  else if (totalSongs > 10) { tag = 'Casual Groover'; emoji = '🎧'; }
  
  const elTagName = document.getElementById('stat-tag-name');
  if(elTagName) elTagName.textContent = tag;
  const elTagEmoji = document.getElementById('stat-tag-emoji');
  if(elTagEmoji) elTagEmoji.textContent = emoji;
  
  const elScSongs = document.getElementById('sc-songs');
  if(elScSongs) elScSongs.textContent = `${totalSongs} songs this week`;
  const elScTime = document.getElementById('sc-time');
  if(elScTime) elScTime.textContent = `${h}h ${m}m listened`;
  const elScTop = document.getElementById('sc-top');
  if(elScTop) elScTop.textContent = `Top: ${topArtist}`;
  const elScTag = document.getElementById('sc-tag');
  if(elScTag) elScTag.textContent = tag;
};

window.downloadStatsCard = function() {
  const card = document.getElementById('stats-card-capture');
  if (window.html2canvas) {
    window.html2canvas(card, { backgroundColor: '#1C1C1C', scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'PhantomStats.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Mood Queue
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('click', e => {
  const moodTile = e.target.closest('.mood-tile');
  if (moodTile) {
    const mood = moodTile.dataset.moodtile;
    generateMoodQueue(mood);
  }
});

async function generateMoodQueue(mood) {
  let query = 'lofi chill';
  if (mood === 'hype') query = 'phonk workout';
  if (mood === 'sad') query = 'sad songs emotional';
  if (mood === 'party') query = 'party bangers dance';
  
  try {
    const res = await fetch('/api/search?q=' + encodeURIComponent(query));
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      if(window.playTrack) window.playTrack(data.results[0], data.results, 0);
    }
  } catch(e) { console.error(e); }
}

// ══════════════════════════════════════════════════════════════════════════════
// Phantom Rooms (WebSockets)
// ══════════════════════════════════════════════════════════════════════════════

let roomWs = null;
let currentRoomId = null;

window.toggleRoomPanel = function() {
  const panel = document.getElementById('room-panel');
  if (panel.style.transform === 'translateX(0px)') {
    panel.style.transform = 'translateX(100%)';
  } else {
    panel.style.transform = 'translateX(0px)';
  }
};

window.createRoom = function() {
  connectRoom('CREATE');
};

window.joinRoom = function() {
  const code = document.getElementById('join-room-code').value.trim();
  if (!code) return;
  connectRoom('JOIN', code);
};

function connectRoom(action, code = null) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;
  roomWs = new WebSocket(wsUrl);
  
  roomWs.onopen = () => {
    if (action === 'CREATE') {
      roomWs.send(JSON.stringify({ type: 'create_room' }));
    } else {
      roomWs.send(JSON.stringify({ type: 'join_room', roomId: code }));
    }
  };
  
  roomWs.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    
    if (data.type === 'room_created' || data.type === 'room_joined') {
      currentRoomId = data.roomId;
      document.getElementById('rp-code').textContent = currentRoomId;
      document.getElementById('room-btn').style.display = 'flex';
      
      const panel = document.getElementById('room-panel');
      if(panel.style.transform !== 'translateX(0px)') toggleRoomPanel();
      
      if (action === 'CREATE') {
        document.getElementById('room-modal-code').textContent = currentRoomId;
        openModal('room-modal');
      }
    }
    
    if (data.type === 'room_state') {
      document.getElementById('rp-count').textContent = `${data.users.length}/20`;
      document.getElementById('rp-members').innerHTML = data.users.map(u => 
        `<div style="font-size:12px; display:flex; align-items:center; gap:6px;">
          <div style="width:8px; height:8px; border-radius:50%; background:#E53935;"></div>
          User ${u.id.substring(0,4)} ${u.isHost ? '(Host)' : ''}
         </div>`
      ).join('');
    }
    
    if (data.type === 'chat') {
      const chatList = document.getElementById('rp-chat-messages');
      chatList.innerHTML += `<div style="color:var(--txt2)"><strong style="color:var(--v)">${data.sender}:</strong> ${data.message}</div>`;
      chatList.scrollTop = chatList.scrollHeight;
    }
    
    if (data.type === 'sync_play') {
      if (window.state && window.state.currentTrack?.id !== data.track.id) {
         if(window.playTrack) window.playTrack(data.track, [data.track], 0);
      }
      if(window.audio) window.audio.currentTime = data.time;
    }
    
    if (data.type === 'error') {
      alert(data.message);
    }
  };
}

window.leaveRoom = function() {
  if (roomWs) {
    roomWs.close();
    roomWs = null;
    currentRoomId = null;
    document.getElementById('room-btn').style.display = 'none';
    const panel = document.getElementById('room-panel');
    if(panel.style.transform === 'translateX(0px)') toggleRoomPanel();
  }
};

window.sendChat = function() {
  const input = document.getElementById('rp-chat-input');
  const txt = input.value.trim();
  if (txt && roomWs) {
    roomWs.send(JSON.stringify({ type: 'chat', message: txt }));
    input.value = '';
  }
};

setInterval(() => {
  if (roomWs && currentRoomId && window.state?.currentTrack && window.audio) {
    roomWs.send(JSON.stringify({
      type: 'sync_play',
      track: window.state.currentTrack,
      time: window.audio.currentTime
    }));
  }
}, 5000);

// Crossfade Slider Logic
window.isCrossfading = false;
window.cfFadeInterval = null;
window.crossfadeDuration = parseInt(localStorage.getItem('crossfadeDuration')) || 0;

setTimeout(() => {
  const sf = document.getElementById('settings-crossfade');
  const svd = document.getElementById('crossfade-val-disp');
  if (sf && svd) {
    sf.value = window.crossfadeDuration;
    svd.textContent = window.crossfadeDuration + 's';
    sf.addEventListener('input', (e) => {
      window.crossfadeDuration = parseInt(e.target.value);
      svd.textContent = window.crossfadeDuration + 's';
      localStorage.setItem('crossfadeDuration', window.crossfadeDuration);
    });
  }
}, 500);

// Crossfade Audio Logic
setTimeout(() => {
  if(window.audioRaw1) window.audioRaw1.addEventListener('timeupdate', handleCrossfadeTick);
  if(window.audioRaw2) window.audioRaw2.addEventListener('timeupdate', handleCrossfadeTick);
}, 500);

function handleCrossfadeTick(e) {
  if (e.target !== window.activePlayer || window.isCrossfading) return;
  const state = window.state;
  if (!state || window.crossfadeDuration === 0 || !window.activePlayer.duration || state.queue.length <= 1) return;
  
  const timeLeft = window.activePlayer.duration - window.activePlayer.currentTime;
  if (timeLeft <= window.crossfadeDuration && timeLeft > 0) {
    startCrossfade();
  }
}

function startCrossfade() {
  window.isCrossfading = true;
  const state = window.state;
  
  let ni;
  if (state.repeatMode === 'one') ni = state.queueIndex;
  else if (state.isShuffled) ni = Math.floor(Math.random() * state.queue.length);
  else ni = (state.queueIndex + 1) % state.queue.length;
  
  const nextTrack = state.queue[ni];
  
  window.inactivePlayer.src = '/api/songs/' + nextTrack.id + '/stream';
  window.inactivePlayer.volume = 0;
  window.inactivePlayer.playbackRate = window.activePlayer.playbackRate;
  window.inactivePlayer.play().catch(console.error);
  
  const steps = window.crossfadeDuration * 10;
  let step = 0;
  const targetVol = state.isMuted ? 0 : state.volume;
  
  window.cfFadeInterval = setInterval(() => {
    step++;
    window.activePlayer.volume = Math.max(0, targetVol * (1 - (step / steps)));
    window.inactivePlayer.volume = Math.min(targetVol, targetVol * (step / steps));
    
    if (step >= steps) {
      clearInterval(window.cfFadeInterval);
      window.activePlayer.pause();
      window.activePlayer.volume = targetVol;
      
      // Swap players
      const temp = window.activePlayer;
      window.activePlayer = window.inactivePlayer;
      window.inactivePlayer = temp;
      
      window.isCrossfading = false;
      
      // Update UI
      state.currentTrack = nextTrack;
      state.queueIndex = ni;
      
      document.getElementById('now-title').textContent = nextTrack.title;
      document.getElementById('now-artist').textContent = nextTrack.artist;
      const src = nextTrack.image || `https://i.ytimg.com/vi/${nextTrack.id}/hqdefault.jpg`;
      document.getElementById('now-art-img').src = src;
      
      const qitems = document.querySelectorAll('.queue-item');
      qitems.forEach(el => el.classList.remove('active'));
      const newActive = document.querySelector(`.queue-item[onclick*="${ni}"]`);
      if(newActive) newActive.classList.add('active');
    }
  }, 100);
}
window.initRealVisualizer = function() {
  if (window.audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioCtx = window.Tone ? Tone.context.rawContext || new AudioContext() : new AudioContext();
    if(window.Tone) Tone.setContext(window.audioCtx);
    window.analyser = window.audioCtx.createAnalyser();
    
    const source1 = window.audioCtx.createMediaElementSource(window.audioRaw1);
    const source2 = window.audioCtx.createMediaElementSource(window.audioRaw2);
    
    window.bassFilter = window.audioCtx.createBiquadFilter();
    window.bassFilter.type = 'lowshelf';
    window.bassFilter.frequency.value = 200;
    window.bassFilter.gain.value = 0;
    
    if (window.Tone && Tone.PitchShift) {
      try {
        window.pitchShifter = new Tone.PitchShift(0);
        window.pitchShifter.wet.value = 0; // Bypassed at 0 pitch
        source1.connect(window.bassFilter);
        source2.connect(window.bassFilter);
        Tone.connect(window.bassFilter, window.pitchShifter);
        Tone.connect(window.pitchShifter, window.analyser);
      } catch(err) {
        console.error("PitchShift failed, falling back to bass filter only", err);
        source1.connect(window.bassFilter);
        source2.connect(window.bassFilter);
        window.bassFilter.connect(window.analyser);
      }
    } else {
      source1.connect(window.bassFilter);
      source2.connect(window.bassFilter);
      window.bassFilter.connect(window.analyser);
    }
    
    window.analyser.connect(window.audioCtx.destination);
    window.analyser.fftSize = 256;
    window.dataArray = new Uint8Array(window.analyser.frequencyBinCount);
  } catch (e) { console.error('AudioContext init failed', e); }
};
