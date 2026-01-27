export interface LockoutData {
    attempts: number;
    lockUntil: number | null;
    firstFailAt: number;
}

export interface LockoutAdapter {
    /**
     * Get lockout data for a key
     */
    get(key: string): Promise<LockoutData | null>;

    /**
     * Save lockout data for a key
     */
    set(key: string, data: LockoutData): Promise<void>;

    /**
     * Delete lockout data for a key
     */
    delete(key: string): Promise<void>;

    /**
     * Clean up expired entries (maintenance)
    */
    cleanup(windowMs: number): Promise<void>;
}
