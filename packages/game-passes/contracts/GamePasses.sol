// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControlUpgradeable, ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC1155SupplyUpgradeable, ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GamePasses
 * @notice An upgradeable ERC1155 contract with AccessControl-based permissions,
 *         supply tracking, forced burns, burn-and-mint, and EIP-2981 royalties.
 * @custom:security-contact contact-blockchain@sandbox.game
 */
contract GamePasses is
    Initializable,
    ERC2771HandlerUpgradeable,
    AccessControlUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC2981Upgradeable,
    PausableUpgradeable
{
    using Strings for uint256;

    // =============================================================
    //                     Structs
    // =============================================================

    /// @dev Struct to hold token configuration
    struct TokenConfig {
        bool isConfigured;
        bool transferable;
        address treasuryWallet; // specific treasury wallet for this token
        uint256 maxMintable; // 0 for open edition
        string metadata;
        uint256 maxPerWallet; // max tokens that can be minted per wallet
        uint256 totalMinted; // total tokens already minted
        mapping(address owner => uint256 mintedCount) mintedPerWallet; // track mints per wallet
        mapping(address caller => bool isWhitelisted) transferWhitelist; // whitelist for transfers
    }

    /// @dev Struct to hold burn and mint request
    struct BurnAndMintRequest {
        address caller;
        uint256 burnId;
        uint256 burnAmount;
        uint256 mintId;
        uint256 mintAmount;
        uint256 deadline;
        uint256 signatureId;
    }

    /// @dev Struct to hold mint request
    struct MintRequest {
        address caller;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
        uint256 deadline;
        uint256 signatureId;
    }

    /// @dev Struct to hold batch mint request
    struct BatchMintRequest {
        address caller;
        uint256[] tokenIds;
        uint256[] amounts;
        uint256[] prices;
        uint256 deadline;
        uint256 signatureId;
    }

    /// @dev Struct to hold initialization parameters
    struct InitParams {
        string baseURI;
        address royaltyReceiver;
        uint96 royaltyFeeNumerator;
        address admin;
        address operator;
        address signer;
        address paymentToken;
        address trustedForwarder;
        address defaultTreasury;
        address owner;
    }

    // =============================================================
    //                      Storage - ERC7201
    // =============================================================

    /// @custom:storage-location erc7201:sandbox.game-passes.storage.CoreStorage
    struct CoreStorage {
        // Base URI for computing {uri}
        string baseURI;
        // Default treasury wallet
        address defaultTreasuryWallet;
        // Payment token, SAND contract
        address paymentToken;
        // Owner of the contract
        address internalOwner;
        // map used to mark if a specific signatureId was used
        mapping(uint256 signatureId => bool used) signatureIds;
        // EIP-712 domain separator
        // solhint-disable-next-line var-name-mixedcase
        bytes32 DOMAIN_SEPARATOR;
    }

    function _coreStorage() private pure returns (CoreStorage storage cs) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            cs.slot := CORE_STORAGE_LOCATION
        }
    }

    /// @custom:storage-location erc7201:sandbox.game-passes.storage.TokenStorage
    struct TokenStorage {
        // Mapping of token configurations
        mapping(uint256 tokenId => TokenConfig tokenConfig) tokenConfigs;
    }

    function _tokenStorage() private pure returns (TokenStorage storage ts) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            ts.slot := TOKEN_STORAGE_LOCATION
        }
    }

    // =============================================================
    //                      Constants
    // =============================================================

    // keccak256(abi.encode(uint256(keccak256(bytes("sandbox.game-passes.storage.CoreStorage"))) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant CORE_STORAGE_LOCATION =
        0xba0c4bc36712a57d2047a947603622e9142187f10a1421293cb6d7500dee6f00;

    // keccak256(abi.encode(uint256(keccak256(bytes("sandbox.game-passes.storage.TokenStorage"))) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant TOKEN_STORAGE_LOCATION =
        0x437f928739e2760da74c662888f938178fa33ad7fb16b9bdbb0b29abf5edec00;

    /// @dev The role that is allowed to upgrade the contract and manage admin-level operations.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    /// @dev The role that is allowed to sign minting operations
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    /// @dev The role that is allowed to consume tokens
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @dev EIP-712 domain typehash
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    /// @dev EIP-712 domain separator
    // solhint-disable-next-line var-name-mixedcase
    bytes32 public DOMAIN_SEPARATOR;

    /// @dev EIP-712 mint request typehash
    bytes32 public constant MINT_TYPEHASH =
        keccak256(
            "MintRequest(address caller,uint256 tokenId,uint256 amount,uint256 price,uint256 deadline,uint256 signatureId)"
        );

    /// @dev EIP-712 burn and mint request typehash
    bytes32 public constant BURN_AND_MINT_TYPEHASH =
        keccak256(
            "BurnAndMintRequest(address caller,uint256 burnId,uint256 burnAmount,uint256 mintId,uint256 mintAmount,uint256 deadline,uint256 signatureId)"
        );

    /// @dev EIP-712 batch mint request typehash
    bytes32 public constant BATCH_MINT_TYPEHASH =
        keccak256(
            "BatchMintRequest(address caller,uint256[] tokenIds,uint256[] amounts,uint256[] prices,uint256 deadline,uint256 signatureId)"
        );

    /// @dev Maximum number of tokens that can be processed in a batch operation
    uint256 public constant MAX_BATCH_SIZE = 100;

    // =============================================================
    //                           Events
    // =============================================================

    /// @notice Emitted when the base URI is updated.
    /// @param caller Address that initiated the base URI update
    /// @param oldURI Previous base URI value before the update
    /// @param newURI New base URI value after the update
    event BaseURISet(address indexed caller, string oldURI, string newURI);
    /// @notice Emitted when a token is configured.
    /// @param caller Address that initiated the token configuration
    /// @param tokenId ID of the token being configured
    /// @param transferable Whether the token can be transferred
    /// @param maxMintable Maximum copies to be minted for this token (type(uint256).max means unlimited)
    /// @param maxPerWallet Maximum number of tokens a single wallet can mint (type(uint256).max means unlimited)
    /// @param metadata Token-specific metadata string
    /// @param treasuryWallet Address where payments for this token will be sent
    event TokenConfigured(
        address indexed caller,
        uint256 indexed tokenId,
        bool transferable,
        uint256 maxMintable,
        uint256 maxPerWallet,
        string metadata,
        address treasuryWallet
    );
    /// @notice Emitted when a token configuration is updated.
    /// @param caller Address that initiated the token configuration update
    /// @param tokenId ID of the token being updated
    /// @param maxMintable New Maximum copies to be minted for this token (type(uint256).max means unlimited)
    /// @param maxPerWallet New maximum number of tokens a single wallet can mint (type(uint256).max means unlimited)
    /// @param metadata New token-specific metadata string
    /// @param treasuryWallet New address where payments for this token will be sent
    event TokenConfigUpdated(
        address indexed caller,
        uint256 indexed tokenId,
        uint256 maxMintable,
        uint256 maxPerWallet,
        string metadata,
        address treasuryWallet
    );
    /// @notice Emitted when a token's transferability is updated.
    /// @param caller Address that initiated the transferability update
    /// @param tokenId ID of the token whose transferability was changed
    /// @param transferable New transferability status (true = transferable, false = soulbound)
    event TransferabilityUpdated(address indexed caller, uint256 indexed tokenId, bool transferable);
    /// @notice Emitted when transfer whitelist is updated.
    /// @param caller Address that initiated the whitelist update
    /// @param tokenId ID of the token whose whitelist was updated
    /// @param accounts Array of addresses that were added to or removed from the whitelist
    /// @param allowed Whether the addresses were added to (true) or removed from (false) the whitelist
    event TransferWhitelistUpdated(address indexed caller, uint256 indexed tokenId, address[] accounts, bool allowed);
    /// @notice Emitted when tokens are recovered from the contract.
    /// @param caller Address that initiated the token recovery
    /// @param token Address of the ERC20 token being recovered
    /// @param recipient Address receiving the recovered tokens
    /// @param amount Amount of tokens recovered
    event TokensRecovered(address indexed caller, address token, address recipient, uint256 amount);
    /// @notice Emitted when the owner is updated
    /// @param caller Address that initiated the owner update
    /// @param oldOwner Previous owner address before the update
    /// @param newOwner New owner address after the update
    event OwnerUpdated(address indexed caller, address oldOwner, address newOwner);

    // =============================================================
    //                           Errors
    // =============================================================

    /// @dev Revert when trying to mint a token that is not configured
    error TokenNotConfigured(uint256 tokenId);
    /// @dev Revert when trying to mint more tokens than the max mintable
    error MaxMintableExceeded(uint256 tokenId);
    /// @dev Revert when token is already configured
    error TokenAlreadyConfigured(uint256 tokenId);
    /// @dev Revert when array lengths mismatch
    error ArrayLengthMismatch();
    /// @dev Revert when signature expired
    error SignatureExpired();
    /// @dev Revert when invalid signature
    error InvalidSignature(ECDSA.RecoverError error);
    /// @dev Revert when invalid signer
    error InvalidSigner();
    /// @dev Revert when signature already used
    error SignatureAlreadyUsed(uint256 signatureId);
    /// @dev Revert when max mintable below current total minted for a token
    error MaxMintableBelowCurrentMinted(uint256 tokenId);
    /// @dev Revert when transfer not allowed
    error TransferNotAllowed(uint256 tokenId);
    /// @dev Revert when exceeds max per wallet
    error ExceedsMaxPerWallet(uint256 tokenId, address wallet, uint256 attempted, uint256 maximum);
    /// @dev Revert when address is zero
    error ZeroAddress(string role);
    /// @dev Revert when payment token is invalid
    error InvalidPaymentToken();
    /// @dev Revert when trying to recover payment token while contract is active
    error PaymentTokenRecoveryNotAllowed();
    /// @dev Revert when batch size exceeds maximum
    error BatchSizeExceeded(uint256 size, uint256 maxSize);
    /// @dev Revert when invalid batch royalty
    error InvalidBatchRoyalty();
    /// @dev Revert when transfer whitelist is already set
    error TransferWhitelistAlreadySet(uint256 tokenId, address account);
    /// @dev Revert when transferability is already set
    error TransferabilityAlreadySet(uint256 tokenId);
    /// @dev Revert when sender of the transaction does not equal the caller value
    error InvalidSender();
    /// @dev Revert when treasury wallet is the same as the contract address
    error InvalidTreasuryWallet();

    // =============================================================
    //                          Init
    // =============================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the upgradeable contract (replaces constructor).
     * @param params Struct containing all initialization parameters:
     *        - baseURI: Initial base URI for metadata.
     *        - royaltyReceiver: Address to receive royalty fees.
     *        - royaltyFeeNumerator: Royalty fee in basis points (e.g. 500 => 5%).
     *        - admin: Address that will be granted the ADMIN_ROLE.
     *        - operator: Address that will be granted the OPERATOR_ROLE.
     *        - signer: Address that will be granted the SIGNER_ROLE.
     *        - paymentToken: Address of the ERC20 token used for payments.
     *        - trustedForwarder: Address of the trusted meta-transaction forwarder.
     *        - defaultTreasury: Address of the default treasury wallet.
     *        - owner: Address that will be set as the internal owner.
     */
    function initialize(InitParams calldata params) external initializer {
        __ERC2771Handler_init(params.trustedForwarder);
        __AccessControl_init();
        __ERC1155_init(params.baseURI);
        __ERC1155Supply_init();
        __ERC2981_init();
        __Pausable_init();

        if (params.admin == address(0)) revert ZeroAddress("admin");
        if (params.defaultTreasury == address(0)) revert ZeroAddress("treasury");
        if (params.paymentToken == address(0)) revert ZeroAddress("payment token");

        if (params.paymentToken.code.length == 0) {
            revert InvalidPaymentToken();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, params.admin);
        _grantRole(ADMIN_ROLE, params.admin);
        _grantRole(OPERATOR_ROLE, params.operator);
        _grantRole(SIGNER_ROLE, params.signer);

        CoreStorage storage cs = _coreStorage();
        cs.paymentToken = params.paymentToken;
        cs.baseURI = params.baseURI;
        cs.defaultTreasuryWallet = params.defaultTreasury;
        cs.internalOwner = params.owner;
        cs.DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("SandboxPasses1155")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        _setDefaultRoyalty(params.royaltyReceiver, params.royaltyFeeNumerator);
    }

    // =============================================================
    //                      External & Public Functions
    // =============================================================

    /**
     * @notice Mints tokens with a valid EIP-712 signature, requiring payment in the configured token
     * @param caller Address that will receive the tokens
     * @param tokenId ID of the token to mint
     * @param amount Number of tokens to mint
     * @param price Price to pay in payment token units
     * @param deadline Timestamp after which the signature becomes invalid
     * @param signature EIP-712 signature from an authorized signer
     * @dev Verifies the signature, checks mint limits, processes payment, and mints tokens
     * @dev Updates the per-wallet minting count and transfers payment to the appropriate treasury
     * @dev Reverts if:
     *      - Contract is paused
     *      - Caller is not the same as msg.sender and its not an approveAndCall operation through SAND contract
     *      - Token is not configured
     *      - Signature is invalid or expired
     *      - Max mintable would be exceeded
     *      - Max per wallet would be exceeded
     *      - Payment transfer fails
     */
    function mint(
        address caller,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes calldata signature,
        uint256 signatureId
    ) external whenNotPaused {
        CoreStorage storage cs = _coreStorage();
        if (_msgSender() != caller && _msgSender() != cs.paymentToken) {
            revert InvalidSender();
        }

        MintRequest memory request = MintRequest({
            caller: caller,
            tokenId: tokenId,
            amount: amount,
            price: price,
            deadline: deadline,
            signatureId: signatureId
        });
        _processSingleMint(request, signature);
    }

    /**
     * @notice Batch mints multiple tokens with a single valid EIP-712 signature in a transaction
     * @param caller Address that will receive the tokens
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @param prices Array of prices to pay for each mint operation
     * @param deadline Timestamp after which the signature becomes invalid
     * @param signature Single EIP-712 signature from authorized signer
     * @dev Processes multiple mint operations in batch, verifying a single signature
     * @dev All array parameters must be the same length
     * @dev Updates per-wallet minting counts and transfers payments to appropriate treasuries
     * @dev Reverts if:
     *      - Contract is paused
     *      - Caller is not the same as msg.sender and its not an approveAndCall operation through SAND contract
     *      - Array lengths don't match
     *      - Batch size exceeds MAX_BATCH_SIZE
     *      - Any token is not configured
     *      - Signature is invalid or expired
     *      - Any max mintable would be exceeded
     *      - Any max per wallet would be exceeded
     *      - Any payment transfer fails
     */
    function batchMint(
        address caller,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256[] calldata prices,
        uint256 deadline,
        bytes calldata signature,
        uint256 signatureId
    ) external whenNotPaused {
        CoreStorage storage cs = _coreStorage();
        if (_msgSender() != caller && _msgSender() != cs.paymentToken) {
            revert InvalidSender();
        }
        BatchMintRequest memory request = BatchMintRequest({
            caller: caller,
            tokenIds: tokenIds,
            amounts: amounts,
            prices: prices,
            deadline: deadline,
            signatureId: signatureId
        });
        _processBatchMint(request, signature);
    }

    /**
     * @notice Allows admin to mint tokens without requiring payment or signature
     * @param to Address that will receive the tokens
     * @param tokenId ID of the token to mint
     * @param amount Number of tokens to mint
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Still respects max mintable limits but bypasses per-wallet limits
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     *      - Max mintable would be exceeded
     */
    function adminMint(address to, uint256 tokenId, uint256 amount) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        _updateAndCheckTotalMinted(tokenId, amount);
        config.mintedPerWallet[to] += amount;

        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Allows admin to batch mint multiple tokens to a single recipient
     * @param to Address that will receive all the tokens
     * @param ids Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Still respects max mintable limits but bypasses per-wallet limits
     * @dev All array parameters must be the same length
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Array lengths don't match
     *      - Any token is not configured
     *      - Any max mintable would be exceeded
     */
    function adminBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(ADMIN_ROLE) {
        if (ids.length != amounts.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i; i < ids.length; i++) {
            TokenConfig storage config = _tokenStorage().tokenConfigs[ids[i]];

            if (!config.isConfigured) {
                revert TokenNotConfigured(ids[i]);
            }
            _updateAndCheckTotalMinted(ids[i], amounts[i]);
            config.mintedPerWallet[to] += amounts[i];
        }
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice Allows admin to mint multiple tokens to multiple recipients in a single transaction
     * @param to Array of addresses that will receive tokens
     * @param ids Array of token IDs to mint
     * @param amounts Array of amounts to mint
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Still respects max mintable limits but bypasses per-wallet limits
     * @dev All array parameters must be the same length
     * @dev Each index in the arrays corresponds to a single mint operation:
     *      to[i] receives amounts[i] of token ids[i]
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Array lengths don't match
     *      - Any token is not configured
     *      - Any max mintable would be exceeded
     */
    function adminMultiRecipientMint(
        address[] calldata to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(ADMIN_ROLE) {
        if (to.length != ids.length || ids.length != amounts.length) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i; i < ids.length; i++) {
            TokenConfig storage config = _tokenStorage().tokenConfigs[ids[i]];

            if (!config.isConfigured) {
                revert TokenNotConfigured(ids[i]);
            }

            _updateAndCheckTotalMinted(ids[i], amounts[i]);
            config.mintedPerWallet[to[i]] += amounts[i];
            _mint(to[i], ids[i], amounts[i], "");
        }
    }

    /**
     * @notice Allows operator to burn tokens from one address and mint different tokens to another address
     * @param burnFrom Address to burn tokens from
     * @param mintTo Address to mint tokens to
     * @param burnTokenId ID of the token to burn
     * @param burnAmount Amount of tokens to burn
     * @param mintTokenId ID of the token to mint
     * @param mintAmount Amount of tokens to mint
     * @dev Only callable by addresses with OPERATOR_ROLE
     * @dev Used for token transformation/upgrade scenarios
     * @dev Contract must not be paused
     * @dev Reverts if:
     *      - Contract is paused
     *      - Caller doesn't have OPERATOR_ROLE
     *      - Mint token is not configured
     *      - Max mintable would be exceeded for mint token
     *      - Burn operation fails (insufficient balance)
     */
    function operatorBurnAndMint(
        address burnFrom,
        address mintTo,
        uint256 burnTokenId,
        uint256 burnAmount,
        uint256 mintTokenId,
        uint256 mintAmount
    ) external whenNotPaused onlyRole(OPERATOR_ROLE) {
        TokenConfig storage mintConfig = _tokenStorage().tokenConfigs[mintTokenId];
        TokenConfig storage burnConfig = _tokenStorage().tokenConfigs[burnTokenId];

        if (!mintConfig.isConfigured) {
            revert TokenNotConfigured(mintTokenId);
        }

        if (!burnConfig.isConfigured) {
            revert TokenNotConfigured(burnTokenId);
        }

        _updateAndCheckTotalMinted(mintTokenId, mintAmount);
        _updateAndCheckMaxPerWallet(mintTokenId, mintTo, mintAmount);

        _burn(burnFrom, burnTokenId, burnAmount);

        _mint(mintTo, mintTokenId, mintAmount, "");
    }

    /**
     * @notice Batch burn and mint operation for multiple tokens (token transformation)
     * @param burnFrom Address to burn tokens from
     * @param mintTo Address to mint new tokens to
     * @param burnTokenIds Array of token IDs to burn
     * @param burnAmounts Array of amounts to burn for each token ID
     * @param mintTokenIds Array of token IDs to mint
     * @param mintAmounts Array of amounts to mint for each token ID
     * @dev Only callable by addresses with OPERATOR_ROLE
     * @dev Used for batch token transformation/upgrade scenarios
     * @dev Contract must not be paused
     * @dev All array parameters must have matching lengths
     * @dev Reverts if:
     *      - Contract is paused
     *      - Caller doesn't have OPERATOR_ROLE
     *      - Array lengths don't match
     *      - Any mint token is not configured
     *      - Any max mintable would be exceeded
     *      - Any burn operation fails (insufficient balance)
     */
    function operatorBatchBurnAndMint(
        address burnFrom,
        address mintTo,
        uint256[] calldata burnTokenIds,
        uint256[] calldata burnAmounts,
        uint256[] calldata mintTokenIds,
        uint256[] calldata mintAmounts
    ) external whenNotPaused onlyRole(OPERATOR_ROLE) {
        if (
            burnTokenIds.length != burnAmounts.length ||
            burnAmounts.length != mintTokenIds.length ||
            mintTokenIds.length != mintAmounts.length
        ) {
            revert ArrayLengthMismatch();
        }

        // Validate mint tokens and check max mintable
        for (uint256 i; i < mintTokenIds.length; i++) {
            TokenConfig storage mintConfig = _tokenStorage().tokenConfigs[mintTokenIds[i]];
            TokenConfig storage burnConfig = _tokenStorage().tokenConfigs[burnTokenIds[i]];

            if (!mintConfig.isConfigured) {
                revert TokenNotConfigured(mintTokenIds[i]);
            }

            if (!burnConfig.isConfigured) {
                revert TokenNotConfigured(burnTokenIds[i]);
            }

            _updateAndCheckTotalMinted(mintTokenIds[i], mintAmounts[i]);
            _updateAndCheckMaxPerWallet(mintTokenIds[i], mintTo, mintAmounts[i]);
        }

        _burnBatch(burnFrom, burnTokenIds, burnAmounts);

        _mintBatch(mintTo, mintTokenIds, mintAmounts, "");
    }

    /**
     * @notice Allows users to burn their tokens and mint new ones with a valid EIP-712 signature
     * @param caller Address to burn from and mint to (must be msg.sender)
     * @param burnId ID of the token to burn
     * @param burnAmount Number of tokens to burn
     * @param mintId ID of the token to mint
     * @param mintAmount Number of tokens to mint
     * @param deadline Timestamp after which the signature becomes invalid
     * @param signature EIP-712 signature from authorized signer
     * @dev Used for user-initiated token transformations
     * @dev Contract must not be paused
     * @dev Reverts if:
     *      - Contract is paused
     *      - Caller is not the same as msg.sender and its not an approveAndCall operation through SAND contract
     *      - Burn token is not configured
     *      - Mint token is not configured
     *      - Signature is invalid or expired
     *      - Max mintable would be exceeded for mint token
     *      - Burn operation fails (insufficient balance)
     */
    function burnAndMint(
        address caller,
        uint256 burnId,
        uint256 burnAmount,
        uint256 mintId,
        uint256 mintAmount,
        uint256 deadline,
        bytes calldata signature,
        uint256 signatureId
    ) external whenNotPaused {
        CoreStorage storage cs = _coreStorage();
        if (_msgSender() != caller && _msgSender() != cs.paymentToken) {
            revert InvalidSender();
        }

        TokenConfig storage burnConfig = _tokenStorage().tokenConfigs[burnId];
        if (!burnConfig.isConfigured) {
            revert TokenNotConfigured(burnId);
        }

        TokenConfig storage mintConfig = _tokenStorage().tokenConfigs[mintId];
        if (!mintConfig.isConfigured) {
            revert TokenNotConfigured(mintId);
        }

        BurnAndMintRequest memory request = BurnAndMintRequest({
            caller: caller,
            burnId: burnId,
            burnAmount: burnAmount,
            mintId: mintId,
            mintAmount: mintAmount,
            deadline: deadline,
            signatureId: signatureId
        });

        verifyBurnAndMintSignature(request, signature);

        _updateAndCheckTotalMinted(mintId, mintAmount);
        _updateAndCheckMaxPerWallet(mintId, caller, mintAmount);

        _burn(caller, burnId, burnAmount);
        _mint(caller, mintId, mintAmount, "");
    }

    /**
     * @notice Add or remove addresses from token transfer whitelist
     * @param tokenId The token ID to update whitelist for
     * @param accounts Array of addresses to update
     * @param allowed Whether the addresses should be allowed to transfer
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Token must be already configured
     * @dev Whitelisted addresses can transfer tokens even if token is non-transferable
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     */
    function updateTransferWhitelist(
        uint256 tokenId,
        address[] calldata accounts,
        bool allowed
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        for (uint256 i; i < accounts.length; i++) {
            if (config.transferWhitelist[accounts[i]] == allowed) {
                revert TransferWhitelistAlreadySet(tokenId, accounts[i]);
            }
            config.transferWhitelist[accounts[i]] = allowed;
        }
        emit TransferWhitelistUpdated(_msgSender(), tokenId, accounts, allowed);
    }

    /**
     * @notice Update transferability for a given token ID
     * @param tokenId The token ID to update
     * @param transferable New transferability status
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Token must be already configured
     * @dev Setting to false makes token soulbound except for whitelisted addresses
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     */
    function setTransferable(uint256 tokenId, bool transferable) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        if (config.transferable == transferable) {
            revert TransferabilityAlreadySet(tokenId);
        }

        config.transferable = transferable;
        emit TransferabilityUpdated(_msgSender(), tokenId, transferable);
    }

    /**
     * @notice Configure a new token with its properties and restrictions
     * @param tokenId The token ID to configure
     * @param transferable Whether the token can be transferred between users
     * @param maxMintable Maximum copies to be minted (0 for disabled, type(uint256).max for unlimited/open edition)
     * @param maxPerWallet Maximum tokens that can be minted per wallet (0 for disabled, type(uint256).max for unlimited)
     * @param metadata Token metadata string (typically IPFS hash or other identifier)
     * @param treasuryWallet Specific treasury wallet for this token (or address(0) for default)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Cannot configure a token that has already been configured
     * @dev Sets initial configuration for a new token ID
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is already configured
     */
    function configureToken(
        uint256 tokenId,
        bool transferable,
        uint256 maxMintable,
        uint256 maxPerWallet,
        string calldata metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (config.isConfigured) {
            revert TokenAlreadyConfigured(tokenId);
        }

        if (treasuryWallet == address(this)) {
            revert InvalidTreasuryWallet();
        }

        config.isConfigured = true;
        config.transferable = transferable;
        config.maxMintable = maxMintable;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;

        emit TokenConfigured(_msgSender(), tokenId, transferable, maxMintable, maxPerWallet, metadata, treasuryWallet);
    }

    /**
     * @notice Update existing token configuration
     * @param tokenId The token ID to update
     * @param maxMintable New Maximum copies to be minted (0 for disabled, type(uint256).max for unlimited/open edition)
     * @param maxPerWallet New maximum tokens per wallet (0 for disabled, type(uint256).max for unlimited)
     * @param metadata New metadata string (typically IPFS hash)
     * @param treasuryWallet New treasury wallet (or address(0) for default)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Token must be already configured
     * @dev Cannot decrease maxMintable below current total minted
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     *      - New maxMintable is less than current total minted
     */
    function updateTokenConfig(
        uint256 tokenId,
        uint256 maxMintable,
        uint256 maxPerWallet,
        string calldata metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        if (maxMintable < config.totalMinted) {
            revert MaxMintableBelowCurrentMinted(tokenId);
        }

        if (treasuryWallet == address(this)) {
            revert InvalidTreasuryWallet();
        }

        config.maxMintable = maxMintable;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;

        emit TokenConfigUpdated(_msgSender(), tokenId, maxMintable, maxPerWallet, metadata, treasuryWallet);
    }

    /**
     * @notice Set the base URI for token metadata
     * @param newBaseURI The new base URI to set
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev The metadata URI is built as `baseURI + tokenId + ".json"`
     * @dev Emits BaseURISet event with old and new values
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     */
    function setBaseURI(string calldata newBaseURI) external onlyRole(ADMIN_ROLE) {
        CoreStorage storage cs = _coreStorage();
        emit BaseURISet(_msgSender(), cs.baseURI, newBaseURI);
        cs.baseURI = newBaseURI;
    }

    /**
     * @notice Updates the contract owner address
     * @param _newOwner The address that will become the new owner
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev The owner may have special permissions outside of the role system
     */
    function setOwner(address _newOwner) external onlyRole(ADMIN_ROLE) {
        address oldOwner = _coreStorage().internalOwner;
        _coreStorage().internalOwner = _newOwner;
        emit OwnerUpdated(_msgSender(), oldOwner, _newOwner);
    }

    /**
     * @notice Sets the default royalty info (applies to all token IDs)
     * @param receiver Address that will receive the royalties
     * @param feeNumerator Royalty amount in basis points (1% = 100)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Updates the default royalty that applies to all tokens
     * @dev Can be overridden per token using setTokenRoyalty
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyRole(ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Sets royalty info for a specific token ID, overriding default royalty
     * @param tokenId ID of the token to set royalties for
     * @param receiver Address that will receive the royalties for this token
     * @param feeNumerator Royalty amount in basis points (1% = 100)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Overrides the default royalty for the specified token ID
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyRole(ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /**
     * @notice Sets royalty info for a batch of token IDs, overriding default royalty
     * @param tokenIds Array of token IDs to set royalties for
     * @param receivers Array of addresses that will receive the royalties
     * @param feeNumerators Array of royalty amounts in basis points (1% = 100)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Array lengths don't match
     *      - Invalid batch royalty
     */
    function setBatchTokenRoyalty(
        uint256[] calldata tokenIds,
        address[] calldata receivers,
        uint96[] calldata feeNumerators
    ) external onlyRole(ADMIN_ROLE) {
        if (tokenIds.length != receivers.length || receivers.length != feeNumerators.length) {
            revert InvalidBatchRoyalty();
        }

        for (uint256 i; i < tokenIds.length; i++) {
            _setTokenRoyalty(tokenIds[i], receivers[i], feeNumerators[i]);
        }
    }

    /**
     * @notice Pauses all contract operations
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev When paused, prevents minting, burning, and transfers
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Contract is already paused
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all contract operations
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Restores minting, burning, and transfer functionality
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Contract is not paused
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Recover ERC20 tokens accidentally sent to the contract
     * @param token The ERC20 token address to recover
     * @param to The address to send recovered tokens to
     * @param amount The amount of tokens to recover
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Cannot recover the payment token if contract is not paused
     */
    function recoverERC20(address token, address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (token == _coreStorage().paymentToken && !paused()) {
            revert PaymentTokenRecoveryNotAllowed();
        }

        SafeERC20.safeTransfer(IERC20(token), to, amount);
        emit TokensRecovered(_msgSender(), token, to, amount);
    }

    /**
     * @notice Check if an address is whitelisted for token transfers
     * @param tokenId The token ID to check
     * @param account The address to check whitelist status for
     * @dev Used to verify if an address can transfer a non-transferable token
     * @dev Returns false if token is not configured
     * @return bool True if the address is whitelisted for transfers, false otherwise
     */
    function isTransferWhitelisted(uint256 tokenId, address account) external view returns (bool) {
        return _tokenStorage().tokenConfigs[tokenId].transferWhitelist[account];
    }

    /**
     * @notice Returns the base URI for token metadata
     * @return string The base URI
     */
    function baseURI() external view returns (string memory) {
        return _coreStorage().baseURI;
    }

    /**
     * @notice Returns the default treasury wallet address
     * @return address The default treasury wallet address
     */
    function defaultTreasuryWallet() external view returns (address) {
        return _coreStorage().defaultTreasuryWallet;
    }

    /**
     * @notice Returns the payment token address
     * @return address The payment token address
     */
    function paymentToken() external view returns (address) {
        return _coreStorage().paymentToken;
    }

    /**
     * @notice Returns current status for a signatureId
     * @param signatureId The signatureId to get status for
     * @return bool The status of the signatureId, true if used, false otherwise
     */
    function getSignatureStatus(uint256 signatureId) external view returns (bool) {
        return _coreStorage().signatureIds[signatureId];
    }

    /**
     * @notice Returns the token configuration
     * @param tokenId The token ID to get configuration for
     * @return isConfigured Whether the token is configured
     * @return transferable Whether the token is transferable
     * @return maxMintable Maximum copies to be minted for the token (type(uint256).max for unlimited)
     * @return metadata Token metadata string
     * @return maxPerWallet Maximum tokens per wallet
     * @return treasuryWallet Treasury wallet for the token
     * @return totalMinted Total tokens minted for the token
     */
    function tokenConfigs(
        uint256 tokenId
    ) external view returns (bool, bool, uint256, string memory, uint256, address, uint256) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];
        return (
            config.isConfigured,
            config.transferable,
            config.maxMintable,
            config.metadata,
            config.maxPerWallet,
            config.treasuryWallet,
            config.totalMinted
        );
    }

    /**
     * @notice Returns the number of tokens minted per wallet for a specific token ID
     * @param tokenId The token ID
     * @param wallet The wallet address
     * @return uint256 Number of tokens minted by this wallet
     */
    function mintedPerWallet(uint256 tokenId, address wallet) external view returns (uint256) {
        return _tokenStorage().tokenConfigs[tokenId].mintedPerWallet[wallet];
    }

    /**
     * @notice Returns the current owner address of the contract
     * @dev This address may have special permissions beyond role-based access control
     * @return address The current owner address
     */
    function owner() external view returns (address) {
        return _coreStorage().internalOwner;
    }

    /**
     * @notice Returns the metadata URI for a specific token ID
     * @param tokenId ID of the token to get URI for
     * @dev Returns the token-specific metadata string stored in the token configuration
     * @return string The metadata URI for the token
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return _tokenStorage().tokenConfigs[tokenId].metadata;
    }

    /**
     * @notice Check if a token exists (has been configured)
     * @param tokenId The token ID to check
     * @return bool True if the token has been configured, false otherwise
     */
    function exists(uint256 tokenId) public view override returns (bool) {
        return _tokenStorage().tokenConfigs[tokenId].isConfigured;
    }

    /**
     * @notice Checks if contract implements various interfaces
     * @param interfaceId The interface identifier to check
     * @dev Combines interface support checks from parent contracts
     * @dev Supports ERC1155, ERC2981, AccessControl interfaces
     * @return bool True if the contract implements the interface
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlUpgradeable, ERC1155Upgradeable, ERC2981Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // =============================================================
    //                  Private and Internal Functions
    // =============================================================

    /**
     * @notice Internal hook to enforce transfer restrictions on soulbound tokens
     * @param from Source address
     * @param to Destination address
     * @param ids Array of token IDs being transferred
     * @param values Array of transfer amounts
     * @dev Called on all ERC1155 transfers (mint, burn, or user transfer)
     * @dev Enforces transferability rules:
     *      - Allows mints (from == address(0))
     *      - Allows burns (to == address(0))
     *      - Checks transferability for regular transfers
     * @dev Reverts if:
     *      - Token is non-transferable AND sender is not whitelisted AND sender is not ADMIN_ROLE or OPERATOR_ROLE
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155SupplyUpgradeable) whenNotPaused {
        // If not a mint (from == address(0)) and not a burn (to == address(0)), enforce transferability
        if (from != address(0) && to != address(0)) {
            bool isAdminOrOperator = hasRole(ADMIN_ROLE, _msgSender()) || hasRole(OPERATOR_ROLE, _msgSender());
            if (!isAdminOrOperator) {
                for (uint256 i; i < ids.length; i++) {
                    uint256 tokenId = ids[i];
                    TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

                    if (!config.transferable && !config.transferWhitelist[from]) {
                        revert TransferNotAllowed(tokenId);
                    }
                }
            }
        }

        super._update(from, to, ids, values);
    }

    /**
     * @notice Gets the sender address, supporting meta-transactions
     * @dev Overrides Context's _msgSender to support meta-transactions via ERC2771
     * @return address The sender's address (original sender for meta-transactions)
     */
    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    /**
     * @notice Gets the transaction data, supporting meta-transactions
     * @dev Overrides Context's _msgData to support meta-transactions via ERC2771
     * @return bytes calldata The transaction data (modified for meta-transactions)
     */
    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771HandlerUpgradeable._msgData();
    }

    /**
     * @notice Verify signature for mint operation using EIP-712
     * @param request The MintRequest struct containing all mint parameters
     * @param signature The EIP-712 signature to verify
     * @dev Internal function that can be used to verify signatures off-chain
     * @dev Validates the signature against the MINT_TYPEHASH and DOMAIN_SEPARATOR
     * @dev Reverts if:
     *      - Signature has expired
     *      - Signature is invalid
     *      - Signer doesn't have SIGNER_ROLE
     */
    function verifySignature(MintRequest memory request, bytes memory signature) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                request.caller,
                request.tokenId,
                request.amount,
                request.price,
                request.deadline,
                request.signatureId
            )
        );

        _verifySignature(structHash, signature, request.deadline, request.signatureId);
    }

    /**
     * @notice Verify signature for burn and mint operation using EIP-712
     * @param request The BurnAndMintRequest struct containing all operation parameters
     * @param signature The EIP-712 signature to verify
     * @dev Internal function that can be used to verify signatures off-chain
     * @dev Validates the signature against the BURN_AND_MINT_TYPEHASH and DOMAIN_SEPARATOR
     * @dev Reverts if:
     *      - Signature has expired
     *      - Signature is invalid
     *      - Signer doesn't have SIGNER_ROLE
     */
    function verifyBurnAndMintSignature(BurnAndMintRequest memory request, bytes memory signature) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                BURN_AND_MINT_TYPEHASH,
                request.caller,
                request.burnId,
                request.burnAmount,
                request.mintId,
                request.mintAmount,
                request.deadline,
                request.signatureId
            )
        );

        _verifySignature(structHash, signature, request.deadline, request.signatureId);
    }

    /**
     * @notice Verify signature for batch mint operation using EIP-712
     * @param request The BatchMintRequest struct containing all batch mint parameters
     * @param signature The EIP-712 signature to verify
     * @dev Internal function that can be used to verify batch signatures off-chain
     * @dev Validates the signature against the BATCH_MINT_TYPEHASH and DOMAIN_SEPARATOR
     * @dev Reverts if:
     *      - Signature has expired
     *      - Signature is invalid
     *      - Signer doesn't have SIGNER_ROLE
     */
    function verifyBatchSignature(BatchMintRequest memory request, bytes memory signature) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                BATCH_MINT_TYPEHASH,
                request.caller,
                keccak256(abi.encodePacked(request.tokenIds)),
                keccak256(abi.encodePacked(request.amounts)),
                keccak256(abi.encodePacked(request.prices)),
                request.deadline,
                request.signatureId
            )
        );

        _verifySignature(structHash, signature, request.deadline, request.signatureId);
    }

    /**
     * @dev Internal helper function to process a single mint operation
     * @param request The MintRequest struct containing all mint parameters
     * @param signature The EIP-712 signature
     */
    function _processSingleMint(MintRequest memory request, bytes calldata signature) private {
        TokenConfig storage config = _tokenStorage().tokenConfigs[request.tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(request.tokenId);
        }

        verifySignature(request, signature);

        _updateAndCheckMaxPerWallet(request.tokenId, request.caller, request.amount);
        _updateAndCheckTotalMinted(request.tokenId, request.amount);

        address treasury = config.treasuryWallet;
        if (treasury == address(0)) {
            treasury = _coreStorage().defaultTreasuryWallet;
        }
        SafeERC20.safeTransferFrom(IERC20(_coreStorage().paymentToken), request.caller, treasury, request.price);
        _mint(request.caller, request.tokenId, request.amount, "");
    }

    /**
     * @dev Internal helper function to process batch minting
     * @param request The BatchMintRequest struct containing all batch mint parameters
     * @param signature The EIP-712 signature
     */
    function _processBatchMint(BatchMintRequest memory request, bytes calldata signature) private {
        if (request.tokenIds.length > MAX_BATCH_SIZE) {
            revert BatchSizeExceeded(request.tokenIds.length, MAX_BATCH_SIZE);
        }

        if (request.tokenIds.length != request.amounts.length || request.amounts.length != request.prices.length) {
            revert ArrayLengthMismatch();
        }

        verifyBatchSignature(request, signature);

        for (uint256 i; i < request.tokenIds.length; i++) {
            TokenConfig storage config = _tokenStorage().tokenConfigs[request.tokenIds[i]];

            if (!config.isConfigured) {
                revert TokenNotConfigured(request.tokenIds[i]);
            }

            _updateAndCheckMaxPerWallet(request.tokenIds[i], request.caller, request.amounts[i]);
            _updateAndCheckTotalMinted(request.tokenIds[i], request.amounts[i]);

            address treasury = config.treasuryWallet;
            if (treasury == address(0)) {
                treasury = _coreStorage().defaultTreasuryWallet;
            }
            SafeERC20.safeTransferFrom(
                IERC20(_coreStorage().paymentToken),
                request.caller,
                treasury,
                request.prices[i]
            );
        }

        _mintBatch(request.caller, request.tokenIds, request.amounts, "");
    }

    /**
     * @notice Internal function to verify EIP-712 signatures
     * @param hash The EIP-712 typed data hash to verify
     * @param signature The signature bytes to verify
     * @param deadline The timestamp after which the signature is invalid
     * @dev Used by both mint and burnAndMint operations to verify signatures
     * @dev Reverts if:
     *      - Current timestamp is past the deadline
     *      - Signature is invalid or malformed
     *      - Signer doesn't have SIGNER_ROLE
     */
    function _verifySignature(bytes32 hash, bytes memory signature, uint256 deadline, uint256 signatureId) private {
        if (block.timestamp > deadline) {
            revert SignatureExpired();
        }

        if (_coreStorage().signatureIds[signatureId]) {
            revert SignatureAlreadyUsed(signatureId);
        }

        _coreStorage().signatureIds[signatureId] = true;

        bytes32 finalHash = MessageHashUtils.toTypedDataHash(_coreStorage().DOMAIN_SEPARATOR, hash);

        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(finalHash, signature);
        if (err != ECDSA.RecoverError.NoError) {
            revert InvalidSignature(err);
        }
        if (!hasRole(SIGNER_ROLE, recovered)) {
            revert InvalidSigner();
        }
    }

    /**
     * @notice Updates the total minted count and checks if it would exceed max mintable
     * @param tokenId The token ID to check
     * @param amount The amount to mint
     * @dev This function both increments totalMinted and checks against maxMintable limit
     * @dev MaxMintable tracks the total number of tokens that can ever be minted, regardless of burns
     * @dev Reverts if:
     *      - Token has maxMintable = 0 (minting disabled) or
     *      - Total minted (including any previously burned tokens) would exceed maxMintable
     */
    function _updateAndCheckTotalMinted(uint256 tokenId, uint256 amount) private {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];
        config.totalMinted += amount;

        if (config.totalMinted > config.maxMintable) {
            revert MaxMintableExceeded(tokenId);
        }
    }

    /**
     * @notice Helper function to check if minting would exceed max per wallet
     * @param tokenId The token ID to check
     * @param to The recipient address
     * @param amount The amount to mint
     * @dev Used internally before user mint operations
     * @dev Reverts if:
     *      - maxPerWallet is 0 (per-wallet minting disabled) or
     *      - Current wallet balance + amount would exceed max per wallet
     * @dev Skips check if maxPerWallet is type(uint256).max (unlimited)
     */
    function _updateAndCheckMaxPerWallet(uint256 tokenId, address to, uint256 amount) private {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        config.mintedPerWallet[to] += amount;

        if (config.maxPerWallet == 0) {
            revert ExceedsMaxPerWallet(tokenId, to, amount, 0);
        }

        if (config.mintedPerWallet[to] > config.maxPerWallet) {
            revert ExceedsMaxPerWallet(tokenId, to, amount, config.maxPerWallet);
        }
    }
}
