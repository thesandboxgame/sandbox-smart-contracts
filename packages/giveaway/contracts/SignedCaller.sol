//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC2771Handler} from "./ERC2771Handler.sol";

/// @title This contract give rewards in any ERC20, ERC721 or ERC1155 when the backend authorize it via message signing.
/// @dev The whole contract is split in this base one and implementation to facilitate the reading and split
/// @dev the signature checking code
/// @dev This contract support meta transactions.
contract SignedCaller is EIP712Upgradeable, ERC2771Handler, AccessControlEnumerableUpgradeable {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    event Claimed(uint256[] claimIds, address indexed to, bytes data, address operator);
    event RevokedClaims(uint256[] claimIds, address operator);
    event NumberOfSignaturesNeededSet(address to, uint256 numberOfSignaturesNeeded, address operator);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "only admin");
        _;
    }

    string public constant name = "Sandbox SignedCaller";
    string public constant version = "1.0";

    /// @dev the address of the signers authorized to sign messages
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(uint256[] claimIds,uint256 expiration,address to,bytes data)");

    uint256[49] private __preGap;

    mapping(address => uint256) private _numberOfSignaturesNeeded; // Amount of signatures needed minus one to approve a message, 0 => 1 signature
    /// @dev claimId => true if already claimed
    mapping(uint256 => bool) private _claimed;

    function initialize(address trustedForwarder_, address admin_) external initializer {
        __Context_init_unchained();
        __AccessControl_init_unchained();
        __EIP712_init_unchained(name, version);
        __ERC2771Handler_initialize(trustedForwarder_);
        _setupRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    /// @notice verifies a ERC712 signature and mint a new NFT for the buyer.
    /// @param sigs signature part
    /// @param claimIds unique claim ids
    /// @param to destination user
    /// @param data msg.data sent to the caller
    function claim(
        Signature[] calldata sigs,
        uint256[] calldata claimIds,
        uint256 expiration,
        address to,
        bytes calldata data
    ) external virtual {
        if (expiration != 0) {
            require(block.timestamp < expiration, "expired");
        }
        for (uint256 i; i < claimIds.length; i++) {
            require(!_claimed[claimIds[i]], "already claimed");
            _claimed[claimIds[i]] = true;
        }
        bytes32 digest = _digest(claimIds, expiration, to, data);
        _checkSig(_getNumberOfSignaturesNeeded(to), digest, sigs);
        emit Claimed(claimIds, to, data, _msgSender());

        AddressUpgradeable.functionCall(to, data);
    }

    /// @notice let the admin revoke some claims so they cannot be used anymore
    /// @param claimIds and array of claim Ids to revoke
    function revokeClaims(uint256[] calldata claimIds) external onlyAdmin {
        for (uint256 i; i < claimIds.length; i++) {
            _claimed[claimIds[i]] = true;
        }
        emit RevokedClaims(claimIds, _msgSender());
    }

    /// @notice set the global limits of the contract
    /// @param numberOfSignaturesNeeded number of signatures needed to approve a claim (default to 1)
    function setNumberOfSignaturesNeeded(address to, uint256 numberOfSignaturesNeeded) external onlyAdmin {
        require(numberOfSignaturesNeeded > 0, "invalid numberOfSignaturesNeeded");
        _numberOfSignaturesNeeded[to] = numberOfSignaturesNeeded - 1;
        emit NumberOfSignaturesNeededSet(to, numberOfSignaturesNeeded, _msgSender());
    }

    /// @notice get the needed number of signatures to approve a claim
    function getNumberOfSignaturesNeeded(address to) external view returns (uint256) {
        return _getNumberOfSignaturesNeeded(to);
    }

    /// @notice verifies a ERC712 signature for the Claim data type.
    /// @param sig signature part (v,r,s)
    /// @param claimIds unique id used to avoid double spending
    /// @param expiration expiration timestamp
    /// @param to destination user
    /// @param data msg.data sent to the caller
    /// @return the recovered address must match the signing address
    function verifySignature(
        Signature calldata sig,
        uint256[] calldata claimIds,
        uint256 expiration,
        address to,
        bytes calldata data
    ) external view virtual returns (address) {
        bytes32 digest = _digest(claimIds, expiration, to, data);
        return _recover(digest, sig);
    }

    /// @notice return true if already claimed
    /// @return true if claimed
    function isClaimed(uint256 claimId) external view virtual returns (bool) {
        return _claimed[claimId];
    }

    /// @notice EIP712 domain separator
    /// @return the hash of the domain separator
    function domainSeparator() public view virtual returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice get the needed number of signatures to approve a claim
    function _getNumberOfSignaturesNeeded(address to) internal view returns (uint256) {
        return _numberOfSignaturesNeeded[to] + 1;
    }

    function _checkSig(uint256 numberOfSignatures, bytes32 digest, Signature[] calldata sigs) internal virtual {
        require(numberOfSignatures == sigs.length, "not enough signatures");
        address lastSig = address(0);
        for (uint256 i; i < numberOfSignatures; i++) {
            address signer = _recover(digest, sigs[i]);
            require(hasRole(SIGNER_ROLE, signer), "invalid signer");
            // Signers must be different and sorted in incremental order.
            require(lastSig < signer, "invalid order");
            lastSig = signer;
        }
    }

    function _digest(
        uint256[] calldata claimIds,
        uint256 expiration,
        address to,
        bytes calldata data
    ) internal view virtual returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, _hashClaimIds(claimIds), expiration, to, keccak256(data))
        );
        return _hashTypedDataV4(structHash);
    }

    function _recover(bytes32 digest, Signature calldata sig) internal view virtual returns (address) {
        return ECDSAUpgradeable.recover(digest, sig.v, sig.r, sig.s);
    }

    function _hashClaimIds(uint256[] calldata claimIds) internal pure returns (bytes32 hash) {
        return keccak256(abi.encodePacked(claimIds));
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    uint256[49] private __postGap;
}
