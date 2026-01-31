import express, { Express } from "express";
import authRouter from './routes/auth'
import cors from 'cors'

const app: Express = express();
const port = Number(process.env.PORT ?? 3000);
const host = "0.0.0.0";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/generate_recharge_jwt", authRouter);

const server = app.listen(port, host, () =>
  console.log(`
🚀 Server ready at: http://${host}:${port}
  `)
);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

