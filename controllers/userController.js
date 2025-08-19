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
       
        const {userId, planId} = req.userId; 
        const userData = await userModel .findById(userId)
        

        if (!userId || !planId) {
            return res.json({ success: false, message: "Missing User Id or Plan Id" });
        }

        let credits,plan, amount , date
        
        switch (planId) {
            case 'Basic':
                plan = 'Basic'
                credits = 100
                amount = 10
                break;
            case 'Advanced':
                plan = 'Advanced'
                credits = 500
                amount = 50
                break;
            case 'Business':
                plan = 'Business'
                credits = 5000
                amount = 250
                break;
        
            default:
                return res.json({ success: false, message: "Plan not found" });
        }
        date = Date.now();

        const transactionData = {
             userId,plan, amount , credits, date
        }
        
        
       

       
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};



export { registerUser, loginUser, userCredits, createPaymentIntent };
 