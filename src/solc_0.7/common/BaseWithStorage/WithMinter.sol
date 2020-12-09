//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "./WithAdmin.sol";

contract WithMinter is WithAdmin {
    address internal _minter;
    event MinterChanged(address oldMinter, address newMinter);

    /// @dev Get the current minter of this contract.
    /// @return The current minter of this contract.
    function getMinter() external view returns (address) {
        return _minter;
    }

    /// @dev Change the minter to be `newMinter`.
    /// @param newMinter  The address of the new minter.
    function changeMinter(address newMinter) external onlyAdmin() {
        emit MinterChanged(_minter, newMinter);
        _minter = newMinter;
    }
}
