/**
 * Dependency Injection Container
 */
import { PrismaClient } from "@prisma/client";
import { IUserRepository, IUserService } from "./types/users";
import { UserController } from "./controllers/users";
import { IServiceProviderRepository, IServiceProviderService } from "./types/serviceProviders";
import { ServiceProviderController } from "./controllers/serviceProviders";
import { ISubscriptionRepository, ISubscriptionSlotRepository, ISubscriptionRequestRepository, ISubscriptionService, ISlotAssignmentService } from "./types/subscriptions";
import { SubscriptionController } from "./controllers/subscriptions";
import { ICountryRepository, ICountryService } from "./types/countries";
import { CountryController } from "./controllers/countries";
import { ICurrencyRepository, ICurrencyService } from "./types/currencies";
import { CurrencyController } from "./controllers/currencies";
export declare class Container {
    private static instance;
    private prisma;
    private userRepository;
    private userService;
    private userController;
    private serviceProviderRepository;
    private serviceProviderService;
    private serviceProviderController;
    private subscriptionRepository;
    private subscriptionSlotRepository;
    private subscriptionRequestRepository;
    private subscriptionService;
    private slotAssignmentService;
    private subscriptionController;
    private countryRepository;
    private countryService;
    private countryController;
    private currencyRepository;
    private currencyService;
    private currencyController;
    private constructor();
    static getInstance(): Container;
    getUserRepository(): IUserRepository;
    getUserService(): IUserService;
    getUserController(): UserController;
    getServiceProviderRepository(): IServiceProviderRepository;
    getServiceProviderService(): IServiceProviderService;
    getServiceProviderController(): ServiceProviderController;
    getSubscriptionRepository(): ISubscriptionRepository;
    getSubscriptionSlotRepository(): ISubscriptionSlotRepository;
    getSubscriptionRequestRepository(): ISubscriptionRequestRepository;
    getSubscriptionService(): ISubscriptionService;
    getSlotAssignmentService(): ISlotAssignmentService;
    getSubscriptionController(): SubscriptionController;
    getCountryRepository(): ICountryRepository;
    getCountryService(): ICountryService;
    getCountryController(): CountryController;
    getCurrencyRepository(): ICurrencyRepository;
    getCurrencyService(): ICurrencyService;
    getCurrencyController(): CurrencyController;
    getPrisma(): PrismaClient;
    disconnect(): Promise<void>;
    resolve<T>(name: string): T;
}
export declare const container: Container;
export default container;
//# sourceMappingURL=container.d.ts.map