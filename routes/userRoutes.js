import express from 'express';
import { registerUser, loginUser, userCredits, stripeWebhook } from '../controllers/userController.js';
import userAuth from '../middlewares/auth.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/credits', userAuth, userCredits);

// ✅ Stripe Webhook route (no auth middleware here!)
userRouter.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default userRouter;
