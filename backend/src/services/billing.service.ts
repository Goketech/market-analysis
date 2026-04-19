import Stripe from 'stripe';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-03-25.acacia' as any,
});

const TIER_PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_placeholder',
};

export class BillingService {
  /**
   * Get or create a Stripe customer for a user
   */
  async ensureCustomer(userId: string, email: string, name?: string): Promise<string> {
    const { rows } = await query<any>(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (rows[0]?.stripe_customer_id) {
      return rows[0].stripe_customer_id;
    }

    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { userId },
    });

    await query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [customer.id, userId]
    );

    return customer.id;
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    tier: 'pro' | 'enterprise',
    name?: string
  ): Promise<{ url: string }> {
    const priceId = TIER_PRICE_IDS[tier];
    if (!priceId || priceId.includes('placeholder')) {
      throw new Error('Stripe price IDs not configured. Set STRIPE_PRO_PRICE_ID and STRIPE_ENTERPRISE_PRICE_ID in .env');
    }

    const customerId = await this.ensureCustomer(userId, email, name);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      metadata: { userId, tier },
      subscription_data: {
        metadata: { userId, tier },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error('Failed to create checkout session');

    logger.info(`Checkout session created for user ${userId}, tier: ${tier}`);
    return { url: session.url };
  }

  /**
   * Create a Stripe customer portal session for subscription management
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const { rows } = await query<any>(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (!rows[0]?.stripe_customer_id) {
      throw new Error('No billing account found. Please subscribe first.');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret || webhookSecret.includes('placeholder')) {
      logger.warn('Stripe webhook secret not configured');
      return;
    }

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    logger.info(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        await this.syncSubscription(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await this.cancelSubscription(subscription.customer as string);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        logger.warn(`Payment failed for customer: ${invoice.customer}`);
        break;
      }
    }
  }

  /**
   * Sync subscription status to our database
   */
  private async syncSubscription(subscription: any): Promise<void> {
    const customerId = subscription.customer as string;
    const tier = subscription.metadata?.tier || 'pro';
    const status = subscription.status;
    const periodEnd = new Date(subscription.current_period_end * 1000);

    const activeTier = ['active', 'trialing'].includes(status) ? tier : 'free';

    await query(
      `UPDATE users SET 
         tier = $1, 
         stripe_subscription_id = $2,
         subscription_status = $3,
         subscription_period_end = $4
       WHERE stripe_customer_id = $5`,
      [activeTier, subscription.id, status, periodEnd, customerId]
    );

    logger.info(`Subscription synced: customer=${customerId}, tier=${activeTier}, status=${status}`);
  }

  /**
   * Cancel subscription — downgrade user to free
   */
  private async cancelSubscription(customerId: string): Promise<void> {
    await query(
      `UPDATE users SET 
         tier = 'free', 
         stripe_subscription_id = NULL,
         subscription_status = 'canceled'
       WHERE stripe_customer_id = $1`,
      [customerId]
    );
    logger.info(`Subscription canceled for customer: ${customerId}`);
  }

  /**
   * Get current subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<{
    tier: string;
    status: string;
    periodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }> {
    const { rows } = await query<any>(
      `SELECT tier, stripe_subscription_id, subscription_status, subscription_period_end
       FROM users WHERE id = $1`,
      [userId]
    );

    if (rows.length === 0) throw new Error('User not found');

    const user = rows[0];
    let cancelAtPeriodEnd: boolean | undefined;

    if (user.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        cancelAtPeriodEnd = sub.cancel_at_period_end;
      } catch {
        // If we can't reach stripe, use cached data
      }
    }

    return {
      tier: user.tier,
      status: user.subscription_status || 'inactive',
      periodEnd: user.subscription_period_end,
      cancelAtPeriodEnd,
    };
  }
}
