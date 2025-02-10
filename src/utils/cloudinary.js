import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from "fs";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // File has been uploaded successfully
        console.log("File has been uploaded successfully", response.url);
        return response
    } catch (error) {
        // Remove the locally saved temporary file as the upload operation gets failed
        fs.unlinkSync(localFilePath)
        return null;
    }
}

export {uploadOnCloudinary}