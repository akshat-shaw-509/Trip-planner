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
 */
let getUserById = async (userId) => {
  if (!userId) {
    throw createValidationError('User ID is required')
  }

  try {
    let user = await User.findById(userId)

    if (!user) {
      throw createNotFoundError('User not found')
    }

    return user
  } catch (error) {
    if (error.isOperational) throw error
    throw createDatabaseError('Failed to fetch user by ID')
  }
}

/**
 * -------------------- Get User By Email --------------------
 * Used internally for authentication
 */
let getUserByEmail = async (email) => {
  if (!email) {
    throw createValidationError('Email is required')
  }

  try {
    return await User.findOne({ email: email.toLowerCase() })
  } catch (error) {
    throw createDatabaseError('Failed to fetch user by email')
  }
}

/**
 * -------------------- Create User --------------------
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
 * Blocks password & system fields
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
    throw createValidationError('Cannot update restricted fields')
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

module.exports = {
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
}
