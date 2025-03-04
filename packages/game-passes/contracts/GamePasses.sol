// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SandboxPasses1155Upgradeable
 * @notice An upgradeable ERC1155 contract with AccessControl-based permissions,
 *         supply tracking, forced burns, burn-and-mint, and EIP-2981 royalties.
 */

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

contract SandboxPasses1155Upgradeable is
    Initializable,
    ERC2771HandlerUpgradeable,
    AccessControlUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC2981Upgradeable,
    PausableUpgradeable
{
    using Strings for uint256;

    // =============================================================
    //                           Errors
    // =============================================================

    /// @dev Revert when a non-transferable token is attempted to be transferred.
    error NonTransferable(uint256 tokenId);
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
    /// @dev Revert when invalid caller doesn't match from address
    error InvalidSender(address from, address caller);
    /// @dev Revert when signature expired
    error SignatureExpired();
    /// @dev Revert when invalid signature
    error InvalidSignature();
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
    /// @dev Revert when max per wallet is zero
    error ZeroMaxPerWallet();
    /// @dev Revert when payment token is invalid
    error InvalidPaymentToken();
    /// @dev Revert when trying to recover payment token while contract is active
    error PaymentTokenRecoveryNotAllowed();

    // =============================================================
    //                           Roles
    // =============================================================

    /// @dev The role that is allowed to upgrade the contract and manage admin-level operations.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    /// @dev The role that is allowed to sign minting operations
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    /// @dev The role that is allowed to consume tokens
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // =============================================================
    //                           Events
    // =============================================================

    /// @notice Emitted when the base URI is updated.
    event BaseURISet(string oldURI, string newURI);
    /// @notice Emitted when a token is configured.
    event TokenConfigured(
        uint256 indexed tokenId,
        bool transferable,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string metadata,
        address treasuryWallet
    );
    /// @notice Emitted when a token configuration is updated.
    event TokenConfigUpdated(
        uint256 indexed tokenId,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string metadata,
        address treasuryWallet
    );
    /// @notice Emitted when a token's transferability is updated.
    event TransferabilityUpdated(uint256 indexed tokenId, bool transferable);
    /// @notice Emitted when transfer whitelist is updated.
    event TransferWhitelistUpdated(uint256 indexed tokenId, address indexed account, bool allowed);
    /// @notice Emitted when tokens are recovered from the contract.
    event TokensRecovered(address token, address recipient, uint256 amount);

    // =============================================================
    //                     Structs
    // =============================================================

    /// @dev Struct to hold token configuration
    struct TokenConfig {
        bool isConfigured;
        bool transferable;
        uint256 maxSupply; // 0 for open edition
        string metadata;
        uint256 maxPerWallet; // max tokens that can be minted per wallet
        address treasuryWallet; // specific treasury wallet for this token
        mapping(address => uint256) mintedPerWallet; // track mints per wallet
        mapping(address => bool) transferWhitelist; // whitelist for transfers
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

    // =============================================================
    //                      State Variables
    // =============================================================

    /// @dev Mapping of token configurations
    mapping(uint256 => TokenConfig) public tokenConfigs;

    /**
     * @dev Base URI for computing {uri}.
     *      The final token URI is constructed as `string(abi.encodePacked(baseURI, tokenId, ".json"))`.
     */
    string public baseURI;

    /// @dev Default treasury wallet
    address public defaultTreasuryWallet;

    /// @dev Payment token
    address public paymentToken;

    // =============================================================
    //                      EIP-712 Constants
    // =============================================================

    /// @dev EIP-712 domain typehash
    bytes32 public constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
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

    // Track nonces for replay protection
    mapping(address => uint256) public nonces;

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
     * @param _trustedForwarder Address of the trusted meta-transaction forwarder.
     * @param _defaultTreasury Address of the default treasury wallet.
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
        address _defaultTreasury
    ) public initializer {
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
        paymentToken = _paymentToken;
        baseURI = _baseURI;
        defaultTreasuryWallet = _defaultTreasury;
        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("SandboxPasses1155")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // =============================================================
    //                      External & Public Functions
    // =============================================================

    /**
     * @notice Mints tokens with a valid EIP-712 signature, requiring payment in the configured token
     * @param from Address that will receive the tokens (must be same as msg.sender)
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
        address from,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes memory signature
    ) external whenNotPaused {
        address caller = _msgSender();

        if (from != caller) {
            revert InvalidSender(from, caller);
        }

        TokenConfig storage config = tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }
        MintRequest memory request = MintRequest({
            caller: caller,
            tokenId: tokenId,
            amount: amount,
            price: price,
            deadline: deadline,
            nonce: nonces[caller]++
        });

        verifySignature(request, signature);
        _checkMaxPerWallet(tokenId, caller, amount);
        _checkMaxSupply(tokenId, amount);

        // Update minted amount for wallet
        config.mintedPerWallet[caller] += amount;

        // Transfer payment
        address treasury = config.treasuryWallet != address(0) ? config.treasuryWallet : defaultTreasuryWallet;
        SafeERC20.safeTransferFrom(IERC20(paymentToken), _msgSender(), treasury, price);

        // Mint tokens
        _mint(caller, tokenId, amount, "");
    }

    /**
     * @notice Batch mints multiple tokens with valid EIP-712 signatures in a single transaction
     * @param from Address that will receive the tokens (must be same as msg.sender)
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of amounts to mint for each token ID
     * @param prices Array of prices to pay for each mint operation
     * @param deadlines Array of timestamps after which each signature becomes invalid
     * @param signatures Array of EIP-712 signatures from authorized signers
     * @dev Processes multiple mint operations in batch, verifying each signature
     * @dev All array parameters must be the same length
     * @dev Updates per-wallet minting counts and transfers payments to appropriate treasuries
     * @dev Reverts if:
     *      - Contract is paused
     *      - Array lengths don't match
     *      - Any token is not configured
     *      - Any signature is invalid or expired
     *      - Any max supply would be exceeded
     *      - Any max per wallet would be exceeded
     *      - Any payment transfer fails
     */
    function batchMint(
        address from,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256[] calldata prices,
        uint256[] calldata deadlines,
        bytes[] calldata signatures
    ) external whenNotPaused {
        address caller = _msgSender();

        if (from != caller) {
            revert InvalidSender(from, caller);
        }

        if (
            tokenIds.length != amounts.length ||
            amounts.length != prices.length ||
            prices.length != deadlines.length ||
            deadlines.length != signatures.length
        ) {
            revert ArrayLengthMismatch();
        }

        // Process each mint separately to avoid stack depth issues
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _processSingleMint(caller, tokenIds[i], amounts[i], prices[i], deadlines[i], signatures[i]);
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
        TokenConfig storage config = tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        _checkMaxSupply(tokenId, amount);

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

        for (uint256 i = 0; i < ids.length; i++) {
            TokenConfig storage config = tokenConfigs[ids[i]];

            if (!config.isConfigured) {
                revert TokenNotConfigured(ids[i]);
            }

            _checkMaxSupply(ids[i], amounts[i]);
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

        for (uint256 i = 0; i < ids.length; i++) {
            TokenConfig storage config = tokenConfigs[ids[i]];

            if (!config.isConfigured) {
                revert TokenNotConfigured(ids[i]);
            }

            _checkMaxSupply(ids[i], amounts[i]);

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
        TokenConfig storage mintConfig = tokenConfigs[mintTokenId];

        if (!mintConfig.isConfigured) {
            revert TokenNotConfigured(mintTokenId);
        }

        _checkMaxSupply(mintTokenId, mintAmount);

        // Burn first
        _burn(burnFrom, burnTokenId, burnAmount);

        // Then mint
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
        for (uint256 i = 0; i < mintTokenIds.length; i++) {
            TokenConfig storage mintConfig = tokenConfigs[mintTokenIds[i]];

            if (!mintConfig.isConfigured) {
                revert TokenNotConfigured(mintTokenIds[i]);
            }

            _checkMaxSupply(mintTokenIds[i], mintAmounts[i]);
        }

        // Burn tokens first
        _burnBatch(burnFrom, burnTokenIds, burnAmounts);

        // Then mint new tokens
        _mintBatch(mintTo, mintTokenIds, mintAmounts, "");
    }

    /**
     * @notice Allows users to burn their tokens and mint new ones with a valid EIP-712 signature
     * @param from Address to burn from and mint to (must be msg.sender)
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
        address from,
        uint256 burnId,
        uint256 burnAmount,
        uint256 mintId,
        uint256 mintAmount,
        uint256 deadline,
        bytes memory signature
    ) external whenNotPaused {
        address caller = _msgSender();

        if (from != caller) {
            revert InvalidSender(from, caller);
        }

        TokenConfig storage burnConfig = tokenConfigs[burnId];
        if (!burnConfig.isConfigured) {
            revert BurnMintNotConfigured(burnId);
        }

        // Check if mint token is configured and respects max supply
        TokenConfig storage mintConfig = tokenConfigs[mintId];
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
            nonce: nonces[caller]++
        });

        verifyBurnAndMintSignature(request, signature);

        _checkMaxSupply(mintId, mintAmount);

        // Burn first
        _burn(caller, burnId, burnAmount);

        // Then mint new token
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
        TokenConfig storage config = tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        for (uint256 i = 0; i < accounts.length; i++) {
            config.transferWhitelist[accounts[i]] = allowed;
            emit TransferWhitelistUpdated(tokenId, accounts[i], allowed);
        }
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
        TokenConfig storage config = tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        config.transferable = transferable;
        emit TransferabilityUpdated(tokenId, transferable);
    }

    /**
     * @notice Configure a new token with its properties and restrictions
     * @param tokenId The token ID to configure
     * @param transferable Whether the token can be transferred between users
     * @param maxSupply Maximum supply (0 for unlimited/open edition)
     * @param maxPerWallet Maximum tokens that can be minted per wallet
     * @param metadata Token metadata string (typically IPFS hash or other identifier)
     * @param treasuryWallet Specific treasury wallet for this token (or address(0) for default)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Cannot configure a token that has already been configured
     * @dev Sets initial configuration for a new token ID
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is already configured
     *      - maxPerWallet is 0
     */
    function configureToken(
        uint256 tokenId,
        bool transferable,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string memory metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];

        if (config.isConfigured) {
            revert TokenAlreadyConfigured(tokenId);
        }

        // Ensure maxPerWallet is not zero
        if (maxPerWallet == 0) revert ZeroMaxPerWallet();

        config.isConfigured = true;
        config.transferable = transferable;
        config.maxSupply = maxSupply;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;

        emit TokenConfigured(tokenId, transferable, maxSupply, maxPerWallet, metadata, treasuryWallet);
    }

    /**
     * @notice Update existing token configuration
     * @param tokenId The token ID to update
     * @param maxSupply New maximum supply (0 for open edition)
     * @param maxPerWallet New maximum tokens per wallet
     * @param metadata New metadata string (typically IPFS hash)
     * @param treasuryWallet New treasury wallet (or address(0) for default)
     * @dev Only callable by addresses with ADMIN_ROLE
     * @dev Token must be already configured
     * @dev Cannot decrease maxSupply below current supply
     * @dev Reverts if:
     *      - Caller doesn't have ADMIN_ROLE
     *      - Token is not configured
     *      - New maxSupply is less than current supply
     *      - maxPerWallet is 0
     */
    function updateTokenConfig(
        uint256 tokenId,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string memory metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        // Ensure maxPerWallet is not zero
        if (maxPerWallet == 0) revert ZeroMaxPerWallet();

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

        emit TokenConfigUpdated(tokenId, maxSupply, maxPerWallet, metadata, treasuryWallet);
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
    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        emit BaseURISet(baseURI, newBaseURI);
        baseURI = newBaseURI;
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
     * @notice Check if an address is whitelisted for token transfers
     * @param tokenId The token ID to check
     * @param account The address to check whitelist status for
     * @dev Used to verify if an address can transfer a non-transferable token
     * @dev Returns false if token is not configured
     * @return bool True if the address is whitelisted for transfers, false otherwise
     */
    function isTransferWhitelisted(uint256 tokenId, address account) public view returns (bool) {
        return tokenConfigs[tokenId].transferWhitelist[account];
    }

    // =============================================================
    //                  Private and Internal Functions
    // =============================================================

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
        TokenConfig storage config = tokenConfigs[tokenId];

        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        MintRequest memory request = MintRequest({
            caller: caller,
            tokenId: tokenId,
            amount: amount,
            price: price,
            deadline: deadline,
            nonce: nonces[caller]++
        });

        verifySignature(request, signature);

        _checkMaxPerWallet(tokenId, caller, amount);
        _checkMaxSupply(tokenId, amount);

        // Update minted amount for wallet
        config.mintedPerWallet[caller] += amount;

        address treasury = config.treasuryWallet;
        if (treasury == address(0)) {
            treasury = defaultTreasuryWallet;
        }
        SafeERC20.safeTransferFrom(IERC20(paymentToken), caller, treasury, price);
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

        bytes32 finalHash = MessageHashUtils.toTypedDataHash(DOMAIN_SEPARATOR, hash);

        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(finalHash, signature);
        if (err != ECDSA.RecoverError.NoError) {
            revert InvalidSignature();
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
    function _checkMaxSupply(uint256 tokenId, uint256 amount) private view {
        TokenConfig storage config = tokenConfigs[tokenId];
        if (config.maxSupply > 0) {
            if (totalSupply(tokenId) + amount > config.maxSupply) {
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
     */
    function _checkMaxPerWallet(uint256 tokenId, address to, uint256 amount) private view {
        TokenConfig storage config = tokenConfigs[tokenId];
        if (config.mintedPerWallet[to] + amount > config.maxPerWallet) {
            revert ExceedsMaxPerWallet(tokenId, to, amount, config.maxPerWallet);
        }
    }

    // =============================================================
    //                   Royalties (ERC2981)
    // =============================================================

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

    // =============================================================
    //                   ERC1155 Overrides
    // =============================================================

    /**
     * @notice Returns the metadata URI for a specific token ID
     * @param tokenId ID of the token to get URI for
     * @dev Constructs the URI by concatenating baseURI + tokenId + ".json"
     * @dev Can be overridden by derived contracts to implement different URI logic
     * @return string The complete URI for the token metadata
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

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
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId = ids[i];
                TokenConfig storage config = tokenConfigs[tokenId];

                if (
                    !config.transferable &&
                    !config.transferWhitelist[from] &&
                    !hasRole(ADMIN_ROLE, _msgSender()) &&
                    !hasRole(OPERATOR_ROLE, _msgSender())
                ) {
                    revert TransferNotAllowed(tokenId);
                }
            }
        }

        super._update(from, to, ids, values);
    }

    // =============================================================
    //                   ERC165 / ERC2981 Overrides
    // =============================================================

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
    //                   Context Overrides
    // =============================================================

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

    // =============================================================
    //                   Pausable Functions
    // =============================================================

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

    // =============================================================
    //                   Recovery Functions
    // =============================================================

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
        if (token == paymentToken && !paused()) {
            revert PaymentTokenRecoveryNotAllowed();
        }

        SafeERC20.safeTransfer(IERC20(token), to, amount);
        emit TokensRecovered(token, to, amount);
    }
}
