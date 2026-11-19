import express from 'express';
import { stripeWebhook } from '../controllers/webhookController.js';

const webhookRouter = express.Router();

/**
 * POST /api/webhook/stripe
 *
 * express.raw() is used here (NOT express.json()) so Stripe can verify
 * the raw request body signature.
 */
webhookRouter.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

export default webhookRouter;
