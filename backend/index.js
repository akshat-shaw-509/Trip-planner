const app = require('./app')
const config = require('./config/env')
const { connectDB } = require('./config/database')

const startServer = async () => {
  try {
    await connectDB()

    const server = app.listen(config.port, () => {
      console.log(`🚀 Planora API running on port ${config.port} (${config.env})`)
    })

    // Graceful shutdown
    const gracefulShutdown = () => {
      server.close(() => {
        process.exit(0)
      })
    }

    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)

    // Handle async errors
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err)
      gracefulShutdown()
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
