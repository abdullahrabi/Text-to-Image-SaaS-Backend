import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDb from './config/mongodb.js';
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';
import bodyParser from 'body-parser';

const PORT = process.env.PORT || 4000;
const app = express();

await connectDb();

app.use(cors());

// Use JSON parser for all routes EXCEPT webhook
app.use('/api/user/stripe', bodyParser.raw({ type: 'application/json' }));
app.use(express.json());

// Routers
app.use('/api/user', userRouter);
app.use('/api/image', imageRouter);

app.get('/', (req, res) => {
  res.send('API Working');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
