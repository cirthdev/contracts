// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IBridge {
    function withdraw(address ferc20Address, uint256 amount) external returns (bool);
		function batchDeposit(address inscriptionAddress, uint[] memory ids) external;
		function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
		function nftTokenIds(address ferc721Address) external returns (uint256);
		function ferc20Addresses(address ferc721Address) external returns (address);
		function ferc721Addresses(address ferc20Address) external returns (address);
		function factoryContractAddress() external returns (address);
}