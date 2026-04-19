import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = format;

const isDev = process.env.NODE_ENV !== 'production';

export const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    isDev
      ? combine(colorize(), simple())
      : json()
  ),
  transports: [
    new transports.Console(),
  ],
  exitOnError: false,
});

export default logger;
