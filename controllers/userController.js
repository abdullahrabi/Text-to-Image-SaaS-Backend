import userModel from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Register a new user

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.json({success: false, message: 'Missing Deatils' });
        }
        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: 'User Already Exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const newUser = new userModel(userData);
        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
        res.json({success: true, message: 'User Registered Successfully', token, user: {name:user.name}});

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({success: false, message: 'Missing Deatils' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({success: false, message: 'User does not Exist Register First Kindly!' });
        }
       
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({success: false, message: 'Invalid Credentials' });
        }
        if(isMatch){
            console.log('User Logged In Successfully');
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'});
            res.json({success: true, message: 'User Logged In Successfully', token, user: {name:user.name}})
        }

    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message });
    }
}

const userCredits = async (req, res) => {

    try {

        const user = await userModel.findById(req.userId);
        res.json({success:true, credits:user.creditBalance, user:{name: user.name}})
        
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message });
    }
}


export { registerUser, loginUser,userCredits };