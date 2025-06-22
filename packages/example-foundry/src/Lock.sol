// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

error NotOwner(address owner, address caller);
error NotUnlocked(uint256 unlockTime, uint256 blockTimestamp);
error PastUnlockTime(uint256 unlockTime, uint256 blockTimestamp);

contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    event Withdrawal(uint256 amount, uint256 when);

    constructor(uint256 _unlockTime) payable {
        if (block.timestamp > _unlockTime) {
            revert PastUnlockTime(_unlockTime, block.timestamp);
        }

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    // Function to receive Ether. msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}

    function withdraw(address payable recipient) public payable {
        if (block.timestamp < unlockTime) {
            revert NotUnlocked(unlockTime, block.timestamp);
        }

        if (msg.sender != owner) {
            revert NotOwner(owner, msg.sender);
        }

        emit Withdrawal(address(this).balance, block.timestamp);

        recipient.transfer(address(this).balance);
    }
}
