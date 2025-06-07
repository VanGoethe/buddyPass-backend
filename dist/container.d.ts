/**
 * Dependency Injection Container
 */
import { PrismaClient } from "@prisma/client";
import { IUserRepository, IUserService } from "./types/users";
import { UserController } from "./controllers/users";
import { IServiceProviderRepository, IServiceProviderService } from "./types/serviceProviders";
import { ServiceProviderController } from "./controllers/serviceProviders";
import { ISubscriptionRepository, ISubscriptionService } from "./types/subscriptions";
import { SubscriptionController } from "./controllers/subscriptions";
import { ICountryRepository, ICountryService } from "./types/countries";
import { CountryController } from "./controllers/countries";
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
    private subscriptionService;
    private subscriptionController;
    private countryRepository;
    private countryService;
    private countryController;
    private constructor();
    static getInstance(): Container;
    getUserRepository(): IUserRepository;
    getUserService(): IUserService;
    getUserController(): UserController;
    getServiceProviderRepository(): IServiceProviderRepository;
    getServiceProviderService(): IServiceProviderService;
    getServiceProviderController(): ServiceProviderController;
    getSubscriptionRepository(): ISubscriptionRepository;
    getSubscriptionService(): ISubscriptionService;
    getSubscriptionController(): SubscriptionController;
    getCountryRepository(): ICountryRepository;
    getCountryService(): ICountryService;
    getCountryController(): CountryController;
    getPrisma(): PrismaClient;
    disconnect(): Promise<void>;
    resolve<T>(name: string): T;
}
export declare const container: Container;
export default container;
//# sourceMappingURL=container.d.ts.map