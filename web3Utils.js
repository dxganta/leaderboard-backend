import scEthAbi from "./abis/scEthAbi.json" with { type: "json" };
import ERC20Abi from "./abis/ERC20Abi.json" with { type: "json" };

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

  const holders = await Promise.all(
    Object.keys(airdrops).map(async (address) => {
      const airdrop = airdrops[address];
    
      let balance = await vault.methods.balanceOf(address).call();
    
      balance = Number(web3.utils.fromWei(balance, decimals===6 ? "mwei" : "ether" ));
      
      // console.log({ address, balance, airdrop });

      return { address, balance, airdrop };
    })
  );

    return holders.sort((a, b) => b.airdrop - a.airdrop);
}


export async function getPrice(balance, isScEth) {
  const quartzAPY = 0.15;

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

  let dollarsPerDay;
  if (isScEth) {
    const ethPrice = data.data.ETH[0].quote.USD.price.toFixed(2);
    dollarsPerDay = (balance * ethPrice * quartzAPY) / 365;
  } else {
    dollarsPerDay = (balance * quartzAPY) / 365;
  }
  const quartzPerDay = dollarsPerDay / quartzPrice;

  return quartzPerDay.toFixed(2);
}

// async function getHolders(web3) {
//   const response = await fetch(
//     "https://api.chainbase.online/v1/token/holders?chain_id=1&contract_address=0x4c406C068106375724275Cbff028770C544a1333&page=1&limit=100",
//     {
//       method: "GET",
//       headers: {
//         accept: "application/json",
//         "x-api-key": process.env.CHAINBASE_API_KEY,
//       },
//     }
//   );

//   const data = await response.json();
//   const holders = data.data;

//   // get balanceOf each holder from holders array and create list with address and balance
//   const holderBalances = await Promise.all(
//     holders.map(async (address) => {
//       let balance = await getBalanceOf(web3, address);
//       balance = web3.utils.fromWei(balance, "ether");
//       balance = Number(balance).toFixed(2);

//       return { address, balance };
//     })
//   );

//   const sortedBalances = holderBalances.sort((a, b) => b.balance - a.balance);
//   return sortedBalances;
// }
