//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IAuthValidator {
    function isAuthValid(bytes calldata signature, bytes32 hashedData) external view returns (bool);
}
