import express from "express";
import db, { client } from "./mongoClient.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Quartz Leaderboard API");
});

app.get("/holders/:vault", async (req, res) => {
  try {
    const coll = db.collection(req.params.vault);
    const cursor = coll.find();

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
