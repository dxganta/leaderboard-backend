import dotenv from "dotenv";
import Web3 from "web3";
import db, { client } from "./mongoClient.js";
import { vaults, blacklistedAddress } from "../utils/utils.js";
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
    for (const [vault, vaultAddress] of Object.entries(vaults)) {
      console.log("Adding to vault Leaderboard", vault);
      const coll = db.collection(vault);
      // delete all previous data
      await coll.deleteMany({});

      const holders = await getLeaderboardData(vaultAddress);
      const quartzPointsAccumulated = await totalClaimPerOwner(web3, vaultAddress, vault);

      const [ethPrice, quartzPrice] = await getPrices();

      const holderAddresses = holders.map((holder) => holder.address);

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
            quartzPoints: quartzPointsAccumulated[holder.address],
          });
        }
      }

      // get all addresses in quartzPointsAccumulated that are not in holderAddresses
      // these will be the addresses that have been received scETH shares by transfer
      const missedHolders = Object.keys(quartzPointsAccumulated).filter(
        (address) => !holderAddresses.includes(address)
      );

      const vault_ = new web3.eth.Contract(
        scEthAbi,
        vaultAddress
      );
      const totalSupply = Number(await vault_.methods.totalSupply().call());
      const totalAssets = Number(await vault_.methods.totalAssets().call());
      const pps = totalAssets / totalSupply;

      for (const address of missedHolders) {
        let balance = await vault_.methods.balanceOf(address).call();

        if ((balance >  0) && !blacklistedAddress.includes(address)) {
          console.log("Missed address", address);
          balance = Number(web3.utils.fromWei(balance, vault==="scusdc" ? "mwei" : "ether" ));
          balance = balance * pps;
  
          const quartzPerDay = getQuartzPerDay(
            balance,
            vault === "sceth",
            ethPrice,
            quartzPrice
          );
  
          await coll.insertOne({
            address: address,
            balance : balance,
            airdrop : 0,
            quartzPerDay : quartzPerDay,
            quartzPoints : quartzPointsAccumulated[address],
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



async function run(functionName) {
  console.log(functionName);
  if (functionName === 'balances') {
     await updateLeaderboardBalances();
  } 
}

run("balances").catch(console.dir);
