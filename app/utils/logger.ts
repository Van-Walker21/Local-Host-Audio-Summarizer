import fs from 'fs/promises';
import path from 'path';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

class Logger {
  private logFile: string;

  constructor() {
    const logsDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    this.ensureLogDirectory(logsDir);
  }

  private async ensureLogDirectory(logsDir: string) {
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory', error);
    }
  }

  private async writeLog(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
      timestamp,
      level,
      message,
      ...metadata
    }) + '\n';

    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.error('Logging failed', error);
    }
  }

  info(message: string, metadata?: Record<string, any>) {
    this.writeLog(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.writeLog(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.writeLog(LogLevel.ERROR, message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.writeLog(LogLevel.DEBUG, message, metadata);
  }
}

export default new Logger();
