// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IContext} from "../interfaces/IContext.sol";
import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import {WithAdmin} from "../common/WithAdmin.sol";
import {WithSuperOperators} from "../common/WithSuperOperators.sol";
import {OperatorFiltererUpgradeable} from "../common/OperatorFiltererUpgradeable.sol";
import {ERC721BaseToken} from "../common/ERC721BaseToken.sol";
import {PolygonLandBaseToken} from "./PolygonLandBaseToken.sol";
import {ERC2771Handler} from "./ERC2771Handler.sol";
import {PolygonLandStorageMixin} from "./PolygonLandStorageMixin.sol";

/// @title LAND Base L2
/// @notice This contract composes everything together without adding any functionality (except for _msgSender).
/// @dev We use the storage mixing for historical reasons.
/// @dev There is a difference between L1 and L2 storage slots order and we want to upgrade the contract.
/// @dev This contract uses the exact storage slots configuration that we have in `core` package so we can upgrade
/// @dev It must be the first one in the inheritance chain for subclasses
contract PolygonLandBase is PolygonLandStorageMixin, PolygonLandBaseToken, ERC2771Handler, OperatorFiltererUpgradeable {
    function _msgSender() internal view override(IContext, ContextUpgradeable, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function _getAdmin() internal view override(PolygonLandStorageMixin, WithAdmin) returns (address) {
        return PolygonLandStorageMixin._getAdmin();
    }

    function _setAdmin(address a) internal override(PolygonLandStorageMixin, WithAdmin) {
        PolygonLandStorageMixin._setAdmin(a);
    }

    function _isSuperOperator(
        address who
    ) internal view override(PolygonLandStorageMixin, WithSuperOperators) returns (bool) {
        return PolygonLandStorageMixin._isSuperOperator(who);
    }

    function _setSuperOperator(
        address superOperator,
        bool enabled
    ) internal override(PolygonLandStorageMixin, WithSuperOperators) {
        PolygonLandStorageMixin._setSuperOperator(superOperator, enabled);
    }

    function _getNumNFTPerAddress(
        address who
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (uint256) {
        return PolygonLandStorageMixin._getNumNFTPerAddress(who);
    }

    function _setNumNFTPerAddress(
        address who,
        uint256 num
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setNumNFTPerAddress(who, num);
    }

    function _getOwnerData(
        uint256 id
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (uint256) {
        return PolygonLandStorageMixin._getOwnerData(id);
    }

    function _setOwnerData(uint256 id, uint256 data) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setOwnerData(id, data);
    }

    function _isOperatorForAll(
        address owner,
        address operator
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (bool) {
        return PolygonLandStorageMixin._isOperatorForAll(owner, operator);
    }

    function _setOperatorForAll(
        address owner,
        address operator,
        bool enabled
    ) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setOperatorForAll(owner, operator, enabled);
    }

    function _getOperator(
        uint256 id
    ) internal view override(PolygonLandStorageMixin, ERC721BaseToken) returns (address) {
        return PolygonLandStorageMixin._getOperator(id);
    }

    function _setOperator(uint256 id, address operator) internal override(PolygonLandStorageMixin, ERC721BaseToken) {
        PolygonLandStorageMixin._setOperator(id, operator);
    }

    function _isMinter(
        address who
    ) internal view override(PolygonLandStorageMixin, PolygonLandBaseToken) returns (bool) {
        return PolygonLandStorageMixin._isMinter(who);
    }

    function _setMinter(address who, bool enabled) internal override(PolygonLandStorageMixin, PolygonLandBaseToken) {
        PolygonLandStorageMixin._setMinter(who, enabled);
    }

    function _getTrustedForwarder() internal view override(PolygonLandStorageMixin, ERC2771Handler) returns (address) {
        return PolygonLandStorageMixin._getTrustedForwarder();
    }

    function _setTrustedForwarder(
        address trustedForwarder
    ) internal virtual override(PolygonLandStorageMixin, ERC2771Handler) {
        PolygonLandStorageMixin._setTrustedForwarder(trustedForwarder);
    }

    function _getOperatorFilterRegistry()
        internal
        view
        override(PolygonLandStorageMixin, OperatorFiltererUpgradeable)
        returns (IOperatorFilterRegistry)
    {
        return PolygonLandStorageMixin._getOperatorFilterRegistry();
    }

    function _setOperatorFilterRegistry(
        IOperatorFilterRegistry registry
    ) internal override(PolygonLandStorageMixin, OperatorFiltererUpgradeable) {
        PolygonLandStorageMixin._setOperatorFilterRegistry(registry);
    }
}
