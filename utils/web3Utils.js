import scEthAbi from "../abis/scEthAbi.json" with { type: "json" };
import ERC20Abi from "../abis/ERC20Abi.json" with { type: "json" };

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
    fromBlock: 19076310, // Use a specific block number where the contract was deployed, or 'earliest' for the start
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
  const quartzAPY = 0.15;

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

// returns the amount of QUARTZ this address has gained in the ongoing month
// which are to be distributed in the end of the month
export async function getQuartzPoints(walletAddress) {

} 