import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = `mongodb+srv://root:${process.env.MONGODB_PASSWORD}@quartzleaderboard.ghh8qyb.mongodb.net/?retryWrites=true&w=majority&appName=QuartzLeaderboard`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cl = await client.connect();

const db = cl.db("leaderboard");

export default db;
