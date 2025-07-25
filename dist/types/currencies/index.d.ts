/**
 * Currency Type Definitions
 */
export interface ICurrency {
    id: string;
    name: string;
    code: string;
    symbol?: string | null;
    minorUnit: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateCurrencyData {
    name: string;
    code: string;
    symbol?: string;
    minorUnit?: number;
    isActive?: boolean;
}
export interface UpdateCurrencyData {
    name?: string;
    code?: string;
    symbol?: string;
    minorUnit?: number;
    isActive?: boolean;
}
export interface CurrencyResponse {
    id: string;
    name: string;
    code: string;
    symbol?: string | null;
    minorUnit: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CurrencyListResponse {
    currencies: CurrencyResponse[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
export interface CurrencyQueryOptions {
    page?: number;
    limit?: number;
    sortBy?: "name" | "code" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
    search?: string;
    isActive?: boolean;
}
export interface ICurrencyRepository {
    create(data: CreateCurrencyData): Promise<ICurrency>;
    findById(id: string): Promise<ICurrency | null>;
    findByCode(code: string): Promise<ICurrency | null>;
    findMany(options?: CurrencyQueryOptions): Promise<{
        currencies: ICurrency[];
        total: number;
    }>;
    findActive(): Promise<ICurrency[]>;
    update(id: string, data: UpdateCurrencyData): Promise<ICurrency>;
    delete(id: string): Promise<void>;
    existsByCode(code: string, excludeId?: string): Promise<boolean>;
    existsByName(name: string, excludeId?: string): Promise<boolean>;
}
export interface ICurrencyService {
    createCurrency(data: CreateCurrencyData): Promise<CurrencyResponse>;
    getCurrencyById(id: string): Promise<CurrencyResponse>;
    getCurrencyByCode(code: string): Promise<CurrencyResponse>;
    getCurrencies(options?: CurrencyQueryOptions): Promise<CurrencyListResponse>;
    getActiveCurrencies(): Promise<CurrencyResponse[]>;
    updateCurrency(id: string, data: UpdateCurrencyData): Promise<CurrencyResponse>;
    deleteCurrency(id: string): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map