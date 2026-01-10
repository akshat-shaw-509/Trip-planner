let User = require('../models/User.model')
let {
    createNotFoundError,
    createConflictError,
    createValidationError,
    createDatabaseError
} = require('../utils/errors')

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
        if (error.isOperational) {
            throw error
        }
        throw createDatabaseError('Failed to fetch user by user id')
    }
}

let getUserByEmail = async (email, options = {}) => {
    if (!email) {
        throw createValidationError('Email is required')
    }
    try {
        let query = User.findOne({ email: email.toLowerCase() })
        if (options.includePassword) {
            query = query.select('+password')
        }
        let user = await query
        return user
    } catch (error) {
        throw createDatabaseError('Failed to fetch user by email')
    }
}

let createUser = async (userData) => {
    let { name, email, password } = userData
    if (!name || !email || !password) {
        throw createValidationError('Name,email and password are required')
    }
    try {
        let existingUser = await getUserByEmail(email)
        if (existingUser) {
            throw createConflictError('Email already registered')
        }
        let user = await User.create({
            name,
            email: email.toLowerCase(),
            password
        })
        return user
    } catch (error) {
        if (error.isOperational) {
            throw error
        }
        throw createDatabaseError('Failed to create user')
    }
}

let updateUser = async (userId, updateData) => {
    if (!userId) {
        throw createValidationError('User ID is required')
    }
    if (!updateData || Object.keys(updateData).length === 0) {
        throw createValidationError('Update data is required')
    }
    let prohibitedFields = ['password', '_id', 'createdAt', 'updatedAt']
    let hasProhibitedField = prohibitedFields.some(field => field in updateData)
    if (hasProhibitedField) {
        throw createValidationError('Cannot update password or system field through this method')
    }
    try {
        let user = await User.findByIdAndUpdate(
            userId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        )
        if (!user) {
            throw createNotFoundError('User not found')
        }
        return user
    } catch (error) {
        if (error.isOperational) {
            throw error
        }
        throw createDatabaseError('Failed to update user')
    }
}

let updateUserPassword = async (userId, newPassword) => {
    if (!userId || !newPassword) {
        throw createValidationError('User ID and new password are required')
    } try {
        let user = await User.findById(userId)
        if (!user) {
            throw createNotFoundError('User not found')
        }
        user.password = newPassword
        await user.save()
        return user
    } catch (error) {
        if (error.isOperational) {
            throw error
        }
        throw createDatabaseError('Failed to update password')
    }
}

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
        if (error.isOperational) {
            throw error
        }
        throw createDatabaseError('Failed to delete user')
    }
}

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

let updateActiveItinerary = async (userId, itineraryId) => {
    if (!userId) throw createValidationError('User ID is required')
    try {
        let user = await User.findByIdAndUpdate(userId,
            {activeItineraryId:itineraryId},
            {new:true,runValidators:true}
        )
        if(!user){
            throw createNotFoundError('User not found')
        }
        return user
    } catch(error){
        if(error.isOperational){
            throw error
        }
        throw createDatabaseError('Failed to update active itinerary')
    }
}

let getAllUsers=async(options={})=>{
    let page=parseInt(options.page)||1
    let limit=parseInt(options.limit)||10
    let sortBy=options.sortBy||'-createdAt'
    let skip=(page-1)*limit
    try{
        let[users,total]=await Promise.all([
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
            pages:Math.ceil(total/limit)
        }
    } catch(error){
        throw createDatabaseError('Failed to fetch users')
    }
}

let searchUsers=async(searchTerm,options={})=>{
    if(!searchTerm) throw createValidationError('Search term is required')
    let page=parseInt(options.page)||1
    let limit=parseInt(options.limit)||10
    let skip=(page-1)*limit
    try{
        let searchRegex=new RegExp(searchTerm,'i')
        let query={
            $or:[
                {name:searchRegex},
                {email:searchRegex}
            ]
        }
        let [users,total]=await Promise.all([
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
            pages:Math.ceil(total/limit)
        }
    } catch(error){
        throw createDatabaseError('Failed to search users')
    }
}

module.exports={
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