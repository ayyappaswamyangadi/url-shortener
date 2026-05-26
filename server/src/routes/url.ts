import Router from "express";
import { nanoid } from "nanoid";
import Url from "../models/Url";

const router = Router();

const BASE_URL = process.env.BASE_URL || "http://localhost:5050";

// POST /api/shorten — create a short URL
router.post("/shorten", async (request, response) => {
  const { originalUrl } = request.body;

  // Validate presence and type
  if (!originalUrl || typeof originalUrl !== "string") {
    return response.status(400).json({ error: "A valid URL string is required." });
  }

  // Validate URL format
  try {
    new URL(originalUrl);
  } catch {
    return response.status(400).json({ error: "Invalid URL format. Include http:// or https://" });
  }

  try {
    // Return existing short URL if already shortened
    const existing = await Url.findOne({ originalUrl });
    if (existing) {
      return response.json({
        shortUrl: `${BASE_URL}/${existing.shortId}`,
        shortId: existing.shortId,
        clicks: existing.clicks,
        createdAt: existing.createdAt,
      });
    }

    // Create new short URL
    const shortId = nanoid(6);
    const newUrl = new Url({ originalUrl, shortId });
    await newUrl.save();

    return response.status(201).json({
      shortUrl: `${BASE_URL}/${shortId}`,
      shortId,
      clicks: 0,
      createdAt: newUrl.createdAt,
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/urls — list all shortened URLs (newest first)
router.get("/urls", async (_request, response) => {
  try {
    const urls = await Url.find().sort({ createdAt: -1 }).limit(50);
    return response.json(
      urls.map((u) => ({
        shortId: u.shortId,
        shortUrl: `${BASE_URL}/${u.shortId}`,
        originalUrl: u.originalUrl,
        clicks: u.clicks,
        createdAt: u.createdAt,
      }))
    );
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /api/urls/:shortId — delete a short URL
router.delete("/urls/:shortId", async (request, response) => {
  const { shortId } = request.params;
  try {
    const deleted = await Url.findOneAndDelete({ shortId });
    if (!deleted) {
      return response.status(404).json({ error: "Short URL not found." });
    }
    return response.json({ message: "Deleted successfully." });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Internal server error." });
  }
});

export default router;
