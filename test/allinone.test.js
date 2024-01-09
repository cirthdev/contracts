const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Testing smart inscription factory", function () {
	let smartInscriptionFactory;
	let smartInscription721;
	let inscription2;
	let swapContract;
	let bridgeContract;
	let libTokenURI;
	let accounts;
	let wethContract;
	let ferc20Contract;
	let erc20ContractOverBridge;

	it("Deploy contracts", async () => {
		// get all accounts
		accounts = await ethers.getSigners();

		// 1- deploy TokenURI lib
		const TokenURI = await ethers.getContractFactory("TokenURI");
		libTokenURI = await TokenURI.deploy();
		await libTokenURI.waitForDeployment();
		const tokenURIAddress = await libTokenURI.getAddress();

		// 2- deploy weth contract
		const WETH9 = await ethers.getContractFactory("WETH9");
		wethContract = await WETH9.deploy();
		await wethContract.waitForDeployment();

		// 3- deploy ferc20 contract
		const FERC20 = await ethers.getContractFactory("FERC20");
		ferc20Contract = await FERC20.deploy();
		await ferc20Contract.waitForDeployment();
		await ferc20Contract.mint(accounts[0], "10000000000000000000000"); // 10000

		// 4- deploy swap contract
		const Swap = await ethers.getContractFactory("Swap");
		swapContract = await Swap.deploy(await wethContract.getAddress(), await ferc20Contract.getAddress());
		await swapContract.waitForDeployment();

		// 5- deploy factory contract
		const SmartInscriptionFactory = await ethers.getContractFactory("SmartInscriptionFactory", {
			libraries: {
				TokenURI: tokenURIAddress
			}
		});
		smartInscriptionFactory = await SmartInscriptionFactory.deploy(await swapContract.getAddress(), await wethContract.getAddress());
		await smartInscriptionFactory.waitForDeployment();

		// 6- deploy bridge contract
		const Ferc721Bridge = await ethers.getContractFactory("Ferc721Bridge");
		bridgeContract = await Ferc721Bridge.deploy(await smartInscriptionFactory.getAddress());
		await bridgeContract.waitForDeployment();

		// 7- set bridge contract for factory
		await smartInscriptionFactory.setBridgeContract(await bridgeContract.getAddress());


	})

	it("initialize smart inscription factory params for testing", async () => {
		await smartInscriptionFactory.setMintHoldAmount(0);
		await smartInscriptionFactory.setFreezeTime(0);
	})

	it("deploy 1st tokens", async () => {
		const tx = await smartInscriptionFactory.deploy(
			"test1",
			"30000",
			"3000",
			false,
		);
		const receipt = await tx.wait();
		const smartInscriptionAddress = receipt.logs[0].args[5];
		const FERC721 = await ethers.getContractFactory("FERC721", {
			libraries: {
				TokenURI: await libTokenURI.getAddress()
			}
		});
		smartInscription721 = FERC721.attach(smartInscriptionAddress);
		expect(await smartInscription721.symbol()).equal("test1");
		expect(await smartInscription721.name()).equal("test1 {ferc-721}");
		console.log('Deploy gas', receipt.gasUsed);
		console.log('Address: ', smartInscriptionAddress)
	})

	it("deploy 2nd tokens", async () => {
		const tx = await smartInscriptionFactory.deploy(
			"test2",
			"1000",
			"300",
			false,
		);
		const receipt = await tx.wait();
		const inscription2Address = receipt.logs[0].args[5];
		const FERC721 = await ethers.getContractFactory("FERC721", {
			libraries: {
				TokenURI: await libTokenURI.getAddress()
			}
		});
		inscription2 = FERC721.attach(inscription2Address);
		console.log('Deploy gas', receipt.gasUsed);
		console.log('Address: ', inscription2Address)
	})

	it("deploy 3rd tokens", async () => {
		const tx = await smartInscriptionFactory.deploy(
			"test3",
			"21000000",
			"2000",
			false,
		);
		const receipt = await tx.wait();
		const inscription3Address = receipt.logs[0].args[5];
		console.log('Deploy gas', receipt.gasUsed);
		console.log('Address: ', inscription3Address)
	})

	it("get total inscriptions", async () => {
		const res = await smartInscriptionFactory.totalInscriptions();
		// console.log("total inscriptions", res.toString());
		expect(res).equal(3n);
	})

	// Note: this test must be on the testnet forked mumbai, run: yarn ganache-mumbai before testing, and change the rpc port to 8545.
	it("get balance of ferc by accounts[0, 1, 2]", async () => {
		const tx1 = await ferc20Contract.transfer(accounts[1], "100000000000000000000");
		const tx2 = await ferc20Contract.transfer(accounts[2], "200000000000000000000");
		await tx1.wait();
		await tx2.wait();
		// await sleep(waitMiniSeconds); // waiting for new block mined
		const balance0 = await swapContract.balanceOfFerc(accounts[0]);
		const balance1 = await swapContract.balanceOfFerc(accounts[1]);
		const balance2 = await swapContract.balanceOfFerc(accounts[2]);
		// console.log(balance0, balance1, balance2);
		expect(balance0).equal(9700000000000000000000n);
		expect(balance1).equal(100000000000000000000n);
		expect(balance2).equal(200000000000000000000n);
	})

	it("mint tokens of inscription #1 by accounts[0, 1, 2]", async () => {
		// update mint fee to zero
		const tx = await smartInscriptionFactory.setFreezeTime(0); // ######
		await tx.wait();
		await mint(accounts[0]); // tokenId = 1
		await mint(accounts[1]); // tokenId = 2
		await mint(accounts[2]); // tokenId = 3
		const limit = await smartInscription721.limit();
		// console.log("limit: " + limit.toString());
		expect(limit).equal(3000n);
	})

	it.skip("check global id", async () => {
		const res = await smartInscriptionFactory.globalId();
		// console.log("total incriptions #", res.toString());
		expect(res).equal(3n);
	})

	it("test getting royalty", async () => {
		const res = await smartInscription721.royaltyInfo(1, 10000);
		// console.log(res[0], res[1]);
		expect(res[1]).equal(200n);
	})

	it("mint all 10 nfts and check balance of account 0", async () => {
		for(let i = 0; i < 7; i++) {
			await mint(accounts[0]); // Token 4-10
		}
		const balance = await smartInscription721.balanceOf(accounts[0].address);
		expect(balance).equal(8n);

		const totalSupply = await smartInscription721.totalSupply();
		expect(totalSupply).equal(10n);

		const max = await smartInscription721.max();
		expect(max).equal(30000n);
	})

	it("send #1 nft to account#1", async () => {
		const tx = await smartInscription721.safeTransferFrom(accounts[0], accounts[1], 1);
		await tx.wait();
		const balance = await smartInscription721.balanceOf(accounts[1].address);
		expect(balance).equal(2n);
	})

	it("send #4/#5/#6 nft from account#0 to bridge and mint 3000 tokens", async () => {
		// console.log("bridge address", await bridgeContract.getAddress(), await smartInscription721.getAddress());
		let res = await smartInscription721.safeTransferFrom(accounts[0], await bridgeContract.getAddress(), 4);
		console.log("gas used for deposit #4 (create a new ferc20)", (await res.wait()).gasUsed);
		
		const erc20Address = await bridgeContract.ferc20Addresses(await smartInscription721.getAddress());
		const FERC20 = await ethers.getContractFactory("FERC20");
		erc20ContractOverBridge = FERC20.attach(erc20Address);
		// console.log("fercAddress", ferc20Address);

		let erc20Balance = await erc20ContractOverBridge.balanceOf(accounts[0].address);
		// console.log("balance of ferc20", ferc20Balance.toString());
		expect(erc20Balance.toString()).equal("3000000000000000000000");

		// send tokenId #5
		res = await smartInscription721.safeTransferFrom(accounts[0], await bridgeContract.getAddress(), 5);
		console.log("gas used for deposit #5 (not create new ferc20)", (await res.wait()).gasUsed);
		erc20Balance = await erc20ContractOverBridge.balanceOf(accounts[0].address);
		// console.log("balance of ferc", ferc20Balance.toString());
		expect(erc20Balance.toString()).equal("6000000000000000000000");

		// send tokenId #6
		res = await smartInscription721.safeTransferFrom(accounts[0], await bridgeContract.getAddress(), 6);
		console.log("gas used for deposit #6 (not create new ferc20)", (await res.wait()).gasUsed);
		erc20Balance = await erc20ContractOverBridge.balanceOf(accounts[0].address);
		// console.log("balance of ferc", ferc20Balance.toString());
		expect(erc20Balance.toString()).equal("9000000000000000000000");
	})

	it.skip("check if hacking the functions: onERC721Received", async () => {
		// This operation is forbidden and will be revert.
		try {
			await bridgeContract.onERC721Received(accounts[0], accounts[0], 1, "0x01");
		} catch (err) {
			console.log(err);
		}
	})

	it("deposit ferc721 and get tokenUri, will show a LOCK on the right-bottom in SVG", async () => {
		const tokenURI = await smartInscription721.tokenURI(4);
		console.log("tokenURI", tokenURI);
	})

	it("withdraw ferc721 from bridge. #4/#5", async () => {
		const bridgeAddress = await bridgeContract.getAddress();
		let ferc721BalanceInBridge = await smartInscription721.balanceOf(bridgeAddress);
		// console.log("balance in bridge (before withdrawal): ", ferc721BalanceInBridge.toString());
		expect(ferc721BalanceInBridge).equal(3n);

		let ferc721Blance = await smartInscription721.balanceOf(accounts[0].address);
		expect(ferc721Blance).equal(4n);

		let approveTx = await erc20ContractOverBridge.approve(bridgeAddress, "3000000000000000000000");
		let withdrawTx = await bridgeContract.withdraw(await erc20ContractOverBridge.getAddress(), "3000000000000000000000");
		let gasUsed = (await approveTx.wait()).gasUsed + (await withdrawTx.wait()).gasUsed;
		console.log("withdraw gas for #4", gasUsed.toString());

		approveTx = await erc20ContractOverBridge.approve(bridgeAddress, "3000000000000000000000");
		withdrawTx = await bridgeContract.withdraw(await erc20ContractOverBridge.getAddress(), "3000000000000000000000");
		gasUsed = (await approveTx.wait()).gasUsed + (await withdrawTx.wait()).gasUsed;
		console.log("withdraw gas for #5", gasUsed.toString());

		// check balance of deposited nft
		ferc721Blance = await smartInscription721.balanceOf(accounts[0].address);
		expect(ferc721Blance).equal(6n);

		// check total supply of ferc20 tokens
		ferc721BalanceInBridge = await smartInscription721.balanceOf(bridgeAddress);
		// console.log("balance in bridge (after withdrawal): ", ferc721BalanceInBridge.toString());
		expect(ferc721BalanceInBridge).equal(1n);

		expect(await erc20ContractOverBridge.balanceOf(accounts[0].address)).equal("3000000000000000000000")
	})

	it("account#0 send 6000 erc20 to account#1, and accounts#1 withdraw 6000 erc20", async () => {
		let tx = await erc20ContractOverBridge.transfer(accounts[1].address, "3000000000000000000000");
		await tx.wait();
		expect(await erc20ContractOverBridge.balanceOf(accounts[1].address)).equal(3000000000000000000000n);

		let ferc721Blance = await smartInscription721.balanceOf(accounts[1].address);
		expect(ferc721Blance).equal(2n);

		const bridgeAddress = await bridgeContract.getAddress();
		tx = await erc20ContractOverBridge.connect(accounts[1]).approve(bridgeAddress, "3000000000000000000000");
		await tx.wait();
		tx = await bridgeContract.connect(accounts[1]).withdraw(await erc20ContractOverBridge.getAddress(), "3000000000000000000000");
		await tx.wait();

		expect(await erc20ContractOverBridge.balanceOf(accounts[1].address)).equal(0n)

		ferc721Blance = await smartInscription721.balanceOf(accounts[1].address);
		expect(ferc721Blance).equal(3n);
	})

	// to avoid fake nft and tokens
	it("send a fake nft which is not made by bridge to bridge contract", async () => {
		const FakeFERC721 = await ethers.getContractFactory("FakeFERC721", {
			libraries: {
				TokenURI: await libTokenURI.getAddress()
			}
		});
		const newNft = await FakeFERC721.deploy(await swapContract.getAddress(), await wethContract.getAddress());
		newNft.waitForDeployment();

		let tx = await newNft.mint(accounts[0].address);
		await tx.wait();

		let balance = await newNft.balanceOf(accounts[0].address);
		expect(balance).equal(1n);
		let owner = await newNft.ownerOf(1);
		expect(owner).equal(accounts[0].address);
		try {
			await newNft.safeTransferFrom(accounts[0].address, await bridgeContract.getAddress(), 1);
		} catch(err) {
			console.log("deposit faile:", err.message)
		} finally {
			balance = await newNft.balanceOf(accounts[0].address);
			expect(balance).equal(1n);
			owner = await newNft.ownerOf(1);
			expect(owner).equal(accounts[0].address);
		}
	})

	it("withdraw a fake token which is not made by bridge to bridge contract", async() => {
		const FakeERC20 = await ethers.getContractFactory("FakeERC20");
		const fakeERC20 = await FakeERC20.deploy();
		try {
			await bridgeContract.withdraw(await fakeERC20.getAddress(), "1000000000000000000000");
		} catch(err) {
			console.log("withdraw faile:", err.message)
		}
	})

	it("Batch deposit ferc721 -> ferc20", async () => {
		let balance = await smartInscription721.balanceOf(accounts[0].address);
		console.log("before => ferc721 balance of account#0:", balance)
		const ownedTokenIds = [];
		for(let i = 0; i < 10; i++) {
			const owner = await smartInscription721.ownerOf(i + 1);
			if(owner === accounts[0].address) ownedTokenIds.push(i+1);
		}

		let erc20Balance = await erc20ContractOverBridge.balanceOf(accounts[0].address);
		console.log("before => ferc20 balance of accoutn#0:", erc20Balance);

		const approveTx = await smartInscription721.setApprovalForAll(await bridgeContract.getAddress(), true);
		const depositTx = await bridgeContract.batchDeposit(await smartInscription721.getAddress(), ownedTokenIds);
		// const totalGas = (await approveTx.wait()).gasUsed + (await depositTx.wait()).gasUsed;
		const totalGas = (await depositTx.wait()).gasUsed;

		balance = await smartInscription721.balanceOf(accounts[0].address);
		console.log("after => ferc721 balance of account#0:", balance)

		balance = await smartInscription721.balanceOf(await bridgeContract.getAddress());
		console.log("after => ferc721 balance of bridge:", balance);

		erc20Balance = await erc20ContractOverBridge.balanceOf(accounts[0].address);
		console.log("after => ferc20 balance of accoutn#0:", erc20Balance);

		console.log("gas used for batch deposit of ", ownedTokenIds.length, ": ", totalGas, ", average: ", totalGas / BigInt(ownedTokenIds.length));
	})

	it("Batch withdraw ferc20 -> ferc721", async () => {
		const bridgeAddress = await bridgeContract.getAddress();
		const approveTx = await erc20ContractOverBridge.approve(bridgeAddress, "18000000000000000000000");
		const withdrawTx = await bridgeContract.withdraw(await erc20ContractOverBridge.getAddress(), "18000000000000000000000");
		const totalGas = (await approveTx.wait()).gasUsed + (await withdrawTx.wait()).gasUsed;
		let balance = await smartInscription721.balanceOf(accounts[0].address);
		console.log("after => ferc721 balance of account#0:", balance)
		let erc20Balance = await erc20ContractOverBridge.balanceOf(accounts[0].address);
		console.log("after => ferc20 balance of accoutn#0:", erc20Balance);

		console.log("gas used for withdraw: ", totalGas);
	})

	it("Test token#2 for max and limit are not divisible", async () => {
		let tx = await inscription2.mint(accounts[0].address);
		await tx.wait();
		console.log(await inscription2.totalSupply());
		tx = await inscription2.mint(accounts[0].address);
		await tx.wait();
		console.log(await inscription2.totalSupply());
		tx = await inscription2.mint(accounts[0].address);
		await tx.wait();
		console.log(await inscription2.totalSupply());
		// await inscription2.mint(accounts[0].address);
	})

	const mint = async (to) => {
		const balance0 = await smartInscription721.balanceOf(to.address);
		const tx = await smartInscription721.connect(to).mint(to.address);
		let gasUsed = (await tx.wait()).gasUsed;
		console.log("Mint gas", gasUsed);
		const balance1 = await smartInscription721.balanceOf(to.address);
		expect(balance0 + 1n).equal(balance1);
	}

	const sleep = (seconds) => new Promise((res, rej) => setTimeout(res, seconds));

});

describe("Test uniswap on mainnet", () => {
	// const fercAddress = "0x2eCBa91da63C29EA80Fbe7b52632CA2d1F8e5Be0"; // mainnet
	// const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // mainnet
	const fercAddress = "0x2ba13129106FcAc97DbdB565b767E144B3D5291B"; // goerli
	const wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"; // goerli
	let swapContract;
	let wethContract;

	it("deploy swap contract on fork mainnet", async () => {
		accounts = await ethers.getSigners();

		const Swap = await ethers.getContractFactory("Swap");
		swapContract = await Swap.deploy(wethAddress, fercAddress);
		await swapContract.waitForDeployment();
		// console.log(await swapContract.getAddress())
	})

	it("wrap eth to weth", async () => {
		const WETH9 = await ethers.getContractFactory("WETH9");
		wethContract = WETH9.attach(wethAddress);

		// const provider = ethers.getDefaultProvider();
		// const balanceInWei = await provider.getBalance(accounts[0]);
		// console.log(balanceInWei)

		const deposit = await wethContract.deposit({ value: "10000000000000000000" })
		await deposit.wait()
		
		// const balanceWeth = await wethContract.balanceOf(accounts[0].address);
	})
})