import mongoose from "mongoose";
const transactionSchema = new mongoose.Schema({

  userId: { type: String, required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true },
  credits: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'canceled'], default: 'pending' },
  date: { type: Date, default: Date.now },
  paymentIntentId: { type: String, required: true }, // NEW


})
const transactionModel = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
export default transactionModel;