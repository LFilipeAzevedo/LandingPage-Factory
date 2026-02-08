const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const { authenticateToken } = require('../middleware/auth'); // Assuming you have this

// 1. Create Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_PREMIUM) {
            console.error('❌ Missing Stripe Configuration:', {
                hasSecret: !!process.env.STRIPE_SECRET_KEY,
                hasPriceId: !!process.env.STRIPE_PRICE_ID_PREMIUM
            });
            return res.status(500).json({ error: 'Server misconfigured: Missing Stripe Keys' });
        }

        const userId = req.user.id;

        // Fetch user from DB to ensure we have the email (not present in JWT)
        db.get('SELECT email FROM users WHERE id = ?', [userId], async (err, user) => {
            if (err || !user) {
                console.error('❌ Database error or user not found:', err);
                return res.status(500).json({ error: 'User not found in database.' });
            }

            const userEmail = user.email;

            // Dynamic URL (Production safe)
            const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';

            console.log(`💳 Iniciando Checkout para ${userEmail} (ID: ${userId})`);

            // Create params for Stripe
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                customer_email: userEmail,
                line_items: [
                    {
                        price: process.env.STRIPE_PRICE_ID_PREMIUM,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${origin}/admin/plans?success=true`,
                cancel_url: `${origin}/admin/plans?canceled=true`,
                metadata: {
                    userId: userId.toString()
                }
            });

            res.json({ url: session.url });
        });
    } catch (error) {
        console.error('❌ Stripe Checkout Error:', error.type, error.raw ? error.raw.message : error.message);
        res.status(500).json({ error: error.raw ? error.raw.message : 'Failed to create checkout session' });
    }
});

// 2. Customer Portal (Manage Subscription)
router.post('/create-portal-session', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get stripe_customer_id from DB
        db.get('SELECT stripe_customer_id FROM users WHERE id = ?', [userId], async (err, row) => {
            if (err || !row || !row.stripe_customer_id) {
                return res.status(400).json({ error: 'No active subscription found.' });
            }

            const session = await stripe.billingPortal.sessions.create({
                customer: row.stripe_customer_id,
                return_url: `${process.env.URL_FRONTEND || 'http://localhost:5173'}/admin/plans`,
            });

            res.json({ url: session.url });
        });

    } catch (error) {
        console.error('Stripe Portal Error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// 3. Webhook Handler
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // req.rawBody must be available (configured in index.js)
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.metadata.userId;
            const customerId = session.customer;
            const subscriptionId = session.subscription;

            // Update user to premium
            db.run(`UPDATE users SET 
                stripe_customer_id = ?, 
                stripe_subscription_id = ?, 
                plan_tier = 'premium', 
                subscription_status = 'active' 
                WHERE id = ?`,
                [customerId, subscriptionId, userId],
                (err) => {
                    if (err) console.error('Error updating user subscription:', err);
                    else console.log(`User ${userId} upgraded to Premium via Webhook.`);
                }
            );
            break;

        case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object;
            const deletedSubId = deletedSubscription.id;

            // Revert user to free
            db.run(`UPDATE users SET 
                plan_tier = 'basic', 
                subscription_status = 'canceled' 
                WHERE stripe_subscription_id = ?`,
                [deletedSubId],
                (err) => {
                    if (err) console.error('Error canceling user subscription:', err);
                    else console.log(`Subscription ${deletedSubId} canceled. User reverted to Basic.`);
                }
            );
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
});

module.exports = router;
