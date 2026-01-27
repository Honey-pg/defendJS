import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

//colors added 
winston.addColors({
    error: "red",
    warn: "yellow",
    info: "green",
    http: "cyan"
});

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaString =
        Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";

    return `${timestamp} ${level}: ${message}${metaString}`;
});

export const logger = winston.createLogger({
    level: "http", 
    format: combine(
        errors({ stack: true }),
        timestamp({ format: "HH:mm:ss" })
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize({ all: true }),
                logFormat
            )
        })
    ]
});

// Shortcut helpers
export const logInfo = (msg: string, meta: any = {}) =>
    logger.info(msg, meta);

export const logWarn = (msg: string, meta: any = {}) =>
    logger.warn(msg, meta);

export const logError = (msg: string, meta: any = {}) =>
    logger.error(msg, meta);
