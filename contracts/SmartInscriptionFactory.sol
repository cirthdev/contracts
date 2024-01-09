// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./FERC721.sol";

contract SmartInscriptionFactory is Ownable {
		address public immutable tokenImplementation;
    uint256 public totalInscriptions;
		address public bridgeContractAddress;

		uint256 internal MIN_TICK_LENGTH = 5;
		uint256 internal MAX_TICK_LENGTH = 5;
		uint256 internal MIN_FERC_HOLD = 10e18; // 10 Ferc
		uint256 internal FREEZE_TIMESTAMP = 600;
		uint256 internal ROYALTY = 200; // 2%

		struct Data {
			uint96 inscriptionId;
			address inscriptionAddress;
		}
		mapping(string => Data) public inscriptionData;

    event Deploy(
        uint256 indexed inscriptionId,
        string  tick,
        uint256 max,
				uint256 limit,
				bool    needFerc,
        address inscriptionAddress
    );

		event Mint(
			uint256 indexed inscriptionId, 
			string tick, 
			uint256 max,
			address inscriptionAddress,
			uint256 indexed tokenId,
			uint256 totalSupply
		);
    
		constructor(
			address _swapContractAddress, 
			address _wethContractAddress
		) {
				tokenImplementation = address(new FERC721(_swapContractAddress, _wethContractAddress));
		}

    function deploy(string calldata _tick, uint256 _max, uint256 _limit, bool _needFerc) public returns(address _inscriptionAddress) {
				uint256 len = bytes(_tick).length;
        require(len >= MIN_TICK_LENGTH && len <= MAX_TICK_LENGTH, "Tick lenght error");
        require(inscriptionData[_tick].inscriptionId == 0, "tick existed");
				require(bridgeContractAddress > address(0x0), "bridge contract not set");

				totalInscriptions++;
				_inscriptionAddress = Clones.clone(tokenImplementation);
        FERC721(_inscriptionAddress).initialize(_tick, _max, _limit, totalInscriptions, msg.sender, uint96(ROYALTY), _needFerc);
				inscriptionData[_tick].inscriptionId = uint96(totalInscriptions);
				inscriptionData[_tick].inscriptionAddress = _inscriptionAddress;
        emit Deploy(totalInscriptions, _tick, _max, _limit, _needFerc, _inscriptionAddress);
    }

		function minted(
			string calldata tick,
			uint   tokenId,
			uint   max
		) public {
				require(msg.sender == inscriptionData[tick].inscriptionAddress, "must call from inscription");
        emit Mint(inscriptionData[tick].inscriptionId, tick, max, inscriptionData[tick].inscriptionAddress, tokenId, tokenId);
		}

		function withdraw(uint amount, address to) public onlyOwner returns(bool) {
			require(address(this).balance >= amount, "balance not enough");
			(bool success, ) = address(to).call{value: amount}("");
			return success;
		}

		function minHoldAmount() public view returns(uint) {
			return MIN_FERC_HOLD;
		}

		function freezeTime() public view returns(uint) {
			return FREEZE_TIMESTAMP;
		}

		function setMintHoldAmount(uint val) public onlyOwner {
			MIN_FERC_HOLD = val;
		}

		function setFreezeTime(uint val) public onlyOwner {
			FREEZE_TIMESTAMP = val;
		}

		function setTickLength(uint min, uint max) public onlyOwner {
			MIN_TICK_LENGTH = min;
			MAX_TICK_LENGTH = max;
		}

		function royalty() public view returns(uint) {
			return ROYALTY;
		}

		function setRoyalty(uint rate) public onlyOwner {
			ROYALTY = rate;
		}

		function setBridgeContract(address addr) public onlyOwner {
			bridgeContractAddress = addr;
		}
}