/**
 * Dependency Injection Container
 */

import { PrismaClient } from "@prisma/client";
import { createUserRepository } from "./repositories/users";
import { createUserService } from "./services/users";
import { createUserController } from "./controllers/users";
import { IUserRepository, IUserService } from "./types/users";
import { UserController } from "./controllers/users";

// ServiceProvider imports
import { createServiceProviderRepository } from "./repositories/serviceProviders";
import { createServiceProviderService } from "./services/serviceProviders";
import { createServiceProviderController } from "./controllers/serviceProviders";
import {
  IServiceProviderRepository,
  IServiceProviderService,
} from "./types/serviceProviders";
import { ServiceProviderController } from "./controllers/serviceProviders";

// Subscription imports
import { createSubscriptionRepository } from "./repositories/subscriptions";
import { createSubscriptionService } from "./services/subscriptions";
import { createSubscriptionController } from "./controllers/subscriptions";
import {
  ISubscriptionRepository,
  ISubscriptionService,
} from "./types/subscriptions";
import { SubscriptionController } from "./controllers/subscriptions";

// Country imports
import { createCountryRepository } from "./repositories/countries";
import { createCountryService } from "./services/countries";
import { createCountryController } from "./controllers/countries";
import { ICountryRepository, ICountryService } from "./types/countries";
import { CountryController } from "./controllers/countries";

export class Container {
  private static instance: Container;
  private prisma: PrismaClient;

  // User module
  private userRepository: IUserRepository;
  private userService: IUserService;
  private userController: UserController;

  // ServiceProvider module
  private serviceProviderRepository: IServiceProviderRepository;
  private serviceProviderService: IServiceProviderService;
  private serviceProviderController: ServiceProviderController;

  // Subscription module
  private subscriptionRepository: ISubscriptionRepository;
  private subscriptionService: ISubscriptionService;
  private subscriptionController: SubscriptionController;

  // Country module
  private countryRepository: ICountryRepository;
  private countryService: ICountryService;
  private countryController: CountryController;

  private constructor() {
    // Initialize Prisma client
    this.prisma = new PrismaClient();

    // Initialize Country module (base dependency)
    this.countryRepository = createCountryRepository(this.prisma);
    this.countryService = createCountryService(this.countryRepository);
    this.countryController = createCountryController(this.countryService);

    // Initialize User module
    this.userRepository = createUserRepository(this.prisma);
    this.userService = createUserService(this.userRepository);
    this.userController = createUserController(this.userService);

    // Initialize ServiceProvider module
    this.serviceProviderRepository = createServiceProviderRepository(
      this.prisma
    );
    this.serviceProviderService = createServiceProviderService(
      this.serviceProviderRepository,
      this.countryRepository
    );
    this.serviceProviderController = createServiceProviderController(
      this.serviceProviderService
    );

    // Initialize Subscription module (depends on ServiceProvider and Country)
    this.subscriptionRepository = createSubscriptionRepository(this.prisma);
    this.subscriptionService = createSubscriptionService(
      this.subscriptionRepository,
      this.serviceProviderRepository,
      this.countryRepository
    );
    this.subscriptionController = createSubscriptionController(
      this.subscriptionService
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  // User module getters
  public getUserRepository(): IUserRepository {
    return this.userRepository;
  }

  public getUserService(): IUserService {
    return this.userService;
  }

  public getUserController(): UserController {
    return this.userController;
  }

  // ServiceProvider module getters
  public getServiceProviderRepository(): IServiceProviderRepository {
    return this.serviceProviderRepository;
  }

  public getServiceProviderService(): IServiceProviderService {
    return this.serviceProviderService;
  }

  public getServiceProviderController(): ServiceProviderController {
    return this.serviceProviderController;
  }

  // Subscription module getters
  public getSubscriptionRepository(): ISubscriptionRepository {
    return this.subscriptionRepository;
  }

  public getSubscriptionService(): ISubscriptionService {
    return this.subscriptionService;
  }

  public getSubscriptionController(): SubscriptionController {
    return this.subscriptionController;
  }

  // Country module getters
  public getCountryRepository(): ICountryRepository {
    return this.countryRepository;
  }

  public getCountryService(): ICountryService {
    return this.countryService;
  }

  public getCountryController(): CountryController {
    return this.countryController;
  }

  // General getters
  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Generic resolve method for dependency injection
  public resolve<T>(name: string): T {
    switch (name) {
      case "userRepository":
        return this.userRepository as T;
      case "userService":
        return this.userService as T;
      case "userController":
        return this.userController as T;
      case "serviceProviderRepository":
        return this.serviceProviderRepository as T;
      case "serviceProviderService":
        return this.serviceProviderService as T;
      case "serviceProviderController":
        return this.serviceProviderController as T;
      case "subscriptionRepository":
        return this.subscriptionRepository as T;
      case "subscriptionService":
        return this.subscriptionService as T;
      case "subscriptionController":
        return this.subscriptionController as T;
      case "countryRepository":
        return this.countryRepository as T;
      case "countryService":
        return this.countryService as T;
      case "countryController":
        return this.countryController as T;
      case "prisma":
        return this.prisma as T;
      default:
        throw new Error(`Unknown dependency: ${name}`);
    }
  }
}

// Export singleton instance
export const container = Container.getInstance();

export default container;
