// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

///@dev This contract is used as an example of an upgradeable contract
contract LockUpgradeable is Initializable {
    string public version = "v1";
    uint256 public unlockTime;
    address payable public owner;
    bool public initialized = false;

    event Withdrawal(uint256 amount, uint256 when);

    function initialize(uint256 _unlockTime) external payable initializer {
        // solhint-disable-next-line not-rely-on-time
        require(block.timestamp < _unlockTime, "Should be in the future");

        initialized = true;
        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function getVersion() public view virtual returns (string memory) {
        return version;
    }

    function withdraw() public virtual {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        // solhint-disable-next-line not-rely-on-time
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        // solhint-disable-next-line not-rely-on-time
        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}

contract LockUpgradeableV2 is LockUpgradeable {
    string public version2 = "v2";

    function withdraw() public override {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        // solhint-disable-next-line not-rely-on-time
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        // solhint-disable-next-line not-rely-on-time
        emit Withdrawal(address(this).balance / 2, block.timestamp);

        owner.transfer(address(this).balance / 2);
    }

    function getVersion() public view override returns (string memory) {
        return version2;
    }
}
