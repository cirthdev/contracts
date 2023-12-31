async function main() {

  const [deployer] = await ethers.getSigners();
	const wethAddress = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
	const fercAddress = "0x2ba13129106FcAc97DbdB565b767E144B3D5291B";

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );
  
  let balance = await deployer.provider.getBalance(deployer.address);
	console.log("Account balance:", balance);// / 1000000000000000000n);
	
	// deploy swap contract
  const Swap = await ethers.getContractFactory("Swap");
  const swapContract = await Swap.deploy(wethAddress, fercAddress);
	await swapContract.waitForDeployment();
  console.log("Swap address:", await swapContract.getAddress());

	// deploy TokenURI lib
	const TokenURI = await ethers.getContractFactory("TokenURI");
	const libTokenURI = await TokenURI.deploy();
	await libTokenURI.waitForDeployment();
	const tokenURIAddress = await libTokenURI.getAddress();
	console.log("TokenURI address:", tokenURIAddress);
	
	// deploy factory contract
	const SmartInscriptionFactory = await ethers.getContractFactory("SmartInscriptionFactory", {
		libraries: {
			TokenURI: tokenURIAddress
		}
	});
	const smartInscriptionFactory = await SmartInscriptionFactory.deploy(await swapContract.getAddress(), wethAddress);
	await smartInscriptionFactory.waitForDeployment();
	console.log("SmartInscriptionFactory address:", await smartInscriptionFactory.getAddress());

	// deploy bridge
	const Ferc721Bridge = await ethers.getContractFactory("Ferc721Bridge");
	const bridgeContract = await Ferc721Bridge.deploy(await smartInscriptionFactory.getAddress());
	await bridgeContract.waitForDeployment();
	console.log("Bridge address:", await bridgeContract.getAddress());

	// set bridge contract for factory
	await smartInscriptionFactory.setBridgeContract(await bridgeContract.getAddress());
	
	balance = await deployer.provider.getBalance(deployer.address);
	console.log("Account balance:", balance);// / 1000000000000000000n);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });