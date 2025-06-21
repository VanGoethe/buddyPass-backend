/**
 * Currency Repository Implementation
 */
import { PrismaClient } from "@prisma/client";
import { ICurrency, CreateCurrencyData, UpdateCurrencyData, CurrencyQueryOptions, ICurrencyRepository } from "../../types/currencies";
export declare class PrismaCurrencyRepository implements ICurrencyRepository {
    private prisma;
    constructor(prisma: PrismaClient);
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
export declare const createCurrencyRepository: (prisma: PrismaClient) => ICurrencyRepository;
//# sourceMappingURL=index.d.ts.map