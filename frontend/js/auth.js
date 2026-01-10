let authHandler = {
  isAuthenticated() {
    let token = localStorage.getItem('accessToken')
    return !!token
  },

  getCurrentUser() {
    let userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  // Store auth data
  storeAuthData(accessToken, refreshToken, user) {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
  },

  // Clear auth data
  clearAuthData() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  },

  // Handle login
  async handleLogin(email, password) {
    try {
      let response = await apiService.auth.login({ email, password })
      if (response.success) {
        let { accessToken, refreshToken, user } = response.data
        this.storeAuthData(accessToken, refreshToken, user)
        return { success: true, user }
      }
      throw new Error(response.message || 'Login failed')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Handle registration
  async handleRegister(name, email, password) {
    try {
      const response = await apiService.auth.register({
        name,
        email,
        password,
      })
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

  // Handle logout
  async handleLogout() {
    try {
      await apiService.auth.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.clearAuthData()
      window.location.href = '/link'
    }
  },

  // Refresh token
  async refreshToken() {
    try {
      let refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        throw new Error('No refresh token')
      }
      let response = await apiService.auth.refreshToken(refreshToken)
      if (response.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', newRefreshToken)
        return true
      }
      
      throw new Error('Token refresh failed')
    } catch (error) {
      console.error('Token refresh error:', error)
      this.clearAuthData()
      window.location.href = '/link'
      return false
    }
  },

  // Protect route (redirect if not authenticated)
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/link'
      return false
    }
    return true
  },
}

// Login form handler
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    let email = document.getElementById('email').value
    let password = document.getElementById('password').value
    try {
      await authHandler.handleLogin(email, password)
      showToast('Login successful!', 'success')
      setTimeout(() => {
        window.location.href = '/link'
      }, 1000)
    } catch (error) {
      showToast(error.message || 'Login failed', 'error')
    }
  })
}

// Signup form handler
if (document.getElementById('signupForm')) {
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    let name = document.getElementById('fullname').value
    let email = document.getElementById('signup-email').value
    let password = document.getElementById('signup-password').value
    let confirmPassword = document.getElementById('confirm-password').value
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    try {
      await authHandler.handleRegister(name, email, password)
      showToast('Registration successful!', 'success')
      setTimeout(() => {
        window.location.href = '/link'
      }, 1000)
    } catch (error) {
      showToast(error.message || 'Registration failed', 'error')
    }
  })
}

// Password toggle functionality
function togglePassword(inputId = 'password') {
  let input = document.getElementById(inputId)
  let icon = input.nextElementSibling?.querySelector('i')
  
  if (input.type === 'password') {
    input.type = 'text'
    if (icon) icon.classList.replace('fa-eye', 'fa-eye-slash')
  } else {
    input.type = 'password'
    if (icon) icon.classList.replace('fa-eye-slash', 'fa-eye')
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.authHandler = authHandler
  window.togglePassword = togglePassword
}