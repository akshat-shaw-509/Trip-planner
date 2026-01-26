const app = require('./app')
const config = require('./config/env')
const { connectDB } = require('./config/database')

// Load models
require('./models/User.model')
require('./models/RefreshToken.model')
require('./models/AuditLog.model')

const startServer = async () => {
  let server

  try {
    await connectDB()

    server = app.listen(config.port, () => {
      console.log('🚀 Planora API running')
      console.log(`Port: ${config.port}`)
      console.log(`Env: ${config.env}`)
      console.log('─'.repeat(40))
    })
  } catch (error) {
    console.error('❌ Server failed to start:', error)
    process.exit(1)
  }

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`)
    if (server) {
      server.close(() => {
        console.log('Process terminated')
        process.exit(0)
      })
    }
  }

  // Graceful shutdown handlers
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
    shutdown('ERROR')
  })

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    shutdown('ERROR')
  })

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

startServer()
