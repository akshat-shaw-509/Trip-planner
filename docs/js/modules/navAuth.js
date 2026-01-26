let updateNavAuth = () => {
  let authButtons = document.querySelector('.auth-buttons')
  let userMenu = document.getElementById('user-menu')
  
  if (!authButtons) return

  if (authHandler.isAuthenticated()) {
    showUserMenu(authButtons, userMenu)
  } else {
    showAuthButtons(authButtons, userMenu)
  }
}

let showUserMenu = (authButtons, userMenu) => {
  authButtons.classList.add('hidden')
  if (userMenu) {
    userMenu.classList.remove('hidden')
    updateUserName(userMenu)
  } else {
    createUserMenu(authButtons)
  }
}

let showAuthButtons = (authButtons, userMenu) => {
  authButtons.classList.remove('hidden')
  if (userMenu) userMenu.classList.add('hidden')
}

let updateUserName = (userMenu) => {
  let userNameEl = userMenu.querySelector('.user-name')
  let user = authHandler.getCurrentUser()
  
  if (userNameEl && user) {
    userNameEl.textContent = user.name || user.email
  }
}

let createUserMenu = (authButtons) => {
  let userMenuHTML = `
    <div id="user-menu" class="user-menu">
      <span class="user-name"></span>
      <button class="btn-logout" type="button">Logout</button>
    </div>
  `
  authButtons.insertAdjacentHTML('afterend', userMenuHTML)
  updateUserName(document.getElementById('user-menu'))
}

let handleLogout = async () => {
  if (!confirm('Logout?')) return
  try {
    await authHandler.handleLogout()
    updateNavAuth()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

document.addEventListener('DOMContentLoaded', updateNavAuth)

if (typeof window !== 'undefined') {
  window.updateNavAuth = updateNavAuth
  window.handleLogout = handleLogout
}
