import { ethers } from "ethers";
import { Token } from '@uniswap/sdk-core';
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk';
import uniswapV3PoolJson from '../abi/UniswapV3Pool.json' assert { type: "json" };;
import quoterJson from '../abi/Quoter.json' assert { type: "json" };;

// const uniswapV3PoolJson = require('../abi/UniswapV3Pool.json');
// const quoterJson = require('../abi/Quoter.json');

const uniswapV3FactoryAddress = "0x1f98431c8ad98523631ae4a59f267346ea31f984";
const quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
const fercAddress = "0x2ba13129106FcAc97DbdB565b767E144B3D5291B";

const getEthFercPoolAddress = (chainId) => {
	// const network = getNetwork(chainId);
	const WETH_TOKEN = new Token(chainId, wethAddress, 18, 'WETH', 'Wrapped Ether');
	const FERC_TOKEN = new Token(chainId, fercAddress, 18, 'FERC', 'FairERC20');
	const poolFee = FeeAmount.MEDIUM;
	return computePoolAddress({
		factoryAddress: uniswapV3FactoryAddress,
		tokenA: WETH_TOKEN,
		tokenB: FERC_TOKEN,
		fee: poolFee,
	});
}

export const getEthFercExactInputSingle = async (rpc, chainId, outputAmount) => {
	try {
		const poolAddress = getEthFercPoolAddress(chainId);
		// const network = getNetwork(chainId);
		const provider = new ethers.providers.JsonRpcProvider(rpc);
		const poolContract = new ethers.Contract(poolAddress, uniswapV3PoolJson, provider);
		const quoterContract = new ethers.Contract(quoterAddress, quoterJson, provider);
	
		const [token0, token1, fee, liquidity, slot0] = await Promise.all([
			poolContract.token0(),
			poolContract.token1(),
			poolContract.fee(),
			poolContract.liquidity(),
			poolContract.slot0(),
		])
		
		const inputAmount = await quoterContract.callStatic.quoteExactInputSingle(
			token0,
			token1,
			fee,
			outputAmount,
			0
		);
		return inputAmount;
	} catch (err) {
		console.log(err.message);
		return false;
	}
}

const getEthUsdPrice = async () => {
	// TODO: get price by cryptocompare api

}

export const getGasPrice = async (rpc, chainId) => {
	// const network = getNetwork(1); // get gas for ethereum mainnet
	const provider = new ethers.providers.JsonRpcProvider(rpc);
	return await provider.getGasPrice();
}