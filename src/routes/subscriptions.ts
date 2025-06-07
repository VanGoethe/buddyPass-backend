/**
 * Subscription Routes
 */

import { Router } from "express";
import { container } from "../container";
import { SubscriptionController } from "../controllers/subscriptions";
import { authenticateJWT, optionalAuth } from "../middleware/auth";

const router = Router();
const subscriptionController = container.getSubscriptionController();

/**
 * @swagger
 * /subscriptions:
 *   get:
 *     summary: Get all subscriptions
 *     description: Retrieve a paginated list of subscriptions with optional filtering. Users can only see their own subscriptions.
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page (max 100)
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for subscription name or email
 *         example: "Netflix"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, userPrice]
 *           default: createdAt
 *         description: Field to sort by
 *         example: "name"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *         example: "asc"
 *       - in: query
 *         name: serviceProviderId
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Filter by service provider ID
 *         example: "cm4sp789xyz012ghi"
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Filter by country ID
 *         example: "cm4c123abc456def789"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
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
 *                         subscriptions:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Subscription'
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
 *                 subscriptions:
 *                   - id: "cm4sub123abc456def"
 *                     serviceProviderId: "cm4sp789xyz012ghi"
 *                     name: "Netflix Premium Family"
 *                     email: "netflix@example.com"
 *                     availableSlots: 3
 *                     countryId: "cm4c123abc456def789"
 *                     country:
 *                       id: "cm4c123abc456def789"
 *                       name: "United States"
 *                       code: "US"
 *                       alpha3: "USA"
 *                     userPrice: 4.99
 *                     currency: "USD"
 *                     isActive: true
 *                     createdAt: "2025-06-04T20:50:09.000Z"
 *                     updatedAt: "2025-06-04T20:50:09.000Z"
 *                     serviceProvider:
 *                       id: "cm4sp789xyz012ghi"
 *                       name: "Netflix"
 *                       description: "Video streaming service"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 25
 *                   totalPages: 3
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/",
  authenticateJWT,
  SubscriptionController.getListValidation,
  subscriptionController.getSubscriptions.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/{id}:
 *   get:
 *     summary: Get a subscription by ID
 *     description: Retrieve detailed information about a specific subscription. Users can only access their own subscriptions.
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique subscription identifier
 *         example: "cm4sub123abc456def"
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
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
 *                         subscription:
 *                           $ref: '#/components/schemas/Subscription'
 *             example:
 *               success: true
 *               data:
 *                 subscription:
 *                   id: "cm4sub123abc456def"
 *                   serviceProviderId: "cm4sp789xyz012ghi"
 *                   name: "Netflix Premium Family"
 *                   email: "netflix@example.com"
 *                   availableSlots: 3
 *                   countryId: "cm4c123abc456def789"
 *                   country:
 *                     id: "cm4c123abc456def789"
 *                     name: "United States"
 *                     code: "US"
 *                     alpha3: "USA"
 *                   expiresAt: "2025-12-31T23:59:59.000Z"
 *                   userPrice: 4.99
 *                   currency: "USD"
 *                   isActive: true
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   updatedAt: "2025-06-04T20:50:09.000Z"
 *                   serviceProvider:
 *                     id: "cm4sp789xyz012ghi"
 *                     name: "Netflix"
 *                     description: "Video streaming service"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/:id",
  authenticateJWT,
  SubscriptionController.getByIdValidation,
  subscriptionController.getSubscriptionById.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     description: Create a new subscription for sharing with other users
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionRequest'
 *           example:
 *             serviceProviderId: "cm4sp789xyz012ghi"
 *             name: "Netflix Premium Family"
 *             email: "netflix@example.com"
 *             password: "MyNetflixPass123"
 *             availableSlots: 4
 *             countryId: "cm4c123abc456def789"
 *             expiresAt: "2025-12-31T23:59:59.000Z"
 *             userPrice: 4.99
 *             currency: "USD"
 *     responses:
 *       201:
 *         description: Subscription created successfully
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
 *                         subscription:
 *                           $ref: '#/components/schemas/Subscription'
 *             example:
 *               success: true
 *               data:
 *                 subscription:
 *                   id: "cm4sub123abc456def"
 *                   serviceProviderId: "cm4sp789xyz012ghi"
 *                   name: "Netflix Premium Family"
 *                   email: "netflix@example.com"
 *                   availableSlots: 4
 *                   countryId: "cm4c123abc456def789"
 *                   country:
 *                     id: "cm4c123abc456def789"
 *                     name: "United States"
 *                     code: "US"
 *                     alpha3: "USA"
 *                   expiresAt: "2025-12-31T23:59:59.000Z"
 *                   userPrice: 4.99
 *                   currency: "USD"
 *                   isActive: true
 *                   createdAt: "2025-06-04T20:50:09.000Z"
 *                   updatedAt: "2025-06-04T20:50:09.000Z"
 *               message: "Subscription created successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/",
  authenticateJWT,
  SubscriptionController.createValidation,
  subscriptionController.createSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/{id}:
 *   put:
 *     summary: Update a subscription
 *     description: Update subscription details. Users can only update their own subscriptions.
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique subscription identifier
 *         example: "cm4sub123abc456def"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubscriptionRequest'
 *           example:
 *             name: "Netflix Premium Family - Updated"
 *             availableSlots: 3
 *             countryId: "cm4c456def789abc123"
 *             userPrice: 5.99
 *             isActive: true
 *     responses:
 *       200:
 *         description: Subscription updated successfully
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
 *                         subscription:
 *                           $ref: '#/components/schemas/Subscription'
 *             example:
 *               success: true
 *               data:
 *                 subscription:
 *                   id: "cm4sub123abc456def"
 *                   serviceProviderId: "cm4sp789xyz012ghi"
 *                   name: "Netflix Premium Family - Updated"
 *                   email: "netflix@example.com"
 *                   availableSlots: 3
 *                   countryId: "cm4c456def789abc123"
 *                   country:
 *                     id: "cm4c456def789abc123"
 *                     name: "Canada"
 *                     code: "CA"
 *                     alpha3: "CAN"
 *                   userPrice: 5.99
 *                   currency: "USD"
 *                   isActive: true
 *                   updatedAt: "2025-06-04T21:00:09.000Z"
 *               message: "Subscription updated successfully"
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
router.put(
  "/:id",
  authenticateJWT,
  SubscriptionController.updateValidation,
  subscriptionController.updateSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/{id}:
 *   delete:
 *     summary: Delete a subscription
 *     description: Delete a subscription. Users can only delete their own subscriptions.
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Unique subscription identifier
 *         example: "cm4sub123abc456def"
 *     responses:
 *       200:
 *         description: Subscription deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Subscription deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  "/:id",
  authenticateJWT,
  SubscriptionController.deleteValidation,
  subscriptionController.deleteSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/service-provider/{serviceProviderId}:
 *   get:
 *     summary: Get subscriptions by service provider
 *     description: Retrieve all active subscriptions for a specific service provider. Public endpoint with optional authentication for personalized data.
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: serviceProviderId
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Service provider identifier
 *         example: "cm4sp789xyz012ghi"
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
 *         description: Number of subscriptions per page
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Filter by country ID
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *         description: Filter by maximum price per slot
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
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
 *                         subscriptions:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Subscription'
 *                               - type: object
 *                                 properties:
 *                                   passwordHash:
 *                                     type: undefined
 *                                     description: Password hash is excluded from public responses
 *                         serviceProvider:
 *                           $ref: '#/components/schemas/ServiceProvider'
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
 *                 subscriptions:
 *                   - id: "cm4sub123abc456def"
 *                     serviceProviderId: "cm4sp789xyz012ghi"
 *                     name: "Netflix Premium Family"
 *                     email: "netflix@example.com"
 *                     availableSlots: 3
 *                     countryId: "cm4c123abc456def789"
 *                     country:
 *                       id: "cm4c123abc456def789"
 *                       name: "United States"
 *                       code: "US"
 *                       alpha3: "USA"
 *                     userPrice: 4.99
 *                     currency: "USD"
 *                     isActive: true
 *                     createdAt: "2025-06-04T20:50:09.000Z"
 *                 serviceProvider:
 *                   id: "cm4sp789xyz012ghi"
 *                   name: "Netflix"
 *                   description: "Video streaming service"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 15
 *                   totalPages: 2
 *       404:
 *         description: Service provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "SERVICE_PROVIDER_NOT_FOUND"
 *                 message: "Service provider not found"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/service-provider/:serviceProviderId",
  optionalAuth,
  SubscriptionController.getByServiceProviderValidation,
  subscriptionController.getSubscriptionsByServiceProvider.bind(
    subscriptionController
  )
);

export default router;
