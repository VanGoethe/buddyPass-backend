import { Router } from "express";
import { container } from "../container";

const router = Router();
const subscriptionController = container.getSubscriptionController();

/**
 * @swagger
 * /offers:
 *   get:
 *     summary: Public catalog of seat offers
 *     description: Price, currency, and free seats per provider and country. Streaming emails are not included.
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Offers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/", subscriptionController.listOffers);

export default router;
