// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFERC20 is IERC20 {
	function bridgeContract() external view returns(address);
	function mint(address account, uint256 amount) external;
}