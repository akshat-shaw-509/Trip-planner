let crypto = require('crypto')

// Calculate distance between two coordinates
let calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  let toRad=x=>x*Math.PI/180
  let dLat = toRad(lat2 - lat1)
  let dLon = toRad(lon2 - lon1)
  
  let a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))  
  return Math.round((R*c) * 100) / 100 // Round to 2 decimal places
}

// Calculate days between dates
let daysBetween = (date1, date2) => {
  let oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay))
}

let sanitizeUser=(user)=>{
    let{ password,resetPasswordHash,refreshToken,...sanitized}=user
    return sanitized
}

module.exports = {
  calculateDistance,
  daysBetween,
  sanitizeUser,
}
