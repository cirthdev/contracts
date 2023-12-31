// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./lib/ERC20.sol";
import "./interfaces/IFERC20.sol";
import "./interfaces/IFERC721.sol";

contract FERC20 is ERC20, IFERC20 {
		address public immutable bridgeContract;

		constructor() {
			bridgeContract = msg.sender;
		}

    function initialize(address _ferc721Address) public {
				require(msg.sender == bridgeContract, "only bridge factory can initialize");
				name = string(abi.encodePacked(IFERC721(_ferc721Address).symbol(), " {ferc-20}"));
			  symbol = IFERC721(_ferc721Address).symbol();
				decimals = 18;
    }

    function mint(address account, uint256 amount) public {
				require(msg.sender == bridgeContract, "only bridge factory can mint");
				_mint(account, amount);
		}
}
