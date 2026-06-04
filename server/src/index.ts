import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectToMongo } from "./db.js";
import urlRoutes from "./routes/url.js";
import Url from "./models/Url.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "5050";

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_, res) => {
  res.send("✅ URL Shortener server is running.");
});

// API routes
app.use("/api", urlRoutes);

// Redirect route — must come after /api routes
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;
  try {
    const url = await Url.findOne({ shortId });
    if (!url) {
      return res.status(404).json({ error: "Short URL not found." });
    }
    // Track click
    url.clicks += 1;
    await url.save();
    return res.redirect(url.originalUrl);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
});
