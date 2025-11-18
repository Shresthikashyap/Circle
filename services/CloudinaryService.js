const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (fileBuffer, fileName, mimetype) => {
  return new Promise((resolve, reject) => {
    let resourceType = "raw"; // default

    if (mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (mimetype.startsWith("video/")) {
      resourceType = "video";
    } 
    // else leave it as raw (pdf, docx, zip, txt etc.)

    console.log("Uploading as resource type:", resourceType);
    console.log("File name received:", fileName);
    console.log("Mimetype:", mimetype);
    
    // Generate a clean public_id
    let publicId;
    if (fileName && fileName !== mimetype) {
      // Use the actual filename
      publicId = path.parse(fileName).name;
    } else {
      // Fallback to timestamp-based name if fileName is not available
      publicId = `video_${Date.now()}`;
    }
    
    // Clean the public_id - remove special characters that might cause issues
    publicId = publicId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    console.log("Using public_id:", publicId);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
        folder: "group_files",
        // Add these options for better video handling
        // ...(resourceType === "video" && {
        //   quality: "auto",
        //   fetch_format: "auto"
        // })
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        console.log("Upload successful:", result.secure_url);
        resolve(result.secure_url); // file URL
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = { uploadToCloudinary };