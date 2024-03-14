import dotenv from "dotenv";
import Web3 from "web3";
import db, { client } from "./mongoClient.js";

import { readAirdropEvents, getPrice } from "./web3Utils.js";

dotenv.config();
const web3 = new Web3(process.env.ALCHEMY_ETHEREUM_RPC_URL);

const getLeaderboardData = async () => {
  return new Promise((resolve) => {
    const holders = readAirdropEvents(web3);
    resolve(holders);
  });
};

async function run() {
  try {
    // delete all previous data
    await db.deleteMany({});

    const holders = await getLeaderboardData();

    for (const holder of holders) {
      if (holder.balance > 0) {
        const quartzPerDay = await getPrice(
          web3,
          holder.address,
          holder.balance
        );

        await db.insertOne({
          address: holder.address,
          balance: holder.balance,
          airdrop: holder.airdrop,
          quartzPerDay: Number(quartzPerDay),
        });
      }
    }
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);
