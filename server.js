import express from "express";
import db, { client } from "./mongo/mongoClient.js";
import cors from "cors";
import dotenv from "dotenv";
import { vaults } from "./utils/utils.js";

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
    let totalQuartzPerDay = 0;
    const address = req.params.address;

    for (const [vault, _] of Object.entries(vaults)) {
      const coll = db.collection(vault);
      const document = await coll.findOne({ address });
      if (document) {
        totalQuartzPerDay += document.quartzPerDay;
      }
    }

    res.send(totalQuartzPerDay.toString());
  } catch {
    res.send("0");
  }
});

app.get("/quartz", async (req, res) => {
  try {
    const coll = db.collection("quartz");
    const cursor = coll.find();

    const results = await cursor.toArray();

    // Convert the results to JSON
    const jsonResults = JSON.stringify(results);

    res.send(jsonResults);
  } catch {
    res.send([]);
  }
});
