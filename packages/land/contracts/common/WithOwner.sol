//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

/// @title Owner support (EIP173)
/// @author The Sandbox
/// @notice Add an owner for the stores that need it
contract WithOwner {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    struct OwnerStorage {
        address _owner;
    }
    // keccak256(abi.encode(uint256(keccak256("thesandbox.storage.OwnerStorage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OWNER_STORAGE_LOCATION =
        0x874ec33bbe0a683b1266b351c71e55906567133dfd607041d3c0d85ae30f2b00;

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

    function _transferOwnership(address newOwner) internal {
        OwnerStorage storage $ = _getOwnerStorage();
        emit OwnershipTransferred($._owner, newOwner);
        $._owner = newOwner;
    }
}
