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

contract SandboxPasses1155Upgradeable is
    Initializable,
    ERC2771HandlerUpgradeable,
    AccessControlUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC2981Upgradeable
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
        uint256 maxSupply;
        string metadata;
        uint256 burnToMintId;
        address premintWallet; // Add wallet for preminting
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
     */
    function initialize(
        string memory _baseURI,
        address _royaltyReceiver,
        uint96 _royaltyFeeNumerator,
        address _admin,
        address _trustedForwarder
    ) public initializer {
        __ERC2771Handler_init(_trustedForwarder);
        __AccessControl_init();
        __ERC1155_init(_baseURI);
        __ERC1155Supply_init();
        __ERC2981_init();

        // Set up AccessControl roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin); // Default admin
        _grantRole(ADMIN_ROLE, _admin); // Custom admin role

        // Set the base URI
        baseURI = _baseURI;

        // Set default royalty info (applies to all token IDs unless otherwise specified)
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

        // Prevent minting of preminted tokens
        if (config.premintWallet != address(0)) {
            revert MintingNotAllowed(tokenId);
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

            // Prevent minting of preminted tokens
            if (config.premintWallet != address(0)) {
                revert MintingNotAllowed(ids[i]);
            }

            if (totalSupply(ids[i]) + amounts[i] > config.maxSupply) {
                revert MaxSupplyExceeded(ids[i]);
            }
        }
        _mintBatch(to, ids, amounts, "");
    }

    /**
     * @notice Forcibly burn tokens from a user's address.
     * @dev    Useful to “shutdown” or punish cheaters.
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
     * @dev    Can be used for an “upgrade” or “transform” mechanic.
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
        if (!burnConfig.isConfigured || burnConfig.burnToMintId != mintId) {
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
     * @notice Update transferability for a given token ID.
     * @dev    If you want to “lock” a pass after it’s used, set `transferable` to false.
     * @param tokenId The token ID to update.
     * @param transferable New transferability status.
     */
    function setTransferable(uint256 tokenId, bool transferable) external onlyRole(ADMIN_ROLE) {
        isTransferable[tokenId] = transferable;
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

    /**
     * @notice Update token configuration values
     * @param tokenId The token ID to update
     * @param maxSupply New maximum supply
     * @param metadata New metadata
     * @param burnToMintId Token ID that can be burned to mint this token
     */
    function updateTokenConfig(
        uint256 tokenId,
        uint256 maxSupply,
        string memory metadata,
        uint256 burnToMintId
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];
        if (!config.isConfigured) {
            revert TokenNotConfigured(tokenId);
        }

        // If token was preminted, cannot decrease max supply below current supply
        if (config.premintWallet != address(0)) {
            uint256 currentSupply = totalSupply(tokenId);
            if (maxSupply < currentSupply) {
                revert CannotDecreaseMaxSupply(tokenId, currentSupply, maxSupply);
            }

            // If increasing max supply, mint difference to premint wallet
            if (maxSupply > config.maxSupply) {
                uint256 additionalSupply = maxSupply - config.maxSupply;
                _mint(config.premintWallet, tokenId, additionalSupply, "");
            }
        }

        config.maxSupply = maxSupply;
        config.metadata = metadata;
        config.burnToMintId = burnToMintId;
    }

    /**
     * @notice Configure a new token with optional preminting
     * @param tokenId The token ID to configure
     * @param transferable Whether the token can be transferred
     * @param maxSupply Maximum supply of the token
     * @param metadata Token metadata
     * @param burnToMintId Token ID that can be burned to mint this token
     * @param premintWallet Address to premint tokens to (address(0) for no preminting)
     */
    function configureToken(
        uint256 tokenId,
        bool transferable,
        uint256 maxSupply,
        string memory metadata,
        uint256 burnToMintId,
        address premintWallet
    ) external onlyRole(ADMIN_ROLE) {
        TokenConfig storage config = tokenConfigs[tokenId];
        if (config.isConfigured) {
            revert TokenAlreadyConfigured(tokenId);
        }

        config.isConfigured = true;
        config.transferable = transferable;
        config.maxSupply = maxSupply;
        config.metadata = metadata;
        config.burnToMintId = burnToMintId;
        config.premintWallet = premintWallet;
        isTransferable[tokenId] = transferable;

        // If premintWallet is specified, mint the full supply
        if (premintWallet != address(0)) {
            _mint(premintWallet, tokenId, maxSupply, "");
        }
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
                if (!isTransferable[tokenId]) {
                    // If it's not transferable, revert
                    revert NonTransferable(tokenId);
                }
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
}
