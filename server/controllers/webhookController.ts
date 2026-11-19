import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

/**
 * POST /api/webhook/stripe
 *
 * Stripe sends raw body — this handler MUST be registered BEFORE express.json()
 * so the raw Buffer is still intact for signature verification.
 */
export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event: Stripe.Event;

    // --- 1. Verify signature -------------------------------------------------
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        console.error('Stripe webhook signature verification failed:', err.message);
        res.status(400).json({ error: `Webhook Error: ${err.message}` });
        return;
    }

    // --- 2. Handle events ---------------------------------------------------
    try {
        switch (event.type) {

            // Payment completed successfully
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutSessionCompleted(session);
                break;
            }

            // Payment failed / expired
            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session;
                console.log(`Checkout session expired: ${session.id}`);
                // Optionally mark transaction as failed here
                break;
            }

            // Catch-all for any other event types
            default:
                console.log(`Unhandled Stripe event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (err: any) {
        console.error('Error processing Stripe webhook event:', err.message);
        res.status(500).json({ error: 'Internal server error while processing webhook' });
    }
};

// ---------------------------------------------------------------------------
// Helper: handle a successful checkout session
// ---------------------------------------------------------------------------
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const transactionId = session.metadata?.transactionId;

    if (!transactionId) {
        console.warn('Stripe webhook: checkout.session.completed missing transactionId in metadata');
        return;
    }

    // Fetch the transaction from DB
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
    });

    if (!transaction) {
        console.warn(`Stripe webhook: transaction not found for id ${transactionId}`);
        return;
    }

    // Guard: skip if already processed (idempotency)
    if (transaction.isPaid) {
        console.log(`Stripe webhook: transaction ${transactionId} already processed – skipping`);
        return;
    }

    // Mark transaction as paid
    await prisma.transaction.update({
        where: { id: transactionId },
        data: { isPaid: true },
    });

    // Add credits to the user
    await prisma.user.update({
        where: { id: transaction.userId },
        data: { credits: { increment: transaction.credits } },
    });

    console.log(
        `Stripe webhook: credited ${transaction.credits} credits to user ${transaction.userId} ` +
        `(transaction ${transactionId})`
    );
}
