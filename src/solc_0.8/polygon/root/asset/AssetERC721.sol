//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";
import {IERC721Base} from "../../../common/interfaces/IERC721Base.sol";
import {IAssetERC721} from "../../../common/interfaces/IAssetERC721.sol";
import {
    DefaultOperatorFiltererUpgradeable
} from "../../../OperatorFilterer/contracts/upgradeable/DefaultOperatorFiltererUpgradeable.sol";
import {
    OperatorFiltererUpgradeable
} from "../../../OperatorFilterer/contracts/upgradeable/OperatorFiltererUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract AssetERC721 is BaseERC721, IAssetERC721, OperatorFiltererUpgradeable {
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

    /// @notice Mint an ERC721 Asset with the provided id.
    /// @dev Should be callable only by the AssetTunnel on L1 via MINTER_ROLE.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
    function mint(address to, uint256 id) public override(BaseERC721, IERC721Base) onlyRole(MINTER_ROLE) {
        BaseERC721.mint(to, id);
    }

    /// @notice Mint an ERC721 Asset with the provided id.
    /// @dev Should be callable only by the AssetTunnel on L1.
    /// @dev If you want to retain token metadata from L2 to L1 during exit, you must implement this method.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
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
    function tokenURI(uint256 id) public view override(BaseERC721, IAssetERC721) returns (string memory) {
        require(ownerOf(id) != address(0), "ZERO_ADDRESS");
        return tokenUris[id];
    }

    function supportsInterface(bytes4 id) public view override(BaseERC721, IERC721Base) returns (bool) {
        return BaseERC721.supportsInterface(id);
    }

    function setTrustedForwarder(address trustedForwarder)
        public
        override(BaseERC721, IERC721Base)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        BaseERC721.setTrustedForwarder(trustedForwarder);
    }

    function setApprovalForAllFor(
        address from,
        address operator,
        bool approved
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperatorApproval(operator) {
        BaseERC721.setApprovalForAllFor(from, operator, approved);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperator(from) {
        BaseERC721.safeTransferFrom(from, to, tokenId);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperator(from) {
        BaseERC721.safeBatchTransferFrom(from, to, ids, data);
    }

    function isTrustedForwarder(address forwarder) public view override(BaseERC721, IERC721Base) returns (bool) {
        return BaseERC721.isTrustedForwarder(forwarder);
    }

    function getTrustedForwarder() public view override(BaseERC721, IERC721Base) returns (address trustedForwarder) {
        return BaseERC721.getTrustedForwarder();
    }

    function exists(uint256 tokenId) public view override(BaseERC721, IERC721Base) returns (bool) {
        return BaseERC721.exists(tokenId);
    }

    function burnFrom(address from, uint256 id) public override(BaseERC721, IERC721Base) {
        BaseERC721.burnFrom(from, id);
    }

    function burn(uint256 id) public override(BaseERC721, IERC721Base) {
        BaseERC721.burn(id);
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperator(from) {
        BaseERC721.batchTransferFrom(from, to, ids);
    }

    function approveFor(
        address from,
        address operator,
        uint256 id
    ) public override(BaseERC721, IERC721Base) onlyAllowedOperatorApproval(operator) {
        BaseERC721.approveFor(from, operator, id);
    }
}
