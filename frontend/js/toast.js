let getToastContainer=()=>{
  let container=document.getElementById('toast-container')
  if(!container){
    container=document.createElement('div')
    container.id='toast-container'
    document.body.appendChild(container)
  }
  return container
}

let ICONS = {
  success: 'fa-check-circle',
  error: 'fa-exclamation-circle', 
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
}

let showToast=(message,type='info')=>{
  let container=getToastContainer()
  let toast=document.createElement('div')
  toast.className=`toast toast--${type}`
  toast.innerHTML=`
  <i class="fas ${ICONS[type] || ICONS.info}"></i>
  <span>${message}</span>
  `
  container.appendChild(toast)
  setTimeout(()=> toast.classList.add('toast--show'),10)
  setTimeout(()=>{
    toast.classList.remove('toast--show')
    setTimeout(()=>{
      if(toast.parentNode){
        toast.parentNode.removeChild(toast)
      }
      if(!container.children.length){
        container.remove()
      }
    },300)
  },3000)
}
if (typeof module !== 'undefined') {
  module.exports = { showToast }
}
if (typeof window !== 'undefined') {
  window.showToast = showToast
}