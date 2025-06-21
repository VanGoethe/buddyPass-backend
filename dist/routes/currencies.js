"use strict";
/**
 * Currency Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = __importDefault(require("../container"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get currency controller from container
const currencyController = container_1.default.resolve("currencyController");
/**
 * @swagger
 * /currencies:
 *   post:
 *     summary: Create a new currency
 *     description: Create a new currency with ISO 4217 code and formatting information
 *     tags: [Currencies]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCurrencyRequest'
 *           example:
 *             name: "US Dollar"
 *             code: "USD"
 *             symbol: "$"
 *             minorUnit: 2
 *             isActive: true
 *     responses:
 *       201:
 *         description: Currency created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrencyResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "US Dollar"
 *                 code: "USD"
 *                 symbol: "$"
 *                 minorUnit: 2
 *                 isActive: true
 *                 createdAt: "2025-06-21T20:04:48.000Z"
 *                 updatedAt: "2025-06-21T20:04:48.000Z"
 *               message: "Currency created successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Currency already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "CURRENCY_CREATION_FAILED"
 *                 message: "Currency with code 'USD' already exists"
 *   get:
 *     summary: Get all currencies
 *     description: Retrieve a paginated list of currencies with optional filtering
 *     tags: [Currencies]
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
 *           maximum: 100
 *           default: 10
 *         description: Number of currencies per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for currency name or code
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, code, createdAt, updatedAt]
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Currencies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrencyListResponse'
 *             example:
 *               success: true
 *               data:
 *                 currencies:
 *                   - id: "clh1234567890"
 *                     name: "US Dollar"
 *                     code: "USD"
 *                     symbol: "$"
 *                     minorUnit: 2
 *                     isActive: true
 *                     createdAt: "2025-06-21T20:04:48.000Z"
 *                     updatedAt: "2025-06-21T20:04:48.000Z"
 *                 total: 1
 *                 page: 1
 *                 limit: 10
 *                 hasNext: false
 *                 hasPrevious: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", auth_1.authenticateJWT, (req, res) => currencyController.createCurrency(req, res));
router.get("/", (req, res) => currencyController.getCurrencies(req, res));
/**
 * @swagger
 * /currencies/active:
 *   get:
 *     summary: Get active currencies
 *     description: Retrieve all active currencies sorted by name
 *     tags: [Currencies]
 *     responses:
 *       200:
 *         description: Active currencies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Currency'
 *             example:
 *               success: true
 *               data:
 *                 - id: "clh1234567890"
 *                   name: "US Dollar"
 *                   code: "USD"
 *                   symbol: "$"
 *                   minorUnit: 2
 *                   isActive: true
 *                   createdAt: "2025-06-21T20:04:48.000Z"
 *                   updatedAt: "2025-06-21T20:04:48.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/active", (req, res) => currencyController.getActiveCurrencies(req, res));
/**
 * @swagger
 * /currencies/{id}:
 *   get:
 *     summary: Get currency by ID
 *     description: Retrieve a specific currency by its unique identifier
 *     tags: [Currencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Currency unique identifier
 *     responses:
 *       200:
 *         description: Currency retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Currency'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "US Dollar"
 *                 code: "USD"
 *                 symbol: "$"
 *                 minorUnit: 2
 *                 isActive: true
 *                 createdAt: "2025-06-21T20:04:48.000Z"
 *                 updatedAt: "2025-06-21T20:04:48.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     summary: Update currency
 *     description: Update an existing currency with new information
 *     tags: [Currencies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Currency unique identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCurrencyRequest'
 *           example:
 *             name: "US Dollar (Updated)"
 *             symbol: "$"
 *             isActive: true
 *     responses:
 *       200:
 *         description: Currency updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrencyResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "US Dollar (Updated)"
 *                 code: "USD"
 *                 symbol: "$"
 *                 minorUnit: 2
 *                 isActive: true
 *                 createdAt: "2025-06-21T20:04:48.000Z"
 *                 updatedAt: "2025-06-21T20:05:48.000Z"
 *               message: "Currency updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete currency
 *     description: Delete an existing currency (only if not in use)
 *     tags: [Currencies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Currency unique identifier
 *     responses:
 *       200:
 *         description: Currency deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               message: "Currency deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Currency is in use and cannot be deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "CURRENCY_IN_USE"
 *                 message: "Cannot delete currency that is being used by countries or subscriptions"
 */
router.get("/:id", (req, res) => currencyController.getCurrencyById(req, res));
router.put("/:id", auth_1.authenticateJWT, (req, res) => currencyController.updateCurrency(req, res));
router.delete("/:id", auth_1.authenticateJWT, (req, res) => currencyController.deleteCurrency(req, res));
/**
 * @swagger
 * /currencies/code/{code}:
 *   get:
 *     summary: Get currency by code
 *     description: Retrieve a specific currency by its ISO 4217 code
 *     tags: [Currencies]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[A-Z]{3}$
 *         description: ISO 4217 currency code (e.g., USD, EUR, GBP)
 *     responses:
 *       200:
 *         description: Currency retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Currency'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "US Dollar"
 *                 code: "USD"
 *                 symbol: "$"
 *                 minorUnit: 2
 *                 isActive: true
 *                 createdAt: "2025-06-21T20:04:48.000Z"
 *                 updatedAt: "2025-06-21T20:04:48.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/code/:code", (req, res) => currencyController.getCurrencyByCode(req, res));
exports.default = router;
//# sourceMappingURL=currencies.js.map