// auth.js - Browser Compatible (No Node.js require)

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
    localStorage.setItem('refreshToken', refreshToken)
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
        const { accessToken, refreshToken, user } = response.data
        this.storeAuthData(accessToken, refreshToken, user)
        return { success: true, user }
      }
      throw new Error(response.message || 'Login failed')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  async handleRegister(name, email, password) {
    try {
      const response = await apiService.auth.register({ name, email, password })
      if (response.success) {
        const { accessToken, refreshToken, user } = response.data
        this.storeAuthData(accessToken, refreshToken, user)
        return { success: true, user }
      }
      throw new Error(response.message || 'Registration failed')
    } catch (error) {
      console.error('Registration error:', error)
      throw error
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
      if (!refreshToken) throw new Error('No refresh token')
      
      const response = await apiService.auth.refreshToken(refreshToken)
      if (response.success) {
        const { accessToken } = response.data
        localStorage.setItem('accessToken', accessToken)
        return true
      }
      throw new Error('Token refresh failed')
    } catch (error) {
      console.error('Token refresh error:', error)
      this.clearAuthData()
      window.location.href = 'index.html'
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
    
    try {
      await authHandler.handleLogin(email, password)
      if (typeof showToast !== 'undefined') {
        showToast('Login successful!', 'success')
      }
      setTimeout(() => window.location.href = 'trips.html', 1000)
    } catch (error) {
      if (typeof showToast !== 'undefined') {
        showToast(error.message || 'Login failed', 'error')
      } else {
        alert(error.message || 'Login failed')
      }
    }
  })
}

// Signup form handler
if (document.getElementById('signupForm')) {
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.getElementById('name').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const confirmPassword = document.getElementById('confirm-password').value
    
    if (password !== confirmPassword) {
      if (typeof showToast !== 'undefined') {
        showToast('Passwords do not match', 'error')
      } else {
        alert('Passwords do not match')
      }
      return
    }
    
    if (password.length < 8) {
      if (typeof showToast !== 'undefined') {
        showToast('Password must be at least 8 characters', 'error')
      } else {
        alert('Password must be at least 8 characters')
      }
      return
    }
    
    try {
      await authHandler.handleRegister(name, email, password)
      if (typeof showToast !== 'undefined') {
        showToast('Registration successful!', 'success')
      }
      setTimeout(() => window.location.href = 'trips.html', 1000)
    } catch (error) {
      if (typeof showToast !== 'undefined') {
        showToast(error.message || 'Registration failed', 'error')
      } else {
        alert(error.message || 'Registration failed')
      }
    }
  })
}

// Password toggle
function togglePassword(inputId) {
  const input = document.getElementById(inputId)
  if (!input) return
  
  const icon = input.nextElementSibling?.querySelector('i')
  
  if (input.type === 'password') {
    input.type = 'text'
    if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash')
  } else {
    input.type = 'password'
    if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye')
  }
}

// Make available globally
window.authHandler = authHandler
window.togglePassword = togglePassword

console.log('✅ Auth module loaded')