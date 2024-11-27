import dotenv from "dotenv";
import Web3 from "web3";
import { vaults, blacklistedAddress, stablecoinVaults, aavePool } from "../utils/utils.js";
import scUsdcAbi from "../abis/scUsdcAbi.json" with { type: "json" };
import ERC20Abi from "../abis/ERC20Abi.json" with { type: "json" };
import AavePoolAbi from "../abis/AavePoolAbi.json" with {type: "json"};
import { getPrices } from "../utils/web3Utils.js";


dotenv.config();
const web3 = new Web3(process.env.ALCHEMY_ETHEREUM_RPC_URL);

const getLiquidationPrice =  async (maxLtv, web3, {vaultAddress, poolAddress}) => {
    // liquidation price of eth = total usdc supplied * max_ltv / no. of eth borrowed
    const vault = new web3.eth.Contract(scUsdcAbi, vaultAddress);

    const pool = new web3.eth.Contract(AavePoolAbi, poolAddress);

    const ltv = await pool.methods.getUserAccountData(vaultAddress).call();

    const {totalCollateralBase, totalDebtBase} = ltv;

    const currentLtv = Number(totalDebtBase) / Number(totalCollateralBase);

    console.log("current ltv: ", currentLtv);

    // total usdc supplied
    const totalCollateral = Number(await vault.methods.totalCollateral().call());
    
    // total weth debt
    const totalDebt = Number(await vault.methods.totalDebt().call());

    const liquidationPrice = (totalCollateral * maxLtv * 1e12) / totalDebt;
    console.log("max ltv:", maxLtv.toFixed(2), "liquidation price $ETH", liquidationPrice.toFixed(0));
    return liquidationPrice;
}

// await getLiquidationPrice(0.75, web3, stablecoinVaults.scsdai);

const getLtvForLiquidationPrice = async (liquidationPrice, maxLtv) => {

 const [ethPrice, _] = await getPrices();
 
 const requiredLtv = (maxLtv * ethPrice) / liquidationPrice;

 console.log("ltv:", requiredLtv.toFixed(2), "liquidation price $ETH", liquidationPrice.toFixed(0));
 return requiredLtv;
}

// let lp = 3000;
// while (lp <= 4300) {
//     await getLtvForLiquidationPrice(lp, 0.75, web3, stablecoinVaults.scsdai);
//     lp += 250;
// }

// await getLiquidationPrice(0.78, web3, stablecoinVaults.scsdai);


// await getLtvForLiquidationPrice(3800, 0.75, web3, stablecoinVaults.scsdai);


for (const [vault, vaultAddress] of Object.entries(stablecoinVaults)) {
    console.log(vault);
    await getLiquidationPrice(0.75, web3, vaultAddress);
    console.log('-------------------------------')
}


const test = async (web3) => {

    const vault = new web3.eth.Contract(scUsdcAbi, stablecoinVaults.scsdai);
    const totalAssets = Number(await vault.methods.totalAssets().call());
    
    console.log("total assets", totalAssets / 1e18);
}


// await test(web3);
