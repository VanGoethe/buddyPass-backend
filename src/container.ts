/**
 * Dependency Injection Container
 */

import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "./config/database";
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
import {
  PrismaSubscriptionRepository,
  PrismaSubscriptionSlotRepository,
  PrismaSubscriptionRequestRepository,
} from "./repositories/subscriptions";
import {
  SubscriptionService,
  SlotAssignmentService,
} from "./services/subscriptions";
import { createSubscriptionController } from "./controllers/subscriptions";
import {
  ISubscriptionRepository,
  ISubscriptionSlotRepository,
  ISubscriptionRequestRepository,
  ISubscriptionService,
  ISlotAssignmentService,
} from "./types/subscriptions";
import { SubscriptionController } from "./controllers/subscriptions";

// Country imports
import { createCountryRepository } from "./repositories/countries";
import { createCountryService } from "./services/countries";
import { createCountryController } from "./controllers/countries";
import { ICountryRepository, ICountryService } from "./types/countries";
import { CountryController } from "./controllers/countries";

// Currency imports
import { createCurrencyRepository } from "./repositories/currencies";
import { createCurrencyService } from "./services/currencies";
import { createCurrencyController } from "./controllers/currencies";
import { ICurrencyRepository, ICurrencyService } from "./types/currencies";
import { CurrencyController } from "./controllers/currencies";
import { AdminController } from "./controllers/admin";
import { AdminService, createAdminService } from "./services/admin";
import { CapacityForecastService } from "./services/capacity";
import { ICapacityForecastService } from "./types/capacity";
import { SmtpMailer } from "./services/mail/smtpMailer";
import { NotificationService } from "./services/notifications";
import { HttpIhellaClient } from "./services/payments/ihellaClient";
import { PaymentService } from "./services/payments";
import { SeatHandoff } from "./services/payments/afterConfirmation";
import { PaymentController } from "./controllers/payments";
import { PrismaRevealStore } from "./repositories/reveals";
import { ImapInboxClient } from "./services/inbox/imapInboxClient";
import { InboxService } from "./services/inbox";
import { IncidentService } from "./services/incidents";
import { NotificationPublisher } from "./realtime";
import { LoginCodeQueue } from "./services/loginCodes";
import { LoginCodeHelpService } from "./services/loginCodeHelp";
import { LoginCodeHelpController } from "./controllers/loginCodeHelp";
import {
  IncidentController,
  LoginCodeController,
  NotificationController,
} from "./controllers/notifications";
import { env } from "./config/env";

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
  private subscriptionSlotRepository: ISubscriptionSlotRepository;
  private subscriptionRequestRepository: ISubscriptionRequestRepository;
  private subscriptionService: ISubscriptionService;
  private slotAssignmentService: ISlotAssignmentService;
  private subscriptionController: SubscriptionController;

  // Country module
  private countryRepository: ICountryRepository;
  private countryService: ICountryService;
  private countryController: CountryController;

  // Currency module
  private currencyRepository: ICurrencyRepository;
  private currencyService: ICurrencyService;
  private currencyController: CurrencyController;
  private adminService: AdminService;
  private adminController: AdminController;
  private capacityForecastService: ICapacityForecastService;
  private notificationService: NotificationService;
  private paymentService: PaymentService;
  private paymentController: PaymentController;
  private inboxService: InboxService;
  private incidentService: IncidentService;
  private notificationController: NotificationController;
  private incidentController: IncidentController;
  private loginCodeController: LoginCodeController;
  private loginCodeQueue: LoginCodeQueue;
  private loginCodeHelp: LoginCodeHelpService;
  private loginCodeHelpController: LoginCodeHelpController;
  private notificationPublisher: NotificationPublisher;

  private constructor() {
    // Initialize Prisma client
    this.prisma = getPrismaClient();

    // Initialize Currency module (base dependency)
    this.currencyRepository = createCurrencyRepository(this.prisma);
    this.currencyService = createCurrencyService(this.currencyRepository);
    this.currencyController = createCurrencyController(this.currencyService);

    // Initialize Country module (base dependency)
    this.countryRepository = createCountryRepository(this.prisma);
    this.countryService = createCountryService(this.countryRepository);
    this.countryController = createCountryController(this.countryService);

    // Initialize User module
    this.userRepository = createUserRepository(this.prisma);
    const mailer = new SmtpMailer();
    this.userService = createUserService(
      this.userRepository,
      this.prisma,
      mailer,
      this.countryRepository
    );
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

    // Initialize Subscription module repositories
    this.subscriptionRepository = new PrismaSubscriptionRepository(this.prisma);
    this.subscriptionSlotRepository = new PrismaSubscriptionSlotRepository(
      this.prisma
    );
    this.subscriptionRequestRepository =
      new PrismaSubscriptionRequestRepository(this.prisma);

    this.capacityForecastService = new CapacityForecastService(this.prisma);

    this.notificationPublisher = new NotificationPublisher();
    this.notificationService = new NotificationService(
      this.prisma,
      mailer,
      this.notificationPublisher
    );
    const ihella =
      env.IHELLA_API_BASE_URL && env.IHELLA_API_KEY
        ? new HttpIhellaClient(env.IHELLA_API_BASE_URL, env.IHELLA_API_KEY)
        : null;
    this.paymentService = new PaymentService(
      this.prisma,
      this.notificationService,
      ihella,
      new SeatHandoff(this.prisma, this.notificationPublisher)
    );
    this.paymentController = new PaymentController(this.paymentService);
    const revealStore = new PrismaRevealStore(this.prisma);
    this.inboxService = new InboxService(
      this.prisma,
      new ImapInboxClient(),
      this.notificationPublisher,
      this.paymentService
    );
    this.loginCodeQueue = new LoginCodeQueue(
      this.prisma,
      this.inboxService,
      this.notificationPublisher,
      this.paymentService
    );
    this.inboxService.setClaims(this.loginCodeQueue);
    this.loginCodeHelp = new LoginCodeHelpService(
      this.prisma,
      this.loginCodeQueue,
      this.notificationPublisher,
      this.notificationService,
      this.paymentService
    );
    this.loginCodeHelpController = new LoginCodeHelpController(
      this.loginCodeQueue,
      this.loginCodeHelp
    );
    this.incidentService = new IncidentService(this.prisma);
    this.notificationController = new NotificationController(this.notificationService);
    this.incidentController = new IncidentController(this.incidentService);
    this.loginCodeController = new LoginCodeController(this.inboxService);

    // Initialize slot assignment service
    this.slotAssignmentService = new SlotAssignmentService(
      this.prisma,
      this.capacityForecastService,
      this.notificationService
    );

    // Initialize Subscription service with all dependencies
    this.subscriptionService = new SubscriptionService(
      this.subscriptionRepository,
      this.subscriptionSlotRepository,
      this.subscriptionRequestRepository,
      this.serviceProviderRepository,
      this.countryRepository,
      this.slotAssignmentService,
      this.capacityForecastService,
      this.paymentService,
      revealStore,
      this.inboxService,
      this.incidentService,
      this.notificationService
    );

    this.subscriptionController = createSubscriptionController(
      this.subscriptionService
    );

    this.adminService = createAdminService(
      this.userRepository,
      this.userService,
      this.subscriptionRepository,
      this.serviceProviderRepository,
      this.capacityForecastService,
      this.subscriptionSlotRepository,
      this.subscriptionRequestRepository,
      this.subscriptionService,
      revealStore,
      this.paymentService,
      this.loginCodeHelp
    );
    this.adminController = new AdminController(this.adminService);
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

  public getSubscriptionSlotRepository(): ISubscriptionSlotRepository {
    return this.subscriptionSlotRepository;
  }

  public getSubscriptionRequestRepository(): ISubscriptionRequestRepository {
    return this.subscriptionRequestRepository;
  }

  public getSubscriptionService(): ISubscriptionService {
    return this.subscriptionService;
  }

  public getSlotAssignmentService(): ISlotAssignmentService {
    return this.slotAssignmentService;
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

  // Currency module getters
  public getCurrencyRepository(): ICurrencyRepository {
    return this.currencyRepository;
  }

  public getCurrencyService(): ICurrencyService {
    return this.currencyService;
  }

  public getCurrencyController(): CurrencyController {
    return this.currencyController;
  }

  public getAdminController(): AdminController {
    return this.adminController;
  }

  public getCapacityForecastService(): ICapacityForecastService {
    return this.capacityForecastService;
  }

  public getPaymentController(): PaymentController {
    return this.paymentController;
  }

  public getNotificationController(): NotificationController {
    return this.notificationController;
  }

  public getIncidentController(): IncidentController {
    return this.incidentController;
  }

  public getLoginCodeController(): LoginCodeController {
    return this.loginCodeController;
  }

  public getInboxService(): InboxService {
    return this.inboxService;
  }

  public getLoginCodeQueue(): LoginCodeQueue {
    return this.loginCodeQueue;
  }

  public getLoginCodeHelpController(): LoginCodeHelpController {
    return this.loginCodeHelpController;
  }

  public getNotificationPublisher(): NotificationPublisher {
    return this.notificationPublisher;
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
      case "subscriptionSlotRepository":
        return this.subscriptionSlotRepository as T;
      case "subscriptionRequestRepository":
        return this.subscriptionRequestRepository as T;
      case "subscriptionService":
        return this.subscriptionService as T;
      case "slotAssignmentService":
        return this.slotAssignmentService as T;
      case "subscriptionController":
        return this.subscriptionController as T;
      case "countryRepository":
        return this.countryRepository as T;
      case "countryService":
        return this.countryService as T;
      case "countryController":
        return this.countryController as T;
      case "currencyRepository":
        return this.currencyRepository as T;
      case "currencyService":
        return this.currencyService as T;
      case "currencyController":
        return this.currencyController as T;
      case "capacityForecastService":
        return this.capacityForecastService as T;
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
