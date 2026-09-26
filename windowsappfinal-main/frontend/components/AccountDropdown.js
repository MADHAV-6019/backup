import { icons } from '../utils/helpers.js';
import { signOut, getUser, getUserProfile, updateUserProfile, isSupabaseConfigured } from '../services/supabaseClient.js';
import { showToast } from '../utils/animations.js';
import gsap from 'gsap';



let _dropdownOpen = false;

export function renderAccountDropdown(container, { authState, onSignIn, onSignOut }) {
  const isLoggedIn = authState?.user;
  const displayName = authState?.profile?.display_name || authState?.user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const email = authState?.user?.email || '';

  if (!isLoggedIn) {
    container.innerHTML = `
      <button class="auth-signin-btn" id="signin-btn" title="Sign In">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>Sign In</span>
      </button>
    `;

    container.querySelector('#signin-btn')?.addEventListener('click', () => {
      if (onSignIn) onSignIn();
    });
    return;
  }
  container.innerHTML = `
    <div class="account-container" id="account-container">
      <button class="account-avatar-btn" id="account-avatar-btn" title="${displayName}">
        <span class="account-initial">${initial}</span>
      </button>
      <div class="account-dropdown hidden" id="account-dropdown">
        <div class="account-dropdown-header">
          <div class="account-dropdown-avatar">${initial}</div>
          <div class="account-dropdown-info">
            <div class="account-dropdown-name" id="account-display-name">${displayName}</div>
            <div class="account-dropdown-email">${email}</div>
          </div>
        </div>
        <div class="account-dropdown-divider"></div>
        <div class="account-dropdown-item" id="account-edit-profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>Edit Profile</span>
        </div>
        <div class="account-dropdown-divider"></div>
        <div class="account-dropdown-item account-dropdown-signout" id="account-signout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Sign Out</span>
        </div>
      </div>
    </div>

    
    <div class="edit-profile-overlay hidden" id="edit-profile-overlay">
      <div class="edit-profile-card">
        <h3>Edit Profile</h3>
        <div class="auth-input-group">
          <label class="auth-label" for="edit-display-name">Display Name</label>
          <input type="text" id="edit-display-name" class="auth-input" value="${displayName}" maxlength="40" />
        </div>
        <div class="edit-profile-actions">
          <button class="auth-btn auth-btn-ghost" id="edit-profile-cancel">Cancel</button>
          <button class="auth-btn auth-btn-primary" id="edit-profile-save">Save</button>
        </div>
      </div>
    </div>
  `;

  const avatarBtn = container.querySelector('#account-avatar-btn');
  const dropdown = container.querySelector('#account-dropdown');
  const editOverlay = container.querySelector('#edit-profile-overlay');
  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    _dropdownOpen = !_dropdownOpen;
    if (_dropdownOpen) {
      dropdown.classList.remove('hidden');
      gsap.from(dropdown, { y: -10, opacity: 0, scale: 0.95, duration: 0.2, ease: 'back.out(2)' });
    } else {
      _closeDropdown(dropdown);
    }
  });
  document.addEventListener('click', (e) => {
    if (!container.querySelector('#account-container')?.contains(e.target)) {
      if (_dropdownOpen) {
        _closeDropdown(dropdown);
        _dropdownOpen = false;
      }
    }
  });
  container.querySelector('#account-edit-profile')?.addEventListener('click', () => {
    _closeDropdown(dropdown);
    _dropdownOpen = false;
    editOverlay.classList.remove('hidden');
    gsap.from(editOverlay.querySelector('.edit-profile-card'), {
      y: 20, opacity: 0, scale: 0.95, duration: 0.3, ease: 'back.out(1.5)'
    });
  });

  container.querySelector('#edit-profile-cancel')?.addEventListener('click', () => {
    editOverlay.classList.add('hidden');
  });

  container.querySelector('#edit-profile-save')?.addEventListener('click', async () => {
    const newName = container.querySelector('#edit-display-name').value.trim();
    if (!newName) return;

    try {
      if (authState?.user?.id) {
        await updateUserProfile(authState.user.id, { display_name: newName });
      }
      if (authState.profile) authState.profile.display_name = newName;
      container.querySelector('#account-display-name').textContent = newName;
      container.querySelector('.account-initial').textContent = newName.charAt(0).toUpperCase();
      container.querySelector('.account-dropdown-avatar').textContent = newName.charAt(0).toUpperCase();
      editOverlay.classList.add('hidden');
      
      const greetingEl = document.querySelector('.home-greeting');
      if (greetingEl) {
        const capsName = newName.charAt(0).toUpperCase() + newName.slice(1);
        greetingEl.textContent = `Welcome back, ${capsName}`;
      }

      const toastContainer = document.getElementById('toast-container');
      if (toastContainer) showToast(toastContainer, 'Profile updated!');
    } catch (err) {
      console.error('Profile update failed:', err);
    }
  });
  container.querySelector('#account-signout')?.addEventListener('click', async () => {
    _closeDropdown(dropdown);
    _dropdownOpen = false;
    try {
      await signOut();
    } catch (e) {  }
    if (onSignOut) onSignOut();
  });
}

function _closeDropdown(dropdown) {
  gsap.to(dropdown, {
    y: -10, opacity: 0, scale: 0.95, duration: 0.15, ease: 'power2.in',
    onComplete: () => dropdown.classList.add('hidden')
  });
}
