import express, {Request,Response} from 'express';
import 'dotenv/config';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import userRouter from './routes/userRoutes';
import projectRouter from './routes/projectRoutes';
import webhookRouter from './routes/webhookRoutes';
const app=express();

const port = Number(process.env.PORT) || 3000;

const corsOptions = {
  origin: process.env.TRUSTED_ORIGINS?.split(',')||[],
  credentials: true,
}

app.use(cors(corsOptions));

// ⚠️  Webhook route MUST be registered BEFORE express.json()
// so Stripe can verify the raw body signature.
app.use('/api/webhook', webhookRouter);

app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json({limit : '50mb'}))

app.get('/',(req:Request,res:Response)=>{
  res.send('Server is Live!');
});
app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);
app.use('/api/projects', projectRouter);

app.listen(port,()=>{
  console.log(`Server is runninig at http://localhost:${port}`);
})