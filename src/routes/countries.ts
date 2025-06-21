/**
 * Country Routes
 */

import { Router } from "express";
import container from "../container";
import { CountryController } from "../controllers/countries";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Get country controller from container
const countryController =
  container.resolve<CountryController>("countryController");

/**
 * @swagger
 * /countries:
 *   post:
 *     summary: Create a new country
 *     description: Create a new country with ISO codes and geographic information
 *     tags: [Countries]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCountryRequest'
 *           example:
 *             name: "United States"
 *             code: "US"
 *             alpha3: "USA"
 *             numericCode: "840"
 *             continent: "North America"
 *             region: "Northern America"
 *             currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *             phoneCode: "+1"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Country created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "United States"
 *                 code: "US"
 *                 alpha3: "USA"
 *                 numericCode: "840"
 *                 continent: "North America"
 *                 region: "Northern America"
 *                 currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *                 phoneCode: "+1"
 *                 isActive: true
 *                 createdAt: "2025-06-04T22:09:04.000Z"
 *                 updatedAt: "2025-06-04T22:09:04.000Z"
 *               message: "Country created successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Country already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "COUNTRY_CREATION_FAILED"
 *                 message: "Country with code 'US' already exists"
 *   get:
 *     summary: Get all countries
 *     description: Retrieve a paginated list of countries with optional filtering
 *     tags: [Countries]
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
 *         description: Number of countries per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for country name, code, or alpha-3 code
 *       - in: query
 *         name: continent
 *         schema:
 *           type: string
 *         description: Filter by continent
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
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
 *         description: Countries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryListResponse'
 *             example:
 *               success: true
 *               data:
 *                 countries:
 *                   - id: "clh1234567890"
 *                     name: "United States"
 *                     code: "US"
 *                     alpha3: "USA"
 *                     numericCode: "840"
 *                     continent: "North America"
 *                     region: "Northern America"
 *                     currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *                     phoneCode: "+1"
 *                     isActive: true
 *                     createdAt: "2025-06-04T22:09:04.000Z"
 *                     updatedAt: "2025-06-04T22:09:04.000Z"
 *                 total: 1
 *                 page: 1
 *                 limit: 10
 *                 hasNext: false
 *                 hasPrevious: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authenticateJWT, (req, res) =>
  countryController.createCountry(req, res)
);
router.get("/", (req, res) => countryController.getCountries(req, res));

/**
 * @swagger
 * /countries/active:
 *   get:
 *     summary: Get active countries
 *     description: Retrieve all active countries sorted by name
 *     tags: [Countries]
 *     responses:
 *       200:
 *         description: Active countries retrieved successfully
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
 *                     $ref: '#/components/schemas/Country'
 *             example:
 *               success: true
 *               data:
 *                 - id: "clh1234567890"
 *                   name: "United States"
 *                   code: "US"
 *                   alpha3: "USA"
 *                   numericCode: "840"
 *                   continent: "North America"
 *                   region: "Northern America"
 *                   currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *                   phoneCode: "+1"
 *                   isActive: true
 *                   createdAt: "2025-06-04T22:09:04.000Z"
 *                   updatedAt: "2025-06-04T22:09:04.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/active", (req, res) =>
  countryController.getActiveCountries(req, res)
);

/**
 * @swagger
 * /countries/{id}:
 *   get:
 *     summary: Get country by ID
 *     description: Retrieve a specific country by its unique identifier
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country unique identifier
 *     responses:
 *       200:
 *         description: Country retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "United States"
 *                 code: "US"
 *                 alpha3: "USA"
 *                 numericCode: "840"
 *                 continent: "North America"
 *                 region: "Northern America"
 *                 currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *                 phoneCode: "+1"
 *                 isActive: true
 *                 createdAt: "2025-06-04T22:09:04.000Z"
 *                 updatedAt: "2025-06-04T22:09:04.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     summary: Update country
 *     description: Update an existing country's information
 *     tags: [Countries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country unique identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCountryRequest'
 *           example:
 *             name: "United States of America"
 *             continent: "North America"
 *             region: "Northern America"
 *             isActive: true
 *     responses:
 *       200:
 *         description: Country updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "United States of America"
 *                 code: "US"
 *                 alpha3: "USA"
 *                 numericCode: "840"
 *                 continent: "North America"
 *                 region: "Northern America"
 *                 currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *                 phoneCode: "+1"
 *                 isActive: true
 *                 createdAt: "2025-06-04T22:09:04.000Z"
 *                 updatedAt: "2025-06-04T22:10:04.000Z"
 *               message: "Country updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - duplicate country data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Delete country
 *     description: Delete a country (only if not referenced by service providers or subscriptions)
 *     tags: [Countries]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Country unique identifier
 *     responses:
 *       200:
 *         description: Country deleted successfully
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
 *               message: "Country deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Country is in use and cannot be deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "COUNTRY_IN_USE"
 *                 message: "Cannot delete country that is being used by service providers"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/:id", (req, res) => countryController.getCountryById(req, res));
router.put("/:id", authenticateJWT, (req, res) =>
  countryController.updateCountry(req, res)
);
router.delete("/:id", authenticateJWT, (req, res) =>
  countryController.deleteCountry(req, res)
);

/**
 * @swagger
 * /countries/code/{code}:
 *   get:
 *     summary: Get country by ISO code
 *     description: Retrieve a specific country by its ISO 3166-1 alpha-2 code
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}$'
 *         description: ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA")
 *     responses:
 *       200:
 *         description: Country retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountryResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "clh1234567890"
 *                 name: "United States"
 *                 code: "US"
 *                 alpha3: "USA"
 *                 numericCode: "840"
 *                 continent: "North America"
 *                 region: "Northern America"
 *                 currencyId: "cm2ksxp8t0000uvcn4kzq3mhc"
 *                 phoneCode: "+1"
 *                 isActive: true
 *                 createdAt: "2025-06-04T22:09:04.000Z"
 *                 updatedAt: "2025-06-04T22:09:04.000Z"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/code/:code", (req, res) =>
  countryController.getCountryByCode(req, res)
);

export default router;
