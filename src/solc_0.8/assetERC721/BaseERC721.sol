//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IMintableERC721} from "../common/interfaces/IMintableERC721.sol";
import {IERC721Token} from "../common/interfaces/IERC721Token.sol";
import {IERC721ExtendedToken} from "../common/interfaces/IERC721ExtendedToken.sol";
import {IERC721Minter} from "../common/interfaces/IERC721Minter.sol";

abstract contract BaseERC721 is
    AccessControlUpgradeable,
    ERC721Upgradeable,
    IMintableERC721,
    IERC721Token,
    IERC721ExtendedToken,
    IERC721Minter
{
    uint256[50] private __gap1; // In case

    address internal _trustedForwarder;

    string public baseTokenURI;

    mapping(uint256 => string) public tokenUris;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @notice Mint an ERC721 Asset with the provided id.
    /// @dev Should be callable only by the designated predicate on L1.
    /// @dev Do not use this mint method if you want to retain metadata.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
    function mint(address to, uint256 id) public virtual override(IMintableERC721, IERC721Token, IERC721Minter) {
        _safeMint(to, id);
    }

    /// @notice Mint an ERC721 Asset with the provided id.
    /// @dev Should be callable only by the designated predicate on L1.
    /// @dev If you want to retain token metadata from L2 to L1 during exit, you must implement this method.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
    /// @param data Associated token metadata, which is decoded & used to set the full tokenUri.
    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) public virtual override(IMintableERC721, IERC721Token, IERC721Minter) {
        require(data.length > 0, "DATA_MUST_CONTAIN_TOKENURI");
        _setTokenURI(id, data);
        _safeMint(to, id, data);
    }

    /// @notice Approve an operator to operate tokens on the sender's behalf.
    /// @param from The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approveFor(
        address from,
        address operator,
        uint256 id
    ) public virtual override(IERC721ExtendedToken) {
        require(from != address(0), "ZERO_ADDRESS");
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "!AUTHORIZED");
        approve(operator, id);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender.
    /// @param from The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param approved The determination of the approval.
    function setApprovalForAllFor(
        address from,
        address operator,
        bool approved
    ) public virtual override(IERC721ExtendedToken) {
        require(from != address(0), "ZERO_ADDRESS");
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "!AUTHORIZED");
        _setApprovalForAll(from, operator, approved);
    }

    /// @notice Burns token with given `id`.
    /// @param from Address whose token is to be burned.
    /// @param id Token id which will be burned.
    function burnFrom(address from, uint256 id) public virtual override(IERC721ExtendedToken, IERC721Token) {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "!AUTHORIZED");
        require(from == ERC721Upgradeable.ownerOf(id), "NOT_OWNER");
        _burn(id);
    }

    /// @notice Burns token with given `id`.
    /// @dev Used by default fx-portal tunnel which burns rather than locks.
    /// @param id The id of the token to be burned.
    function burn(uint256 id) public virtual override(IERC721ExtendedToken) onlyRole(BURNER_ROLE) {
        _burn(id);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param from Address whose token is to be transferred.
    /// @param to Recipient.
    /// @param tokenId The token id to be transferred.
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override(ERC721Upgradeable, IMintableERC721, IERC721Token) {
        ERC721Upgradeable.safeTransferFrom(from, to, tokenId);
    }

    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param ids The ids of the tokens to be transferred.
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) public virtual override(IERC721ExtendedToken) {
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            ERC721Upgradeable.transferFrom(from, to, id);
        }
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param ids The ids of the tokens to be transferred.
    /// @param data Additional data.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) public virtual override(IERC721ExtendedToken) {
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            ERC721Upgradeable.safeTransferFrom(from, to, id, data);
        }
    }

    /// @notice Query if a token id exists.
    /// @param tokenId Token id to be queried.
    function exists(uint256 tokenId) public view virtual override(IMintableERC721, IERC721Token) returns (bool) {
        return _exists(tokenId);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id)
        public
        view
        virtual
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(id);
    }

    /// @notice Change the address of the trusted forwarder for meta-transactions
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) public virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        _trustedForwarder = trustedForwarder;
    }

    function isTrustedForwarder(address forwarder) public view virtual returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function getTrustedForwarder() public view virtual returns (address trustedForwarder) {
        return _trustedForwarder;
    }

    function _setTokenURI(uint256 id, bytes memory data) internal {
        tokenUris[id] = abi.decode(data, (string));
    }

    function _msgSender() internal view virtual override returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    function _msgData() internal view virtual override returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        super.tokenURI(tokenId);
    }

    function _baseURI() internal view override(ERC721Upgradeable) returns (string memory) {
        return baseTokenURI;
    }

    uint256[50] private __gap2; // In case
}
