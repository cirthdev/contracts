// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface ISwap {
	function swapExactInputSingle(uint256 amountIn, address recipient) external returns (uint256 amountOut);
	function swapExactOutputSingle(uint256 amountOut, uint256 amountInMaximum, address recipient) external returns (uint256 amountIn);
	function balanceOfFerc(address sender) external returns (uint256 amount);
}