const express = require("express");
const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: "din4pswwv",
  api_key: process.env.CLOUDINARY_API_KEY || "your_api_key",
  api_secret: process.env.CLOUDINARY_API_SECRET || "your_api_secret",
});

// Upload endpoint for images
router.post("/image", async (req, res) => {
  try {
    if (!req.body || !req.body.image || typeof req.body.image !== "string") {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(req.body.image, "base64");
    const stream = Readable.from(buffer);

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "ptf-india/events",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ error: "Upload failed", details: error.message });
        }
        res.json({ url: result.secure_url, public_id: result.public_id });
      }
    );

    stream.pipe(uploadStream);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// Delete image endpoint
router.delete("/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
});

module.exports = router;
