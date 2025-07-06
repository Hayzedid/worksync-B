import cors from 'cors';

const corsOptions = {
  origin: ['http://localhost:3000'], // adjust to match your frontend domain
  credentials: true,
  optionsSuccessStatus: 200
};

export default cors(corsOptions);
