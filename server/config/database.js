const mongoose = require('mongoose');

// MongoDB Atlas connection string
const MONGODB_URI = 'mongodb+srv://angelo:Cheesecake37@finance-cluster.19iqrki.mongodb.net/financial-system?retryWrites=true&w=majority&appName=finance-cluster';

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB Atlas...');
        
        const conn = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log(`MongoDB Atlas Connected Successfully: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('MongoDB Connection Error:');
        console.error(`Error Name: ${error.name}`);
        console.error(`Error Message: ${error.message}`);
        if (error.reason) console.error(`Error Reason: ${error.reason}`);
        process.exit(1);
    }
};

module.exports = connectDB; 