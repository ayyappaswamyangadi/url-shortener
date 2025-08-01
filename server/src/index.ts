import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectToMongo } from "./db";
import urlRoutes from "./routes/url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "5050";

app.use(cors());
app.use(express.json());

app.use("/api", urlRoutes);

app.get("/", (_, res) => {
  res.send("URL shortener is running");
});

connectToMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on 'http://localhost:${PORT}'`);
  });
});
