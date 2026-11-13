
require('dotenv').config();

const express = require('express');
const cors = require("cors");
const connectDB = require('./config/db');
const assignmentRoutes = require('./routes/assignmentRoutes');
const app = express();

// Browser pages on the local frontend server may call this API.
// Any other website is rejected.
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const PORT = process.env.PORT || 5000;
const authRoutes = require('./routes/authRoutes');
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);






app.get('/', (req, res) => {
  res.send('CampusConnect Backend is Running!');
});

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`CampusConnect server running on http://localhost:${PORT}`);
  });
};

startServer();
