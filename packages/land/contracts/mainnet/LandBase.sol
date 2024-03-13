// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.23;

import {WithAdmin} from "../common/WithAdmin.sol";
import {WithSuperOperators} from "../common/WithSuperOperators.sol";
import {LandBaseToken} from "./LandBaseToken.sol";
import {OperatorFiltererUpgradeable} from "./OperatorFiltererUpgradeable.sol";
import {LandStorageMixin} from "./LandStorageMixin.sol";
import {MetaTransactionReceiver} from "./MetaTransactionReceiver.sol";
import {ERC721BaseToken} from "./ERC721BaseToken.sol";

/// @title LAND Base L1
/// @notice This class composes everything together without adding any functionality (except for _msgSender).
/// @dev We use the storage mixing for historical reasons.
/// @dev There is a difference between L1 and L2 storage slots order and we want to upgrade the contract.
/// @dev This contract uses the exact storage slots configuration that we have in `core` package so we can upgrade
/// @dev It must be the first one in the inheritance chain for subclasses
contract LandBase is LandStorageMixin, LandBaseToken, OperatorFiltererUpgradeable {
    function _msgSender() internal view virtual override returns (address) {
        return msg.sender;
    }

    function _getAdmin() internal view override(LandStorageMixin, WithAdmin) returns (address) {
        return LandStorageMixin._getAdmin();
    }

    function _setAdmin(address a) internal override(LandStorageMixin, WithAdmin) {
        LandStorageMixin._setAdmin(a);
    }

    function _isSuperOperator(address who) internal view override(LandStorageMixin, WithSuperOperators) returns (bool) {
        return LandStorageMixin._isSuperOperator(who);
    }

    function _setSuperOperator(
        address superOperator,
        bool enabled
    ) internal override(LandStorageMixin, WithSuperOperators) {
        LandStorageMixin._setSuperOperator(superOperator, enabled);
    }

    function _isMetaTransactionContract(
        address who
    ) internal view override(LandStorageMixin, MetaTransactionReceiver) returns (bool) {
        return LandStorageMixin._isMetaTransactionContract(who);
    }

    function _setMetaTransactionContract(
        address metaTransactionProcessor,
        bool enabled
    ) internal override(LandStorageMixin, MetaTransactionReceiver) {
        LandStorageMixin._setMetaTransactionContract(metaTransactionProcessor, enabled);
    }

    function _getNumNFTPerAddress(
        address who
    ) internal view override(LandStorageMixin, ERC721BaseToken) returns (uint256) {
        return LandStorageMixin._getNumNFTPerAddress(who);
    }

    function _setNumNFTPerAddress(address who, uint256 val) internal override(LandStorageMixin, ERC721BaseToken) {
        LandStorageMixin._setNumNFTPerAddress(who, val);
    }

    function _getOwnerData(uint256 id) internal view override(LandStorageMixin, ERC721BaseToken) returns (uint256) {
        return LandStorageMixin._getOwnerData(id);
    }

    function _setOwnerData(uint256 id, uint256 data) internal override(LandStorageMixin, ERC721BaseToken) {
        LandStorageMixin._setOwnerData(id, data);
    }
}
