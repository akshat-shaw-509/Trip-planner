<<<<<<< HEAD
let bcrypt = require('bcryptjs')
let getSaltRounds=()=>{
    let rounds=parseInt(process.env.BCRYPT_SALT_ROUNDS)
    if(rounds && rounds>=4 && rounds<=31){
        return rounds
    }
    return 12
}

let hashPassword=async(plainPassword)=>{
    if(!plainPassword){
        throw Error('Password is required for hashing')
    }
    if(typeof plainPassword!=='string'){
        throw Error('Password must be a string')
    }
    if(plainPassword.length===0){
        throw Error('Password cannot be empty')
    }
    if(Buffer.byteLength(plainPassword,'utf8')>72){
        throw Error('Password is too long (max 72 bytes)')
    }
    try{
        let saltRounds=getSaltRounds()
        let hashedPassword=await bcrypt.hash(plainPassword,saltRounds)
        return hashedPassword
    } catch(error){
        throw Error('Failed to hash password')
    }
}

let comparePassword=async(plainPassword,hashedPassword)=>{
    if(!plainPassword || !hashedPassword){
        return false
    }
    try{
        let isMatch=await bcrypt.compare(plainPassword,hashedPassword)
        return isMatch
    } catch(error){
        return false
    }
}

let validatePasswordStrength=(password)=>{
    let errors=[]
    if(!password){
        return{isValid:false,errors:['Password is required']}
    }
    if(typeof password!=='string'){
        return{isValid:false,errors:['Password must be a string']}
    }
    if(password.length<8){
        errors.push('Password must be at least 8 characters long')
    }
    if(Buffer.byteLength(password,'utf8')>72){
        errors.push('Password is too long (max 72 bytes)')
    }
    let hasUpperCase=/[A-Z]/.test(password)
    let hasLowerCase=/[a-z]/.test(password)
    let hasNumber=/[0-9]/.test(password)
    let hasSpecialChar=/[!@#$%^&*(),.?":{}|<>]/.test(password)

    let characterTypeCount=[hasUpperCase,hasLowerCase,hasNumber,hasSpecialChar].filter(Boolean).length
    if(characterTypeCount<3){
        errors.push('Password should contain at least 3 of: uppercase, lowercase, numbers, special characters')
    }
    let commonPasswords=[
        'password', 'password123', '12345678', 'qwerty', 
    'abc123', 'letmein', 'welcome', 'monkey'
    ]
    if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password')
  }
  return{
    isValid:errors.length===0,
    errors
  }
}

let isBCryptHash=(hash)=>{
    if(!hash||typeof hash!=='string'){
        return false
    }
    let bcryptRegex=/^\$2[ayb]\$\d{2}\$.{53}$/
    return bcryptRegex.test(hash)
}

let getHashCostFactor=(hash)=>{
    if(!isBCryptHash(hash)){
        return null
    }
    let costFactor=parseInt(hash.substring(4,6),10)
    return isNaN(costFactor)?null:costFactor
}

let needsRehash=(hash,minCostFactor=null)=>{
    let currentCost=getHashCostFactor(hash)
    if(currentCost===null){
        return true
    }
    let minCost=minCostFactor||getSaltRounds()
    return currentCost<minCost
}

let generateSalt=async(rounds=null)=>{
    let saltRounds=rounds||getSaltRounds()
    try{
        let salt=await bcrypt.genSalt(saltRounds)
        return salt
    } catch(error){
        throw Error('Failed to generate salt')
    }
}

let hashWithSalt=async(plainPassword,salt)=>{
    if(!plainPassword||!salt){
        throw Error('Password and salt are required')
    }
    try{
        let hashedPassword=await bcrypt.hash(plainPassword,salt)
        return hashedPassword
    } catch(error){
        throw Error('Failed to hash password with salt')
    }
}

module.exports={
    hashPassword,
    comparePassword,
    validatePasswordStrength,
    isBCryptHash,
    getHashCostFactor,
    needsRehash,
    generateSalt,
    hashWithSalt
=======
let bcrypt = require('bcryptjs')
let getSaltRounds=()=>{
    let rounds=parseInt(process.env.BCRYPT_SALT_ROUNDS)
    if(rounds && rounds>=4 && rounds<=31){
        return rounds
    }
    return 12
}

let hashPassword=async(plainPassword)=>{
    if(!plainPassword){
        throw Error('Password is required for hashing')
    }
    if(typeof plainPassword!=='string'){
        throw Error('Password must be a string')
    }
    if(plainPassword.length===0){
        throw Error('Password cannot be empty')
    }
    if(Buffer.byteLength(plainPassword,'utf8')>72){
        throw Error('Password is too long (max 72 bytes)')
    }
    try{
        let saltRounds=getSaltRounds()
        let hashedPassword=await bcrypt.hash(plainPassword,saltRounds)
        return hashedPassword
    } catch(error){
        throw Error('Failed to hash password')
    }
}

let comparePassword=async(plainPassword,hashedPassword)=>{
    if(!plainPassword || !hashedPassword){
        return false
    }
    try{
        let isMatch=await bcrypt.compare(plainPassword,hashedPassword)
        return isMatch
    } catch(error){
        return false
    }
}

let validatePasswordStrength=(password)=>{
    let errors=[]
    if(!password){
        return{isValid:false,errors:['Password is required']}
    }
    if(typeof password!=='string'){
        return{isValid:false,errors:['Password must be a string']}
    }
    if(password.length<8){
        errors.push('Password must be at least 8 characters long')
    }
    if(Buffer.byteLength(password,'utf8')>72){
        errors.push('Password is too long (max 72 bytes)')
    }
    let hasUpperCase=/[A-Z]/.test(password)
    let hasLowerCase=/[a-z]/.test(password)
    let hasNumber=/[0-9]/.test(password)
    let hasSpecialChar=/[!@#$%^&*(),.?":{}|<>]/.test(password)

    let characterTypeCount=[hasUpperCase,hasLowerCase,hasNumber,hasSpecialChar].filter(Boolean).length
    if(characterTypeCount<3){
        errors.push('Password should contain at least 3 of: uppercase, lowercase, numbers, special characters')
    }
    let commonPasswords=[
        'password', 'password123', '12345678', 'qwerty', 
    'abc123', 'letmein', 'welcome', 'monkey'
    ]
    if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password')
  }
  return{
    isValid:errors.length===0,
    errors
  }
}

let isBCryptHash=(hash)=>{
    if(!hash||typeof hash!=='string'){
        return false
    }
    let bcryptRegex=/^\$2[ayb]\$\d{2}\$.{53}$/
    return bcryptRegex.test(hash)
}

let getHashCostFactor=(hash)=>{
    if(!isBCryptHash(hash)){
        return null
    }
    let costFactor=parseInt(hash.substring(4,6),10)
    return isNaN(costFactor)?null:costFactor
}

let needsRehash=(hash,minCostFactor=null)=>{
    let currentCost=getHashCostFactor(hash)
    if(currentCost===null){
        return true
    }
    let minCost=minCostFactor||getSaltRounds()
    return currentCost<minCost
}

let generateSalt=async(rounds=null)=>{
    let saltRounds=rounds||getSaltRounds()
    try{
        let salt=await bcrypt.genSalt(saltRounds)
        return salt
    } catch(error){
        throw Error('Failed to generate salt')
    }
}

let hashWithSalt=async(plainPassword,salt)=>{
    if(!plainPassword||!salt){
        throw Error('Password and salt are required')
    }
    try{
        let hashedPassword=await bcrypt.hash(plainPassword,salt)
        return hashedPassword
    } catch(error){
        throw Error('Failed to hash password with salt')
    }
}

module.exports={
    hashPassword,
    comparePassword,
    validatePasswordStrength,
    isBCryptHash,
    getHashCostFactor,
    needsRehash,
    generateSalt,
    hashWithSalt
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
}