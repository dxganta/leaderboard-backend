import dotenv from "dotenv";
import Web3 from "web3";
import { vaults, blacklistedAddress } from "../utils/utils.js";
import scUsdcAbi from "../abis/scUsdcAbi.json" with { type: "json" };
import ERC20Abi from "../abis/ERC20Abi.json" with { type: "json" };


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
    console.log("liquidation price", liquidationPrice);
    return liquidationPrice;
}

getLiquidationPrice(0.7, web3, vaults.scusdc);