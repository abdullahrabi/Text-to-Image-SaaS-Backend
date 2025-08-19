import userModel from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import bodyParser from 'body-parser';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ------------------- Register -------------------
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.json({success: false, message: 'Missing Details' });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: 'User Already Exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        });

        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.json({success: true, message: 'User Registered Successfully', token, user: {name:user.name}});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message });
    }
};

// ------------------- Login -------------------
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({success: false, message: 'Missing Details' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({success: false, message: 'User does not Exist Register First Kindly!' });
        }
       
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({success: false, message: 'Invalid Credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.json({success: true, message: 'User Logged In Successfully', token, user: {name:user.name}});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message });
    }
};

// ------------------- Get User Credits -------------------
const userCredits = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId);
        res.json({success:true, credits:user.creditBalance, user:{name: user.name}});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message });
    }
};

// ------------------- Create Stripe PaymentIntent -------------------
const createPaymentIntent = async (req, res) => {
    try {
        const { credits, amount } = req.body; // amount in cents, credits to give
        const userId = req.userId; // extracted from JWT middleware

        if (!credits || !amount) {
            return res.json({ success: false, message: "Missing payment details" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount, // in cents
            currency: "usd",
            metadata: {
                userId: userId,
                credits: credits
            }
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

// ------------------- Stripe Webhook -------------------
const stripeWebhook = [
    bodyParser.raw({ type: "application/json" }),
    async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error("⚠️ Webhook signature verification failed:", err.message);
            return res.sendStatus(400);
        }

        switch (event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const userId = paymentIntent.metadata?.userId;
                const credits = parseInt(paymentIntent.metadata?.credits, 10);

                if (userId && credits) {
                    await userModel.findByIdAndUpdate(userId, {
                        $inc: { creditBalance: credits }
                    });
                    console.log(`✅ Payment succeeded: added ${credits} credits to user ${userId}`);
                }
                break;
            }
            case "payment_intent.canceled": {
                const paymentIntent = event.data.object;
                console.log(`❌ Payment canceled for intent: ${paymentIntent.id}`);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    }
];

export { registerUser, loginUser, userCredits, createPaymentIntent, stripeWebhook };
