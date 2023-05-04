//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.6.5;
import "../Interfaces/ERC20Extended.sol";

contract MockSandPredicate {
    event LockedERC20(
        address indexed depositor,
        address indexed depositReceiver,
        address indexed rootToken,
        uint256 amount
    );

    function lockTokens(
        address depositor,
        address depositReceiver,
        address rootToken,
        bytes calldata depositData
    ) external {
        uint256 amount = abi.decode(depositData, (uint256));
        emit LockedERC20(depositor, depositReceiver, rootToken, amount);
        ERC20Extended(rootToken).transferFrom(depositor, address(this), amount);
    }
}
