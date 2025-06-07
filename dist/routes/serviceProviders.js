"use strict";
/**
 * ServiceProvider Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = require("../container");
const serviceProviders_1 = require("../controllers/serviceProviders");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const serviceProviderController = container_1.container.getServiceProviderController();
/**
 * @swagger
 * /service-providers:
 *   get:
 *     summary: Get list of service providers
 *     description: Retrieve service providers with pagination and search. Public endpoint with optional authentication for personalized results.
 *     tags: [Service Providers]
 *     security:
 *       - BearerAuth: []
 *       - {}
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of service providers per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search service providers by name or description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: name
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Service providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceProviders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ServiceProvider'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *             example:
 *               success: true
 *               data:
 *                 serviceProviders:
 *                   - id: "cm4sp789xyz012ghi"
 *                     name: "Netflix"
 *                     description: "Video streaming service with movies and TV shows"
 *                     metadata:
 *                       category: "Entertainment"
 *                       supportedCountries: ["US", "CA", "UK"]
 *                       maxSlots: 4
 *                     createdAt: "2025-06-04T20:50:09.000Z"
 *                     updatedAt: "2025-06-04T20:50:09.000Z"
 *                   - id: "cm4sp456def789abc"
 *                     name: "Spotify"
 *                     description: "Music streaming platform"
 *                     metadata:
 *                       category: "Music"
 *                       supportedCountries: ["US", "CA", "UK", "EU"]
 *                       maxSlots: 6
 *                     createdAt: "2025-06-04T19:50:09.000Z"
 *                     updatedAt: "2025-06-04T19:50:09.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 25
 *                   totalPages: 3
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", auth_1.optionalAuth, serviceProviders_1.ServiceProviderController.getListValidation, serviceProviderController.getServiceProviders.bind(serviceProviderController));
/**
 * @swagger
 * /service-providers/{id}:
 *   get:
 *     summary: Get a service provider by ID
 *     description: Retrieve detailed information about a specific service provider including available subscriptions count.
 *     tags: [Service Providers]
 *     security:
 *       - BearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique service provider identifier
 *         example: "cm4sp789xyz012ghi"
 *     responses:
 *       200:
 *         description: Service provider retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceProvider:
 *                           allOf:
 *                             - $ref: '#/components/schemas/ServiceProvider'
 *                             - type: object
 *                               properties:
 *                                 subscriptionCount:
 *                                   type: integer
 *                                   description: Number of active subscriptions for this provider
 *                                 averagePrice:
 *                                   type: number
 *                                   format: decimal
 *                                   description: Average price per slot across all subscriptions
 *                                   nullable: true
 *             example:
 *               success: true
 *               data:
 *                 serviceProvider:
 *                   id: "cm4sp789xyz012ghi"
 *                   name: "Netflix"
 *                   description: "Video streaming service with movies and TV shows"
 *                   metadata:
 *                     category: "Entertainment"
 *                     supportedCountries: ["US", "CA", "UK"]
 *                     maxSlots: 4
 *                     website: "https://netflix.com"
 *                   subscriptionCount: 15
 *                   averagePrice: 4.99
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   updatedAt: "2025-06-04T20:50:09.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", auth_1.optionalAuth, serviceProviders_1.ServiceProviderController.getByIdValidation, serviceProviderController.getServiceProviderById.bind(serviceProviderController));
/**
 * @swagger
 * /service-providers:
 *   post:
 *     summary: Create a new service provider
 *     description: Create a new service provider entry. Requires authentication.
 *     tags: [Service Providers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceProviderRequest'
 *           example:
 *             name: "Disney+"
 *             description: "Disney streaming service with movies, shows, and original content"
 *             metadata:
 *               category: "Entertainment"
 *               supportedCountries: ["US", "CA", "UK", "AU"]
 *               maxSlots: 4
 *               website: "https://disneyplus.com"
 *               subscriptionTypes: ["Monthly", "Annual"]
 *     responses:
 *       201:
 *         description: Service provider created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceProvider:
 *                           $ref: '#/components/schemas/ServiceProvider'
 *             example:
 *               success: true
 *               data:
 *                 serviceProvider:
 *                   id: "cm4sp123new456def"
 *                   name: "Disney+"
 *                   description: "Disney streaming service with movies, shows, and original content"
 *                   metadata:
 *                     category: "Entertainment"
 *                     supportedCountries: ["US", "CA", "UK", "AU"]
 *                     maxSlots: 4
 *                     website: "https://disneyplus.com"
 *                     subscriptionTypes: ["Monthly", "Annual"]
 *                   createdAt: "2025-06-04T21:00:09.000Z"
 *                   updatedAt: "2025-06-04T21:00:09.000Z"
 *               message: "Service provider created successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Service provider with this name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SERVICE_PROVIDER_EXISTS"
 *                 message: "Service provider with this name already exists"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", auth_1.authenticateJWT, serviceProviders_1.ServiceProviderController.createValidation, serviceProviderController.createServiceProvider.bind(serviceProviderController));
/**
 * @swagger
 * /service-providers/{id}:
 *   put:
 *     summary: Update a service provider
 *     description: Update service provider information. Requires authentication and appropriate permissions.
 *     tags: [Service Providers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique service provider identifier
 *         example: "cm4sp789xyz012ghi"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: Service provider name
 *               description:
 *                 type: string
 *                 description: Service provider description
 *               metadata:
 *                 type: object
 *                 description: Additional metadata (flexible structure)
 *           example:
 *             name: "Netflix Premium"
 *             description: "Premium video streaming service with 4K content and multiple screens"
 *             metadata:
 *               category: "Entertainment"
 *               supportedCountries: ["US", "CA", "UK", "EU"]
 *               maxSlots: 5
 *               features: ["4K", "HDR", "Multiple Screens"]
 *     responses:
 *       200:
 *         description: Service provider updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceProvider:
 *                           $ref: '#/components/schemas/ServiceProvider'
 *             example:
 *               success: true
 *               data:
 *                 serviceProvider:
 *                   id: "cm4sp789xyz012ghi"
 *                   name: "Netflix Premium"
 *                   description: "Premium video streaming service with 4K content and multiple screens"
 *                   metadata:
 *                     category: "Entertainment"
 *                     supportedCountries: ["US", "CA", "UK", "EU"]
 *                     maxSlots: 5
 *                     features: ["4K", "HDR", "Multiple Screens"]
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   updatedAt: "2025-06-04T21:05:09.000Z"
 *               message: "Service provider updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put("/:id", auth_1.authenticateJWT, serviceProviders_1.ServiceProviderController.updateValidation, serviceProviderController.updateServiceProvider.bind(serviceProviderController));
/**
 * @swagger
 * /service-providers/{id}:
 *   delete:
 *     summary: Delete a service provider
 *     description: Delete a service provider and all associated subscriptions. Requires authentication and appropriate permissions. This action cannot be undone.
 *     tags: [Service Providers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique service provider identifier
 *         example: "cm4sp789xyz012ghi"
 *     responses:
 *       200:
 *         description: Service provider deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         deletedSubscriptionsCount:
 *                           type: integer
 *                           description: Number of associated subscriptions that were also deleted
 *             example:
 *               success: true
 *               data:
 *                 deletedSubscriptionsCount: 8
 *               message: "Service provider and 8 associated subscriptions deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Cannot delete service provider with active subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SERVICE_PROVIDER_HAS_SUBSCRIPTIONS"
 *                 message: "Cannot delete service provider with active subscriptions"
 *                 details:
 *                   activeSubscriptions: 5
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/:id", auth_1.authenticateJWT, serviceProviders_1.ServiceProviderController.deleteValidation, serviceProviderController.deleteServiceProvider.bind(serviceProviderController));
exports.default = router;
//# sourceMappingURL=serviceProviders.js.map