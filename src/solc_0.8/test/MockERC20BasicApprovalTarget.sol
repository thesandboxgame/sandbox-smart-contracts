//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";

contract MockERC20BasicApprovalTarget {
    event LogOnCall(address);

    function logOnCall(address sender) external returns (address) {
        emit LogOnCall(sender);
        return sender;
    }

    function revertOnCall() external pure {
        revert("REVERT_ON_CALL");
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        return IERC20(msg.sender).transferFrom(sender, recipient, amount);
    }
}
