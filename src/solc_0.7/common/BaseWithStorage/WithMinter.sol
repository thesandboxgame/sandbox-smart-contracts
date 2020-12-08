//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "./WithAdmin.sol";

contract WithMinter is WithAdmin {
    address internal _minter;
    event MinterChanged(address oldMinter, address newMinter);

    modifier onlyMinter() {
        require(msg.sender == _minter, "MINTER_ACCESS_DENIED");
        _;
    }

    /// @dev gives the current minter of this contract.
    /// @return the current minter of this contract.
    function getMinter() external view returns (address) {
        return _minter;
    }

    /// @dev change the minter to be `newMinter`.
    /// @param newMinter address of the new minter.
    function changeMinter(address newMinter) external onlyAdmin() {
        emit MinterChanged(_minter, newMinter);
        _minter = newMinter;
    }
}
