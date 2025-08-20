import userModel from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import transactionModel from '../models/transactionData.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ------------------- Register -------------------
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'User Already Exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      message: 'User Registered Successfully',
      token,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ------------------- Login -------------------
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: 'User does not Exist Register First Kindly!',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid Credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      message: 'User Logged In Successfully',
      token,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ------------------- Get User Credits -------------------
const userCredits = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    res.json({
      success: true,
      credits: user.creditBalance,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ------------------- Create Stripe PaymentIntent -------------------
const createPaymentIntent = async (req, res) => {
  try {
    const { planId } = req.body; // from frontend
    const userId = req.userId;

    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.json({ success: false, message: 'User not found' });
    }

    if (!planId) {
      return res.json({ success: false, message: 'Missing Plan Id' });
    }

    let credits, plan, amount;
    switch (planId) {
      case 'Basic':
        plan = 'Basic';
        credits = 100;
        amount = 10; // $10
        break;
      case 'Advanced':
        plan = 'Advanced';
        credits = 500;
        amount = 50; // $50
        break;
      case 'Business':
        plan = 'Business';
        credits = 5000;
        amount = 250; // $250
        break;
      default:
        return res.json({ success: false, message: 'Plan not found' });
    }

    // Create PaymentIntent in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      metadata: { userId, plan }, // used later in webhook
      automatic_payment_methods: { enabled: true },
    });

   // Save or update transaction
   const transactionData = {
    userId, plan, amount, credits, date
   }
    const newTransaction = await transactionModel.create(transactionData);
    
    // Return client_secret so frontend can confirm the payment
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      message: 'PaymentIntent created',
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// ------------------- Stripe Webhook (single source of truth) -------------------
/**
 * IMPORTANT:
 * - Mount this controller on a route that uses raw body:
 *   userRouter.post('/stripe-webhook', express.raw({ type: 'application/json' }), stripeWebhook)
 * - Do NOT apply express.json() before this route.
 */
const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw Buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const paymentIntentId = intent.id;

        // Find the pending transaction
        const txn = await transactionModel.findOne({ paymentIntentId });
        if (!txn) {
          // Nothing to update; safely acknowledge
          console.warn('Transaction not found for intent:', paymentIntentId);
          break;
        }

        // Idempotency guard: if already success, do nothing
        if (txn.status === 'success') break;

        // Mark transaction as success
        txn.status = 'success';
        await txn.save();

        // Credit the user based on stored txn (not from client)
        await userModel.findByIdAndUpdate(txn.userId, {
          $inc: { creditBalance: txn.credits },
        });

        console.log(`✅ Credits added: ${txn.credits} to user ${txn.userId}`);
        break;
      }

      case 'payment_intent.canceled': {
        const intent = event.data.object;
        const paymentIntentId = intent.id;

        // Mark transaction as canceled if found
        await transactionModel.findOneAndUpdate(
          { paymentIntentId },
          { status: 'canceled' }
        );
        console.log(`❌ Payment canceled: ${paymentIntentId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).send('Server error');
  }
};

export {
  registerUser,
  loginUser,
  userCredits,
  createPaymentIntent,
  stripeWebhook,
};
