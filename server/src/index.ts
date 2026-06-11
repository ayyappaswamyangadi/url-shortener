import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectToMongo } from "./db.js";
import urlRoutes from "./routes/url.js";
import Url from "./models/Url.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "5050";

const sseClients = new Set<express.Response>();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (_, res) => {
  res.send("✅ URL Shortener server is running.");
});

// SSE endpoint — clients subscribe here for real-time click updates
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // prevents Render/nginx from buffering SSE
  res.flushHeaders();
  res.write(": connected\n\n");

  sseClients.add(res);

  // Keep connection alive — proxies drop idle SSE after ~30s
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
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

    // Push real-time update to all connected clients
    const payload = `data: ${JSON.stringify({ shortId, clicks: url.clicks })}\n\n`;
    for (const client of sseClients) {
      client.write(payload);
    }

    return res.redirect(url.originalUrl);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error." });
  }
});

connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on ${process.env.BASE_URL + PORT}`);
  });
});
