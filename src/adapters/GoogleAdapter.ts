import { OAuth2Client, LoginTicket } from "google-auth-library";
import { AdapterError } from "../core/errors/AdapterError";
import { logger } from "../logging";

export interface GoogleTokenPayload {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
    [key: string]: any;
}

export class GoogleAdapter {
    private client: OAuth2Client;
    private clientId?: string;

    constructor(clientId?: string) {
        if (clientId && clientId.trim().length === 0) {
            throw new AdapterError("Google clientId cannot be empty string");
        }

        this.client = new OAuth2Client(clientId);
        this.clientId = clientId;
    }

    async verifyIdToken(idToken: string): Promise<GoogleTokenPayload> {
        try {
            if (!idToken || typeof idToken !== "string") {
                throw new AdapterError("Invalid ID token provided");
            }

            const options: { idToken: string; audience?: string | string[] } = {
                idToken
            };

            if (this.clientId && this.clientId.trim().length > 0) {
                options.audience = this.clientId;
            }

            const ticket: LoginTicket = await this.client.verifyIdToken(options);
            const payload = ticket.getPayload();

            if (!payload) {
                logger.warn("Google ID token payload empty", {
                    adapter: "google-auth",
                    operation: "verifyIdToken",
                    hasClientId: !!this.clientId
                });

                throw new AdapterError("Invalid Google ID token payload.");
            }

            const result: GoogleTokenPayload = {
                sub: payload.sub,
                email: payload.email || "",
                email_verified: payload.email_verified || false,
                name: payload.name,
                picture: payload.picture
            };

            const { sub, email, email_verified, name, picture, ...rest } = payload;
            Object.assign(result, rest);

            return result;

        } catch (err: any) {
            logger.error("Google ID token verification failed", {
                adapter: "google-auth",
                operation: "verifyIdToken",
                hasClientId: !!this.clientId,
                reason: err?.message
            });

            if (err?.message?.includes("audience")) {
                throw new AdapterError("Invalid Google client ID configured.");
            }

            throw new AdapterError("Google token verification failed.");
        }
    }
}
