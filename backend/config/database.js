let mongoose = require('mongoose')

let connectDB = async () => {
  try {
    let conn = await mongoose.connect(process.env.MONGODB_URI)

    console.log(`MongoDB Connected: ${conn.connection.host}`)

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB disconnected (SIGINT)');
      process.exit(0);
    })

    process.on('SIGTERM', async () => {
      await mongoose.connection.close()
      console.log('MongoDB disconnected (SIGTERM)')
      process.exit(0)
    })
    return conn
  } catch (error) {
    console.error('MongoDB connection error:', error.message)
    process.exit(1)
  }
}

let disconnectDB = async () => {
  try {
    await mongoose.connection.close()
    console.log('MongoDB disconnected')
  } catch (error) {
    console.error('Disconnect error:', error.message)
    throw error
  }
}

module.exports = { connectDB, disconnectDB }