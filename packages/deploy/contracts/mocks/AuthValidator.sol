//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

/// @title AuthValidator
/// @author The Sandbox
/// @notice This contract is used to validate the signature of the backend
contract AuthValidatorMock {
    mapping(bytes32 => bool) public valid;
    /// @dev Constructor
    /// @param admin Address of the admin that will be able to grant roles
    /// @param initialSigningWallet Address of the initial signing wallet that will be signing on behalf of the backend
    constructor(address admin, address initialSigningWallet) {
    }

    /// @notice Takes the signature and the digest and returns if the signer has a backend signer role assigned
    /// @dev Multipurpose function that can be used to verify signatures with different digests
    /// @param signature Signature hash
    /// @param digest Digest hash
    /// @return bool
    function verify(bytes memory signature, bytes32 digest) public view returns (bool) {
        return valid[digest];
    }

    function setValid(bytes32 digest, bool val) external {
        valid[digest] = val;
    }
}
