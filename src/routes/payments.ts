import { Router } from "express";
import { container } from "../container";

const router = Router();
const payments = container.getPaymentController();

/**
 * @swagger
 * /payments/ihella/webhook:
 *   post:
 *     summary: Confirm an Ihella payment
 *     description: HMAC-SHA256 of the raw body in the x-ihella-signature header. Idempotent on providerRef.
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: x-ihella-signature
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerRef]
 *             properties:
 *               providerRef:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post("/ihella/webhook", payments.webhook);

export default router;
