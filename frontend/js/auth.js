// auth.js - FIXED VERSION

const authHandler = {
  isAuthenticated() {
    const token = localStorage.getItem('accessToken')
    return !!token
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  storeAuthData(accessToken, refreshToken, user) {
    localStorage.setItem('accessToken', accessToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    localStorage.setItem('user', JSON.stringify(user))
  },

  clearAuthData() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },

  async handleLogin(email, password) {
    try {
      const response = await apiService.auth.login({ email, password })

      if (response.success) {
        const dataPayload = response.data || response
        const accessToken = dataPayload.accessToken || dataPayload.token
        const refreshToken = dataPayload.refreshToken || null
        const user = dataPayload.user

        if (!accessToken) {
          throw new Error('No access token received from server')
        }

        this.storeAuthData(accessToken, refreshToken, user)
        showToast('Login successful! Redirecting...', 'success')
        setTimeout(() => window.location.href = 'trips.html', 1000)

        return { success: true, user }
      }

      throw new Error(response.message || 'Login failed')

    } catch (error) {
      console.error('Login error:', error)
      showToast(error.message || 'Login failed', 'error')
      return { success: false, error: error.message }
    }
  },

  async handleRegister(name, email, password) {
    try {
      const response = await apiService.auth.register({ name, email, password })

      if (response.success) {
        const dataPayload = response.data || response
        const accessToken = dataPayload.accessToken || dataPayload.token
        const refreshToken = dataPayload.refreshToken || null
        const user = dataPayload.user

        this.storeAuthData(accessToken, refreshToken, user)
        showToast('Registration successful! Redirecting...', 'success')
        setTimeout(() => window.location.href = 'trips.html', 1000)

        return { success: true, user }
      }

      throw new Error(response.message || 'Registration failed')

    } catch (error) {
      console.error('Registration error:', error)

      if (error.backendErrors && Array.isArray(error.backendErrors)) {
        const errorList = error.backendErrors.map(e => `• ${e.message}`).join('\n')
        showToast(`Registration Failed:\n${errorList}`, 'error')
      } else {
        showToast(error.message || 'Registration failed', 'error')
      }

      return { success: false, error: error.message }
    }
  },

  async handleLogout() {
    try {
      await apiService.auth.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearAuthData()
      window.location.href = 'index.html'
    }
  },

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) return false

      const response = await apiService.auth.refreshToken(refreshToken)

      if (response.success) {
        const { accessToken } = response.data
        localStorage.setItem('accessToken', accessToken)
        return true
      }

      return false
    } catch (error) {
      console.warn('Token refresh failed, staying logged in')
      return false
    }
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'index.html'
      return false
    }
    return true
  },
}

// Login form handler
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    await authHandler.handleLogin(email, password)
  })
}

// Signup form handler
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

    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&]/.test(password)
    }

    if (!Object.values(requirements).every(Boolean)) {
      showToast('Please meet all password requirements', 'error')
      return
    }

    const submitBtn = document.getElementById('signupBtn')
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...'

    const result = await authHandler.handleRegister(name, email, password)

    if (!result.success) {
      submitBtn.disabled = false
      submitBtn.innerHTML = originalText
    }
  })
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId)
  if (!input) return

  const button = input.nextElementSibling
  const icon = button?.querySelector('i')

  if (input.type === 'password') {
    input.type = 'text'
    if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash')
  } else {
    input.type = 'password'
    if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye')
  }
}

// ✅ FIXED: Google OAuth Handler - USE ONLY .env CLIENT_ID
async function handleGoogleLogin(response) {
  try {
    console.log('🔵 Google login callback triggered', response)
    
    if (!response || !response.credential) {
      showToast('Google login failed - no credential received', 'error')
      return
    }

    const baseURL = apiService.baseURL || 'http://localhost:5000/api'
    showToast('Authenticating with Google...', 'info')

    const res = await fetch(`${baseURL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idToken: response.credential
      })
    })

    const data = await res.json()
    console.log('🔵 Google auth response:', data)

    if (!data.success) {
      showToast(data.message || 'Google login failed', 'error')
      return
    }

    const { accessToken, user } = data.data
    authHandler.storeAuthData(accessToken, null, user)

    showToast('Google login successful! Redirecting...', 'success')
    setTimeout(() => {
      window.location.href = 'trips.html'
    }, 1000)

  } catch (error) {
    console.error('❌ Google login error:', error)
    showToast('Google login error: ' + error.message, 'error')
  }
}

// ✅ FIXED: Google SDK Initialization - SINGLE CLIENT_ID
let googleInitialized = false

function initializeGoogleSignIn() {
  if (googleInitialized || !window.google) return

  const clientId = '971566670592-c4v3bk1u8oe7ejv51bvmnc2nvg8729jo.apps.googleusercontent.com'

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleLogin,
    ux_mode: 'popup'
  })

  // ✅ THIS is the key fix
  google.accounts.id.renderButton(
    document.getElementById('googleLoginBtn'),
    {
      theme: 'outline',
      size: 'large',
      text: 'continue_with'
    }
  )

  googleInitialized = true
  console.log('✅ Google Sign-In button rendered')
}


// ✅ Called when Google SDK loads
function onGoogleScriptLoad() {
  console.log('✅ Google SDK loaded')
  initializeGoogleSignIn()
}





window.authHandler = authHandler
window.togglePassword = togglePassword
window.handleGoogleLogin = handleGoogleLogin
window.onGoogleScriptLoad = onGoogleScriptLoad

console.log('✅ Auth module loaded')