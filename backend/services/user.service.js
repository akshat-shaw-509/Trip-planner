
// -------------------- Models --------------------
let User = require('../models/User.model')

// -------------------- Custom Error Factories --------------------
let {
  createNotFoundError,
  createConflictError,
  createValidationError,
  createDatabaseError
} = require('../utils/errors')

/**
 * -------------------- Get User By ID --------------------
 * Optionally includes password (used internally only)
 */
let getUserById = async (userId, options = {}) => {
  if (!userId) {
    throw createValidationError('User ID is required')
  }

  try {
    let query = User.findById(userId)

    if (options.includePassword) {
      query = query.select('+password')
    }

    let user = await query

    if (!user) {
      throw createNotFoundError('User not found')
    }

    return user
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to fetch user by user id')
  }
}

/**
 * -------------------- Get User By Email --------------------
 * Used for authentication & existence checks
 */
let getUserByEmail = async (email, options = {}) => {
  if (!email) {
    throw createValidationError('Email is required')
  }

  try {
    let query = User.findOne({ email: email.toLowerCase() })

    if (options.includePassword) {
      query = query.select('+password')
    }

    return await query
  } catch (error) {
    throw createDatabaseError('Failed to fetch user by email')
  }
}

/**
 * -------------------- Create User --------------------
 * Performs:
 * - required field validation
 * - email uniqueness check
 */
let createUser = async (userData) => {
  let { name, email, password } = userData

  if (!name || !email || !password) {
    throw createValidationError('Name, email and password are required')
  }

  try {
    let existingUser = await getUserByEmail(email)

    if (existingUser) {
      throw createConflictError('Email already registered')
    }

    return await User.create({
      name,
      email: email.toLowerCase(),
      password
    })
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to create user')
  }
}

/**
 * -------------------- Update User Profile --------------------
 * Blocks:
 * - password changes
 * - system fields
 */
let updateUser = async (userId, updateData) => {
  if (!userId) {
    throw createValidationError('User ID is required')
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw createValidationError('Update data is required')
  }

  let prohibitedFields = ['password', '_id', 'createdAt', 'updatedAt']
  if (prohibitedFields.some(field => field in updateData)) {
    throw createValidationError(
      'Cannot update password or system field through this method'
    )
  }

  try {
    let user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )

    if (!user) {
      throw createNotFoundError('User not found')
    }

    return user
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to update user')
  }
}

/**
 * -------------------- Update User Password --------------------
 * Uses mongoose pre-save hook for hashing
 */
let updateUserPassword = async (userId, newPassword) => {
  if (!userId || !newPassword) {
    throw createValidationError('User ID and new password are required')
  }

  try {
    let user = await User.findById(userId)

    if (!user) {
      throw createNotFoundError('User not found')
    }

    user.password = newPassword
    await user.save()

    return user
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to update password')
  }
}

/**
 * -------------------- Delete User --------------------
 * Hard delete (admin-level operation)
 */
let deleteUser = async (userId) => {
  if (!userId) {
    throw createValidationError('User ID is required')
  }

  try {
    let user = await User.findByIdAndDelete(userId)

    if (!user) {
      throw createNotFoundError('User not found')
    }

    return user
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to delete user')
  }
}

/**
 * -------------------- Utility Checks --------------------
 */
let emailExists = async (email) => {
  if (!email) return false

  try {
    let user = await User.findOne({ email: email.toLowerCase() })
    return !!user
  } catch (error) {
    throw createDatabaseError('Failed to check email existence')
  }
}

let userExists = async (userId) => {
  if (!userId) return false

  try {
    let user = await User.findById(userId)
    return !!user
  } catch (error) {
    throw createDatabaseError('Failed to check user existence')
  }
}

/**
 * -------------------- Active Itinerary --------------------
 * Stores currently active itinerary/trip for user
 */
let updateActiveItinerary = async (userId, itineraryId) => {
  if (!userId) {
    throw createValidationError('User ID is required')
  }

  try {
    let user = await User.findByIdAndUpdate(
      userId,
      { activeItineraryId: itineraryId },
      { new: true, runValidators: true }
    )

    if (!user) {
      throw createNotFoundError('User not found')
    }

    return user
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to update active itinerary')
  }
}

/**
 * -------------------- Admin: Get All Users --------------------
 * Supports pagination & sorting
 */
let getAllUsers = async (options = {}) => {
  let page = parseInt(options.page) || 1
  let limit = parseInt(options.limit) || 10
  let sortBy = options.sortBy || '-createdAt'
  let skip = (page - 1) * limit

  try {
    let [users, total] = await Promise.all([
      User.find()
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      User.countDocuments()
    ])

    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  } catch (error) {
    throw createDatabaseError('Failed to fetch users')
  }
}

/**
 * -------------------- Search Users --------------------
 * Search by name or email (case-insensitive)
 */
let searchUsers = async (searchTerm, options = {}) => {
  if (!searchTerm) {
    throw createValidationError('Search term is required')
  }

  let page = parseInt(options.page) || 1
  let limit = parseInt(options.limit) || 10
  let skip = (page - 1) * limit

  try {
    let searchRegex = new RegExp(searchTerm, 'i')

    let query = {
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    }

    let [users, total] = await Promise.all([
      User.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ])

    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  } catch (error) {
    throw createDatabaseError('Failed to search users')
  }
}

module.exports = {
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  emailExists,
  userExists,
  updateActiveItinerary,
  getAllUsers,
  searchUsers
}