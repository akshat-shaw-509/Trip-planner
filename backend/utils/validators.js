let validator=require('validator')

let isValidEmail = (email) => validator.isEmail(email)
let isValidObjectId = (id) => validator.isMongoId(id)
let isValidUrl = (url) => validator.isURL(url)
let isValidISO8601 = (date) => validator.isISO8601(date)

let isValidAmount = (amount) => typeof amount === 'number' && amount > 0 && isFinite(amount)

let isValidCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return false
  let [lng, lat] = coords
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

let isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start < end && !isNaN(start) && !isNaN(end)
}

let sanitizeString = (str) => validator.escape(str.trim())
let isValidLength = (str, min = 1, max = 255) => {
  const trimmed = str.trim()
  return trimmed.length >= min && trimmed.length <= max
}

let isNonEmptyArray = (arr) => Array.isArray(arr) && arr.length > 0

module.exports = {
  isValidEmail,
  isValidUrl,
  isValidObjectId,
  isValidISO8601,
  isValidAmount,
  isValidCoordinates,
  isValidDateRange,
  sanitizeString,
  isValidLength,
  isNonEmptyArray,
}