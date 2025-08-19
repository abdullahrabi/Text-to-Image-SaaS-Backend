import mongoose from "mongoose";
const transactionSchema = new mongoose.Schema({

    userId:{type: String, require:true},
    plan:{type: String, require:true},
    amount:{type: Number, require:true},
    credits:{type: Number, require:true},
    status: { type: String, enum: ['pending', 'success', 'canceled'], default: 'pending' },
    date: { type: Date, default: Date.now }


})
const transactionModel = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
export default transactionModel;