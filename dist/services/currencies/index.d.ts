/**
 * Currency Service Implementation
 */
import { ICurrencyService, ICurrencyRepository, CreateCurrencyData, UpdateCurrencyData, CurrencyResponse, CurrencyListResponse, CurrencyQueryOptions } from "../../types/currencies";
export declare class CurrencyService implements ICurrencyService {
    private currencyRepository;
    constructor(currencyRepository: ICurrencyRepository);
    createCurrency(data: CreateCurrencyData): Promise<CurrencyResponse>;
    getCurrencyById(id: string): Promise<CurrencyResponse>;
    getCurrencyByCode(code: string): Promise<CurrencyResponse>;
    getCurrencies(options?: CurrencyQueryOptions): Promise<CurrencyListResponse>;
    getActiveCurrencies(): Promise<CurrencyResponse[]>;
    updateCurrency(id: string, data: UpdateCurrencyData): Promise<CurrencyResponse>;
    deleteCurrency(id: string): Promise<void>;
}
export declare const createCurrencyService: (currencyRepository: ICurrencyRepository) => ICurrencyService;
//# sourceMappingURL=index.d.ts.map