//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";
import {IPolygonAssetERC721} from "../../../common/interfaces/IPolygonAssetERC721.sol";
import {IERC721Base} from "../../../common/interfaces/IERC721Base.sol";
import {
    OperatorFiltererUpgradeable
} from "../../../OperatorFilterer/contracts/upgradeable/OperatorFiltererUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev AssetERC721 will be minted only on L2 and can be transferred to L1 but not minted on L1.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract PolygonAssetERC721 is BaseERC721, IPolygonAssetERC721, OperatorFiltererUpgradeable {
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(
        address trustedForwarder,
        address admin,
        address subscription
    ) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        __ERC721_init("Sandbox's ASSETs ERC721", "ASSETERC721");
        __OperatorFilterer_init(subscription, true);
    }

    /// @notice Creates a new token for `to`
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @param to The address that will receive a new token
    /// @param id The id of the new token
    function mint(address to, uint256 id) public override(BaseERC721, IERC721Base) onlyRole(MINTER_ROLE) {
        BaseERC721.mint(to, id);
    }

    /// @notice Creates a new token for `to`
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @dev Use this function to retain metadata
    /// @param to The address that will receive a new token
    /// @param id The id of the new token
    /// @param data Associated token metadata, which is decoded & used to set the token's metadata hash.
    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) public override(BaseERC721, IERC721Base) onlyRole(MINTER_ROLE) {
        BaseERC721.mint(to, id, data);
    }

    /// @notice Set the metadatahash for a given token id.
    /// @dev The metadata hash for the ERC721 may need to be manually set or overridden.
    /// @param id The token id.
    /// @param uri The full token URI to be used for the token id.
    function setTokenURI(uint256 id, string memory uri) external override onlyRole(METADATA_ROLE) {
        tokenUris[id] = uri;
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
    /// @param id The token to get the uri of.
    /// @return URI The token's URI string.
    function tokenURI(uint256 id) public view override(BaseERC721, IPolygonAssetERC721) returns (string memory) {
        require(ownerOf(id) != address(0), "ZERO_ADDRESS");
        return tokenUris[id];
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id) public view override(BaseERC721, IERC721Base) returns (bool) {
        return BaseERC721.supportsInterface(id);
    }

    /// @notice Change the address of the trusted forwarder for meta-transactions
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder)
        public
        override(BaseERC721, IERC721Base)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        BaseERC721.setTrustedForwarder(trustedForwarder);
    }

    /// @notice Set the approval for an operator to manage all the tokens of the sender.
    /// @param from The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param approved The determination of the approval.
    function setApprovalForAllFor(
        address from,
        address operator,
        bool approved
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperatorApproval(operator) {
        BaseERC721.setApprovalForAllFor(from, operator, approved);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param from Address whose token is to be transferred.
    /// @param to Recipient.
    /// @param tokenId The token id to be transferred.
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperator(from) {
        BaseERC721.safeTransferFrom(from, to, tokenId);
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
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperator(from) {
        BaseERC721.safeBatchTransferFrom(from, to, ids, data);
    }

    /// @notice Checks if address supplierd is that of an forwarder
    /// @param forwarder the address to be checked
    function isTrustedForwarder(address forwarder) public view override(BaseERC721, IERC721Base) returns (bool) {
        BaseERC721.isTrustedForwarder(forwarder);
    }

    /// @notice returns the address of the trusted forwarder
    function getTrustedForwarder() public view override(BaseERC721, IERC721Base) returns (address trustedForwarder) {
        BaseERC721.getTrustedForwarder();
    }

    /// @notice checks if the token id has been minted or not
    /// @param tokenId the id to be checked
    function exists(uint256 tokenId) public view override(BaseERC721, IERC721Base) returns (bool) {
        BaseERC721.exists(tokenId);
    }

    /// @notice Burns token with given `id`.
    /// @param from Address whose token is to be burned.
    /// @param id Token id which will be burned.
    function burnFrom(address from, uint256 id) public override(BaseERC721, IERC721Base) {
        BaseERC721.burnFrom(from, id);
    }

    /// @notice Burns token with given `id`.
    /// @dev Used by default fx-portal tunnel which burns rather than locks.
    /// @param id The id of the token to be burned.
    function burn(uint256 id) public override(BaseERC721, IERC721Base) {
        BaseERC721.burn(id);
    }

    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param ids The ids of the tokens to be transferred.
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperator(from) {
        BaseERC721.batchTransferFrom(from, to, ids);
    }

    /// @notice Approve an operator to operate tokens on the sender's behalf.
    /// @param from The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approveFor(
        address from,
        address operator,
        uint256 id
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperatorApproval(operator) {
        BaseERC721.approveFor(from, operator, id);
    }
}
