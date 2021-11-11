//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ERC2771Handler} from "../../common/BaseWithStorage/ERC2771Handler.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title This contract pays Sand claims when the backend authorize it via message signing.
/// @dev can be extended to support NFTs, etc.
/// @dev This contract support meta transactions.
/// @dev This contract is final, don't inherit form it.
contract SignedERC20Giveaway is
    Initializable,
    ContextUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    ERC2771Handler
{
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address signer,uint256 claimId,address token,address to,uint256 amount)");
    string public constant name = "Sandbox SignedERC20Giveaway";
    string public constant version = "1.0";
    mapping(uint256 => bool) public claimed;

    function initialize(address trustedForwarder_, address defaultAdmin_) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __EIP712_init_unchained(name, version);
        __ERC2771Handler_initialize(trustedForwarder_);

        _setupRole(DEFAULT_ADMIN_ROLE, defaultAdmin_);
    }

    /// @notice verifies a ERC712 signature for the Mint data type.
    /// @param v signature part
    /// @param r signature part
    /// @param s signature part
    /// @param signer the address of the signer, must be part of the signer role
    /// @param claimId unique claim id
    /// @param token token contract address
    /// @param to destination user
    /// @param amount of ERC20 to transfer
    /// @return true if the signature is valid
    function verify(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        uint256 claimId,
        address token,
        address to,
        uint256 amount
    ) external view returns (bool) {
        return _verify(v, r, s, signer, claimId, token, to, amount);
    }

    /// @notice verifies a ERC712 signature and mint a new NFT for the buyer.
    /// @param v signature part
    /// @param r signature part
    /// @param s signature part
    /// @param signer the address of the signer, must be part of the signer role
    /// @param claimId unique claim id
    /// @param token token contract address
    /// @param to destination user
    /// @param amount of ERC20 to transfer
    function execute(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        uint256 claimId,
        address token,
        address to,
        uint256 amount
    ) external {
        require(_verify(v, r, s, signer, claimId, token, to, amount), "Invalid signature");
        require(hasRole(SIGNER_ROLE, signer), "Invalid signer");
        require(!claimed[claimId], "Already claimed");
        claimed[claimId] = true;
        require(IERC20Upgradeable(token).transfer(to, amount), "Transfer failed");
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function _verify(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        uint256 claimId,
        address token,
        address to,
        uint256 amount
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, signer, claimId, token, to, amount)));
        address recoveredSigner = ECDSAUpgradeable.recover(digest, v, r, s);
        return recoveredSigner == signer;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
