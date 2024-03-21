import scEthAbi from "../abis/scEthAbi.json" with { type: "json" };
import ERC20Abi from "../abis/ERC20Abi.json" with { type: "json" };

const quartzAPY = 0.15;
const zeroAddress = "0x0000000000000000000000000000000000000000"

export async function readAirdropEvents(web3, vaultAddress) {
  const quartzContract = new web3.eth.Contract(
    ERC20Abi,
    "0xbA8A621b4a54e61C442F5Ec623687e2a942225ef"
  );

  let airdrops = {};

  const events = await quartzContract.getPastEvents("Transfer", {
    filter: {
      from: [
        "0xD152f549545093347A162Dce210e7293f1452150",
        "0x6cF38285FdFAf8D67205ca444A899025b5B18e83",
      ],
    },
    fromBlock: 18847935, // Use a specific block number where the contract was deployed, or 'earliest' for the start
    toBlock: "latest",
  });

  events.forEach((event) => {
    const { _, to, value } = event.returnValues;
    const valueInEth = Number(web3.utils.fromWei(value, "ether"));

    if (airdrops.hasOwnProperty(to)) {
      // If the key exists, add the new value to the existing value
      airdrops[to] += valueInEth;
    } else {
      // If the key doesn't exist, add the key with the initial value
      airdrops[to] = valueInEth;
    }
  });

  const vault = new web3.eth.Contract(
    scEthAbi,
    vaultAddress
  );

  const decimals = Number(await vault.methods.decimals().call());
  const totalSupply = Number(await vault.methods.totalSupply().call());
  const totalAssets = Number(await vault.methods.totalAssets().call());

  const pps = totalAssets / totalSupply;

  const holders = await Promise.all(
    Object.keys(airdrops).map(async (address) => {
      const airdrop = airdrops[address];
    
      let balance = await vault.methods.balanceOf(address).call();
    
      balance = Number(web3.utils.fromWei(balance, decimals===6 ? "mwei" : "ether" ));
      balance = balance * pps;
      
      // console.log({ address, balance, airdrop });

      return { address, balance, airdrop };
    })
  );

    return holders.sort((a, b) => b.airdrop - a.airdrop);
}

// returns the price of ETH and QUARTZ
export async function getPrices() {
  const response = await fetch(
    "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=ETH,QUARTZ",
    {
      method: "GET",
      headers: {
        accept: "application/json",
        mode: "no-cors",
        "X-CMC_PRO_API_KEY": process.env.REACT_APP_COINMARKETCAP_API_KEY,
      },
    }
  );

  const data = await response.json();

  const quartzPrice = data.data.QUARTZ[0].quote.USD.price.toFixed(4);
  const ethPrice = data.data.ETH[0].quote.USD.price.toFixed(2);

  return [ ethPrice, quartzPrice];

}


// returns the amount of QUARTZ per day for an address
export function getQuartzPerDay(balance, isScEth, ethPrice, quartzPrice) {
  let dollarsPerDay;
  if (isScEth) {
    dollarsPerDay = (balance * ethPrice * quartzAPY) / 365;
  } else {
    dollarsPerDay = (balance * quartzAPY) / 365;
  }
  const quartzPerDay = dollarsPerDay / quartzPrice;

  return quartzPerDay.toFixed(2);
}


// returns the ENS name for an address else returns the address
export async function getEns(alchemy, walletAddress) {
  const ensContractAddress = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";
  const nfts = await alchemy.nft.getNftsForOwner(walletAddress, {
    contractAddresses: [ensContractAddress],
  });

  if (nfts.totalCount > 0) {
    return nfts.ownedNfts[0].name.toString();
  } 
    return walletAddress;
}

const multipliers = {
  "sceth": 3587e-18,
  "scusdc": 1e-6,
  "sclusd": 1e-18,
}

// returns the amount of QUARTZ all addresses has gained in the ongoing month
// which are to be distributed in the end of the month
export async function getQuartzPoints(web3, vaultAddress, assetType) {

  if (assetType == "sceth") {
    const [ethPrice, _] = await getPrices();
    multipliers["sceth"] = ethPrice;
  }

  const vault = new web3.eth.Contract(
    scEthAbi,
    vaultAddress
  );

  const decimals = Number(await vault.methods.decimals().call());
  
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const monthStartTimestamp = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).getTime() / 1000;

  let totalClaimPerOwner = {};

  const depositEvents = await vault.getPastEvents("Deposit", {
    fromBlock: 17990849, // Use a specific block number where the contract was deployed, or 'earliest' for the start
    toBlock: "latest",
  });
  for (const event of depositEvents) {
    const {owner, assets} = event.returnValues;
    const value = await quartzAirdropForDeposit(web3, assets, currentTimestamp, monthStartTimestamp, assetType, decimals, event.blockNumber);

    if (owner in totalClaimPerOwner) {
      totalClaimPerOwner[owner] += value;
    } else {
      totalClaimPerOwner[owner] = value;
    }
  }

  // console.log(totalClaimPerOwner);


  const transferEvents = await vault.getPastEvents("Transfer", {
    fromBlock: 17990849, // Use a specific block number where the contract was deployed, or 'earliest' for the start
    toBlock: "latest",
  });
  for (const event of transferEvents) {
    const {from, to, amount} = event.returnValues;

    if ((from !== zeroAddress) && (to!==zeroAddress)) {
      const airdropValue = await quartzAirdropForDeposit(web3, amount, currentTimestamp, monthStartTimestamp, assetType, decimals, event.blockNumber);

      totalClaimPerOwner[from] -= airdropValue;

      if (to in totalClaimPerOwner) {
        totalClaimPerOwner[to] += airdropValue;
      } else {
        totalClaimPerOwner[to] = airdropValue;
      }
    }  
  }

  // console.log(totalClaimPerOwner);

  const withdrawalEvents = await vault.getPastEvents("Withdraw", {
    fromBlock: 17990849, // Use a specific block number where the contract was deployed, or 'earliest' for the start
    toBlock: "latest",
  });
  for (const event of withdrawalEvents) {
    const {owner, assets} = event.returnValues;

    const value = await quartzAirdropForDeposit(web3, assets, currentTimestamp, monthStartTimestamp, assetType, decimals, event.blockNumber);
    totalClaimPerOwner[owner] -= value;
  }

  // console.log(totalClaimPerOwner);

  return totalClaimPerOwner;

} 

async function quartzAirdropForDeposit(web3, balance, currentTimestamp, monthStartTimestamp, assetType, decimals, blockNumber) {
  let assets = Number(web3.utils.fromWei(balance, decimals===6 ? "mwei" : "ether" ));
  
  const depositTimestamp = Number((await web3.eth.getBlock(blockNumber)).timestamp);

  let hoursSinceDeposit;
  if (depositTimestamp > monthStartTimestamp) {
    hoursSinceDeposit = (currentTimestamp - depositTimestamp) / 3600;
  } else {
    hoursSinceDeposit = (currentTimestamp - monthStartTimestamp) / 3600;
  }

  assets = assets * Number(multipliers[assetType]);

  const value = assets * quartzAPY *  (hoursSinceDeposit / (365 * 24) )

  return value;
}