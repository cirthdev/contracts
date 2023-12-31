import {execContract, execEIP1559Contract, execEIP1559ContractByNonce} from './web3.js';
import { createRequire } from "module"; // Bring in the ability to create the 'require' method
import { ethers } from "ethers";
import dotenv from 'dotenv';
import { getEthFercExactInputSingle } from "./uniswap.js";
import sleep from 'sleep-promise';
dotenv.config();
const require = createRequire(import.meta.url); // construct the require method

const rpcUrl = process.env.RPC_URL;
const chainId = process.env.CHAIN_ID * 1;
const Web3 = require('web3');
const priKey = process.env.PRI_KEY;
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
const HDWalletProvider = require("@truffle/hdwallet-provider");
const fercAddress = "0x2ba13129106FcAc97DbdB565b767E144B3D5291B";

const senderAddress = (web3.eth.accounts.privateKeyToAccount('0x' + priKey)).address;
// Mumbai
// const contractAddress = '0xbc456F8c4DA5E178BA46bfFA7d1B1fE38abE4d91'; // SmartInscriptionFactory Contract
// const swapContractAddress = '0x841Ac4006295fe7587F2d5D2c6e5091448eEB856'; // swap contract

// for goerli network
const contractAddress = '0xF81170145b54Fb46828b9bA089Fe4d14B2085488'; // SmartInscriptionFactory Contract
// const swapContractAddress = '0xC07cCf0db9D89691d9A83F0fbC1E20fEB9De7F8b'; // swap contract

const contractJson = require('../abi/SmartInscriptionFactory.json');
// const swapContractJson = require('../abi/Swap.json');

const contract = new web3.eth.Contract(contractJson, contractAddress);
// const swapContract = new web3.eth.Contract(swapContractJson, swapContractAddress);

const SmartInscriptionJson = require('../abi/FERC721.json');

const ERC20Json = require('../abi/ERC20.json');
const fercContract = new web3.eth.Contract(ERC20Json, fercAddress);

// contract.methods.totalInscriptions().call().then((response) => {
// 	console.log('total inscriptions', response)
// });

// swapContract.methods.balanceOfFerc(senderAddress).call().then((response) => {
// 	console.log("Ferc balance ", response / 1e18);
// })

/**
 * ==== Following testing methods is Send Tx ====
 */

const callContract = (encodeABI, contractAddress, value) => execContract(web3, chainId, priKey, encodeABI, value === null ? 0:value, contractAddress, null, null, null, null);	
const callEIP1559Contract = (encodeABI, contractAddress, value = null, privateKey = null, onHash = null, onConfirmed = null, onReceipt = null) => execEIP1559Contract(web3, chainId, privateKey === null ? priKey : privateKey, encodeABI, value === null ? 0:value, contractAddress, onHash, onConfirmed, onReceipt, null);	

const deploy = async (tick, max, limit) => {
	const sendEncodeABI = contract.methods.deploy(
		tick,
		max,
		limit
	).encodeABI(); 
	callEIP1559Contract(sendEncodeABI, contractAddress, 0, null, (hash) => {
		console.log(hash);
	}, () => {}, (receipt) => {
		console.log(receipt);
	});
}

const mint = async (_smartInscriptionAddress, value) => {
	const contract = new web3.eth.Contract(SmartInscriptionJson, _smartInscriptionAddress);
	const sendEncodeABI = contract.methods.mint(senderAddress).encodeABI(); 
	callEIP1559Contract(sendEncodeABI, _smartInscriptionAddress, web3.utils.toWei(value), null, (hash) => {
		console.log(hash);
	}, (confirmation, receipt) => {

	}, (receipt) => {
		console.log(receipt);
	});
}

const swapTest = async (_smartInscriptionAddress) => {
	const contract = new web3.eth.Contract(SmartInscriptionJson, _smartInscriptionAddress);
	const sendEncodeABI = contract.methods.swap().encodeABI(); 
	callEIP1559Contract(sendEncodeABI, _smartInscriptionAddress, web3.utils.toWei("0.001"));
}

const info = async (_smartInscriptionAddress, tokenId) => {
	const contract = new web3.eth.Contract(SmartInscriptionJson, _smartInscriptionAddress);
	contract.methods.tokenURI(tokenId).call().then((response) => {
		console.log('tokenURI', response);
	});

	contract.methods.totalSupply().call().then((response) => {
		console.log("total supply", response);
	})

	contract.methods.max().call().then((response) => {
		console.log("max", response);
	})
}

// fsats: 0x1106b539b945f084ca6bfd34e6c7bba99061e699
// fordi: 0x83a0933f9171e94865709d7dad7b9d21f8fad363

// =================================================================
// ========================== Bot ==================================
// =================================================================
const receiverAccount = "0xC4BFA07776D423711ead76CDfceDbE258e32474A"; // all inscription will be sent to here

const minerMnemonic = process.env.MNEMONIC;
const node = ethers.utils.HDNode.fromMnemonic(minerMnemonic);
const wallets = [];

async function initializeAccounts(limit) {
	for (let i = 0; i < limit; i++) {
		const path = "m/44'/60'/0'/0/" + i
		const address = node.derivePath(path).address;
		const privateKey = node.derivePath(path).privateKey;
		wallets.push({
			address,
			privateKey,
		});
	}
	return wallets;
}

// 在每10分钟内，运行一次批量铸造
const minInAccount = web3.utils.toWei("0.0025");
const batchMint = (inscriptionAddress, from, to) => {
	const contract = new web3.eth.Contract(SmartInscriptionJson, inscriptionAddress);
	if(from <= to) {
		//处理冻结时间
		getEthFercExactInputSingle(rpcUrl, chainId, web3.utils.toWei("10")).then(async (buyFercFee) => {
			// check eth balance
			// console.log(buyFercFee / 1e18);
			const balance = await web3.eth.getBalance(wallets[from].address);
			// console.log(balance / 1e18);

			const estimatedCost = ethers.BigNumber.from(buyFercFee).mul(ethers.BigNumber.from("200").div(ethers.BigNumber.from("100")));

			if(ethers.BigNumber.from(balance).lt(minInAccount)) {
				console.log(`ID: ${from} balance eth is not enough, need at least 0.002 ETH.`);
				from++;
				batchMint(inscriptionAddress, from, to);
				return;
			}

			// 检查ferc是否足够
			const fercBalance = await fercContract.methods.balanceOf(wallets[from].address).call();
			// console.log("ferc balance", fercBalance);
			let value = "0";
			if(ethers.BigNumber.from(fercBalance).lt(ethers.BigNumber.from("10000000000000000000"))) {
				value = estimatedCost;
			}

			// 检测是否在冷冻期
			const lastMintTimestamp = await contract.methods.lastMintTimestamp(wallets[from].address).call();
			const blockTimestamp = (await web3.eth.getBlock("latest")).timestamp;
			// console.log("From last mint timestamp: ", blockTimestamp - lastMintTimestamp, "seconds");
			if(blockTimestamp - lastMintTimestamp < 600) {
				console.log(`ID: ${from} ${wallets[from].address} is in freeze time, continue next account`);
				from++;
				batchMint(inscriptionAddress, from, to);
				return;
			}

			try {
				// console.log("value", value * 1);
				const sendEncodeABI = contract.methods.mint(wallets[from].address).encodeABI();
				callEIP1559Contract(sendEncodeABI, inscriptionAddress, value, wallets[from].privateKey.substring(2), (txHash) => {
					console.log(`Minting #${from}: ${wallets[from].address}, tx: ${txHash}`);
				}, async (confirmation, receipt) => {
					console.log(`Minted #${from}: ${wallets[from].address}`);
					from++;
					// await sleep(5000);
					batchMint(inscriptionAddress, from, to);
					return;
				}, async (receipt) => {
				});			
			} catch(err) {
				from++;
				batchMint(inscriptionAddress, from, to);
				return;
			}
		});
	} else {
		console.log("Done!");
	}
}

const fundAccounts = (amount, from, to) => {
	if(from <= to) {
		callEIP1559Contract("", wallets[from].address, web3.utils.toWei(amount), null, (txHash) => {
			console.log(`Funding #${from}: ${wallets[from].address} ${amount}ETH, tx: ${txHash}`);
		}, (receipt) => {
			console.log(`Funded #${from}: ${wallets[from].address} ${amount}ETH`);
			from++;
			fundAccounts(amount, from, to);
		});	
	} else {
		console.log("Done!");
		return;
	}
}

const getBalances = async(inscriptionAddress, from, to) => {
	const contract = new web3.eth.Contract(SmartInscriptionJson, inscriptionAddress);
	// const inscriptionBalance = await contract.methods.balanceOf(senderAddress).call();
	// console.log(inscriptionBalance);
	for(let i = from; i <= to; i++) {
		const address = wallets[i].address;
		const balance = await web3.eth.getBalance(address);
		const inscriptionBalance = await contract.methods.balanceOf(wallets[i].address).call();
		console.log(`#${i} Balance of ${address}: ${web3.utils.fromWei(balance)} ETH, insc ${inscriptionBalance} NFTs`);
	}
}

initializeAccounts(50);

// =================================================================
// ==================== 执行以下批量测试命令 ==========================
// =================================================================

// deploy("fsats", 21000000, 1000);
const inscriptionAddress = "0x4ef8fdd3d895fd7f7473dda42cfe36e04984bcca";
fundAccounts("0.004", 21, 50); // 给操作账户充值，第二个参数是钱包ID的开始和终止

// batchMint(inscriptionAddress, 0, 20);

// getBalances(inscriptionAddress, 1, 50); // 获取账户的余额

// info(inscriptionAddress, 2);

// mint(inscriptionAddress, "0");
