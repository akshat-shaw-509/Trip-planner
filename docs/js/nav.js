// Handles navigation state and user profile dropdown

(function () {
  'use strict';

  // Initialize navigation once DOM is ready
  document.addEventListener('DOMContentLoaded', initNavigation);

  // ===================== Initialization =====================
  function initNavigation() {
    const token = sessionStorage.getItem('accessToken');
    const user = getUserData();

    if (token && user) {
      showUserProfile(user);
    } else {
      showAuthButtons();
    }
  }

  // ===================== User Data =====================
  function getUserData() {
    try {
      const userStr = sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (err) {
      console.error('Failed to parse user data:', err);
      return null;
    }
  }

  // ===================== UI States =====================
  function showUserProfile(user) {
    // Hide login / signup buttons
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) authButtons.style.display = 'none';

    let userProfile = document.querySelector('.user-profile');

    // Create profile section if it does not exist
    if (!userProfile) {
      userProfile = createUserProfileElement(user);
      document.querySelector('nav')?.appendChild(userProfile);
    } else {
      updateUserProfileElement(userProfile, user);
    }

    userProfile.classList.add('active');
  }

  function showAuthButtons() {
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');

    if (authButtons) authButtons.style.display = 'flex';
    if (userProfile) userProfile.classList.remove('active');
  }

  // ===================== Profile Elements =====================
  function createUserProfileElement(user) {
    const profile = document.createElement('div');
    profile.className = 'user-profile';

    const name = user.name || 'User';
    const email = user.email || '';
    const avatar =
      user.profilePicture || user.avatar || getDefaultAvatar(name);

    profile.innerHTML = `
      <img
        src="${avatar}"
        alt="${escapeHtml(name)}"
        class="user-avatar"
        onerror="this.src='${getDefaultAvatar(name)}'"
      />

      <div class="user-info">
        <span class="user-greeting">Welcome</span>
        <span class="user-name">${escapeHtml(name.split(' ')[0])}!</span>
      </div>

      <i class="fas fa-chevron-down user-dropdown-icon"></i>

      <div class="user-dropdown">
        <div class="user-dropdown-header">
          <div class="user-name">${escapeHtml(name)}</div>
          <div class="user-email">${escapeHtml(email)}</div>
        </div>

        <div class="user-dropdown-menu">
          <a href="trips.html">
            <i class="fas fa-suitcase"></i>
            My Trips
          </a>
          
          <div class="user-dropdown-divider"></div>

          <button class="logout" onclick="handleLogout()">
            <i class="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
    `;

    return profile;
  }

  function updateUserProfileElement(profile, user) {
    const name = user.name || 'User';
    const email = user.email || '';
    const avatar =
      user.profilePicture || user.avatar || getDefaultAvatar(name);

    profile.querySelector('.user-avatar')?.setAttribute('src', avatar);
    profile.querySelector('.user-info .user-name').textContent =
      `${escapeHtml(name.split(' ')[0])}!`;

    profile.querySelector('.user-dropdown-header .user-name').textContent =
      escapeHtml(name);

    profile.querySelector('.user-dropdown-header .user-email').textContent =
      escapeHtml(email);
  }

  // ===================== Helpers =====================
  function getDefaultAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=667eea&color=fff&size=128&bold=true`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===================== Logout =====================
  window.handleLogout = async function () {
    try {
      if (window.authHandler?.handleLogout) {
        await window.authHandler.handleLogout();
        return;
      }

      // Fallback logout
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');

      window.showToast?.('Logged out successfully', 'success');
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Logout failed:', err);

      // Force cleanup even on error
      sessionStorage.clear();
      window.location.href = 'index.html';
    }
  };

  console.log('Navigation module loaded');
})();