// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IOperatorFilterRegistry} from "./interfaces/IOperatorFilterRegistry.sol";
import {WithAdmin} from "./common/WithAdmin.sol";
import {WithSuperOperators} from "./common/WithSuperOperators.sol";
import {OperatorFiltererUpgradeable} from "./common/OperatorFiltererUpgradeable.sol";
import {ERC721BaseToken} from "./common/ERC721BaseToken.sol";
import {LandBaseToken} from "./common/LandBaseToken.sol";
import {ERC2771Handler} from "./polygon/ERC2771Handler.sol";
import {PolygonLandStorageMixin} from "./polygon/PolygonLandStorageMixin.sol";
import {LandBase} from "./common/LandBase.sol";

/// @title LAND token on L2
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice LAND contract on L2
/// @dev We use the storage mixing for historical reasons.
/// @dev There is a difference between L1 and L2 storage slots order and we want to upgrade the contract.
/// @dev This contract uses the exact storage slots configuration that we have in `core` package so we can upgrade
/// @dev PolygonLandStorageMixin must be the first one in the inheritance chain for subclasses
contract PolygonLand is PolygonLandStorageMixin, LandBase, ERC2771Handler {
    /// @notice Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external {
        _setTrustedForwarder(address(0));
    }

    /// @notice Implements the Context msg sender
    /// @return the address of the message sender
    function _msgSender() internal view override(Context, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    /// @notice get the admin address
    /// @return the admin address
    function _readAdmin() internal view override(PolygonLandStorageMixin, WithAdmin) returns (address) {
        return PolygonLandStorageMixin._readAdmin();
    }

    /// @notice set the admin address
    /// @param admin the admin address
    function _writeAdmin(address admin) internal override(PolygonLandStorageMixin, WithAdmin) {
        PolygonLandStorageMixin._writeAdmin(admin);
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
    function _writeSuperOperator(
        address superOperator,
        bool enabled
    ) internal override(PolygonLandStorageMixin, WithSuperOperators) {
        PolygonLandStorageMixin._writeSuperOperator(superOperator, enabled);
    }

    /// @notice get the number of nft for an address
    /// @param owner address to check
    /// @return the number of nfts
    function _readNumNFTPerAddress(
        address owner
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (uint256) {
        return PolygonLandStorageMixin._readNumNFTPerAddress(owner);
    }

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _writeNumNFTPerAddress(
        address owner,
        uint256 quantity
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._writeNumNFTPerAddress(owner, quantity);
    }

    /// @notice get the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @return the owner data
    function _readOwnerData(
        uint256 tokenId
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (uint256) {
        return PolygonLandStorageMixin._readOwnerData(tokenId);
    }

    /// @notice set the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @param data the owner data
    function _writeOwnerData(
        uint256 tokenId,
        uint256 data
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._writeOwnerData(tokenId, data);
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
    function _writeOperatorForAll(
        address owner,
        address operator,
        bool enabled
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._writeOperatorForAll(owner, operator, enabled);
    }

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _readOperator(
        uint256 tokenId
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (address) {
        return PolygonLandStorageMixin._readOperator(tokenId);
    }

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _writeOperator(
        uint256 tokenId,
        address operator
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._writeOperator(tokenId, operator);
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
    function _writeMinter(address minter, bool enabled) internal override(PolygonLandStorageMixin, LandBaseToken) {
        PolygonLandStorageMixin._writeMinter(minter, enabled);
    }

    /// @notice get the address of the ERC2771 trusted forwarder
    /// @return the address of the trusted forwarder
    function _readTrustedForwarder() internal view override(PolygonLandStorageMixin, ERC2771Handler) returns (address) {
        return PolygonLandStorageMixin._readTrustedForwarder();
    }

    /// @notice set the address of the ERC2771 trusted forwarder
    /// @param trustedForwarder the address of the trusted forwarder
    function _writeTrustedForwarder(
        address trustedForwarder
    ) internal virtual override(PolygonLandStorageMixin, ERC2771Handler) {
        PolygonLandStorageMixin._writeTrustedForwarder(trustedForwarder);
    }

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _readOperatorFilterRegistry()
        internal
        view
        override(PolygonLandStorageMixin, OperatorFiltererUpgradeable)
        returns (IOperatorFilterRegistry)
    {
        return PolygonLandStorageMixin._readOperatorFilterRegistry();
    }

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _writeOperatorFilterRegistry(
        IOperatorFilterRegistry registry
    ) internal override(PolygonLandStorageMixin, OperatorFiltererUpgradeable) {
        PolygonLandStorageMixin._writeOperatorFilterRegistry(registry);
    }
}
