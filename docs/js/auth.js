// ===================== Auth State & Helpers =====================
let authHandler = {
  isAuthenticated() {
    return !!sessionStorage.getItem('accessToken')
  },

  getCurrentUser() {
    const userStr = sessionStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  storeAuthData(accessToken, refreshToken, user) {
    sessionStorage.setItem('accessToken', accessToken)
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken)
    }
    sessionStorage.setItem('user', JSON.stringify(user))
  },

  clearAuthData() {
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    sessionStorage.removeItem('user')
  },

  // ===================== Login =====================
  async handleLogin(email, password) {
    try {
      const response = await apiService.auth.login({ email, password })

      if (!response.success) {
        throw new Error(response.message || 'Login failed')
      }

      const data = response.data || response
      const accessToken = data.accessToken || data.token
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken) {
        throw new Error('Missing access token')
      }

      this.storeAuthData(accessToken, refreshToken, user)
      showToast('Login successful', 'success')

      // ✅ OPTIMIZED: Reduced delay from 1000ms to 300ms
      setTimeout(() => {
        window.location.href = '/Trip-planner/index.html'
      }, 300)

      return { success: true, user }
    } catch (error) {
      console.error('Login error:', error)
      showToast(error.message || 'Login failed', 'error')
      return { success: false, error: error.message }
    }
  },

  // ===================== Register =====================
  async handleRegister(name, email, password) {
    try {
      const response = await apiService.auth.register({ name, email, password })

      if (!response.success) {
        throw new Error(response.message || 'Registration failed')
      }

      const data = response.data || response
      const accessToken = data.accessToken || data.token
      const refreshToken = data.refreshToken || null
      const user = data.user

      this.storeAuthData(accessToken, refreshToken, user)
      showToast('Account created', 'success')

      // ✅ OPTIMIZED: Reduced delay from 1000ms to 300ms
      setTimeout(() => {
        window.location.href = './trips.html'
      }, 300)

      return { success: true, user }
    } catch (error) {
      console.error('Registration error:', error)

      if (error.backendErrors && Array.isArray(error.backendErrors)) {
        const messages = error.backendErrors.map(e => `• ${e.message}`).join('\n')
        showToast(`Registration failed:\n${messages}`, 'error')
      } else {
        showToast(error.message || 'Registration failed', 'error')
      }
      return { success: false, error: error.message }
    }
  },

  // ===================== Logout =====================
  async handleLogout() {
    try {
      await apiService.auth.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearAuthData()
      // ✅ OPTIMIZED: Clear Google Client ID cache on logout
      localStorage.removeItem('googleClientId')
      window.location.href = '/Trip-planner/index.html'
    }
  },

  // ===================== Token Refresh =====================
  async refreshToken() {
    try {
      const refreshToken = sessionStorage.getItem('refreshToken')
      if (!refreshToken) return false

      const response = await apiService.auth.refreshToken(refreshToken)
      if (response.success) {
        sessionStorage.setItem('accessToken', response.data.accessToken)
        return true
      }
      return false
    } catch (error) {
      console.warn('Token refresh failed')
      return false
    }
  },

  // ===================== Route Guard =====================
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/Trip-planner/index.html'
      return false
    }
    return true
  }
}

// ===================== Login Form =====================
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    await authHandler.handleLogin(email, password)
  })
}

// ===================== Signup Form =====================
if (document.getElementById('signupForm')) {
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const name = document.getElementById('name').value.trim()
    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value.trim()
    const confirmPassword = document.getElementById('confirm-password').value.trim()

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    const isStrongPassword =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[@$!%*?&]/.test(password)

    if (!isStrongPassword) {
      showToast('Password does not meet requirements', 'error')
      return
    }

    const submitBtn = document.getElementById('signupBtn')
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...'

    const result = await authHandler.handleRegister(name, email, password)
    if (!result.success) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalText
    }
  })
}

// ===================== UI Helpers =====================
function togglePassword(inputId) {
  const input = document.getElementById(inputId)
  if (!input) return

  const icon = input.nextElementSibling?.querySelector('i')
  const isHidden = input.type === 'password'

  input.type = isHidden ? 'text' : 'password'
  if (icon) {
    icon.classList.toggle('fa-eye')
    icon.classList.toggle('fa-eye-slash')
  }
}

// ===================== Google OAuth =====================

// ✅ OPTIMIZED: Load Google Client ID with caching
async function loadGoogleClientId() {
  try {
    // Check localStorage cache first
    const cachedClientId = localStorage.getItem('googleClientId')
    const cacheTimestamp = localStorage.getItem('googleClientIdTimestamp')
    
    // Use cache if it's less than 24 hours old
    if (cachedClientId && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp)
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (age < maxAge) {
        window.GOOGLE_CLIENT_ID = cachedClientId
        initializeGoogleSignIn()
        return
      }
    }

    // Fetch from server if cache is stale or missing
    const baseURL = apiService.baseURL
    const response = await fetch(`${baseURL}/auth/google-client-id`)
    const data = await response.json()
    
    if (data.success && data.clientId) {
      window.GOOGLE_CLIENT_ID = data.clientId
      // ✅ Cache the client ID
      localStorage.setItem('googleClientId', data.clientId)
      localStorage.setItem('googleClientIdTimestamp', Date.now().toString())
      initializeGoogleSignIn()
    } else {
      console.error('Failed to load Google Client ID')
    }
  } catch (error) {
    console.error('Error loading Google Client ID:', error)
  }
}

async function handleGoogleLogin(response) {
  try {
    if (!response?.credential) {
      showToast('Google login failed', 'error')
      return
    }

    const baseURL = apiService.baseURL
    showToast('Signing in with Google...', 'info')

    const res = await fetch(`${baseURL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken: response.credential })
    })

    const data = await res.json()
    if (!data.success) {
      showToast(data.message || 'Google login failed', 'error')
      return
    }

    const { accessToken, user } = data.data
    authHandler.storeAuthData(accessToken, null, user)

    showToast('Login successful', 'success')
    
    // ✅ OPTIMIZED: Reduced delay from 1000ms to 300ms
    setTimeout(() => {
      window.location.href = './trips.html'
    }, 300)
  } catch (error) {
    console.error('Google login error:', error)
    showToast('Google login failed', 'error')
  }
}

// ===================== Google SDK Init =====================
let googleInitialized = false

function initializeGoogleSignIn() {
  if (googleInitialized || !window.google || !window.GOOGLE_CLIENT_ID) return

  google.accounts.id.initialize({
    client_id: window.GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin,
    ux_mode: 'popup'
  })

  const googleBtn = document.getElementById('googleLoginBtn')
  if (googleBtn) {
    google.accounts.id.renderButton(
      googleBtn,
      { theme: 'outline', size: 'large', text: 'continue_with' }
    )
  }

  googleInitialized = true
}

function onGoogleScriptLoad() {
  loadGoogleClientId()
}

// ===================== Expose Globals =====================
window.authHandler = authHandler
window.togglePassword = togglePassword
window.handleGoogleLogin = handleGoogleLogin
