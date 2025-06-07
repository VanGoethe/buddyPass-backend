/**
 * Country Service Implementation
 */
import { ICountryService, ICountryRepository, CreateCountryData, UpdateCountryData, CountryResponse, CountryListResponse, CountryQueryOptions } from "../../types/countries";
export declare class CountryService implements ICountryService {
    private countryRepository;
    constructor(countryRepository: ICountryRepository);
    createCountry(data: CreateCountryData): Promise<CountryResponse>;
    getCountryById(id: string): Promise<CountryResponse>;
    getCountryByCode(code: string): Promise<CountryResponse>;
    getCountries(options?: CountryQueryOptions): Promise<CountryListResponse>;
    getActiveCountries(): Promise<CountryResponse[]>;
    updateCountry(id: string, data: UpdateCountryData): Promise<CountryResponse>;
    deleteCountry(id: string): Promise<void>;
}
export declare const createCountryService: (countryRepository: ICountryRepository) => ICountryService;
//# sourceMappingURL=index.d.ts.map