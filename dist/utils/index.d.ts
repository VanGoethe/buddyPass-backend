/**
 * Common utility functions
 */
/**
 * Generate a random string of specified length
 */
export declare const generateRandomString: (length?: number) => string;
/**
 * Validate email format
 */
export declare const isValidEmail: (email: string) => boolean;
/**
 * Calculate pagination offset
 */
export declare const calculatePagination: (page?: number, limit?: number) => {
    offset: number;
    limit: number;
};
/**
 * Format date to ISO string
 */
export declare const formatDate: (date: Date) => string;
/**
 * Sleep utility for async operations
 */
export declare const sleep: (ms: number) => Promise<void>;
//# sourceMappingURL=index.d.ts.map