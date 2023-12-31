// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Swap {
	ISwapRouter public constant SwapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
	address public immutable WETH9;
	address public immutable FERC;

	// For this example, we will set the pool fee to 0.3%.
	uint24 public constant poolFee = 3000;

	constructor(address weth9, address ferc) {
		WETH9 = weth9;
		FERC = ferc;
	}

	function balanceOfFerc(address sender) external view returns(uint256) {
		return IERC20(FERC).balanceOf(sender);
	}

	function swapExactInputSingle(uint256 amountIn, address recipient) external returns (uint256 amountOut) {
		require(IERC20(WETH9).allowance(msg.sender, address(this)) >= amountIn, "allowance not enough");
		require(IERC20(WETH9).balanceOf(msg.sender) >= amountIn, "balance not enough");

		TransferHelper.safeTransferFrom(WETH9, msg.sender, address(this), amountIn);
		TransferHelper.safeApprove(WETH9, address(SwapRouter), amountIn);

		ISwapRouter.ExactInputSingleParams memory params =
		ISwapRouter.ExactInputSingleParams({
				tokenIn: WETH9,
				tokenOut: FERC,
				fee: poolFee,
				recipient: recipient,
				deadline: block.timestamp,
				amountIn: amountIn,
				amountOutMinimum: 0,
				sqrtPriceLimitX96: 0
		});
		amountOut = SwapRouter.exactInputSingle(params);
	}

	function swapExactOutputSingle(uint256 amountOut, uint256 amountInMaximum, address recipient) external returns (uint256 amountIn) {
		require(IERC20(WETH9).allowance(msg.sender, address(this)) >= amountInMaximum, "allowance not enough");
		require(IERC20(WETH9).balanceOf(msg.sender) >= amountInMaximum, "balance not enough");

		TransferHelper.safeTransferFrom(WETH9, msg.sender, address(this), amountInMaximum);
		TransferHelper.safeApprove(WETH9, address(SwapRouter), amountInMaximum);

		ISwapRouter.ExactOutputSingleParams memory params =
			ISwapRouter.ExactOutputSingleParams({
				tokenIn: WETH9,
				tokenOut: FERC,
				fee: poolFee,
				recipient: recipient,
				deadline: block.timestamp,
				amountOut: amountOut,
				amountInMaximum: amountInMaximum,
				sqrtPriceLimitX96: 0
			});

		amountIn = SwapRouter.exactOutputSingle(params);

		if (amountIn < amountInMaximum) {
			TransferHelper.safeApprove(WETH9, address(SwapRouter), 0);
			TransferHelper.safeTransfer(WETH9, recipient, amountInMaximum - amountIn);
		}
  }
}