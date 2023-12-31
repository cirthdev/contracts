// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
 
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IFERC721.sol";
import "./interfaces/IFERC20.sol";
import "./FERC20.sol";

contract Ferc721Bridge {
		address public immutable factoryContractAddress;
		address public immutable tokenImplementation;

		mapping(address => uint256[]) public nftTokenIds;
		mapping(address => address) public ferc20Addresses; // ferc-721 => ferc-20 address
		mapping(address => address) public ferc721Addresses;  // ferc-20 => ferc-721 address

		event DeployERC20(address operator, address indexed from, address indexed ferc721Address, address indexed ferc20Address, uint256 limit);
		event ReceivedNFT(address operator, address indexed from, uint256 tokenId, address indexed ferc721Address, address indexed ferc20Address, uint256 limit);
		event ReceivedToken(address indexed from, uint256 ferc20Amount, uint256 ferc721Amount, address indexed ferc20Address, address indexed ferc721Address, uint256 limit);

		constructor(address _factoryContractAddress) {
			factoryContractAddress = _factoryContractAddress;
			tokenImplementation = address(new FERC20());
		}

    function withdraw(address ferc20Address, uint256 amount) external returns (bool) {
				IFERC20 ferc20 = IFERC20(ferc20Address);
				require(ferc20.bridgeContract() == address(this), "token is not created by ferc bridge");
				require(ferc20.allowance(msg.sender, address(this)) >= amount, "allowance is not enough");
				require(ferc20.balanceOf(msg.sender) >= amount, "balance is not enough");

				address ferc721Address = ferc721Addresses[ferc20Address];
				IFERC721 ferc721 = IFERC721(ferc721Address);
				uint256 limit = ferc721.limit();
				require(amount / 1e18 % limit == 0, "amount should be a multiple of limit");
				uint256 amountOfFERC721 = amount / limit / 1e18;
				require(amountOfFERC721 > 0, "amount can not be zero");

				// return back to depositer
				for(uint i; i < amountOfFERC721; i++) {
					ferc721.safeTransferFrom(address(this), msg.sender, nftTokenIds[ferc721Address][nftTokenIds[ferc721Address].length - 1]);
					nftTokenIds[ferc721Address].pop();
				}

				// burn ferc20
				ferc20.transferFrom(msg.sender, address(this), amount);
				ferc20.transfer(address(0x0), amount);

				emit ReceivedToken(msg.sender, amount, amountOfFERC721, msg.sender, ferc721Address, limit);
        return true;
    }

		function batchDeposit(address inscriptionAddress, uint[] memory ids) external {
			IFERC721 inscription = IFERC721(inscriptionAddress);
			require(inscription.factoryContract() == factoryContractAddress, "not created by factory");
			require(inscription.totalSupply() == inscription.max() / inscription.limit(), "mint not finished");
			require(inscription.isApprovedForAll(msg.sender, address(this)), "not approved");

			address ferc20Address = ferc20Addresses[inscriptionAddress];
			if(ferc20Address == address(0x0)) {
				ferc20Address = Clones.clone(tokenImplementation);
				FERC20(ferc20Address).initialize(inscriptionAddress);
				ferc721Addresses[ferc20Address] = inscriptionAddress;
				ferc20Addresses[inscriptionAddress] = ferc20Address;
				emit DeployERC20(msg.sender, msg.sender, inscriptionAddress, ferc20Address, inscription.limit());
			}

			for(uint i; i < ids.length; i++) {
				nftTokenIds[inscriptionAddress].push(ids[i]);
				inscription.transferFrom(msg.sender, address(this), ids[i]);
				emit ReceivedNFT(msg.sender, msg.sender, ids[i], inscriptionAddress, ferc20Address, inscription.limit());
			}
			FERC20(ferc20Address).mint(msg.sender, inscription.limit() * 1e18 * ids.length);
		}
		
		function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4) {
				require(IFERC721(msg.sender).factoryContract() == factoryContractAddress, "not created by factory");
				require(IFERC721(msg.sender).totalSupply() == IFERC721(msg.sender).max() / IFERC721(msg.sender).limit(), "mint not finished");

				address ferc20Address = ferc20Addresses[msg.sender];
				if(ferc20Address == address(0x0)) {
					ferc20Address = Clones.clone(tokenImplementation);
					FERC20(ferc20Address).initialize(msg.sender);
					ferc721Addresses[ferc20Address] = msg.sender;
					ferc20Addresses[msg.sender] = ferc20Address;
					emit DeployERC20(operator, from, msg.sender, ferc20Address, IFERC721(msg.sender).limit());
				}
				nftTokenIds[msg.sender].push(tokenId);

				FERC20(ferc20Address).mint(from, IFERC721(msg.sender).limit() * 1e18);

				emit ReceivedNFT(operator, from, tokenId, msg.sender, ferc20Address, IFERC721(msg.sender).limit());
				return IERC721Receiver.onERC721Received.selector;
		}
}
