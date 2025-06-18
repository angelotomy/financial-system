const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financial-system');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const MONGODB_URI = 'mongodb+srv://admin:admin123@cluster0.mongodb.net/financial-system?retryWrites=true&w=majority';

module.exports = {
    connectDB,
    MONGODB_URI
}; 