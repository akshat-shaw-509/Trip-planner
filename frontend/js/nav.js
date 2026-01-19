// nav.js - Updated Navigation with User Profile

(function() {
  'use strict';

  // Initialize navigation on page load
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
  });

  function initNavigation() {
    const token = localStorage.getItem('accessToken');
    const user = getUserData();

    if (token && user) {
      showUserProfile(user);
    } else {
      showAuthButtons();
    }
  }

  function getUserData() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  function showUserProfile(user) {
    // Hide auth buttons
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
      authButtons.style.display = 'none';
    }

    // Show or create user profile section
    let userProfile = document.querySelector('.user-profile');
    
    if (!userProfile) {
      userProfile = createUserProfileElement(user);
      const nav = document.querySelector('nav');
      if (nav) {
        nav.appendChild(userProfile);
      }
    } else {
      updateUserProfileElement(userProfile, user);
    }

    userProfile.classList.add('active');
  }

  function createUserProfileElement(user) {
    const userProfile = document.createElement('div');
    userProfile.className = 'user-profile';
    
    const userName = user.name || 'User';
    const userEmail = user.email || '';
    const userAvatar = user.profilePicture || user.avatar || getDefaultAvatar(userName);

    userProfile.innerHTML = `
      <img src="${userAvatar}" alt="${userName}" class="user-avatar" onerror="this.src='${getDefaultAvatar(userName)}'">
      <div class="user-info">
        <span class="user-greeting">Welcome</span>
        <span class="user-name">${escapeHtml(userName.split(' ')[0])}!</span>
      </div>
      <i class="fas fa-chevron-down user-dropdown-icon"></i>
      
      <div class="user-dropdown">
        <div class="user-dropdown-header">
          <div class="user-name">${escapeHtml(userName)}</div>
          <div class="user-email">${escapeHtml(userEmail)}</div>
        </div>
        <div class="user-dropdown-menu">
          <a href="trips.html">
            <i class="fas fa-suitcase"></i>
            My Trips
          </a>
          <a href="profile.html">
            <i class="fas fa-user"></i>
            Profile Settings
          </a>
          <a href="preferences.html">
            <i class="fas fa-cog"></i>
            Preferences
          </a>
          <div class="user-dropdown-divider"></div>
          <button class="logout" onclick="handleLogout()">
            <i class="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
    `;

    return userProfile;
  }

  function updateUserProfileElement(userProfile, user) {
    const userName = user.name || 'User';
    const userEmail = user.email || '';
    const userAvatar = user.profilePicture || user.avatar || getDefaultAvatar(userName);

    const avatarImg = userProfile.querySelector('.user-avatar');
    const nameSpan = userProfile.querySelector('.user-info .user-name');
    const headerName = userProfile.querySelector('.user-dropdown-header .user-name');
    const headerEmail = userProfile.querySelector('.user-dropdown-header .user-email');

    if (avatarImg) avatarImg.src = userAvatar;
    if (nameSpan) nameSpan.textContent = escapeHtml(userName.split(' ')[0]) + '!';
    if (headerName) headerName.textContent = escapeHtml(userName);
    if (headerEmail) headerEmail.textContent = escapeHtml(userEmail);
  }

  function showAuthButtons() {
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.querySelector('.user-profile');

    if (authButtons) {
      authButtons.style.display = 'flex';
    }

    if (userProfile) {
      userProfile.classList.remove('active');
    }
  }

  function getDefaultAvatar(name) {
    // Generate a default avatar using UI Avatars or a fallback
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=128&bold=true`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Global logout handler
  window.handleLogout = async function() {
    try {
      // Call logout API if available
      if (window.authHandler && typeof window.authHandler.handleLogout === 'function') {
        await window.authHandler.handleLogout();
      } else {
        // Fallback logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        if (window.showToast) {
          window.showToast('Logged out successfully', 'success');
        }
        
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('Logout error:', error);
      
      // Force logout even if API call fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    }
  };

  console.log('✅ Navigation module loaded');
})();