import dotenv from "dotenv";
import Web3 from "web3";
import { vaults, blacklistedAddress } from "../utils/utils.js";
import scUsdcAbi from "../abis/scUsdcAbi.json" with { type: "json" };
import ERC20Abi from "../abis/ERC20Abi.json" with { type: "json" };
import { getPrices } from "../utils/web3Utils.js";


dotenv.config();
const web3 = new Web3(process.env.ALCHEMY_ETHEREUM_RPC_URL);

const getLiquidationPrice =  async (maxLtv, web3, vaultAddress) => {
    // liquidation price of eth = total usdc supplied * max_ltv / no. of eth borrowed
    const vault = new web3.eth.Contract(scUsdcAbi, vaultAddress);

    // total usdc supplied
    const totalCollateral = Number(await vault.methods.totalCollateral().call());
    
    // total weth debt
    const totalDebt = Number(await vault.methods.totalDebt().call());

    const liquidationPrice = (totalCollateral * maxLtv * 10e11) / totalDebt;
    console.log("ltv:", maxLtv.toFixed(2), "liquidation price $ETH", liquidationPrice.toFixed(0));
    return liquidationPrice;
}

const getLtvForLiquidationPrice = async (liquidationPrice, maxLtv) => {

 const [ethPrice, _] = await getPrices();
 const requiredLtv = (maxLtv * ethPrice) / liquidationPrice;

 console.log("ltv:", requiredLtv.toFixed(2), "liquidation price $ETH", liquidationPrice.toFixed(0));
 return requiredLtv;
}

let lp = 3000;
while (lp <= 4300) {
    await getLtvForLiquidationPrice(lp, 0.7, web3, vaults.scusdc);
    lp += 250;
}
