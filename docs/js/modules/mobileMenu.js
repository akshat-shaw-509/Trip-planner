export function initMobileMenu(){
    let nav= document.querySelector('nav')

    let hamburger= document.createElement('button')
    hamburger.className='hamburger'
    hamburger.innerHTML='<span></span><span></span><span></span>'

    let mobileMenu=document.createElement('div')
    mobileMenu.className='mobile-menu'

    let navLinks=nav.querySelectorAll('a')
    let ctaContainer=nav.querySelector('.cta-container')
    
    navLinks.forEach(link=>{
        mobileMenu.appendChild(link.cloneNode(true))
    });

    nav.insertBefore(hamburger, nav.firstChild)
    document.body.appendChild(mobileMenu)
    
    let toggleMenu = (open)=>{
        let isOpen = open ?? !hamburger.classList.contains('active')
        hamburger.classList.toggle('active',isOpen)
        mobileMenu.classList.toggle('active',isOpen)
    };
    
    hamburger.addEventListener('click',()=>toggleMenu())
    mobileMenu.querySelectorAll('a').forEach(link =>{
        link.addEventListener('click',()=> toggleMenu(false))
    });

    hamburger.addEventListener('keydown',(e)=>{
        if(e.key === 'Enter'||e.key===' '){
            e.preventDefault()
            toggleMenu()
        }
    });

    mobileMenu.addEventListener('keydown',(e)=>{
        if(e.key==='Escape'){
            toggleMenu(false)
        }
    });

    addStyles()
}

function addStyles() {
    let style = document.createElement('style');
    style.textContent = `
        .hamburger {
            display: none;
            flex-direction: column;
            gap: 4px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px;
        }
        
        .hamburger span {
            width: 24px;
            height: 2px;
            background: #333;
            transition: transform 0.2s;
        }
        
        .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }
        
        .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(6px, -6px);
        }
        
        .mobile-menu {
            position: fixed;
            top: 0;
            right: -100%;
            width: 280px;
            height: 100vh;
            background: white;
            padding: 80px 30px 30px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            transition: right 0.3s;
            z-index: 1000;
            box-shadow: -2px 0 8px rgba(0,0,0,0.1);
        }
        
        .mobile-menu.active {
            right: 0;
        }
        
        .mobile-menu a {
            color:#333;
            text-decoration:none;
            font-size:16px;
            font-weight:500;
            transition: background 0.2s;
            border-radius:4px;
            display:block;
            padding: 12px 16px;
            border-bottom: 1px solid #eee;
            }
        
        @media (max-width: 768px) {
            .hamburger {
                display: flex;
            }
            
            nav > a,
            nav .search-bar,
            nav .cta-container {
                display: none;
            }
        }
    `;
    document.head.appendChild(style);
}