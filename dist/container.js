"use strict";
/**
 * Dependency Injection Container
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = exports.Container = void 0;
const client_1 = require("@prisma/client");
const users_1 = require("./repositories/users");
const users_2 = require("./services/users");
const users_3 = require("./controllers/users");
// ServiceProvider imports
const serviceProviders_1 = require("./repositories/serviceProviders");
const serviceProviders_2 = require("./services/serviceProviders");
const serviceProviders_3 = require("./controllers/serviceProviders");
// Subscription imports
const subscriptions_1 = require("./repositories/subscriptions");
const subscriptions_2 = require("./services/subscriptions");
const subscriptions_3 = require("./controllers/subscriptions");
// Country imports
const countries_1 = require("./repositories/countries");
const countries_2 = require("./services/countries");
const countries_3 = require("./controllers/countries");
class Container {
    constructor() {
        // Initialize Prisma client
        this.prisma = new client_1.PrismaClient();
        // Initialize Country module (base dependency)
        this.countryRepository = (0, countries_1.createCountryRepository)(this.prisma);
        this.countryService = (0, countries_2.createCountryService)(this.countryRepository);
        this.countryController = (0, countries_3.createCountryController)(this.countryService);
        // Initialize User module
        this.userRepository = (0, users_1.createUserRepository)(this.prisma);
        this.userService = (0, users_2.createUserService)(this.userRepository);
        this.userController = (0, users_3.createUserController)(this.userService);
        // Initialize ServiceProvider module
        this.serviceProviderRepository = (0, serviceProviders_1.createServiceProviderRepository)(this.prisma);
        this.serviceProviderService = (0, serviceProviders_2.createServiceProviderService)(this.serviceProviderRepository, this.countryRepository);
        this.serviceProviderController = (0, serviceProviders_3.createServiceProviderController)(this.serviceProviderService);
        // Initialize Subscription module (depends on ServiceProvider and Country)
        this.subscriptionRepository = (0, subscriptions_1.createSubscriptionRepository)(this.prisma);
        this.subscriptionService = (0, subscriptions_2.createSubscriptionService)(this.subscriptionRepository, this.serviceProviderRepository, this.countryRepository);
        this.subscriptionController = (0, subscriptions_3.createSubscriptionController)(this.subscriptionService);
    }
    static getInstance() {
        if (!Container.instance) {
            Container.instance = new Container();
        }
        return Container.instance;
    }
    // User module getters
    getUserRepository() {
        return this.userRepository;
    }
    getUserService() {
        return this.userService;
    }
    getUserController() {
        return this.userController;
    }
    // ServiceProvider module getters
    getServiceProviderRepository() {
        return this.serviceProviderRepository;
    }
    getServiceProviderService() {
        return this.serviceProviderService;
    }
    getServiceProviderController() {
        return this.serviceProviderController;
    }
    // Subscription module getters
    getSubscriptionRepository() {
        return this.subscriptionRepository;
    }
    getSubscriptionService() {
        return this.subscriptionService;
    }
    getSubscriptionController() {
        return this.subscriptionController;
    }
    // Country module getters
    getCountryRepository() {
        return this.countryRepository;
    }
    getCountryService() {
        return this.countryService;
    }
    getCountryController() {
        return this.countryController;
    }
    // General getters
    getPrisma() {
        return this.prisma;
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
    // Generic resolve method for dependency injection
    resolve(name) {
        switch (name) {
            case "userRepository":
                return this.userRepository;
            case "userService":
                return this.userService;
            case "userController":
                return this.userController;
            case "serviceProviderRepository":
                return this.serviceProviderRepository;
            case "serviceProviderService":
                return this.serviceProviderService;
            case "serviceProviderController":
                return this.serviceProviderController;
            case "subscriptionRepository":
                return this.subscriptionRepository;
            case "subscriptionService":
                return this.subscriptionService;
            case "subscriptionController":
                return this.subscriptionController;
            case "countryRepository":
                return this.countryRepository;
            case "countryService":
                return this.countryService;
            case "countryController":
                return this.countryController;
            case "prisma":
                return this.prisma;
            default:
                throw new Error(`Unknown dependency: ${name}`);
        }
    }
}
exports.Container = Container;
// Export singleton instance
exports.container = Container.getInstance();
exports.default = exports.container;
//# sourceMappingURL=container.js.map