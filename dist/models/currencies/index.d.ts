/**
 * Currency Domain Model
 */
import { ICurrency, CreateCurrencyData, UpdateCurrencyData, CurrencyResponse } from "../../types/currencies";
export declare class Currency implements ICurrency {
    readonly id: string;
    readonly name: string;
    readonly code: string;
    readonly symbol?: string | null;
    readonly minorUnit: number;
    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(data: ICurrency);
    /**
     * Validates currency creation data
     */
    static validateCreateData(data: CreateCurrencyData): void;
    /**
     * Validates currency update data
     */
    static validateUpdateData(data: UpdateCurrencyData): void;
    /**
     * Normalizes currency data for storage
     */
    static normalizeData(data: CreateCurrencyData | UpdateCurrencyData): any;
    /**
     * Converts to API response format
     */
    toResponse(): CurrencyResponse;
    /**
     * Creates Currency instance from Prisma result
     */
    static fromPrisma(data: any): Currency;
}
//# sourceMappingURL=index.d.ts.map