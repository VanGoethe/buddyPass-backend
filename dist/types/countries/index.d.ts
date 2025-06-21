/**
 * Country Type Definitions
 */
export interface ICountry {
    id: string;
    name: string;
    code: string;
    alpha3: string;
    numericCode?: string | null;
    continent?: string | null;
    region?: string | null;
    currencyId?: string | null;
    phoneCode?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateCountryData {
    name: string;
    code: string;
    alpha3: string;
    numericCode?: string;
    continent?: string;
    region?: string;
    currencyId?: string;
    phoneCode?: string;
    isActive?: boolean;
}
export interface UpdateCountryData {
    name?: string;
    code?: string;
    alpha3?: string;
    numericCode?: string;
    continent?: string;
    region?: string;
    currencyId?: string;
    phoneCode?: string;
    isActive?: boolean;
}
export interface CountryResponse {
    id: string;
    name: string;
    code: string;
    alpha3: string;
    numericCode?: string | null;
    continent?: string | null;
    region?: string | null;
    currencyId?: string | null;
    phoneCode?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CountryListResponse {
    countries: CountryResponse[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
export interface CountryQueryOptions {
    page?: number;
    limit?: number;
    sortBy?: "name" | "code" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
    search?: string;
    continent?: string;
    region?: string;
    isActive?: boolean;
}
export interface ICountryRepository {
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
export interface ICountryService {
    createCountry(data: CreateCountryData): Promise<CountryResponse>;
    getCountryById(id: string): Promise<CountryResponse>;
    getCountryByCode(code: string): Promise<CountryResponse>;
    getCountries(options?: CountryQueryOptions): Promise<CountryListResponse>;
    getActiveCountries(): Promise<CountryResponse[]>;
    updateCountry(id: string, data: UpdateCountryData): Promise<CountryResponse>;
    deleteCountry(id: string): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map