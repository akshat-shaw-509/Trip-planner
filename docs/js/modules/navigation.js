export function initSmoothScroll(){
    document.querySelectorAll('nav a[href^="#"]').forEach(link=>{
        link.addEventListener('click',function(e){
            e.preventDefault()
            let target=document.querySelector(this.getAttribute('href'));
            if(target){
                target.scrollIntoView({behavior:'smooth'})
            }
        });
    });
}