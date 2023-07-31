//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ERC1155HolderUpgradeable, ERC1155ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import {ERC721HolderUpgradeable, IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {ERC2771Handler} from "./ERC2771Handler.sol";
import {SignedMultiGiveawayBase} from "./SignedMultiGiveawayBase.sol";

/// @title This contract gives rewards in any ERC20, ERC721 or ERC1155 when the backend authorizes it via message signing.
/// @dev The whole contract is split in the base one this implementation to facilitate the reading and split
/// @dev the signature checking code.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract SignedMultiGiveaway is
    SignedMultiGiveawayBase,
    PausableUpgradeable,
    ERC2771Handler,
    ERC1155HolderUpgradeable,
    ERC721HolderUpgradeable
{
    /// @notice limits applied for each claim per token
    struct PerTokenLimitData {
        uint256 maxWeiPerClaim; // maximum amount of wei per each individual claim, 0 => check disabled
    }

    /// @dev global limits that affect the whole contract behaviour
    struct LimitData {
        uint128 numberOfSignaturesNeeded; // Amount of signatures needed minus one to approve a message, 0 => 1 signature
        uint128 maxClaimEntries; // Maximum amount of claims per message minus one, 0 => 1 claim entry per claim
    }

    /// @dev args of claim, used to pass an array to batchClaim
    struct BatchClaimData {
        Signature[] sigs;
        uint256[] claimIds;
        uint256 expiration;
        address from;
        address to;
        ClaimEntry[] claims;
    }

    string public constant NAME = "Sandbox SignedMultiGiveaway";
    string public constant VERSION = "1.0";

    /// @dev this role is for addresses that help the admin. Can pause the contract, but, only the admin can unpause it.
    bytes32 public constant BACKOFFICE_ROLE = keccak256("BACKOFFICE_ROLE");

    /// @dev configurable global limits for the contract.
    LimitData private _limits;

    /// @dev limits applied to each claim per token and tokenId (most useful for EIP1155 tokens)
    /// @dev Token -> id -> Limit
    mapping(address => mapping(uint256 => PerTokenLimitData)) private _perTokenLimitData;

    event Claimed(
        uint256[] claimIds,
        address indexed from,
        address indexed to,
        ClaimEntry[] claims,
        address indexed operator
    );
    event RevokedClaims(uint256[] claimIds, address indexed operator);
    event AssetsRecovered(address indexed to, ClaimEntry[] claims, address indexed operator);
    event MaxWeiPerClaimSet(
        address indexed token,
        uint256 indexed tokenId,
        uint256 maxWeiPerClaim,
        address indexed operator
    );
    event NumberOfSignaturesNeededSet(uint128 numberOfSignaturesNeeded, address indexed operator);
    event MaxClaimEntriesSet(uint128 maxClaimEntries, address indexed operator);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "only admin");
        _;
    }

    modifier onlyBackoffice() {
        require(hasRole(BACKOFFICE_ROLE, _msgSender()), "only backoffice");
        _;
    }

    /// @dev this protects the implementation contract from behing initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer method, called during deployment
    /// @param trustedForwarder_ address of the ERC2771 trusted forwarder
    /// @param admin_ address that have admin access and can assign roles.
    function initialize(address trustedForwarder_, address admin_) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155Receiver_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        __EIP712_init_unchained(NAME, VERSION);
        __Pausable_init_unchained();
        __ERC2771Handler_initialize(trustedForwarder_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(BACKOFFICE_ROLE, admin_);
    }

    /// @notice verifies the ERC712 signatures and transfer tokens from the source user to the destination user.
    /// @param sigs signature part (v,r,s) the array of signatures M in N of M sigs
    /// @param claimIds unique claim ids, used by the backend to avoid double spending
    /// @param expiration expiration timestamp
    /// @param from source user
    /// @param to destination user
    /// @param claims list of tokens to do transfer
    function claim(
        Signature[] calldata sigs,
        uint256[] calldata claimIds,
        uint256 expiration,
        address from, // if different from address(this) then must be used with approve
        address to,
        ClaimEntry[] calldata claims
    ) external whenNotPaused {
        _verifyClaim(_limits.numberOfSignaturesNeeded + 1, sigs, claimIds, expiration, from, to, claims);
        _transfer(from, to, claims);
        emit Claimed(claimIds, from, to, claims, _msgSender());
    }

    /// @notice does a lot of claims in batch
    /// @param batch an array of args to the claim method
    function batchClaim(BatchClaimData[] calldata batch) external whenNotPaused {
        uint256 len = batch.length;
        require(len > 0, "invalid len");
        address sender = _msgSender();
        for (uint256 i; i < len; i++) {
            BatchClaimData calldata c = batch[i];
            _verifyClaim(
                _limits.numberOfSignaturesNeeded + 1,
                c.sigs,
                c.claimIds,
                c.expiration,
                c.from,
                c.to,
                c.claims
            );
            _transfer(c.from, c.to, c.claims);
            emit Claimed(c.claimIds, c.from, c.to, c.claims, sender);
        }
    }

    /// @notice let the admin recover tokens from the contract
    /// @param to destination address of the recovered fund
    /// @param claims list of the tokens to transfer
    function recoverAssets(address to, ClaimEntry[] calldata claims) external onlyAdmin {
        _transfer(address(this), to, claims);
        emit AssetsRecovered(to, claims, _msgSender());
    }

    /// @notice let the backoffice role to revoke claims so they cannot be used anymore
    /// @param claimIds and array of claim Ids to revoke
    function revokeClaims(uint256[] calldata claimIds) external onlyBackoffice {
        _revokeClaims(claimIds);
        emit RevokedClaims(claimIds, _msgSender());
    }

    /// @notice Triggers stopped state. No more claims are accepted.
    function pause() external onlyBackoffice {
        _pause();
    }

    /// @notice Returns to the normal state. Accept claims.
    function unpause() external onlyAdmin {
        _unpause();
    }

    /// @notice set the global limits of the contract
    /// @param numberOfSignaturesNeeded number of signatures needed to approve a claim (default to 1)
    function setNumberOfSignaturesNeeded(uint128 numberOfSignaturesNeeded) external onlyAdmin {
        require(numberOfSignaturesNeeded > 0, "invalid numberOfSignaturesNeeded");
        _limits = LimitData({
            numberOfSignaturesNeeded: numberOfSignaturesNeeded - 1,
            maxClaimEntries: _limits.maxClaimEntries
        });
        emit NumberOfSignaturesNeededSet(numberOfSignaturesNeeded, _msgSender());
    }

    /// @notice set the global limits of the contract
    /// @param maxClaimEntries maximum number of entries in a claim (amount of transfers) that can be claimed at once
    function setMaxClaimEntries(uint128 maxClaimEntries) external onlyAdmin {
        require(maxClaimEntries > 0, "invalid maxClaimEntries");
        _limits = LimitData({
            numberOfSignaturesNeeded: _limits.numberOfSignaturesNeeded,
            maxClaimEntries: maxClaimEntries - 1
        });
        emit MaxClaimEntriesSet(maxClaimEntries, _msgSender());
    }

    /// @notice set the limits per token and tokenId
    /// @param token the token to which will assign the limit
    /// @param tokenId for ERC1155 is the id of the token, else it must be zero
    /// @param maxWeiPerClaim the max amount per each claim, for example 0.01eth per claim
    /// @dev even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm
    function setMaxWeiPerClaim(address token, uint256 tokenId, uint256 maxWeiPerClaim) external onlyAdmin {
        require(token != address(0), "invalid token address");
        _perTokenLimitData[token][tokenId].maxWeiPerClaim = maxWeiPerClaim;
        emit MaxWeiPerClaimSet(token, tokenId, maxWeiPerClaim, _msgSender());
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param newForwarder The new trustedForwarder
    function setTrustedForwarder(address newForwarder) external onlyAdmin {
        _setTrustedForwarder(newForwarder);
    }

    /// @notice return true if already claimed
    /// @param claimId unique id used to avoid double spending
    /// @return true if claimed
    function isClaimed(uint256 claimId) external view returns (bool) {
        return _isClaimed(claimId);
    }

    /// @notice verifies a ERC712 signature for the Claim data type.
    /// @param sig signature part (v,r,s)
    /// @param claimIds unique id used to avoid double spending
    /// @param expiration expiration timestamp
    /// @param from source user
    /// @param to destination user
    /// @param claims list of tokens to do transfer
    /// @return the recovered address must match the signing address
    function verifySignature(
        Signature calldata sig,
        uint256[] calldata claimIds,
        uint256 expiration,
        address from,
        address to,
        ClaimEntry[] calldata claims
    ) external view returns (address) {
        return _verifySignature(sig, claimIds, expiration, from, to, claims);
    }

    /// @notice EIP712 domain separator
    /// @return the hash of the domain separator
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice get the needed number of signatures to approve a claim
    /// @return number of signatures needed
    function getNumberOfSignaturesNeeded() external view returns (uint128) {
        return _limits.numberOfSignaturesNeeded + 1;
    }

    /// @notice get the maximum claim entries per claim
    /// @return Maximum amount of claims per message
    function getMaxClaimEntries() external view returns (uint128) {
        return _limits.maxClaimEntries + 1;
    }

    /// @notice get maximum Weis that can be claimed at once
    /// @param token the token contract address
    /// @param tokenId if ERC1155 the token id else must be zero
    /// @dev even tokenId is kind of inconsistent for tokenType!=ERC1155 it doesn't harm
    /// @return maximum amount of wei per each individual claim, 0 => check disabled
    function getMaxWeiPerClaim(address token, uint256 tokenId) external view returns (uint256) {
        return _perTokenLimitData[token][tokenId].maxWeiPerClaim;
    }

    /// @dev See {IERC165-supportsInterface}.
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlEnumerableUpgradeable, ERC1155ReceiverUpgradeable) returns (bool) {
        return (interfaceId == type(IERC721ReceiverUpgradeable).interfaceId) || super.supportsInterface(interfaceId);
    }

    function _transfer(address from, address to, ClaimEntry[] calldata claims) internal {
        uint256 len = claims.length;
        require(len <= _limits.maxClaimEntries + 1, "too many claims");
        for (uint256 i; i < len; i++) {
            _transferEntry(from, to, claims[i]);
        }
    }

    // solhint-disable code-complexity
    function _transferEntry(address from, address to, ClaimEntry calldata claimEntry) internal {
        if (claimEntry.tokenType == TokenType.ERC20) {
            _transferERC20(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721) {
            _transferERC721(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_BATCH) {
            _transferERC721Batch(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_SAFE) {
            _transferERC721Safe(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC721_SAFE_BATCH) {
            _transferERC721SafeBatch(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC1155) {
            _transferERC1155(from, to, claimEntry);
        } else if (claimEntry.tokenType == TokenType.ERC1155_BATCH) {
            _transferERC1155Batch(from, to, claimEntry);
        } else {
            revert("invalid token type");
        }
    }

    function _transferERC20(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 amount = abi.decode(claimEntry.data, (uint256));
        _checkLimits(_perTokenLimitData[tokenAddress][0], amount);
        if (from == address(this)) {
            require(IERC20Upgradeable(tokenAddress).transfer(to, amount), "transfer failed");
        } else {
            require(IERC20Upgradeable(tokenAddress).transferFrom(from, to, amount), "transfer failed");
        }
    }

    function _transferERC721(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 tokenId = abi.decode(claimEntry.data, (uint256));
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], 1);
        IERC721Upgradeable(tokenAddress).transferFrom(from, to, tokenId);
    }

    function _transferERC721Batch(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256[] memory tokenIds = abi.decode(claimEntry.data, (uint256[]));
        uint256 len = tokenIds.length;
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], len);
        for (uint256 i; i < len; i++) {
            IERC721Upgradeable(tokenAddress).transferFrom(from, to, tokenIds[i]);
        }
    }

    function _transferERC721Safe(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256 tokenId = abi.decode(claimEntry.data, (uint256));
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], 1);
        IERC721Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenId);
    }

    function _transferERC721SafeBatch(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        uint256[] memory tokenIds = abi.decode(claimEntry.data, (uint256[]));
        uint256 len = tokenIds.length;
        // We want a global limit, not per tokenId.
        _checkLimits(_perTokenLimitData[tokenAddress][0], len);
        for (uint256 i; i < len; i++) {
            IERC721Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenIds[i]);
        }
    }

    function _transferERC1155(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        (uint256 tokenId, uint256 amount, bytes memory data) = abi.decode(claimEntry.data, (uint256, uint256, bytes));
        _checkLimits(_perTokenLimitData[tokenAddress][tokenId], amount);
        IERC1155Upgradeable(tokenAddress).safeTransferFrom(from, to, tokenId, amount, data);
    }

    function _transferERC1155Batch(address from, address to, ClaimEntry calldata claimEntry) internal {
        address tokenAddress = claimEntry.tokenAddress;
        (uint256[] memory ids, uint256[] memory amounts, bytes memory data) = abi.decode(
            claimEntry.data,
            (uint256[], uint256[], bytes)
        );

        uint256 len = ids.length;
        require(len > 0, "invalid data len");
        require(len == amounts.length, "invalid data");
        for (uint256 i; i < len; i++) {
            _checkLimits(_perTokenLimitData[tokenAddress][ids[i]], amounts[i]);
        }
        IERC1155Upgradeable(tokenAddress).safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function _checkLimits(PerTokenLimitData storage limits, uint256 amount) internal view {
        require(amount > 0, "invalid amount");
        if (limits.maxWeiPerClaim > 0) {
            require(amount <= limits.maxWeiPerClaim, "checkLimits, amount too high");
        }
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    uint256[48] private __gap;
}
