// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../lib/ERC20.sol";

contract FakeERC20 is ERC20 {
	constructor() {
		name = "TestToken";
		symbol = "TST";
		decimals = 18;
		_mint(msg.sender, 1000000000000000000000);
	}
}