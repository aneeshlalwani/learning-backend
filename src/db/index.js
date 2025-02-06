import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        // mongoose returns an object
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`\nMongo DB Connected!! HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Mongo DB Connection error: ", error);
        process.exit(1);
    }
}
export default connectDB;