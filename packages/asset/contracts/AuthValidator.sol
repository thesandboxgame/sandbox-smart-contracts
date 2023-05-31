//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title AuthValidator
/// @author The Sandbox
/// @notice This contract is used to validate the signature of the backend
contract AuthValidator is AccessControl {
    bytes32 public constant AUTH_SIGNER_ROLE = keccak256("AUTH_ROLE");

    /// @dev Constructor
    /// @param admin Address of the admin that will be able to grant roles
    /// @param initialSigningWallet Address of the initial signing wallet that will be signing on behalf of the backend
    constructor(address admin, address initialSigningWallet) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUTH_SIGNER_ROLE, initialSigningWallet);
    }

    /// @notice Takes the signature and the digest and returns if the signer has a backend signer role assigned
    /// @dev Multipurpose function that can be used to verify signatures with different digests
    /// @param signature Signature hash
    /// @param digest Digest hash
    /// @return bool
    function verify(
        bytes memory signature,
        bytes32 digest
    ) public view returns (bool) {
        address recoveredSigner = ECDSA.recover(digest, signature);
        return hasRole(AUTH_SIGNER_ROLE, recoveredSigner);
    }
}
