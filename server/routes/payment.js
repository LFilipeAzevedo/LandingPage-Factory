const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Helper to get price ID based on plan and interval
const getPriceId = (plan, interval) => {
    const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`; // e.g. STRIPE_PRICE_PREMIUM_MONTHLY
    return process.env[key];
};

// 1. Create Checkout Session (Dynamic)
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { planTier, interval } = req.body; // e.g. { planTier: 'premium', interval: 'monthly' }

        if (!['basic', 'premium'].includes(planTier) || !['monthly', 'yearly'].includes(interval)) {
            return res.status(400).json({ error: 'Invalid plan or interval.' });
        }

        const priceId = getPriceId(planTier, interval);

        if (!process.env.STRIPE_SECRET_KEY || !priceId) {
            console.error(`❌ Missing Stripe Configuration for ${planTier} ${interval}.`);
            return res.status(500).json({ error: 'Server misconfigured: Missing Stripe Keys' });
        }

        const userId = req.user.id;

        // Fetch user from DB
        db.get('SELECT email FROM users WHERE id = ?', [userId], async (err, user) => {
            if (err || !user) {
                console.error('❌ Database error or user not found:', err);
                return res.status(500).json({ error: 'User not found in database.' });
            }

            try {
                const userEmail = user.email;
                const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';

                const isYearly = interval === 'yearly';
                const sessionOptions = {
                    payment_method_types: ['card'],
                    customer_email: userEmail,
                    line_items: [{
                        price: priceId,
                        quantity: 1,
                    }],
                    mode: isYearly ? 'payment' : 'subscription', // Use payment for yearly to allow installments in Brazil
                    success_url: `${origin}/admin/plans?success=true`,
                    cancel_url: `${origin}/admin/plans?canceled=true`,
                    metadata: {
                        userId: userId.toString(),
                        plan_tier: planTier,
                        interval: interval
                    }
                };

                // Enable installments for BRAZIL cards if it's a payment mode
                if (isYearly) {
                    sessionOptions.payment_method_options = {
                        card: {
                            installments: {
                                enabled: true
                            }
                        }
                    };
                }

                const session = await stripe.checkout.sessions.create(sessionOptions);
                res.json({ url: session.url });
            } catch (innerError) {
                console.error('❌ Stripe Async Error:', innerError);
                return res.status(500).json({ error: innerError.message || 'Stripe session creation failed' });
            }
        });
    } catch (error) {
        console.error('❌ Stripe Checkout Error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// 2. Customer Portal (Manage Subscription)
router.post('/create-portal-session', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        db.get('SELECT stripe_customer_id FROM users WHERE id = ?', [userId], async (err, row) => {
            if (err || !row || !row.stripe_customer_id) {
                return res.status(400).json({ error: 'No active subscription found.' });
            }

            const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';

            const session = await stripe.billingPortal.sessions.create({
                customer: row.stripe_customer_id,
                return_url: `${origin}/admin/plans`,
            });

            res.json({ url: session.url });
        });

    } catch (error) {
        console.error('Stripe Portal Error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// 3. Get Price Details (All Plans)
router.get('/price-details', async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'Stripe keys missing' });
        }

        const plans = [
            { id: 'basic', monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY, yearly: process.env.STRIPE_PRICE_BASIC_YEARLY },
            { id: 'premium', monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY, yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY }
        ];

        const results = {};

        for (const plan of plans) {
            if (plan.monthly) {
                try {
                    const priceM = await stripe.prices.retrieve(plan.monthly);
                    if (!results[plan.id]) results[plan.id] = {};
                    results[plan.id].monthly = {
                        amount: priceM.unit_amount / 100,
                        id: priceM.id
                    };
                } catch (e) { console.error(`Failed to fetch monthly price for ${plan.id}`, e.message); }
            }
            if (plan.yearly) {
                try {
                    const priceY = await stripe.prices.retrieve(plan.yearly);
                    if (!results[plan.id]) results[plan.id] = {};
                    results[plan.id].yearly = {
                        amount: priceY.unit_amount / 100,
                        id: priceY.id
                    };
                } catch (e) { console.error(`Failed to fetch yearly price for ${plan.id}`, e.message); }
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Error fetching prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// 4. Webhook Handler
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.metadata.userId;
            const planTier = session.metadata.plan_tier || 'basic'; // Default fallback
            const interval = session.metadata.interval || 'monthly';
            const customerId = session.customer;
            const subscriptionId = session.subscription || null;

            // Handle Expiration for One-time payments (Yearly with Installments)
            let expiryDate = null;
            if (session.mode === 'payment' && interval === 'yearly') {
                const date = new Date();
                date.setFullYear(date.getFullYear() + 1);
                expiryDate = date.toISOString();
            }

            db.run(`UPDATE users SET 
                stripe_customer_id = ?, 
                stripe_subscription_id = ?, 
                plan_tier = ?, 
                subscription_status = 'active',
                subscription_expires_at = ?
                WHERE id = ?`,
                [customerId, subscriptionId, planTier, expiryDate, userId],
                (err) => {
                    if (err) console.error('Error updating user subscription:', err);
                    else console.log(`User ${userId} upgraded to ${planTier} (${interval}) via Webhook. Expiry: ${expiryDate || 'N/A'}`);
                }
            );
            break;

        case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object;
            const deletedSubId = deletedSubscription.id;

            db.run(`UPDATE users SET 
                plan_tier = 'static', -- Revert to Free
                subscription_status = 'canceled' 
                WHERE stripe_subscription_id = ?`,
                [deletedSubId],
                (err) => {
                    if (err) console.error('Error canceling user subscription:', err);
                    else console.log(`Subscription ${deletedSubId} canceled. Reverted to Static (Free).`);
                }
            );
            break;
    }

    res.send();
});

module.exports = router;
