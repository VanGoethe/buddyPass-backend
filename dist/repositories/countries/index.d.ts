/**
 * Country Repository Implementation
 */
import { PrismaClient } from "@prisma/client";
import { ICountry, CreateCountryData, UpdateCountryData, CountryQueryOptions, ICountryRepository } from "../../types/countries";
export declare class PrismaCountryRepository implements ICountryRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateCountryData): Promise<ICountry>;
    findById(id: string): Promise<ICountry | null>;
    findByCode(code: string): Promise<ICountry | null>;
    findByAlpha3(alpha3: string): Promise<ICountry | null>;
    findMany(options?: CountryQueryOptions): Promise<{
        countries: ICountry[];
        total: number;
    }>;
    findActive(): Promise<ICountry[]>;
    update(id: string, data: UpdateCountryData): Promise<ICountry>;
    delete(id: string): Promise<void>;
    existsByCode(code: string, excludeId?: string): Promise<boolean>;
    existsByAlpha3(alpha3: string, excludeId?: string): Promise<boolean>;
    existsByName(name: string, excludeId?: string): Promise<boolean>;
}
export declare const createCountryRepository: (prisma: PrismaClient) => ICountryRepository;
//# sourceMappingURL=index.d.ts.map