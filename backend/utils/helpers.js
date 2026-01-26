<<<<<<< HEAD
let crypto = require('crypto')

// Generate random string
let generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex')
}

// Hash string using SHA256
let hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex')
}

// Sleep/delay function
let sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Paginate array
let paginateArray = (array, page = 1, pageSize = 20) => {
  let startIndex = (page - 1) * pageSize
  let endIndex = startIndex + pageSize
  return {
    data: array.slice(startIndex, endIndex),
    page:parseInt(page),
    pageSize:parseInt(pageSize),
    totalItems: array.length,
    totalPages: Math.ceil(array.length / pageSize),
    hasNext: endIndex < array.length,
    hasPrev: page > 1,
  }
}

// Calculate distance between two coordinates (Haversine formula)
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

// Pick keys from object
let pick = (obj, keys) => {
  let result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

// Convert to slug
let slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

module.exports = {
  generateRandomString,
  hashString,
  sleep,
  paginateArray,
  calculateDistance,
  daysBetween,
  sanitizeUser,
  pick,
  slugify,
=======
let crypto = require('crypto')

// Generate random string
let generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex')
}

// Hash string using SHA256
let hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex')
}

// Sleep/delay function
let sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Paginate array
let paginateArray = (array, page = 1, pageSize = 20) => {
  let startIndex = (page - 1) * pageSize
  let endIndex = startIndex + pageSize
  return {
    data: array.slice(startIndex, endIndex),
    page:parseInt(page),
    pageSize:parseInt(pageSize),
    totalItems: array.length,
    totalPages: Math.ceil(array.length / pageSize),
    hasNext: endIndex < array.length,
    hasPrev: page > 1,
  }
}

// Calculate distance between two coordinates (Haversine formula)
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

// Pick keys from object
let pick = (obj, keys) => {
  let result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

// Convert to slug
let slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

module.exports = {
  generateRandomString,
  hashString,
  sleep,
  paginateArray,
  calculateDistance,
  daysBetween,
  sanitizeUser,
  pick,
  slugify,
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
}