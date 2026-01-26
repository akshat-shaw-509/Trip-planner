export function initScrollReveal(){
    let cards=document.querySelectorAll('.trip-card')
    if(!cards.length) return

    let observer=new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
            if(entry.isIntersecting){
                entry.target.classList.add('visible')
            }
        });
    },{
        threshold:0.15
    });
    cards.forEach(card=>{
        card.classList.add('fade-in')
        observer.observe(card)
    });
}

let style=document.createElement('style')
style.textContent=`
.fade-in{
opacity:0;
transform:translateY(16px);
transition: opacity 0.45s ease, transform 0.45s ease;
}
.fade-in.visible{
opacity:1;
transform:translateY(0);
}
.trip-card:hover {
    transform: translateY(-5px) translateX(5px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}
`;
document.head.appendChild(style)