import mysql from "mysql2";
import dotenv from "dotenv";
import Web3 from "web3";

import { readAirdropEvents, getPrice } from "../utils/web3Utils.js";

dotenv.config();
const web3 = new Web3(process.env.ALCHEMY_ETHEREUM_RPC_URL);

const getLeaderboardData = async () => {
  return new Promise((resolve) => {
    const holders = readAirdropEvents(web3);
    resolve(holders);
  });
};

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

// DELETE all previous data in the leaderboard table
const emptyTable = async () => {
  await pool.query("DELETE FROM leaderboard");
};

const insertIntoLeaderboard = async (
  address,
  balance,
  airdrop,
  quartzPerDay
) => {
  await pool.query(
    "INSERT INTO leaderboard (address, balance, airdrop, quartzPerDay) VALUES (?, ?, ?, ?)",
    [address, balance, airdrop, quartzPerDay]
  );
};

const updateLeaderboardDatabase = async () => {
  await emptyTable();
  const holders = await getLeaderboardData();

  for (const holder of holders) {
    if (holder.balance > 0) {
      const quartzPerDay = await getPrice(web3, holder.address, holder.balance);
      await insertIntoLeaderboard(
        holder.address,
        holder.balance,
        holder.airdrop,
        quartzPerDay
      );
    }
  }

  pool.end();
};

updateLeaderboardDatabase();
