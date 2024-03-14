import express from "express";
import db, { client } from "./mongoClient.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Quartz Leaderboard API");
});

app.get("/holders", async (req, res) => {
  try {
    const cursor = db.find();

    const results = await cursor.toArray();

    // Convert the results to JSON
    const jsonResults = JSON.stringify(results);

    res.send(jsonResults);
  } catch {
    res.send([]);
  }
});

app.get("/quartz/:address", async (req, res) => {
  try {
    const address = req.params.address;

    const document = await db.findOne({ address });

    if (document) {
      res.send(document.quartzPerDay.toString());
    } else {
      res.send("0");
    }
  } catch {
    res.send("0");
  }
});
