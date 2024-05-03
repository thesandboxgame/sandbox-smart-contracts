//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

/// @title Owner support (EIP173)
/// @author The Sandbox
/// @notice Add an owner for the stores that need it
contract WithOwner {
    /// @notice emitted when the ownership of the contract is changed
    /// @param previousOwner The old address of the owner.
    /// @param newOwner The new address of the owner.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    struct OwnerStorage {
        address _owner;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.land.common.WithOwner
    bytes32 internal constant OWNER_STORAGE_LOCATION =
        0x1836e2fa424a35b79c13fd66f8e282cb3a31513f9610d6e7a99baf7ffe56ec00;

    function _getOwnerStorage() private pure returns (OwnerStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := OWNER_STORAGE_LOCATION
        }
    }

    /// @notice Get the address of the owner
    /// @return ownerAddress The address of the owner.
    function owner() external view returns (address ownerAddress) {
        OwnerStorage storage $ = _getOwnerStorage();
        return $._owner;
    }

    /// @notice change the ownership of the contract
    /// @param newOwner The new address of the owner.
    function _transferOwnership(address newOwner) internal {
        OwnerStorage storage $ = _getOwnerStorage();
        emit OwnershipTransferred($._owner, newOwner);
        $._owner = newOwner;
    }
}
