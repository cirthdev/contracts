// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/ISmartInscriptionFactory.sol";
import "./interfaces/ISwap.sol";
import "./interfaces/IWETH9.sol";
import "./lib/TokenURI.sol";
import "./interfaces/IFERC721.sol";

contract FERC721 is IFERC721, ERC2981 {
    address public immutable factoryContract;
    address public immutable swapContract;
    address public immutable wethContract;

    struct Data {
        uint128 max;
        uint120 totalSupply;
				bool    needFerc;
        uint96  inscriptionId;
        uint56  limit;
        uint104 ordinals;
        string  tick;
    }
    Data internal _tokenData;

    mapping(address => uint256) internal _lastMintTimestamp; // record the last mint timestamp of account
    mapping(address => uint) internal _balanceOf;
    mapping(address => mapping(address => bool)) internal _isApprovedForAll;
    mapping(uint => address) internal _ownerOf;
    mapping(uint => address) internal _approvals;

    constructor(
        address _swapContractAddress,
        address _wethContractAddress
    ) {
        factoryContract = msg.sender;
        swapContract = _swapContractAddress;
        wethContract = _wethContractAddress;
    }

    function initialize(
        string calldata _tick,
        uint _max,
        uint _limit,
        uint _inscriptionId,
        address _deployer,
        uint96 _feeNumerator,
				bool  _needFerc
    ) public {
        require(_inscriptionId > 0, "inscriptionId can not be zero");
        require(_tokenData.inscriptionId == 0, "initialized");
        require(msg.sender == factoryContract, "only factory caontract allowed");
        _setDefaultRoyalty(_deployer, _feeNumerator);
				_tokenData.max = uint128(_max);
				_tokenData.totalSupply = 0;
				_tokenData.needFerc = _needFerc;
				_tokenData.inscriptionId = uint96(_inscriptionId);
				_tokenData.limit = uint56(_limit);
				_tokenData.ordinals = 0;
				_tokenData.tick = _tick;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC2981, IERC165) returns (bool) {
        return
            interfaceId == type(IFERC721).interfaceId ||
						interfaceId == type(IERC721Metadata).interfaceId || 
            interfaceId == type(IERC165).interfaceId ||
						super.supportsInterface((interfaceId));
    }

    function name() public view returns (string memory) {
        return
            string(abi.encodePacked(_tokenData.tick, " {ferc-721}"));
    }

    function symbol() public view returns (string memory) {
        return _tokenData.tick;
    }

    function max() public view returns (uint) {
        return _tokenData.max;
    }

    function limit() public view returns (uint) {
        return _tokenData.limit;
    }

    function tokenURI(uint tokenId) public view returns (string memory res) {
        if (tokenId <= totalSupply())
            res = TokenURI.uri(
                _tokenData.tick,
                tokenId,
                _tokenData.max,
                _tokenData.limit,
                _tokenData.ordinals,
								ownerOf(tokenId) == ISmartInscriptionFactory(factoryContract).bridgeContractAddress()
            );
    }

    function totalSupply() public view returns (uint) {
        return _tokenData.totalSupply;
    }

		function needFerc() public view returns (bool) {
			return _tokenData.needFerc;
		}

    function lastMintTimestamp(address addr) public view returns (uint) {
        return _lastMintTimestamp[addr];
    }

    function inscriptionId() public view returns (uint) {
        return _tokenData.inscriptionId;
    }

		function ordinals() public view returns (uint) {
			return _tokenData.ordinals;
		}

    function isApprovedForAll(
        address owner,
        address operator
    ) public view returns (bool) {
        return _isApprovedForAll[owner][operator];
    }

    function ownerOf(uint id) public view returns (address owner) {
        owner = _ownerOf[id];
        require(owner != address(0), "token doesn't exist");
    }

    function balanceOf(address owner) public view returns (uint) {
        require(owner != address(0), "owner = zero address");
        return _balanceOf[owner];
    }

    function setApprovalForAll(address operator, bool approved) public {
				require(msg.sender != operator, "approve to caller");
        _isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function approve(address spender, uint id) public {
        address owner = _ownerOf[id];
				require(spender != owner, "approval to current owner");

        require(
            msg.sender == owner || _isApprovedForAll[owner][msg.sender],
            "not authorized"
        );
        _approvals[id] = spender;
        emit Approval(owner, spender, id);
    }

    function getApproved(uint id) public view returns (address) {
        require(_ownerOf[id] != address(0), "token doesn't exist");
        return _approvals[id];
    }

    function transferFrom(address from, address to, uint id) public {
        require(from == _ownerOf[id], "from != owner");
        require(to != address(0), "transfer to zero address");
        require(_isApprovedOrOwner(from, msg.sender, id), "not authorized");

        unchecked {
					_balanceOf[from]--;
					_balanceOf[to]++;
        }
        _ownerOf[id] = to;

        delete _approvals[id];
        emit Transfer(from, to, id);
    }

    function safeTransferFrom(address from, address to, uint id) public {
				safeTransferFrom(from, to, id, "");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint id,
        bytes memory data
    ) public {
        transferFrom(from, to, id);
        _checkOnERC721Received(from, to, id, data);
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length > 0) {
            try
                IERC721Receiver(to).onERC721Received(
                    msg.sender,
                    from,
                    tokenId,
                    data
                )
            returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert(
                        "ERC721: transfer to non ERC721Receiver implementer"
                    );
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    function mint(address to) public payable {
        require(
            block.timestamp >=
                _lastMintTimestamp[msg.sender] + ISmartInscriptionFactory(factoryContract).freezeTime(),
            "In freeze time"
        );
        require(
            _tokenData.totalSupply < _tokenData.max / _tokenData.limit,
            "touch the max batch"
        );
        require(to != address(0), "mint to zero address");
        _tokenData.totalSupply++;

        if (_tokenData.needFerc && msg.value > 0) {
            (bool success2, ) = wethContract.call{value: msg.value}("");
            IWETH9(wethContract).approve(swapContract, msg.value);
            uint256 amountIn = ISwap(swapContract).swapExactOutputSingle(
                ISmartInscriptionFactory(factoryContract).minHoldAmount(),
                msg.value,
                msg.sender
            );
            require(success2 && amountIn > 0, "swap error");
        }

        if (_tokenData.needFerc && ISmartInscriptionFactory(factoryContract).minHoldAmount() > 0)
            require(
                ISwap(swapContract).balanceOfFerc(msg.sender) >=
                    ISmartInscriptionFactory(factoryContract).minHoldAmount(),
                "ferc not enough"
            );

        _balanceOf[to]++;
        _ownerOf[_tokenData.totalSupply] = to;
        _lastMintTimestamp[msg.sender] = block.timestamp;
				
        _tokenData.ordinals = uint104(
            ISmartInscriptionFactory(factoryContract).minted(
                _tokenData.tick,
                _tokenData.totalSupply,
                _tokenData.max,
                _tokenData.totalSupply
            )
        );
        emit Transfer(address(0), to, _tokenData.totalSupply);
    }

    function _isApprovedOrOwner(
        address owner,
        address spender,
        uint id
    ) internal view returns (bool) {
        return (spender == owner ||
            _isApprovedForAll[owner][spender] ||
            spender == _approvals[id]);
    }
}
