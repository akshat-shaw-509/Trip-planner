let app = require('./app')
let config = require('./config/env')
let { connectDB } = require('./config/database')

let startServer = async () => {
  let server
  try {
    // Connect to MongoDB
    await connectDB()

    // Start server
    server = app.listen(config.port, () => {
      console.log('Planora API running')
      console.log(`Port: ${config.port}`)
      console.log(`Env: ${config.env}`)
      console.log('─'.repeat(40))
    })
  } catch (error) {
    console.error('Server failed to start:', error.message)
    process.exit(1)
  }

  let shutdown = (signal) => {
    console.log(`${signal} received. Shutting down...`)
    server?.close(() => {
      console.log('Process terminated')
      process.exit(0)
    })
  }
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    shutdown('ERROR')
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    shutdown(ERROR)
  })

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

startServer();