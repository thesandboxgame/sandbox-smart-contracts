//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title AuthSuperValidator
/// @author The Sandbox
/// @notice This contract is used to validate the signatures of the backend, each contract can have a separate signer assigned
contract AuthSuperValidator is AccessControl {
    mapping(address => address) private _signers;

    /// @dev Constructor
    /// @param admin Address of the admin that will be able to grant roles
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Sets the signer for a contract
    /// @dev Only the admin can call this function
    /// @param contractAddress Address of the contract to set the signer for
    /// @param signer Address of the signer
    function setSigner(address contractAddress, address signer) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _signers[contractAddress] = signer;
    }

    /// @notice Gets the signer for a contract
    /// @param contractAddress Address of the contract to get the signer for
    /// @return address of the signer
    function getSigner(address contractAddress) public view returns (address) {
        return _signers[contractAddress];
    }

    /// @notice Takes the signature and the digest and returns if the signer has a backend signer role assigned
    /// @dev Multipurpose function that can be used to verify signatures with different digests
    /// @param signature Signature hash
    /// @param digest Digest hash
    /// @return bool
    function verify(bytes memory signature, bytes32 digest) public view returns (bool) {
        address signer = _signers[_msgSender()];
        require(signer != address(0), "AuthSuperValidator: signer not set");
        address recoveredSigner = ECDSA.recover(digest, signature);
        return recoveredSigner == signer;
    }
}
