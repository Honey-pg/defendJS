import morgan from "morgan";
import { logger } from "./winstonSetup";

export const requestLogger = morgan(
    ":method :url :status :response-time ms",
    {
        stream: {
            write: (message) => {
                logger.http(message.trim());
            }
        }
    }
);
