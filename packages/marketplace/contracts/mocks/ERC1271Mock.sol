// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";

/// @title ERC1271Mock Contract
/// @dev implements the ERC1271 standard for signature validation
contract ERC1271Mock is IERC1271 {
    bool private returnSuccessfulValidSignature;

    /// @notice valid id signature
    /// @return return ERC1271_RETURN_VALID_SIGNATURE
    bytes4 public constant ERC1271_RETURN_VALID_SIGNATURE = 0x1626ba7e;

    /// @notice invalid id signature
    /// @return return ERC1271_RETURN_INVALID_SIGNATURE
    bytes4 public constant ERC1271_RETURN_INVALID_SIGNATURE = 0x00000000;

    function setReturnSuccessfulValidSignature(bool value) public {
        returnSuccessfulValidSignature = value;
    }

    function isValidSignature(bytes32, bytes memory) public view override returns (bytes4) {
        return returnSuccessfulValidSignature ? ERC1271_RETURN_VALID_SIGNATURE : ERC1271_RETURN_INVALID_SIGNATURE;
    }
}
