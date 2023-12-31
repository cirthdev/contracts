// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IWETH9 {
		function deposit() external payable;
    function withdraw(uint wad) external;
    function approve(address guy, uint wad) external returns (bool);
}