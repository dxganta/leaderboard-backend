import dotenv from "dotenv";
import Web3 from "web3";
import db, { client } from "./mongoClient.js";
import { vaults } from "../utils/utils.js";
import { Alchemy, Network } from "alchemy-sdk";
import scEthAbi from "../abis/scEthAbi.json" with { type: "json" };
import ERC20Abi from "../abis/ERC20Abi.json" with { type: "json" };


import {
  readAirdropEvents,
  getQuartzPerDay,
  getEns,
  getPrices,
  getQuartzPoints,
} from "../utils/web3Utils.js";

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

const totalClaimPerOwner = async (web3, vaultAddress, assetType) => {
  return new Promise((resolve) => {
    const points = getQuartzPoints(web3, vaultAddress, assetType);
    resolve(points);
  });
};

async function updateLeaderboardBalances() {
  try {
    // let vault = "scusdc";
    // let vaultAddress = vaults[vault];
    for (const [vault, vaultAddress] of Object.entries(vaults)) {
      console.log("Adding to vault Leaderboard", vault);
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

          // const ens = await getEns(alchemy, holder.address);

          await coll.insertOne({
            address: holder.address,
            balance: holder.balance,
            airdrop: holder.airdrop,
            quartzPerDay: Number(quartzPerDay),
            quartzPoints: 0
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

async function updateQuartzPoints()  {
  try {
    for (const [vault, vaultAddress] of Object.entries(vaults)) {
      console.log("Adding quartz points to vault", vault);
      const coll = db.collection(vault);

      const quartzPointsAccumulated = await totalClaimPerOwner(web3, vaultAddress, vault);

      for (const [owner, points] of Object.entries(quartzPointsAccumulated)) {
        if (points > 1) {
          const filter = { address: owner };
          const options = { upsert: true };
  
          // Specify the update to set a value for the plot field
        const updateDoc = {
          $set: {
            quartzPoints: points
          },
        };
        // Update the first document that matches the filter
         await coll.updateOne(filter, updateDoc, options);
        }
    }
  } 
}
  catch (err) {
    console.log(err);
  } finally {
    await client.close();
  }
}

async function updateEnsNames() {
 try {
  for (const [vault, vaultAddress] of Object.entries(vaults)) {
    const coll = db.collection(vault);

    // get all entries in the collection
    const cursor = coll.find({});
    const results = await cursor.toArray();
    const jsonResults = JSON.stringify(results);

    for (const doc in jsonResults) {
      console.log(doc);
    }
  }
 } catch (err) {
    console.log(err);
 } finally {
    await client.close();
 }
}

async function run(functionName) {
  console.log(functionName);
  if (functionName === 'balances') {
     await updateLeaderboardBalances();
  } else if (functionName == "points") {
    await updateQuartzPoints();
  } else if (functionName == "ens") {
    await updateEnsNames();
  }
}

run("balances").catch(console.dir);
