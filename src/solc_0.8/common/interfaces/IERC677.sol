//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IERC677 {
    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool success);
}
