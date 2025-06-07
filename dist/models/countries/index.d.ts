/**
 * Country Domain Model
 */
import { ICountry, CreateCountryData, UpdateCountryData, CountryResponse } from "../../types/countries";
export declare class Country implements ICountry {
    readonly id: string;
    readonly name: string;
    readonly code: string;
    readonly alpha3: string;
    readonly numericCode?: string | null;
    readonly continent?: string | null;
    readonly region?: string | null;
    readonly currency?: string | null;
    readonly phoneCode?: string | null;
    readonly isActive: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    constructor(data: ICountry);
    /**
     * Validates country creation data
     */
    static validateCreateData(data: CreateCountryData): void;
    /**
     * Validates country update data
     */
    static validateUpdateData(data: UpdateCountryData): void;
    /**
     * Normalizes country data for storage
     */
    static normalizeData(data: CreateCountryData | UpdateCountryData): any;
    /**
     * Converts domain model to API response format
     */
    toResponse(): CountryResponse;
    /**
     * Creates a Country instance from Prisma result
     */
    static fromPrisma(data: any): Country;
}
//# sourceMappingURL=index.d.ts.map