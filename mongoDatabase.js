import dotenv from "dotenv";
import Web3 from "web3";
import db, { client } from "./mongoClient.js";
import { vaults } from "./utils.js";
import { Alchemy, Network } from "alchemy-sdk";

import {
  readAirdropEvents,
  getQuartzPerDay,
  getEns,
  getPrices,
} from "./web3Utils.js";

dotenv.config();
const web3 = new Web3(process.env.ALCHEMY_ETHEREUM_RPC_URL);

const config = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

const getLeaderboardData = async (vaultAddress) => {
  return new Promise((resolve) => {
    const holders = readAirdropEvents(web3, vaultAddress);
    resolve(holders);
  });
};

async function run() {
  try {
    // let vault = "scusdc";
    // let vaultAddress = vaults[vault];
    for (const [vault, vaultAddress] of Object.entries(vaults)) {
      console.log("Adding to vault", vault);
      const coll = db.collection(vault);
      // delete all previous data
      await coll.deleteMany({});

      const holders = await getLeaderboardData(vaultAddress);

      const [ethPrice, quartzPrice] = await getPrices();

      for (const holder of holders) {
        if (holder.balance > 0) {
          const quartzPerDay = getQuartzPerDay(
            holder.balance,
            vault === "sceth",
            ethPrice,
            quartzPrice
          );

          const ens = await getEns(alchemy, holder.address);

          await coll.insertOne({
            address: ens,
            balance: holder.balance,
            airdrop: holder.airdrop,
            quartzPerDay: Number(quartzPerDay),
          });
        }
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);
