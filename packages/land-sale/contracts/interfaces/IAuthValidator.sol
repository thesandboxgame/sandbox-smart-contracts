//SPDX-License-Identifier: MIT
pragma solidity 0.6.5;

interface IAuthValidator {
    function isAuthValid(bytes calldata signature, bytes32 hashedData) external view returns (bool);
}
