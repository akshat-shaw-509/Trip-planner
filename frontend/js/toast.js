// toast.js — Unified Toast Notification System
(function () {
  'use strict';

  if (window.toastLoaded) return;
  window.toastLoaded = true;

  let toastContainer = null;

  const COLORS = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  const ICONS = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle',
  };

  function initToastContainer() {
    if (toastContainer) return;

    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 500px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  function showToast(message, type = 'info', duration = 4000) {
    initToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const bgColor = COLORS[type] || COLORS.info;
    const icon = ICONS[type] || ICONS.info;

    toast.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px 20px;
      background: white;
      color: #1f2937;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-left: 4px solid ${bgColor};
      font-size: 14px;
      line-height: 1.6;
      animation: slideIn 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      max-width: 100%;
      word-wrap: break-word;
    `;

    toast.innerHTML = `
      <i class="fas fa-${icon}" style="color:${bgColor}; font-size:18px; flex-shrink:0; margin-top:2px;"></i>
      <span style="flex:1; white-space: pre-line;">${escapeHtml(message)}</span>
      <i class="fas fa-times" style="font-size:16px; opacity:0.7; flex-shrink:0;"></i>
    `;

    toast.onclick = () => removeToast(toast);
    toastContainer.appendChild(toast);

    setTimeout(() => removeToast(toast), duration);

    return toast;
  }

  function removeToast(toast) {
    if (!toast || !toast.parentElement) return;

    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    .toast:hover {
      transform: translateX(-5px);
      transition: transform 0.2s ease;
    }
  `;
  document.head.appendChild(style);

  window.showToast = showToast;
  console.log('✅ Unified toast system loaded');
})();
