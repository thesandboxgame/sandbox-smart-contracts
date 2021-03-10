//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

contract MockERC20BasicApprovalTarget {
    event LogOnCall(address);

    function logOnCall(address sender) external returns (address) {
        emit LogOnCall(sender);
        return sender;
    }

    function revertOnCall(address sender) external pure {
        revert("REVERT_ON_CALL");
    }
}
