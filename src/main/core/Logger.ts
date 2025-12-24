import is from 'electron-is'
import { type LogLevel } from 'electron-log'
import logger from 'electron-log/main'

const level: LogLevel = is.dev() ? 'silly' : 'info'

logger.transports.console.level = level
logger.transports.console.format = '{h}:{i}:{s} [{level}] {text}'

logger.transports.file.level = level
logger.transports.file.format = '{y}:{m}:{d} {h}:{i}:{s} [{level}] {text}'

// Initialize the logger to be available in renderer process
logger.initialize()

export default logger
