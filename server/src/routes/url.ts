import Router from "express";
import { nanoid } from "nanoid";
import Url from "../models/Url";

const router = Router();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

router.post("/shorten", async (request, response) => {
  const { originalUrl } = request.body;

  // no valid originalUrl
  if (!originalUrl || typeof originalUrl !== "string") {
    return response.status(400).json({ error: "Invalid url" });
  }
  try {
    //if short id exists
    const existing = await Url.findOne({ originalUrl });
    if (existing) {
      return response?.json({ shortUrl: `${BASE_URL}/${existing.shortId}` });
    }

    // if no short id exists
    const shortId = nanoid(6);

    const newUrl = new Url({ originalUrl, shortId });
    await newUrl.save();
    response.status(201).json({ shortUrl: `${BASE_URL}/${shortId}` });
  } catch (error) {
    console.log(error);
  }
});

export default router;
