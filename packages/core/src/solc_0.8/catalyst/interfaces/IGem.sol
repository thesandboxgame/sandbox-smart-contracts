//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../common/interfaces/IERC20Extended.sol";

interface IGem is IERC20Extended {
    function gemId() external returns (uint16);

    function approveFor(
        address owner,
        address spender,
        uint256 amount
    ) external override returns (bool success);

    function getDecimals() external pure returns (uint8);
}
