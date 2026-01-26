export function initSearch() {
    let searchInput = document.getElementById('searchInput')
    if (!searchInput) return
    let debounceTimer
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            filterTrips(e.target.value)
        }, 500);
    });
    
    searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(debounceTimer); 
        filterTrips(searchInput.value); 
    } else if (e.key === 'Escape') {
        searchInput.value = '';
        filterTrips('');
        searchInput.blur();
    }
});
}

function filterTrips(searchTerm) {
    let term = searchTerm.toLowerCase().trim()
    let cards = document.querySelectorAll('.trip-card')
    let visibleCount = 0
    
    cards.forEach(card => {
        let name = card.querySelector('.trip-name')?.textContent.toLowerCase() || ''
        let isVisible = name.includes(term)
        card.style.display = isVisible ? 'flex' : 'none'
        if (isVisible) visibleCount++
    });
    
    updateSearchFeedback(visibleCount, term)
}

function updateSearchFeedback(count, term) {
    let feedback = document.getElementById('search-feedback')
    
    if (term) {
        feedback.textContent = count === 0 
            ? 'No trips found' 
            : `${count} trip${count !== 1 ? 's' : ''} found`
        feedback.style.display = 'block'
    } else {
        feedback.style.display = 'none'
    }
}

let style = document.createElement('style');
style.textContent = `
    #search-feedback {
        padding: 8px 12px;
        margin-bottom: 16px;
        background: #f5f5f5;
        border-radius: 6px;
        font-size: 14px;
        color: #666;
        display: none;
    }
`;
document.head.appendChild(style)