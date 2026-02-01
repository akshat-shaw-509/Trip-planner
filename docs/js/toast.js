(function () {
  'use strict';

  if (window.toastLoaded) return;
  window.toastLoaded = true;

  let container = null;

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

  function ensureContainer() {
    if (container) return;

    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 480px;
      pointer-events: none;
    `;

    document.body.appendChild(container);
  }

  function showToast(message, type = 'info', duration = 4000) {
    ensureContainer();

    const toast = document.createElement('div');
    const color = COLORS[type] || COLORS.info;
    const icon = ICONS[type] || ICONS.info;

    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      display: flex;
      gap: 12px;
      padding: 14px 18px;
      background: #fff;
      color: #1f2937;
      border-radius: 8px;
      border-left: 4px solid ${color};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      line-height: 1.5;
      animation: slideIn 0.25s ease;
      pointer-events: auto;
      cursor: pointer;
    `;

    toast.innerHTML = `
      <i class="fas fa-${icon}" style="color:${color}; font-size:16px; margin-top:2px;"></i>
      <div style="flex:1; white-space:pre-line;">${escapeHtml(message)}</div>
      <i class="fas fa-times" style="opacity:0.6;"></i>
    `;

    toast.onclick = () => dismissToast(toast);

    container.appendChild(toast);
    setTimeout(() => dismissToast(toast), duration);

    return toast;
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;

    toast.style.animation = 'slideOut 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(300px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to   { transform: translateX(300px); opacity: 0; }
    }
    .toast:hover {
      transform: translateX(-4px);
      transition: transform 0.15s ease;
    }
  `;
  document.head.appendChild(style);

  window.showToast = showToast;
})();
