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
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

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
    /// @dev Revert when trying to decrease max supply below current supply for preminted tokens
    error CannotDecreaseMaxSupply(uint256 tokenId, uint256 currentSupply, uint256 requestedSupply);
    /// @dev Revert when trying to mint a preminted token
    error MintingNotAllowed(uint256 tokenId);

    // =============================================================
    //                           Roles
    // =============================================================

    /// @dev The role that is allowed to upgrade the contract and manage admin-level operations.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    /// @dev The role that is allowed to sign minting operations
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    /// @dev The role that is allowed to consume tokens
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    /// @dev Signature validity duration (5 minutes)
    uint256 public constant SIGNATURE_VALIDITY = 5 minutes;

    // =============================================================
    //                           Events
    // =============================================================

    /// @notice Emitted when the base URI is updated.
    event BaseURISet(string oldURI, string newURI);

    // =============================================================
    //                      State Variables
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

    /// @dev Mapping of token configurations
    mapping(uint256 => TokenConfig) public tokenConfigs;

    /**
     * @dev Mapping to determine if a token ID is freely transferable by users.
     *      - true => transferable
     *      - false => soulbound (non-transferable by users)
     */
    mapping(uint256 => bool) public isTransferable;

    /**
     * @dev Base URI for computing {uri}.
     *      The final token URI is constructed as `string(abi.encodePacked(baseURI, tokenId, ".json"))`.
     */
    string public baseURI;

    /// @dev Default treasury wallet
    address public defaultTreasuryWallet;

    /// @dev Mapping to track used signatures
    mapping(bytes32 => bool) public usedSignatures;

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
        address _trustedForwarder,
        address _defaultTreasury
    ) public initializer {
        __ERC2771Handler_init(_trustedForwarder);
        __AccessControl_init();
        __ERC1155_init(_baseURI);
        __ERC1155Supply_init();
        __ERC2981_init();
        __Pausable_init();

        // Set up AccessControl roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        baseURI = _baseURI;
        defaultTreasuryWallet = _defaultTreasury;
        _setDefaultRoyalty(_royaltyReceiver, _royaltyFeeNumerator);
    }

    // =============================================================
    //                      External Functions
    // =============================================================

    /**
     * @notice Mint a given amount of a specific token ID to a specified address.
     * @dev    If this is the first mint of `tokenId`, define its transferability.
     * @param to Address to which the tokens will be minted.
     * @param tokenId ID of the token type to mint.
     * @param amount Number of tokens to mint.
     */
    function mint(address to, uint256 tokenId, uint256 amount) external {
        TokenConfig storage config = tokenConfigs[tokenId];
        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        if (totalSupply(tokenId) + amount > config.maxSupply) {
            revert MaxSupplyExceeded(tokenId);
        }

        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Batch mint for efficiency.
     * @dev    Each index in `transferableList` corresponds to the same index in `ids`.
     * @param to Address to which the tokens will be minted.
     * @param ids Array of token IDs.
     * @param amounts Array of amounts to mint.
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external {
        for (uint256 i = 0; i < ids.length; i++) {
            TokenConfig storage config = tokenConfigs[ids[i]];
            if (!config.isConfigured) {
                revert TokenNotConfigured(ids[i]);
            }

            if (totalSupply(ids[i]) + amounts[i] > config.maxSupply) {
                revert MaxSupplyExceeded(ids[i]);
            }
        }
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice Forcibly burn tokens from a user's address.
     * @dev    Useful to "shutdown" or punish cheaters.
     * @param account The address whose tokens are burned.
     * @param tokenId The token ID to burn.
     * @param amount The number of tokens to burn.
     */
    function adminBurn(address account, uint256 tokenId, uint256 amount) external onlyRole(ADMIN_ROLE) {
        _burn(account, tokenId, amount);
    }

    /**
     * @notice Forcibly burn multiple tokens from a user's address.
     * @dev    Batch version of adminBurn for gas efficiency.
     * @param account The address whose tokens are burned.
     * @param ids Array of token IDs to burn.
     * @param amounts Array of amounts to burn.
     */
    function adminBatchBurn(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(ADMIN_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /**
     * @notice Burn `burnAmount` of tokenId `burnId` from `account`, then mint `mintAmount` of tokenId `mintId` to `account`.
     * @dev    Can be used for an "upgrade" or "transform" mechanic.
     * @param account The user wallet to burn from and mint to.
     * @param burnId ID of the token to burn.
     * @param burnAmount Number of tokens to burn.
     * @param mintId ID of the token to mint.
     * @param mintAmount Number of tokens to mint.
     */
    function burnAndMint(
        address account,
        uint256 burnId,
        uint256 burnAmount,
        uint256 mintId,
        uint256 mintAmount
    ) external {
        TokenConfig storage burnConfig = tokenConfigs[burnId];
        if (!burnConfig.isConfigured) {
            revert BurnMintNotConfigured(burnId);
        }

        // Check if mint token is configured and respects max supply
        TokenConfig storage mintConfig = tokenConfigs[mintId];
        if (!mintConfig.isConfigured) {
            revert TokenNotConfigured(mintId);
        }

        if (totalSupply(mintId) + mintAmount > mintConfig.maxSupply) {
            revert MaxSupplyExceeded(mintId);
        }

        // Burn first
        _burn(account, burnId, burnAmount);

        // Then mint new token
        _mint(account, mintId, mintAmount, "");
    }

    /**
     * @notice Configure a new token
     * @param tokenId The token ID to configure
     * @param transferable Whether the token can be transferred
     * @param maxSupply Maximum supply (0 for open edition)
     * @param maxPerWallet Maximum tokens that can be minted per wallet
     * @param metadata Token metadata
     * @param treasuryWallet Specific treasury wallet for this token (or address(0) for default)
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
        require(!config.isConfigured, "Token already configured");

        config.isConfigured = true;
        config.transferable = transferable;
        config.maxSupply = maxSupply;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;

        // Set initial transferability state
        isTransferable[tokenId] = transferable;
    }

    /**
     * @notice Update existing token configuration
     * @param tokenId The token ID to update
     * @param maxSupply New maximum supply (0 for open edition)
     * @param maxPerWallet New maximum tokens per wallet
     * @param metadata New metadata
     * @param treasuryWallet New treasury wallet (or address(0) for default)
     */
    function updateTokenConfig(
        uint256 tokenId,
        uint256 maxSupply,
        uint256 maxPerWallet,
        string memory metadata,
        address treasuryWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];
        require(config.isConfigured, "Token not configured");

        // Cannot decrease maxSupply below current supply
        if (maxSupply > 0) {
            uint256 currentSupply = totalSupply(tokenId);
            require(maxSupply >= currentSupply, "Cannot decrease below current supply");
        }

        config.maxSupply = maxSupply;
        config.maxPerWallet = maxPerWallet;
        config.metadata = metadata;
        config.treasuryWallet = treasuryWallet;
    }

    /**
     * @notice Add or remove addresses from token transfer whitelist
     * @param tokenId The token ID to update whitelist for
     * @param accounts Array of addresses to update
     * @param allowed Whether the addresses should be allowed to transfer
     */
    function updateTransferWhitelist(
        uint256 tokenId,
        address[] calldata accounts,
        bool allowed
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];
        require(config.isConfigured, "Token not configured");

        for (uint256 i = 0; i < accounts.length; i++) {
            config.transferWhitelist[accounts[i]] = allowed;
        }
    }

    /**
     * @notice Update transferability for a given token ID
     * @param tokenId The token ID to update
     * @param transferable New transferability status
     */
    function setTransferable(uint256 tokenId, bool transferable) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];
        require(config.isConfigured, "Token not configured");

        config.transferable = transferable;
        isTransferable[tokenId] = transferable;
    }

    /**
     * @notice Check if an address is whitelisted for token transfers
     * @param tokenId The token ID to check
     * @param account The address to check
     * @return bool Whether the address is whitelisted
     */
    function isTransferWhitelisted(uint256 tokenId, address account) public view returns (bool) {
        return tokenConfigs[tokenId].transferWhitelist[account];
    }

    /**
     * @notice Set the base URI for token metadata.
     *         The metadata URI is built as `baseURI + tokenId + ".json"`.
     * @param newBaseURI The new base URI.
     */
    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        emit BaseURISet(baseURI, newBaseURI);
        baseURI = newBaseURI;
    }

    // =============================================================
    //                   Royalties (ERC2981)
    // =============================================================

    /**
     * @notice Sets the default royalty info (applies to all token IDs).
     * @param receiver Address that will receive the royalties.
     * @param feeNumerator Royalty amount in basis points (1% = 100).
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyRole(ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Sets royalty info for a specific token ID, overriding default royalty.
     * @param tokenId ID of the token.
     * @param receiver Address that will receive the royalties.
     * @param feeNumerator Royalty amount in basis points.
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyRole(ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    // =============================================================
    //                   ERC1155 Overrides
    // =============================================================

    /**
     * @notice Override to define token-specific metadata URIs if desired.
     *         Currently, returns `baseURI + tokenId + ".json"`.
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Hook to enforce transfer restrictions on soulbound tokens.
     *      This is triggered on all ERC1155 transfers (mint, burn, or user transfer).
     * @param from Source address
     * @param to Destination address
     * @param ids Array of token IDs being transferred
     * @param values Array of transfer amounts
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // If not a mint (from == address(0)) and not a burn (to == address(0)), enforce transferability
        if (from != address(0) && to != address(0)) {
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId = ids[i];
                TokenConfig storage config = tokenConfigs[tokenId];

                require(
                    config.transferable ||
                        config.transferWhitelist[from] ||
                        config.transferWhitelist[to] ||
                        hasRole(ADMIN_ROLE, _msgSender()),
                    "Transfer not allowed"
                );
            }
        }

        super._update(from, to, ids, values);
    }

    // =============================================================
    //                   ERC165 / ERC2981 Overrides
    // =============================================================

    /**
     * @notice Supports interface for ERC1155, ERC2981, AccessControl, etc.
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
     * @notice Override _msgSender and _msgData from Context
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
     * @notice Verify signature for minting operation
     * @param signer The address that signed the message
     * @param to Recipient of the tokens
     * @param tokenId Token ID to mint
     * @param amount Amount to mint
     * @param price Price in wei
     * @param deadline Signature expiration timestamp
     * @param signature The signature to verify
     */
    function verifySignature(
        address signer,
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes memory signature
    ) public view returns (bool) {
        require(hasRole(SIGNER_ROLE, signer), "Invalid signer");
        require(block.timestamp <= deadline, "Signature expired");

        bytes32 hash = keccak256(abi.encodePacked(to, tokenId, amount, price, deadline, address(this)));

        bytes32 message = MessageHashUtils.toEthSignedMessageHash(hash);
        return SignatureChecker.isValidSignatureNow(signer, message, signature);
    }

    /**
     * @notice Mint tokens with a valid signature
     * @param to Recipient of the tokens
     * @param tokenId Token ID to mint
     * @param amount Amount to mint
     * @param price Price in wei
     * @param deadline Signature expiration timestamp
     * @param signature The signature to verify
     */
    function mintWithSignature(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes memory signature
    ) external payable whenNotPaused {
        TokenConfig storage config = tokenConfigs[tokenId];
        require(config.isConfigured, "Token not configured");
        require(msg.value >= price, "Insufficient payment");

        // Verify signature hasn't been used
        bytes32 sigHash = keccak256(abi.encodePacked(signature));
        require(!usedSignatures[sigHash], "Signature already used");
        usedSignatures[sigHash] = true;

        // Check max per wallet
        require(config.mintedPerWallet[to] + amount <= config.maxPerWallet, "Exceeds max per wallet");

        // Check max supply
        if (config.maxSupply > 0) {
            require(totalSupply(tokenId) + amount <= config.maxSupply, "Exceeds max supply");
        }

        // Update minted amount for wallet
        config.mintedPerWallet[to] += amount;

        // Transfer payment to treasury
        address treasury = config.treasuryWallet != address(0) ? config.treasuryWallet : defaultTreasuryWallet;
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Admin mint function - no price, no signature needed
     * @param to Recipient of the tokens
     * @param tokenId Token ID to mint
     * @param amount Amount to mint
     */
    function adminMint(address to, uint256 tokenId, uint256 amount) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];
        require(config.isConfigured, "Token not configured");

        if (config.maxSupply > 0) {
            require(totalSupply(tokenId) + amount <= config.maxSupply, "Exceeds max supply");
        }

        _mint(to, tokenId, amount, "");
    }

    /**
     * @notice Admin batch mint function
     * @param to Recipient of the tokens
     * @param ids Array of token IDs
     * @param amounts Array of amounts
     */
    function adminBatchMint(address to, uint256[] memory ids, uint256[] memory amounts) external onlyRole(ADMIN_ROLE) {
        require(ids.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            TokenConfig storage config = tokenConfigs[ids[i]];
            require(config.isConfigured, "Token not configured");

            if (config.maxSupply > 0) {
                require(totalSupply(ids[i]) + amounts[i] <= config.maxSupply, "Exceeds max supply");
            }
        }

        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice Burn and mint with signature (token transformation)
     * @param burnTokenId Token ID to burn
     * @param burnAmount Amount to burn
     * @param mintTokenId Token ID to mint
     * @param mintAmount Amount to mint
     * @param deadline Signature expiration timestamp
     * @param signature The signature to verify
     */
    function burnAndMintWithSignature(
        uint256 burnTokenId,
        uint256 burnAmount,
        uint256 mintTokenId,
        uint256 mintAmount,
        uint256 deadline,
        bytes memory signature
    ) external whenNotPaused {
        TokenConfig storage mintConfig = tokenConfigs[mintTokenId];
        require(mintConfig.isConfigured, "Mint token not configured");

        // Verify signature hasn't been used
        bytes32 sigHash = keccak256(abi.encodePacked(signature));
        require(!usedSignatures[sigHash], "Signature already used");
        usedSignatures[sigHash] = true;

        // Check max supply for mint token
        if (mintConfig.maxSupply > 0) {
            require(totalSupply(mintTokenId) + mintAmount <= mintConfig.maxSupply, "Exceeds max supply");
        }

        // Burn first
        _burn(_msgSender(), burnTokenId, burnAmount);

        // Then mint
        _mint(_msgSender(), mintTokenId, mintAmount, "");
    }

    /**
     * @notice Consume tokens (admin burn)
     * @param from Address to burn from
     * @param tokenId Token ID to burn
     * @param amount Amount to burn
     */
    function consumeTokens(address from, uint256 tokenId, uint256 amount) external onlyRole(CONSUMER_ROLE) {
        _burn(from, tokenId, amount);
    }

    // =============================================================
    //                   Pausable Functions
    // =============================================================

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}
