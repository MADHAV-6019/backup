import { signUpEmailPassword, signInEmailPassword, verifyOTP, isSupabaseConfigured } from '../services/supabaseClient.js';
import { icons } from '../utils/helpers.js';
import gsap from 'gsap';



let _onAuthSuccess = null;
let _onGuestMode = null;
let _isSignUpMode = false;

export function renderAuthModal(container, { onAuthSuccess, onGuestMode }) {
  _onAuthSuccess = onAuthSuccess;
  _onGuestMode = onGuestMode;
  _isSignUpMode = false; 

  container.innerHTML = `
    <div class="auth-backdrop" id="auth-backdrop">
      <div class="auth-particles" id="auth-particles"></div>
      <div class="auth-card" id="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">🎵</div>
          <h1 class="auth-logo-text">MelodyFlow</h1>
          <p class="auth-logo-tagline">Your music, your way</p>
        </div>

        
        <div class="auth-step" id="auth-step-email">
          <h2 class="auth-step-title" id="auth-main-title">Sign in to continue</h2>
          <p class="auth-step-desc" id="auth-main-desc">Welcome back to MelodyFlow</p>
          
          <div class="auth-input-group hidden" id="auth-name-group">
            <label class="auth-label" for="auth-name">Display Name</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">👤</span>
              <input type="text" id="auth-name" class="auth-input" placeholder="Your Name" autocomplete="name" />
            </div>
          </div>
          
          <div class="auth-input-group">
            <label class="auth-label" for="auth-email">Email address</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">${icons.music}</span>
              <input type="email" id="auth-email" class="auth-input" placeholder="you@example.com" autocomplete="email" />
            </div>
          </div>

          <div class="auth-input-group">
            <label class="auth-label" for="auth-password">Password</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">🔒</span>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" autocomplete="current-password" />
            </div>
          </div>

          <button class="auth-btn auth-btn-primary" id="auth-submit-btn">
            <span class="auth-btn-text" id="auth-submit-text">Sign In</span>
            <span class="auth-btn-loader hidden" id="auth-submit-loader">
              <span class="auth-spinner"></span>
            </span>
          </button>
          
          <div class="auth-toggle-mode">
            <span id="auth-toggle-text">Don't have an account?</span> 
            <button id="auth-toggle-btn" class="auth-text-link">Sign Up</button>
          </div>

          <div class="auth-error hidden" id="auth-main-error"></div>
          
          <div class="auth-divider">
            <span>or</span>
          </div>
          <button class="auth-btn auth-btn-ghost" id="auth-guest-btn">
            Continue as Guest
          </button>
          <p class="auth-guest-note">Guest data is saved locally and won't sync across devices</p>
        </div>

        
        <div class="auth-step hidden" id="auth-step-otp">
          <button class="auth-back-btn" id="auth-back-btn">
            ${icons.chevronLeft} <span>Back</span>
          </button>
          <h2 class="auth-step-title">Check your email</h2>
          <p class="auth-step-desc" id="auth-otp-desc">Enter the 6-digit code sent to your email to verify your account.</p>
          <div class="auth-otp-inputs" id="auth-otp-inputs">
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="0" inputmode="numeric" autocomplete="one-time-code" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="1" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="2" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="3" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="4" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="5" inputmode="numeric" />
          </div>
          <button class="auth-btn auth-btn-primary" id="auth-verify-otp">
            <span class="auth-btn-text">Verify Account</span>
            <span class="auth-btn-loader hidden" id="auth-verify-loader">
              <span class="auth-spinner"></span>
            </span>
          </button>
          <div class="auth-error hidden" id="auth-otp-error"></div>
        </div>
      </div>
    </div>
  `;

  _initParticles(container.querySelector('#auth-particles'));
  _bindMainStep(container);
  _bindOTPStep(container);
  _animateIn(container);
}

export function hideAuthModal(container) {
  const backdrop = container.querySelector('#auth-backdrop');
  if (!backdrop) return;
  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: () => {
      container.innerHTML = '';
    },
  });
}

function _animateIn(container) {
  const backdrop = container.querySelector('#auth-backdrop');
  const card = container.querySelector('#auth-card');
  gsap.set(backdrop, { opacity: 0 });
  gsap.set(card, { y: 40, scale: 0.95, opacity: 0 });
  gsap.to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  gsap.to(card, { y: 0, scale: 1, opacity: 1, duration: 0.6, delay: 0.15, ease: 'back.out(1.2)' });
}

function _initParticles(particlesEl) {
  if (!particlesEl) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'auth-particle';
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.width = p.style.height = `${2 + Math.random() * 4}px`;
    p.style.animationDelay = `${Math.random() * 6}s`;
    p.style.animationDuration = `${4 + Math.random() * 6}s`;
    particlesEl.appendChild(p);
  }
}

let _currentEmail = '';

function _bindMainStep(container) {
  const nameGroup = container.querySelector('#auth-name-group');
  const nameInput = container.querySelector('#auth-name');
  const emailInput = container.querySelector('#auth-email');
  const passwordInput = container.querySelector('#auth-password');
  const submitBtn = container.querySelector('#auth-submit-btn');
  const guestBtn = container.querySelector('#auth-guest-btn');
  const toggleBtn = container.querySelector('#auth-toggle-btn');
  const toggleText = container.querySelector('#auth-toggle-text');
  const titleEl = container.querySelector('#auth-main-title');
  const descEl = container.querySelector('#auth-main-desc');
  const errorEl = container.querySelector('#auth-main-error');
  const loader = container.querySelector('#auth-submit-loader');
  const btnText = container.querySelector('#auth-submit-text');

  toggleBtn.addEventListener('click', () => {
    _isSignUpMode = !_isSignUpMode;
    if (_isSignUpMode) {
      titleEl.textContent = 'Create an account';
      descEl.textContent = 'Join MelodyFlow to sync your music anywhere';
      btnText.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign In';
      nameGroup.classList.remove('hidden');
    } else {
      titleEl.textContent = 'Sign in to continue';
      descEl.textContent = 'Welcome back to MelodyFlow';
      btnText.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Sign Up';
      nameGroup.classList.add('hidden');
    }
    errorEl.classList.add('hidden');
  });

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !email.includes('@')) {
      _showError(errorEl, 'Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      _showError(errorEl, 'Password must be at least 6 characters');
      return;
    }

    if (!isSupabaseConfigured()) {
      _showError(errorEl, 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      return;
    }

    _currentEmail = email;
    _showLoading(submitBtn, btnText, loader);

    try {
      if (_isSignUpMode) {
        const displayName = nameInput.value.trim();
        const result = await signUpEmailPassword(email, password, displayName);
        _hideLoading(submitBtn, btnText, loader);
        if (result.session) {
          if (_onAuthSuccess) _onAuthSuccess(result);
          hideAuthModal(container);
        } else {
          _switchToOTP(container, email);
        }
      } else {
        const result = await signInEmailPassword(email, password);
        _hideLoading(submitBtn, btnText, loader);
        if (_onAuthSuccess) _onAuthSuccess(result);
        hideAuthModal(container);
      }
    } catch (err) {
      _hideLoading(submitBtn, btnText, loader);
      _showError(errorEl, err.message || 'Authentication failed. Please try again.');
    }
  });

  const enterHandler = (e) => {
    if (e.key === 'Enter') submitBtn.click();
  };
  emailInput.addEventListener('keydown', enterHandler);
  passwordInput.addEventListener('keydown', enterHandler);

  guestBtn.addEventListener('click', () => {
    if (_onGuestMode) _onGuestMode();
    hideAuthModal(container);
  });
}

function _switchToOTP(container, email) {
  const stepMain = container.querySelector('#auth-step-email');
  const stepOTP = container.querySelector('#auth-step-otp');
  const otpDesc = container.querySelector('#auth-otp-desc');

  otpDesc.textContent = `Enter the 6-digit code sent to ${email} to verify your account.`;

  gsap.to(stepMain, {
    x: -30, opacity: 0, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      stepMain.classList.add('hidden');
      stepOTP.classList.remove('hidden');
      gsap.set(stepOTP, { x: 30, opacity: 0 });
      gsap.to(stepOTP, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      const firstDigit = container.querySelector('.auth-otp-digit[data-index="0"]');
      if (firstDigit) firstDigit.focus();
    }
  });
}

function _bindOTPStep(container) {
  const digits = container.querySelectorAll('.auth-otp-digit');
  const verifyBtn = container.querySelector('#auth-verify-otp');
  const backBtn = container.querySelector('#auth-back-btn');
  const errorEl = container.querySelector('#auth-otp-error');
  const loader = container.querySelector('#auth-verify-loader');
  const btnText = verifyBtn.querySelector('.auth-btn-text');
  digits.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && i < 5) {
        digits[i + 1].focus();
      }
      if (i === 5 && val) {
        const code = Array.from(digits).map(d => d.value).join('');
        if (code.length === 6) verifyBtn.click();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) {
        digits[i - 1].focus();
      }
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      paste.split('').forEach((ch, j) => {
        if (digits[j]) digits[j].value = ch;
      });
      if (paste.length === 6) {
        digits[5].focus();
        setTimeout(() => verifyBtn.click(), 100);
      } else if (paste.length > 0) {
        digits[Math.min(paste.length, 5)].focus();
      }
    });
  });

  verifyBtn.addEventListener('click', async () => {
    const code = Array.from(digits).map(d => d.value).join('');
    if (code.length !== 6) {
      _showError(errorEl, 'Please enter all 6 digits');
      return;
    }

    _showLoading(verifyBtn, btnText, loader);

    try {
      const result = await verifyOTP(_currentEmail, code, 'signup');
      _hideLoading(verifyBtn, btnText, loader);
      if (_onAuthSuccess) _onAuthSuccess(result);
      hideAuthModal(container);
    } catch (err) {
      _hideLoading(verifyBtn, btnText, loader);
      _showError(errorEl, err.message || 'Invalid code. Try again.');
      digits.forEach(d => { d.value = ''; });
      digits[0].focus();
    }
  });

  backBtn.addEventListener('click', () => {
    const stepMain = container.querySelector('#auth-step-email');
    const stepOTP = container.querySelector('#auth-step-otp');
    gsap.to(stepOTP, {
      x: 30, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        stepOTP.classList.add('hidden');
        digits.forEach(d => { d.value = ''; });
        stepMain.classList.remove('hidden');
        gsap.set(stepMain, { x: -30, opacity: 0 });
        gsap.to(stepMain, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    });
  });
}

function _showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  gsap.from(el, { y: -10, opacity: 0, duration: 0.25 });
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function _showLoading(btn, textEl, loaderEl) {
  btn.disabled = true;
  textEl.classList.add('hidden');
  loaderEl.classList.remove('hidden');
}

function _hideLoading(btn, textEl, loaderEl) {
  btn.disabled = false;
  textEl.classList.remove('hidden');
  loaderEl.classList.add('hidden');
}
