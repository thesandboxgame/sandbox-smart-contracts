//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

contract WithMinter {
    address internal _minter;
    event MinterChanged(address oldMinter, address newMinter);

    /// @dev gives the current minter of this contract.
    /// @return the current minter of this contract.
    function getMinter() external view returns (address) {
        return _minter;
    }

    /// @dev change the minter to be `newMinter`.
    /// @param newMinter address of the new minter.
    function changeMinter(address newMinter) external {
        require(msg.sender == _minter, "only admin can change admin");
        emit MinterChanged(_minter, newMinter);
        _minter = newMinter;
    }

    modifier onlyMinter() {
        require(msg.sender == _minter, "only minter allowed");
        _;
    }
}
