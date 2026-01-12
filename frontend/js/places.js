let currentTripId = null
let allPlaces = []
let currentFilter = 'all'

let initPlacesPage=async()=>{
    if(!authHandler.requireAuth()) return

    currentTripId = new URLSearchParams(window.location.search).get('id')
    if(!currentTripId){
        showToast('Select a trip first', 'error')
        setTimeout(()=>window.location.href='/trips',2000)
        return
    }
    await Promise.all([
        loadTripContext(),
        loadPlaces()
    ])
    initFilters()
}

let loadTripContext= async ()=>{
    try{
        let response=await apiService.trips.getById(currentTripId)
        let trip=response.data

        let context=document.querySelector('.context-left')
        if(context){
            context.innerHTML = `
        <h2>Places to Visit</h2>
        <p>${trip.destination}${trip.country ? ', ' + trip.country : ''} • ${getDuration(trip)} days</p>
      `
        }
    } catch(error){
        console.error('Load trip failed:', error)
    }
}

let getDuration = (trip) => {
  return Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
}

let loadPlaces=async (filter = 'all')=> {
  try {
    let filters = filter !== 'all' ? { category: filter } : {}
    let response = await apiService.places.getByTrip(currentTripId, filters)
    
    allPlaces = response.data || []
    displayPlaces(filter === 'all' ? allPlaces : allPlaces.filter(p => 
      p.category.toLowerCase() === filter.toLowerCase()
    ))
  } catch (error) {
     console.error('Load places failed:', error)
    showToast('Failed to load places', 'error')
  }
}

let getCategoryClass = (category) => {
  return category.toLowerCase()
}

let displayPlaces=(places)=> {
  let grid = document.getElementById('placesGrid')
  let emptyState = document.querySelector('.empty-places')
  
  if (!places.length) {
    grid.style.display = 'none'
    emptyState.style.display = 'block'
    return
  }
  
  grid.style.display = 'grid'
  emptyState.style.display = 'none'
  grid.innerHTML = places.map(createPlaceCard).join('')
}

let createPlaceCard=(place)=> {
  return `
    <div class="place-card" data-place-id="${place._id}">
      <div class="place-image">
        <img src="${place.photos?.[0] || '../Svg/default-destination.jpg'}" alt="${place.name}">
        <span class="place-badge ${getCategoryClass(place.category)}">
          <i class="fas fa-${getCategoryIcon(place.category)}"></i>
          ${capitalize(place.category)}
        </span>
      </div>
      <div class="place-content">
        <h3>${place.name}</h3>
        <p>${place.description || 'No description'}</p>
        <div class="place-meta">
          ${place.rating ? `<div class="place-rating"><i class="fas fa-star"></i> ${place.rating.toFixed(1)}</div>` : ''}
          ${place.priceLevel ? `<div class="place-price"><i class="fas fa-dollar-sign"></i> ${'$'.repeat(place.priceLevel)}</div>` : ''}
        </div>
        <div class="place-actions">
          <button class="btn-add-schedule" onclick="addToSchedule('${place._id}')">
            <i class="fas fa-plus"></i> Add to Schedule
          </button>
          <button class="btn-favorite" onclick="toggleFavorite('${place._id}')">
            <i class="far fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `
}

let getCategoryBadgeClass=(category)=> {
  let icons = {
    accommodation: 'bed', restaurant: 'utensils', attraction: 'landmark',
    shopping: 'shopping-bag', entertainment: 'theater-masks', transport: 'car'
  }
  return icons[category] || 'map-marker-alt'
}

let capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)


let getCategoryIcon=(category)=> {
  let icons = {
    accommodation: 'bed',
    restaurant: 'utensils',
    attraction: 'landmark',
    shopping: 'shopping-bag',
    entertainment: 'theater-masks',
    transport: 'car',
    other: 'map-marker-alt',
  };
  return icons[category] || 'map-marker-alt';
}

let initFilters = () => {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      currentFilter = btn.dataset.filter
      const filtered = currentFilter === 'all' 
        ? allPlaces 
        : allPlaces.filter(p => p.category.toLowerCase() === currentFilter.toLowerCase())
      displayPlaces(filtered)
    })
  })
}

let addToSchedule=async (placeId)=> {
  try {
    showToast('Add to schedule coming soon!', 'info')
  } catch (error) {
    showToast('Failed to add place', 'error')
  }
}

let toggleFavorite=async (placeId)=> {
  try {
    let response = await apiService.places.toggleFavorite(placeId)
    if (response.success) {
      showToast('Favorite updated!', 'success')
      await loadPlaces(currentFilter)
    }
  } catch (error) {
    showToast('Failed to update favorite', 'error')
  }
}

document.addEventListener('DOMContentLoaded', initPlacesPage)

if (typeof window !== 'undefined') {
  window.addToSchedule = addToSchedule;
  window.toggleFavorite = toggleFavorite;
}