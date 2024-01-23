// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/**
 * @title AddressUtils
 * @author The Sandbox
 * @notice Helper to manipulate addresses
 */
library AddressUtils {
    /**
     * @dev Cast the address to be payable
     * @param _address target address
     * @return a payable address
     */
    function toPayable(address _address) internal pure returns (address) {
        return _address;
    }

    /**
     * @dev Check if the address is a contract
     * @param addr target address
     * @return is it a contract
     */
    function isContract(address addr) internal view returns (bool) {
        // for accounts without code, i.e. `keccak256('')`:
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;

        bytes32 codehash;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            codehash := extcodehash(addr)
        }
        return (codehash != 0x0 && codehash != accountHash);
    }
}
