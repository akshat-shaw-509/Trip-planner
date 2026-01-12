// toast.js - Browser Compatible (No Node.js require)

const getToastContainer = () => {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `
    document.body.appendChild(container)
  }
  return container
}

const ICONS = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
}

const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
}

const showToast = (message, type = 'info') => {
  const container = getToastContainer()
  const toast = document.createElement('div')
  
  toast.className = `toast toast--${type}`
  toast.style.cssText = `
    background: white;
    color: #1f2937;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    max-width: 500px;
    border-left: 4px solid ${COLORS[type] || COLORS.info};
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease-out;
  `
  
  toast.innerHTML = `
    <i class="fas ${ICONS[type] || ICONS.info}" style="color: ${COLORS[type] || COLORS.info}; font-size: 20px;"></i>
    <span style="flex: 1; font-size: 14px; line-height: 1.5;">${message}</span>
  `
  
  container.appendChild(toast)
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(0)'
  }, 10)
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
      
      // Remove container if empty
      if (container.children.length === 0) {
        container.remove()
      }
    }, 300)
  }, 3000)
}

// Make available globally
window.showToast = showToast

console.log('✅ Toast module loaded')