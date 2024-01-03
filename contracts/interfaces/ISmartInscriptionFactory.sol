// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface ISmartInscriptionFactory {
	function minHoldAmount() external view returns(uint256);
	function freezeTime() external view returns(uint256);
	function mintFee() external view returns(uint);
	function minted(string calldata tick, uint tokenId, uint max) external;
	function bridgeContractAddress() external view returns(address);
}