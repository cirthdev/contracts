// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface SmartInscriptionInterface {
	function mint(address _to) external;
}

contract BatchMint {
	SmartInscriptionInterface public smartInscriptionContract;
	constructor(address addr) {
		smartInscriptionContract = SmartInscriptionInterface(addr);
	}

	function batchMint() public {
		for(uint i = 0; i < 10; i++) {
			smartInscriptionContract.mint(msg.sender);
		}
	}
}