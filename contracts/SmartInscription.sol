// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "./lib/ERC20.sol";

// This contract is extended from ERC20
contract SmartInscription is ERC20 {
		struct Data {
			uint112 cap;                     // Max amount
			uint96 limitPerMint;             // Limitaion of each mint
			uint48 inscriptionId;            // Inscription Id
		}
		Data public tokenData;
    mapping(address => uint256) public lastMintTimestamp;   // record the last mint timestamp of account

    function initialize(
        string memory _tick,            // token tick, same as symbol. must be 4 characters.
        uint256 _cap,                   // Max amount
        uint256 _limitPerMint,          // Limitaion of each mint
        uint256 _inscriptionId          // Inscription Id
    ) public {
				name = _tick;
				symbol = _tick;
				tokenData = Data(uint112(_cap), uint96(_limitPerMint), uint48(_inscriptionId));
    }

    function mint(address _to) public {
        require(totalSupply + tokenData.limitPerMint <= tokenData.cap, "Touched cap");
        require(block.timestamp >= lastMintTimestamp[msg.sender] + 600, "In freeze time");
				lastMintTimestamp[msg.sender] = block.timestamp;
        balanceOf[_to] += tokenData.limitPerMint;
        totalSupply += tokenData.limitPerMint;
        emit Transfer(address(0), _to, tokenData.limitPerMint);
    }
}
