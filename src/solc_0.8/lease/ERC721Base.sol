// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/Address.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/utils/ERC721Holder.sol";

contract ERC721Base is IERC721 {
    // -----------------------------------------
    // Libraries
    // -----------------------------------------

    using Address for address;

    // -----------------------------------------
    // CONSTANTS
    // -----------------------------------------

    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC165ID = 0x01ffc9a7;

    // -----------------------------------------
    // Storage
    // -----------------------------------------

    mapping(address => uint256) internal _numNFTPerAddress;
    mapping(uint256 => uint256) internal _owners;
    mapping(address => mapping(address => bool)) internal _operatorsForAll;
    mapping(uint256 => address) internal _operators;

    // -----------------------------------------
    // External Functions
    // -----------------------------------------

    function ownerOf(uint256 id) external view override returns (address owner) {
        owner = _ownerOf(id);
        require(owner != address(0), "TOKEN_NOT_EXISTS");
    }

    function balanceOf(address owner) external view override returns (uint256) {
        require(owner != address(0), "INVALID_ADDRESS_ZERO");
        return _numNFTPerAddress[owner];
    }

    function approve(address operator, uint256 id) external override {
        address owner = _ownerOf(id);
        require(owner != address(0), "TOKEN_NOT_EXISTS");
        require(owner == msg.sender, "NOT_OWNER");
        _approveFor(owner, operator, id);
    }

    function getApproved(uint256 id) external view override returns (address) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "TOKEN_NOT_EXISTS");
        if (operatorEnabled) {
            return _operators[id];
        } else {
            return address(0);
        }
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) external override {
        _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public override {
        _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(msg.sender, from, to, id, data), "ERC721_TRANSFER_REJECTED");
        }
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) external override {
        safeTransferFrom(from, to, id, "");
    }

    function supportsInterface(bytes4 id) public pure virtual override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    function setApprovalForAll(address operator, bool approved) external override {
        _operatorsForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view override returns (bool isOperator) {
        return _operatorsForAll[owner][operator];
    }

    // -----------------------------------------
    // Internal Functions
    // -----------------------------------------

    function _ownerOf(uint256 id) internal view virtual returns (address) {
        uint256 data = _owners[id];
        return address(uint160(data));
    }

    function _ownerAndOperatorEnabledOf(uint256 id) internal view returns (address owner, bool operatorEnabled) {
        uint256 data = _owners[id];
        owner = address(uint160(data));
        operatorEnabled = (data / 2**255) == 1;
    }

    function _mint(address to, uint256 id) internal {
        _numNFTPerAddress[to]++;
        _owners[id] = uint256(uint160(to));
        emit Transfer(address(0), to, id);
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        _numNFTPerAddress[from]--;
        _numNFTPerAddress[to]++;
        _owners[id] = uint256(uint160(to));
        emit Transfer(from, to, id);
    }

    function _approveFor(
        address owner,
        address operator,
        uint256 id
    ) internal {
        if (operator == address(0)) {
            _owners[id] = _owners[id] & (2**255 - 1); // no need to resset the operator, it will be overriden next time
        } else {
            _owners[id] = _owners[id] | (2**255);
            _operators[id] = operator;
        }
        emit Approval(owner, operator, id);
    }

    function _burn(address owner, uint256 id) internal {
        _owners[id] = 0;
        _numNFTPerAddress[owner]--;
        emit Transfer(owner, address(0), id);
    }

    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = ERC721Holder(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == ERC721_RECEIVED);
    }

    // ---------------------------------------
    // Internal Checks
    // ---------------------------------------

    function _checkTransfer(
        address from,
        address to,
        uint256 id
    ) internal view {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "TOKEN_NOT_EXISTS");
        require(owner == from, "NOT_OWNER");
        require(to != address(0), "INVALID_ADDRESS_ZERO");
        require(to != address(this), "INVALID_ADDRESS_THIS");
        if (msg.sender != from) {
            require(
                _operatorsForAll[from][msg.sender] || (operatorEnabled && _operators[id] == msg.sender),
                "NOT_AUTHORIZED"
            );
        }
    }
}
