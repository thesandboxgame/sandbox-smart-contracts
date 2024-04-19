// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import {WithAdmin} from "../common/WithAdmin.sol";
import {WithSuperOperators} from "../common/WithSuperOperators.sol";
import {OperatorFiltererUpgradeable} from "../common/OperatorFiltererUpgradeable.sol";
import {ERC721BaseToken} from "../common/ERC721BaseToken.sol";
import {LandBaseToken} from "../common/LandBaseToken.sol";
import {ERC2771Handler} from "./ERC2771Handler.sol";
import {PolygonLandStorageMixin} from "./PolygonLandStorageMixin.sol";

/// @title LAND Base L2
/// @notice This contract composes everything together without adding any functionality (except for _msgSender).
/// @dev We use the storage mixing for historical reasons.
/// @dev There is a difference between L1 and L2 storage slots order and we want to upgrade the contract.
/// @dev This contract uses the exact storage slots configuration that we have in `core` package so we can upgrade
/// @dev It must be the first one in the inheritance chain for subclasses
contract PolygonLandBase is PolygonLandStorageMixin, LandBaseToken, ERC2771Handler, OperatorFiltererUpgradeable {
    /// @notice Implements the Context msg sender
    /// @return the address of the message sender
    function _msgSender() internal view override(Context, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    /// @notice Implements the Context msg data
    /// @return the message data without the address of the sender
    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    /// @notice get the admin address
    /// @return the admin address
    function _getAdmin() internal view override(PolygonLandStorageMixin, WithAdmin) returns (address) {
        return PolygonLandStorageMixin._getAdmin();
    }

    /// @notice set the admin address
    /// @param admin the admin address
    function _setAdmin(address admin) internal override(PolygonLandStorageMixin, WithAdmin) {
        PolygonLandStorageMixin._setAdmin(admin);
    }

    /// @notice check if an address is a super-operator
    /// @param superOperator the operator address to check
    /// @return true if an address is a super-operator
    function _isSuperOperator(
        address superOperator
    ) internal view override(PolygonLandStorageMixin, WithSuperOperators) returns (bool) {
        return PolygonLandStorageMixin._isSuperOperator(superOperator);
    }

    /// @notice enable an address to be super-operator
    /// @param superOperator the address to set
    /// @param enabled true enable the address, false disable it.
    function _setSuperOperator(
        address superOperator,
        bool enabled
    ) internal override(PolygonLandStorageMixin, WithSuperOperators) {
        PolygonLandStorageMixin._setSuperOperator(superOperator, enabled);
    }

    /// @notice get the number of nft for an address
    /// @param owner address to check
    /// @return the number of nfts
    function _getNumNFTPerAddress(
        address owner
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (uint256) {
        return PolygonLandStorageMixin._getNumNFTPerAddress(owner);
    }

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _setNumNFTPerAddress(
        address owner,
        uint256 quantity
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setNumNFTPerAddress(owner, quantity);
    }

    /// @notice get the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @return the owner data
    function _getOwnerData(
        uint256 tokenId
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (uint256) {
        return PolygonLandStorageMixin._getOwnerData(tokenId);
    }

    /// @notice set the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @param data the owner data
    function _setOwnerData(uint256 tokenId, uint256 data) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setOwnerData(tokenId, data);
    }

    /// @notice check if an operator was enabled by a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @return true if the operator has access
    function _isOperatorForAll(
        address owner,
        address operator
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (bool) {
        return PolygonLandStorageMixin._isOperatorForAll(owner, operator);
    }

    /// @notice set an operator for a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @param enabled true enable the address, false disable it.
    function _setOperatorForAll(
        address owner,
        address operator,
        bool enabled
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setOperatorForAll(owner, operator, enabled);
    }

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _getOperator(
        uint256 tokenId
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (address) {
        return PolygonLandStorageMixin._getOperator(tokenId);
    }

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _setOperator(
        uint256 tokenId,
        address operator
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setOperator(tokenId, operator);
    }

    /// @notice checks if an address is enabled as minter
    /// @param minter the address to check
    /// @return true if the address is a minter
    function _isMinter(address minter) internal view override(PolygonLandStorageMixin, LandBaseToken) returns (bool) {
        return PolygonLandStorageMixin._isMinter(minter);
    }

    /// @notice set an address as minter
    /// @param minter the address to set
    /// @param enabled true enable the address, false disable it.
    function _setMinter(address minter, bool enabled) internal override(PolygonLandStorageMixin, LandBaseToken) {
        PolygonLandStorageMixin._setMinter(minter, enabled);
    }

    /// @notice get the address of the ERC2771 trusted forwarder
    /// @return the address of the trusted forwarder
    function _getTrustedForwarder() internal view override(PolygonLandStorageMixin, ERC2771Handler) returns (address) {
        return PolygonLandStorageMixin._getTrustedForwarder();
    }

    /// @notice set the address of the ERC2771 trusted forwarder
    /// @param trustedForwarder the address of the trusted forwarder
    function _setTrustedForwarder(
        address trustedForwarder
    ) internal virtual override(PolygonLandStorageMixin, ERC2771Handler) {
        PolygonLandStorageMixin._setTrustedForwarder(trustedForwarder);
    }

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _getOperatorFilterRegistry()
        internal
        view
        override(PolygonLandStorageMixin, OperatorFiltererUpgradeable)
        returns (IOperatorFilterRegistry)
    {
        return PolygonLandStorageMixin._getOperatorFilterRegistry();
    }

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _setOperatorFilterRegistry(
        IOperatorFilterRegistry registry
    ) internal override(PolygonLandStorageMixin, OperatorFiltererUpgradeable) {
        PolygonLandStorageMixin._setOperatorFilterRegistry(registry);
    }
}
