import {execContract, execEIP1559Contract} from './web3.js';
import { createRequire } from "module"; // Bring in the ability to create the 'require' method
import dotenv from 'dotenv';
dotenv.config();
const require = createRequire(import.meta.url); // construct the require method

import { Token } from '@uniswap/sdk-core';
import { computePoolAddress, FeeAmount } from '@uniswap/v3-sdk';
// import QuoterABI from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
// import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
const WETH_TOKEN = new Token(
  1,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  18,
  'WETH',
  'Wrapped Ether'
)
const FERC_TOKEN = new Token(
  1,
  '0x2eCBa91da63C29EA80Fbe7b52632CA2d1F8e5Be0',
  18,
  'FERC',
  'FairERC20'
)
const uniswapV3FactoryAddress = "0x1f98431c8ad98523631ae4a59f267346ea31f984";
const quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

export const config = {
	rpc: {
		local: "http://localhost:8545",
		mainnet: 'https://mainnet.infura.io/v3/2NGKD05T8i68cawO3JWbVuYqXPz',
	},
	tokens: {
		in: WETH_TOKEN,
		amountIn: 0.01,
		out: FERC_TOKEN,
		poolFee: FeeAmount.MEDIUM,
	}
}

const poolAddress = computePoolAddress({
  factoryAddress: uniswapV3FactoryAddress,
  tokenA: config.tokens.in,
  tokenB: config.tokens.out,
  fee: config.tokens.poolFee,
})

console.log(poolAddress);

const chainId = 1337;
const Web3 = require('web3');
const priKey = "bc1ff5495636ba328844195c5398fcbca5158b7c486340a50100f5904865e50d";
const web3 = new Web3(new Web3.providers.HttpProvider(config.rpc.mainnet));
const senderAddress = (web3.eth.accounts.privateKeyToAccount('0x' + priKey)).address;
console.log(senderAddress);

const uniswapV3PoolJson = require('../abi/UniswapV3Pool.json');
const poolContract = new web3.eth.Contract(uniswapV3PoolJson, poolAddress);
const quoterJson = require('../abi/Quoter.json');
const quoterContract = new web3.eth.Contract(quoterJson, quoterAddress);

const [token0, token1, fee, liquidity, slot0] = await Promise.all([
  poolContract.methods.token0().call(),
  poolContract.methods.token1().call(),
  poolContract.methods.fee().call(),
  poolContract.methods.liquidity().call(),
  poolContract.methods.slot0().call(),
])

// console.log(token0, token1, fee, liquidity, slot0);
const sendEncodeABI = quoterContract.methods.quoteExactInputSingle(
  token0,
  token1,
  fee,
	web3.utils.toWei(config.tokens.amountIn.toString()),
  0
).encodeABI(); 

const height = await web3.eth.getBlockNumber();
console.log("current block height", height * 1);

console.log(sendEncodeABI);
web3.eth.call(sendEncodeABI).then((res) => console.log(res));

// /**
//  * ==== Following testing methods is Send Tx ====
//  */
const callContract = (encodeABI, contractAddress, value) => execContract(web3, chainId, priKey, encodeABI, value === null ? 0:value, contractAddress, null, null, null, null);	
const callEIP1559Contract = (encodeABI, contractAddress, value) => execEIP1559Contract(web3, chainId, priKey, encodeABI, value === null ? 0:value, contractAddress, null, null, null, null);	

// callEIP1559Contract(sendEncodeABI, quoterAddress, 0);

// getPrice();