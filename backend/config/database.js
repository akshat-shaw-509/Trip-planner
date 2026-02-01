const mongoose = require('mongoose')
let isConnected=false

let connectDB = async () => {
  if(isConnected) return
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    isConnected=true
    console.log(`MongoDB Connected: ${mongoose.connection.host}`)
    process.on('SIGINT',closeConnection)
    process.on('SIGTERM',closeConnection)
    }catch(error){
      console.error('MongoDB connection error:', error.message)
      process.exit(1)
    }
  }
    let closeConnection=async()=>{
      try{
        await mongoose.connection.close()
        console.log('MongoDB disconnected')
        process.exit(0)
      } catch(error){
        console.error('MongoDB close error:', error.message)
        process.exit(1)
      }
    }
let disconnectDB = async () => {
  try {
    await mongoose.connection.close()
    console.log('MongoDB disconnected')
  } catch (error) {
    console.error('Disconnect error:', error.message)
  }
}

module.exports = { connectDB, disconnectDB }
