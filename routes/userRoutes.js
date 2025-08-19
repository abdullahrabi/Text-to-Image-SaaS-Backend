import express from 'express';
import {
  registerUser,
  loginUser,
  userCredits,
  createPaymentIntent,
  stripeWebhook
} from '../controllers/userController.js';
import userAuth from '../middlewares/auth.js';
import bodyParser from "body-parser";

const userRouter = express.Router();

// ✅ Auth routes
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.get('/credits', userAuth, userCredits);

// ✅ Payment intent (client creates intent before paying)
userRouter.post('/pay-stripe', userAuth, createPaymentIntent);

// ✅ Stripe webhook (Stripe calls this after payment success/cancel)
userRouter.post(
  "/stripe",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhook
);


export default userRouter;
