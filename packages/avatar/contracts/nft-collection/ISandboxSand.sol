// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @dev Minimal interface for the SAND token contract.
 */
interface ISandboxSand {
    function approveAndCall(
        address target,
        uint256 amount,
        bytes calldata data
    ) external payable returns (bytes memory);
}
