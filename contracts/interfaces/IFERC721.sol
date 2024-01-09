// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IFERC721 is IERC721 {
	struct TokenData {
		uint64  max;
		uint64  totalSupply;
		bool    needFerc;
		uint24  inscriptionId;
		uint24  limit;
		bytes5  tick;
	}

	function factoryContract() external view returns(address);
	function swapContract() external view returns(address);
	function wethContract() external view returns(address);
	function name() external view returns(string memory);
	function symbol() external view returns(string memory);
	function totalSupply() external view returns(uint);
	function max() external view returns(uint);
	function limit() external view returns(uint);
	function needFerc() external view returns(bool);
	function inscriptionId() external view returns(uint);
	function tokenData() external view returns(TokenData memory);
	function lastMintTimestamp(address addr) external view returns (uint);
}