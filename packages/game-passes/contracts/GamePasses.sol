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
        uint256 maxSupply; // 0 for open edition
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
        uint256 nonce;
    }

    /// @dev Struct to hold mint request
    struct MintRequest {
        address caller;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
        uint256 deadline;
        uint256 nonce;
    }

    /// @dev Struct to hold batch mint request
    struct BatchMintRequest {
        address caller;
        uint256[] tokenIds;
        uint256[] amounts;
        uint256[] prices;
        uint256 deadline;
        uint256 nonce;
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
        // Payment token
        address paymentToken;
        // Owner
        address internalOwner;
        // EIP-712 domain separator
        // solhint-disable-next-line var-name-mixedcase
        bytes32 DOMAIN_SEPARATOR;
    }

    function _coreStorage() private pure returns (CoreStorage storage cs) {
        bytes32 position = keccak256(
            abi.encode(uint256(keccak256(bytes("sandbox.game-passes.storage.CoreStorage"))) - 1)
        ) & ~bytes32(uint256(0xff));
        // solhint-disable-next-line no-inline-assembly
        assembly {
            cs.slot := position
        }
    }

    /// @custom:storage-location erc7201:sandbox.game-passes.storage.UserStorage
    struct UserStorage {
        // Track nonces for replay protection
        mapping(address caller => uint256 nonce) nonces;
    }

    function _userStorage() private pure returns (UserStorage storage us) {
        bytes32 position = keccak256(
            abi.encode(uint256(keccak256(bytes("sandbox.game-passes.storage.UserStorage"))) - 1)
        ) & ~bytes32(uint256(0xff));
        // solhint-disable-next-line no-inline-assembly
        assembly {
            us.slot := position
        }
    }

    /// @custom:storage-location erc7201:sandbox.game-passes.storage.TokenStorage
    struct TokenStorage {
        // Mapping of token configurations
        mapping(uint256 tokenId => TokenConfig tokenConfig) tokenConfigs;
    }

    function _tokenStorage() private pure returns (TokenStorage storage ts) {
        bytes32 position = keccak256(
            abi.encode(uint256(keccak256(bytes("sandbox.game-passes.storage.TokenStorage"))) - 1)
        ) & ~bytes32(uint256(0xff));
        // solhint-disable-next-line no-inline-assembly
        assembly {
            ts.slot := position
        }
    }

    // =============================================================
    //                      Constants
    // =============================================================

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
            "MintRequest(address caller,uint256 tokenId,uint256 amount,uint256 price,uint256 deadline,uint256 nonce)"
        );

    /// @dev EIP-712 burn and mint request typehash
    bytes32 public constant BURN_AND_MINT_TYPEHASH =
        keccak256(
            "BurnAndMintRequest(address caller,uint256 burnId,uint256 burnAmount,uint256 mintId,uint256 mintAmount,uint256 deadline,uint256 nonce)"
        );

    /// @dev EIP-712 batch mint request typehash
    bytes32 public constant BATCH_MINT_TYPEHASH =
        keccak256(
            "BatchMintRequest(address caller,uint256[] tokenIds,uint256[] amounts,uint256[] prices,uint256 deadline,uint256 nonce)"
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
    /// @param maxSupply Maximum supply for this token (0 means unlimited)
    /// @param maxPerWallet Maximum number of tokens a single wallet can mint (0 means unlimited)
    /// @param metadata Token-specific metadata string
    /// @param treasuryWallet Address where payments for this token will be sent
    event TokenConfigured(
        address indexed caller,
        uint256 indexed tokenId,
        bool transferable,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string metadata,
        address treasuryWallet
    );
    /// @notice Emitted when a token configuration is updated.
    /// @param caller Address that initiated the token configuration update
    /// @param tokenId ID of the token being updated
    /// @param maxSupply New maximum supply for this token (0 means unlimited)
    /// @param maxPerWallet New maximum number of tokens a single wallet can mint (0 means unlimited)
    /// @param metadata New token-specific metadata string
    /// @param treasuryWallet New address where payments for this token will be sent
    event TokenConfigUpdated(
        address indexed caller,
        uint256 indexed tokenId,
        uint256 maxSupply,
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
    /// @dev Revert when trying to mint more tokens than the max supply
    error MaxSupplyExceeded(uint256 tokenId);
    /// @dev Revert when burn and mint configuration doesn't exist
    error BurnMintNotConfigured(uint256 burnTokenId);
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
    /// @dev Revert when max supply below current supply
    error MaxSupplyBelowCurrentSupply(uint256 tokenId);
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

    // =============================================================
    //                          Init
    // =============================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the upgradeable contract (replaces constructor).
     * @param _baseURI Initial base URI for metadata.
     * @param _royaltyReceiver Address to receive royalty fees.
     * @param _royaltyFeeNumerator Royalty fee in basis points (e.g. 500 => 5%).
     * @param _admin Address that will be granted the ADMIN_ROLE.
     * @param _operator Address that will be granted the OPERATOR_ROLE.
     * @param _signer Address that will be granted the SIGNER_ROLE.
     * @param _paymentToken Address of the ERC20 token used for payments.
     * @param _trustedForwarder Address of the trusted meta-transaction forwarder.
     * @param _defaultTreasury Address of the default treasury wallet.
     * @param _owner Address that will be set as the internal owner.
     */
    function initialize(
        string memory _baseURI,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator,
        address _admin,
        address _operator,
        address _signer,
        address _paymentToken,
        address _trustedForwarder,
        address _defaultTreasury,
        address _owner
    ) external initializer {
        __ERC2771Handler_init(_trustedForwarder);
        __AccessControl_init();
        __ERC1155_init(_baseURI);
        __ERC1155Supply_init();
        __ERC2981_init();
        __Pausable_init();

        // Validate inputs
        if (_admin == address(0)) revert ZeroAddress("admin");
        if (_defaultTreasury == address(0)) revert ZeroAddress("treasury");
        if (_paymentToken == address(0)) revert ZeroAddress("payment token");

        // Check if _paymentToken is a contract
        if (_paymentToken.code.length == 0) {
            revert InvalidPaymentToken();
        }

        // Set up AccessControl roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _operator);
        _grantRole(SIGNER_ROLE, _signer);

        // Initialize storage structs
        CoreStorage storage cs = _coreStorage();
        cs.paymentToken = _paymentToken;
        cs.baseURI = _baseURI;
        cs.defaultTreasuryWallet = _defaultTreasury;
        cs.internalOwner = _owner;
        cs.DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("SandboxPasses1155")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);
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
     * @dev Verifies the signature, checks supply limits, processes payment, and mints tokens
     * @dev Updates the per-wallet minting count and transfers payment to the appropriate treasury
     * @dev Reverts if:
     *      - Contract is paused
     *      - Token is not configured
     *      - Signature is invalid or expired
     *      - Max supply would be exceeded
     *      - Max per wallet would be exceeded
     *      - Payment transfer fails
     */
    function mint(
        address caller,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        _processSingleMint(caller, tokenId, amount, price, deadline, signature);
        _mint(caller, tokenId, amount, "");
    }

    /**
     * @notice Batch mints multiple tokens with a single valid EIP-712 signature in a transaction
     * @param caller Address that will receive the tokens (must be same as msg.sender)
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
     *      - Array lengths don't match
     *      - Batch size exceeds MAX_BATCH_SIZE
     *      - Any token is not configured
     *      - Signature is invalid or expired
     *      - Any max supply would be exceeded
     *      - Any max per wallet would be exceeded
     *      - Any payment transfer fails
     */
    function batchMint(
        address caller,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256[] calldata prices,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        if (tokenIds.length > MAX_BATCH_SIZE) {
            revert BatchSizeExceeded(tokenIds.length, MAX_BATCH_SIZE);
        }

        if (tokenIds.length != amounts.length || amounts.length != prices.length) {
            revert ArrayLengthMismatch();
        }

        BatchMintRequest memory request = BatchMintRequest({
            caller: caller,
            tokenIds: tokenIds,
            amounts: amounts,
            prices: prices,
            deadline: deadline,
            nonce: _userStorage().nonces[caller]++
        });

        verifyBatchSignature(request, signature);

        // Process each mint separately
        for (uint256 i; i < tokenIds.length; i++) {
            TokenConfig storage config = _tokenStorage().tokenConfigs[tokenIds[i]];

            if (!config.isConfigured) {
                revert TokenNotConfigured(tokenIds[i]);
            }

            _checkMaxPerWallet(tokenIds[i], caller, amounts[i]);
            _checkMaxSupply(tokenIds[i], amounts[i]);

            // Update minted amount for wallet
            config.mintedPerWallet[caller] += amounts[i];

            address treasury = config.treasuryWallet;
            if (treasury == address(0)) {
                treasury = _coreStorage().defaultTreasuryWallet;
            }
            SafeERC20.safeTransferFrom(IERC20(_coreStorage().paymentToken), caller, treasury, prices[i]);
        }

        // Perform batch mint
        _mintBatch(caller, tokenIds, amounts, "");
    }

    /**
     * @notice Allows admin to mint tokens without requiring payment or signature
     * @param to Address that will receive the tokens
     * @param tokenId ID of the token to mint
     * @param amount Number of tokens to mint
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Still respects max supply limits but bypasses per-wallet limits
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     *      - Max supply would be exceeded
     */
    function adminMint(address to, uint256 tokenId, uint256 amount) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        _checkMaxSupply(tokenId, amount);
        config.mintedPerWallet[to] += amount;

        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Allows admin to batch mint multiple tokens to a single recipient
     * @param to Address that will receive all the tokens
     * @param ids Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Still respects max supply limits but bypasses per-wallet limits
     * @dev All array parameters must be the same length
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Array lengths don't match
     *      - Any token is not configured
     *      - Any max supply would be exceeded
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
            _checkMaxSupply(ids[i], amounts[i]);
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
     * @dev Still respects max supply limits but bypasses per-wallet limits
     * @dev All array parameters must be the same length
     * @dev Each index in the arrays corresponds to a single mint operation:
     *      to[i] receives amounts[i] of token ids[i]
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Array lengths don't match
     *      - Any token is not configured
     *      - Any max supply would be exceeded
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

            _checkMaxSupply(ids[i], amounts[i]);
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
     *      - Max supply would be exceeded for mint token
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

        if (!mintConfig.isConfigured) {
            revert TokenNotConfigured(mintTokenId);
        }

        _checkMaxSupply(mintTokenId, mintAmount);
        mintConfig.mintedPerWallet[mintTo] += mintAmount;
        // Burn first
        _burn(burnFrom, burnTokenId, burnAmount);

        // Then mint
        _checkMaxPerWallet(mintTokenId, mintTo, mintAmount);
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
     *      - Any max supply would be exceeded
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

        // Validate mint tokens and check max supply
        for (uint256 i; i < mintTokenIds.length; i++) {
            TokenConfig storage mintConfig = _tokenStorage().tokenConfigs[mintTokenIds[i]];

            if (!mintConfig.isConfigured) {
                revert TokenNotConfigured(mintTokenIds[i]);
            }

            _checkMaxSupply(mintTokenIds[i], mintAmounts[i]);
            _checkMaxPerWallet(mintTokenIds[i], mintTo, mintAmounts[i]);
            mintConfig.mintedPerWallet[mintTo] += mintAmounts[i];
        }

        // Burn tokens first
        _burnBatch(burnFrom, burnTokenIds, burnAmounts);

        // Then mint new tokens
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
     *      - from address doesn't match msg.sender
     *      - Burn token is not configured
     *      - Mint token is not configured
     *      - Signature is invalid or expired
     *      - Max supply would be exceeded for mint token
     *      - Burn operation fails (insufficient balance)
     */
    function burnAndMint(
        address caller,
        uint256 burnId,
        uint256 burnAmount,
        uint256 mintId,
        uint256 mintAmount,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        TokenConfig storage burnConfig = _tokenStorage().tokenConfigs[burnId];
        if (!burnConfig.isConfigured) {
            revert BurnMintNotConfigured(burnId);
        }

        // Check if mint token is configured and respects max supply
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
            nonce: _userStorage().nonces[caller]++
        });

        verifyBurnAndMintSignature(request, signature);

        _checkMaxSupply(mintId, mintAmount);
        mintConfig.mintedPerWallet[caller] += mintAmount;
        // Burn first
        _burn(caller, burnId, burnAmount);

        // Then mint new token
        _checkMaxPerWallet(mintId, caller, mintAmount);
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
     * @param maxSupply Maximum supply (0 for unlimited/open edition)
     * @param maxPerWallet Maximum tokens that can be minted per wallet (0 for unlimited)
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
        uint256 maxSupply,
        uint256 maxPerWallet,
        string calldata metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (config.isConfigured) {
            revert TokenAlreadyConfigured(tokenId);
        }

        config.isConfigured = true;
        config.transferable = transferable;
        config.maxSupply = maxSupply;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;

        emit TokenConfigured(_msgSender(), tokenId, transferable, maxSupply, maxPerWallet, metadata, treasuryWallet);
    }

    /**
     * @notice Update existing token configuration
     * @param tokenId The token ID to update
     * @param maxSupply New maximum supply (0 for open edition)
     * @param maxPerWallet New maximum tokens per wallet (0 for unlimited)
     * @param metadata New metadata string (typically IPFS hash)
     * @param treasuryWallet New treasury wallet (or address(0) for default)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Token must be already configured
     * @dev Cannot decrease maxSupply below current supply
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     *      - New maxSupply is less than current supply
     */
    function updateTokenConfig(
        uint256 tokenId,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string calldata metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        // Cannot decrease maxSupply below current supply
        if (maxSupply > 0) {
            uint256 currentSupply = totalSupply(tokenId);
            if (maxSupply < currentSupply) {
                revert MaxSupplyBelowCurrentSupply(tokenId);
            }
        }

        config.maxSupply = maxSupply;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;

        emit TokenConfigUpdated(_msgSender(), tokenId, maxSupply, maxPerWallet, metadata, treasuryWallet);
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
     * @notice Returns current nonce for a user address
     * @param user The address to get nonce for
     * @return uint256 The current nonce
     */
    function getNonce(address user) external view returns (uint256) {
        return _userStorage().nonces[user];
    }

    /**
     * @notice Returns the token configuration
     * @param tokenId The token ID to get configuration for
     * @return isConfigured Whether the token is configured
     * @return transferable Whether the token is transferable
     * @return maxSupply Maximum supply for the token (0 for unlimited)
     * @return metadata Token metadata string
     * @return maxPerWallet Maximum tokens per wallet
     * @return treasuryWallet Treasury wallet for the token
     * @return totalMinted Total tokens minted for the token
     */
    function tokenConfigs(
        uint256 tokenId
    )
        external
        view
        returns (
            bool isConfigured,
            bool transferable,
            uint256 maxSupply,
            string memory metadata,
            uint256 maxPerWallet,
            address treasuryWallet,
            uint256 totalMinted
        )
    {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];
        return (
            config.isConfigured,
            config.transferable,
            config.maxSupply,
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
     * @notice Returns the current owner address of the contract
     * @dev This address may have special permissions beyond role-based access control
     * @return address The current owner address
     */
    function owner() external view returns (address) {
        return _coreStorage().internalOwner;
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
        // If attempting to recover the payment token, contract must be paused
        if (token == _coreStorage().paymentToken && !paused()) {
            revert PaymentTokenRecoveryNotAllowed();
        }

        SafeERC20.safeTransfer(IERC20(token), to, amount);
        emit TokensRecovered(_msgSender(), token, to, amount);
    }

    /**
     * @notice Returns the metadata URI for a specific token ID
     * @param tokenId ID of the token to get URI for
     * @dev Constructs the URI by concatenating baseURI + tokenId + ".json"
     * @dev Can be overridden by derived contracts to implement different URI logic
     * @return string The complete URI for the token metadata
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return string(abi.encodePacked(_coreStorage().baseURI, tokenId.toString(), ".json"));
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
     * @notice Verify signature for mint operation using EIP-712
     * @param request The MintRequest struct containing all mint parameters
     * @param signature The EIP-712 signature to verify
     * @dev Public view function that can be used to verify signatures off-chain
     * @dev Validates the signature against the MINT_TYPEHASH and DOMAIN_SEPARATOR
     * @dev Reverts if:
     *      - Signature has expired
     *      - Signature is invalid
     *      - Signer doesn't have SIGNER_ROLE
     */
    function verifySignature(MintRequest memory request, bytes memory signature) public view {
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                request.caller,
                request.tokenId,
                request.amount,
                request.price,
                request.deadline,
                request.nonce
            )
        );

        _verifySignature(structHash, signature, request.deadline);
    }

    /**
     * @notice Verify signature for burn and mint operation using EIP-712
     * @param request The BurnAndMintRequest struct containing all operation parameters
     * @param signature The EIP-712 signature to verify
     * @dev Public view function that can be used to verify signatures off-chain
     * @dev Validates the signature against the BURN_AND_MINT_TYPEHASH and DOMAIN_SEPARATOR
     * @dev Reverts if:
     *      - Signature has expired
     *      - Signature is invalid
     *      - Signer doesn't have SIGNER_ROLE
     */
    function verifyBurnAndMintSignature(BurnAndMintRequest memory request, bytes memory signature) public view {
        bytes32 structHash = keccak256(
            abi.encode(
                BURN_AND_MINT_TYPEHASH,
                request.caller,
                request.burnId,
                request.burnAmount,
                request.mintId,
                request.mintAmount,
                request.deadline,
                request.nonce
            )
        );

        _verifySignature(structHash, signature, request.deadline);
    }

    /**
     * @notice Verify signature for batch mint operation using EIP-712
     * @param request The BatchMintRequest struct containing all batch mint parameters
     * @param signature The EIP-712 signature to verify
     * @dev Public view function that can be used to verify batch signatures off-chain
     * @dev Validates the signature against the BATCH_MINT_TYPEHASH and DOMAIN_SEPARATOR
     * @dev Reverts if:
     *      - Signature has expired
     *      - Signature is invalid
     *      - Signer doesn't have SIGNER_ROLE
     */
    function verifyBatchSignature(BatchMintRequest memory request, bytes memory signature) public view {
        bytes32 structHash = keccak256(
            abi.encode(
                BATCH_MINT_TYPEHASH,
                request.caller,
                keccak256(abi.encodePacked(request.tokenIds)),
                keccak256(abi.encodePacked(request.amounts)),
                keccak256(abi.encodePacked(request.prices)),
                request.deadline,
                request.nonce
            )
        );

        _verifySignature(structHash, signature, request.deadline);
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
     *      - Token is non-transferable AND
     *      - Sender is not whitelisted AND
     *      - Sender is not ADMIN_ROLE or OPERATOR_ROLE
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
     * @dev Internal helper function to process a single mint operation
     * @param caller The address calling the mint function
     * @param tokenId The token ID to mint
     * @param amount The amount to mint
     * @param price The price to pay
     * @param deadline The signature deadline
     * @param signature The EIP-712 signature
     */
    function _processSingleMint(
        address caller,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes calldata signature
    ) private {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        MintRequest memory request = MintRequest({
            caller: caller,
            tokenId: tokenId,
            amount: amount,
            price: price,
            deadline: deadline,
            nonce: _userStorage().nonces[caller]++
        });

        verifySignature(request, signature);

        _checkMaxPerWallet(tokenId, caller, amount);
        _checkMaxSupply(tokenId, amount);

        // Update minted amount for wallet
        config.mintedPerWallet[caller] += amount;

        address treasury = config.treasuryWallet;
        if (treasury == address(0)) {
            treasury = _coreStorage().defaultTreasuryWallet;
        }
        SafeERC20.safeTransferFrom(IERC20(_coreStorage().paymentToken), caller, treasury, price);
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
    function _verifySignature(bytes32 hash, bytes memory signature, uint256 deadline) private view {
        if (block.timestamp > deadline) {
            revert SignatureExpired();
        }

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
     * @notice Helper function to check if minting would exceed max supply
     * @param tokenId The token ID to check
     * @param amount The amount to mint
     * @dev Used internally before any mint operation
     * @dev Reverts if:
     *      - Token has a max supply (> 0) and
     *      - Current supply + amount would exceed max supply
     */
    function _checkMaxSupply(uint256 tokenId, uint256 amount) private {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];
        // update the config total minted and check if it exceeds the max supply
        config.totalMinted += amount;
        if (config.maxSupply > 0) {
            if (config.totalMinted > config.maxSupply) {
                revert MaxSupplyExceeded(tokenId);
            }
        }
    }

    /**
     * @notice Helper function to check if minting would exceed max per wallet
     * @param tokenId The token ID to check
     * @param to The recipient address
     * @param amount The amount to mint
     * @dev Used internally before user mint operations
     * @dev Reverts if:
     *      - Current wallet balance + amount would exceed max per wallet
     * @dev Skips check if maxPerWallet is 0 (unlimited)
     */
    function _checkMaxPerWallet(uint256 tokenId, address to, uint256 amount) private view {
        TokenConfig storage config = _tokenStorage().tokenConfigs[tokenId];
        // Skip check if maxPerWallet is 0 (unlimited)
        if (config.maxPerWallet > 0 && config.mintedPerWallet[to] + amount > config.maxPerWallet) {
            revert ExceedsMaxPerWallet(tokenId, to, amount, config.maxPerWallet);
        }
    }
}
