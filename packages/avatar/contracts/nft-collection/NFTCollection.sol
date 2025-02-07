// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/utils/ReentrancyGuardUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/access/Ownable2StepUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/utils/ContextUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/utils/PausableUpgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/token/common/ERC2981Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/token/ERC721/ERC721Upgradeable.sol";
import {IERC20} from "@openzeppelin/contracts-5.0.2/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts-5.0.2/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts-5.0.2/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC4906} from "../common/IERC4906.sol";
import {UpdatableOperatorFiltererUpgradeable} from "./UpdatableOperatorFiltererUpgradeable.sol";
import {ERC2771HandlerUpgradeable} from "./ERC2771HandlerUpgradeable.sol";
import {NFTCollectionSignature} from "./NFTCollectionSignature.sol";
import {INFTCollection} from "./INFTCollection.sol";

/**
 * @title NFTCollection
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice Implements an upgradeable ERC721 contract for Avatar NFT collections.
 * @dev Implements the following features:
 * - Upgradeable proxy pattern
 * - Two-step ownership transfer
 * - OpenSea and ERC2981 royalty standards
 * - ERC4906 metadata update notifications
 * - ERC165 interface detection
 * - ERC2771 meta-transaction support
 * - Burn tracking for game access control
 * - ERC20-based minting with approveAndCall pattern
 * - Batch minting and transfer operations
 */
contract NFTCollection is
    ReentrancyGuardUpgradeable,
    Ownable2StepUpgradeable,
    ERC721Upgradeable,
    ERC2981Upgradeable,
    ERC2771HandlerUpgradeable,
    UpdatableOperatorFiltererUpgradeable,
    PausableUpgradeable,
    NFTCollectionSignature,
    IERC4906,
    INFTCollection
{
    /// @custom:storage-location erc7201:thesandbox.storage.avatar.nft-collection.NFTCollection
    struct NFTCollectionStorage {
        /**
         * @notice Maximum supply cap for the collection.
         */
        uint256 maxSupply;
        /**
         * @notice Maximum tokens that can be minted per wallet across all waves.
         */
        uint256 maxTokensPerWallet;
        /**
         * @notice Treasury address receiving minting payments.
         */
        address mintTreasury;
        /**
         * @notice Base URI for token metadata.
         */
        string baseTokenURI;
        /**
         * @notice Array of minting wave configurations.
         */
        WaveData[] waveData;
        /**
         * @notice ERC20 token contract used for minting payments.
         */
        IERC20 allowedToExecuteMint;
        /**
         * @notice Mapping of token personalization traits.
         */
        mapping(uint256 tokenId => uint256 mask) personalizationTraits;
        /**
         * @notice Mapping of tokens minted per address.
         */
        mapping(address wallet => uint256 count) mintedCount;
        /**
         * @notice Current total supply of minted tokens.
         */
        uint256 totalSupply;
        /**
         * @notice Flag controlling token burn functionality.
         */
        bool isBurnEnabled;
    }

    // keccak256(abi.encode(uint256(keccak256("thesandbox.storage.avatar.nft-collection.NFTCollection")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant NFT_COLLECTION_STORAGE_LOCATION =
        0x54137d560768c3c24834e09621a4fafd063f4a5812823197e84bcd3fbaff7d00;

    function _getNFTCollectionStorage() private pure returns (NFTCollectionStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := NFT_COLLECTION_STORAGE_LOCATION
        }
    }

    /**
     * @notice Mitigates a possible Implementation contract takeover, as indicated by
     *         https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the NFT collection with configuration parameters.
     * @param params Struct containing all initialization parameters, see InitializationParams for details.
     * @dev External initialization entry point following the upgradeable pattern.
     */
    function initialize(InitializationParams calldata params) external virtual initializer {
        __NFTCollection_init(params);
    }

    /**
     * @notice Internal initialization logic for the NFT collection.
     * @param params Struct containing all initialization parameters, see InitializationParams for details.
     * @dev Initializes all inherited contracts and sets initial configuration values.
     */
    function __NFTCollection_init(InitializationParams calldata params) internal onlyInitializing {
        if (bytes(params.name).length == 0) {
            revert InvalidName(params.name);
        }
        if (bytes(params.symbol).length == 0) {
            revert InvalidSymbol(params.symbol);
        }
        __ReentrancyGuard_init();
        __Ownable_init(params.collectionOwner);
        __ERC2981_init();
        _setTrustedForwarder(params.initialTrustedForwarder);
        __ERC721_init(params.name, params.symbol);
        __Pausable_init();
        _setBaseURI(params.initialBaseURI);
        _setTreasury(params.mintTreasury);
        _setSignAddress(params.signAddress);
        _setAllowedExecuteMint(params.allowedToExecuteMint);
        _setMaxSupply(params.maxSupply);
        _setMaxTokensPerWallet(params.maxTokensPerWallet);

        emit ContractInitialized(
            params.initialBaseURI,
            params.name,
            params.symbol,
            params.mintTreasury,
            params.signAddress,
            params.allowedToExecuteMint,
            params.maxSupply,
            params.maxTokensPerWallet
        );
    }

    /**
     * @notice Creates a new minting wave.
     * @param _waveMaxTokensOverall Maximum tokens that can be minted in this wave.
     * @param _waveMaxTokensPerWallet Maximum tokens per wallet for this wave.
     * @param _waveSingleTokenPrice Price per token in wave, denominated in allowedToExecuteMint token.
     * @dev Validates wave parameters against global limits and current supply.
     */
    function setupWave(
        uint256 _waveMaxTokensOverall,
        uint256 _waveMaxTokensPerWallet,
        uint256 _waveSingleTokenPrice
    ) external onlyOwner {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (
            _waveMaxTokensOverall > $.maxSupply ||
            _waveMaxTokensOverall == 0 ||
            _waveMaxTokensPerWallet == 0 ||
            _waveMaxTokensPerWallet > _waveMaxTokensOverall
        ) {
            revert InvalidWaveData(_waveMaxTokensOverall, _waveMaxTokensPerWallet);
        }
        if (_waveMaxTokensPerWallet > $.maxTokensPerWallet) {
            revert WaveMaxTokensHigherThanGlobalMax(_waveMaxTokensPerWallet, $.maxTokensPerWallet);
        }
        uint256 waveIndex = $.waveData.length;
        emit WaveSetup(_msgSender(), _waveMaxTokensOverall, _waveMaxTokensPerWallet, _waveSingleTokenPrice, waveIndex);
        $.waveData.push();
        $.waveData[waveIndex].waveMaxTokensOverall = _waveMaxTokensOverall;
        $.waveData[waveIndex].waveMaxTokensPerWallet = _waveMaxTokensPerWallet;
        $.waveData[waveIndex].waveSingleTokenPrice = _waveSingleTokenPrice;
    }

    /**
     * @notice Mints tokens using the latest wave configuration.
     * @param wallet Address receiving the minted tokens.
     * @param amount Number of tokens to mint.
     * @param signatureId Unique identifier for the minting signature.
     * @param signature Cryptographic signature authorizing the mint.
     * @dev Only callable by allowedToExecuteMint contract. Uses the most recent wave configuration.
     */
    function mint(
        address wallet,
        uint256 amount,
        uint256 signatureId,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        uint256 wavesLength = $.waveData.length;
        if (wavesLength == 0) {
            revert ContractNotConfigured();
        }
        if (_msgSender() != address($.allowedToExecuteMint)) {
            revert ERC721InvalidSender(_msgSender());
        }
        _checkAndSetMintSignature(wallet, signatureId, signature);
        // pick the last wave
        uint256 waveIndex = wavesLength - 1;
        WaveData storage waveData = $.waveData[waveIndex];
        _doMint(waveData, wallet, amount, waveIndex);
    }

    /**
     * @notice Mints tokens using a specific wave configuration.
     * @param wallet Address receiving the minted tokens.
     * @param amount Number of tokens to mint.
     * @param waveIndex Index of the wave configuration to use.
     * @param signatureId Unique identifier for the minting signature.
     * @param signature Cryptographic signature authorizing the mint.
     * @dev Only callable by allowedToExecuteMint contract.
     */
    function waveMint(
        address wallet,
        uint256 amount,
        uint256 waveIndex,
        uint256 signatureId,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if ($.waveData.length == 0) {
            revert ContractNotConfigured();
        }
        if (_msgSender() != address($.allowedToExecuteMint)) {
            revert ERC721InvalidSender(_msgSender());
        }
        _checkAndSetWaveMintSignature(wallet, waveIndex, signatureId, signature);
        WaveData storage waveData = _getWaveData(waveIndex);
        _doMint(waveData, wallet, amount, waveIndex);
    }

    /**
     * @notice Deactivates a minting wave by setting its maximum tokens to zero.
     * @param waveIndex Index of the wave to cancel.
     * @dev Cannot cancel the most recent wave to prevent disruption of mint function.
     */
    function cancelWave(uint256 waveIndex) external onlyOwner {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        /// @dev don't use _getWaveData, we don't want to cancel the last wave by mistake
        if (waveIndex >= $.waveData.length) {
            revert ContractNotConfigured();
        }
        $.waveData[waveIndex].waveMaxTokensOverall = 0;
    }

    /**
     * @notice Performs batch minting for multiple addresses.
     * @param waveIndex Index of the wave configuration to use.
     * @param wallets Array of recipient addresses and mint amounts.
     * @dev Owner-only function for airdrops. Bypasses wave restrictions but respects maxSupply.
     */
    function batchMint(uint256 waveIndex, BatchMintingData[] calldata wallets) external whenNotPaused onlyOwner {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        uint256 len = wallets.length;
        if (len == 0) {
            revert InvalidBatchData();
        }
        if ($.waveData.length == 0) {
            revert ContractNotConfigured();
        }
        for (uint256 i; i < len; i++) {
            uint256 _totalSupply = $.totalSupply;
            address wallet = wallets[i].wallet;
            uint256 amount = wallets[i].amount;
            if (amount == 0) {
                revert CannotMint(MintDenialReason.InvalidAmount, wallet, amount, waveIndex);
            }
            if ($.totalSupply + amount > $.maxSupply) {
                revert CannotMint(MintDenialReason.MaxSupplyExceeded, wallet, amount, waveIndex);
            }
            for (uint256 j; j < amount; j++) {
                // @dev _mint already checks the destination wallet
                // @dev start with tokenId = 1
                _mint(wallet, _totalSupply + j + 1);
                emit WaveMint(_totalSupply + j + 1, wallet, waveIndex);
            }
            $.totalSupply += amount;
        }
    }

    /**
     * @notice Triggers metadata refresh for a specific token.
     * @param tokenId ID of the token to refresh.
     * @param signatureId Unique identifier for the reveal signature.
     * @param signature Cryptographic signature authorizing the reveal.
     * @dev Emits MetadataUpdate for marketplace integration. Caller must be token owner.
     */
    function reveal(uint256 tokenId, uint256 signatureId, bytes calldata signature) external whenNotPaused {
        address sender = _msgSender();
        address owner = ownerOf(tokenId);
        if (owner != sender) {
            revert ERC721IncorrectOwner(sender, tokenId, owner);
        }
        _checkAndSetRevealSignature(sender, signatureId, signature);
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice Updates token traits using a bit mask.
     * @param tokenId ID of the token to personalize.
     * @param personalizationMask Bit mask encoding trait configurations.
     * @param signatureId Unique identifier for the personalization signature.
     * @param signature Cryptographic signature authorizing the personalization.
     * @dev Caller must be token owner. Emits MetadataUpdate event.
     */
    function personalize(
        uint256 tokenId,
        uint256 personalizationMask,
        uint256 signatureId,
        bytes calldata signature
    ) external whenNotPaused {
        address sender = _msgSender();
        address owner = ownerOf(tokenId);
        if (owner != sender) {
            revert ERC721IncorrectOwner(sender, tokenId, owner);
        }
        _checkAndSetPersonalizationSignature(sender, tokenId, personalizationMask, signatureId, signature);
        _updateTokenTraits(tokenId, personalizationMask);
    }

    /**
     * @notice Updates token traits with privileged access.
     * @param tokenId ID of the token to personalize.
     * @param personalizationMask Bit mask encoding trait configurations.
     * @dev Owner-only function for game-driven trait updates.
     */
    function operatorPersonalize(uint256 tokenId, uint256 personalizationMask) external onlyOwner {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        _updateTokenTraits(tokenId, personalizationMask);
    }

    /**
     * @notice Burns a token.
     * @param tokenId ID of the token to burn.
     * @dev Requires burning to be enabled. Caller must own or be approved for token.
     */
    function burn(uint256 tokenId) external whenNotPaused {
        _burnWithCheck(tokenId);
    }

    /**
     * @notice Enables token burning functionality.
     * @dev Reverts if burning is already enabled. Only callable by owner.
     */
    function enableBurning() external onlyOwner {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if ($.isBurnEnabled) {
            revert EnforcedBurn();
        }
        $.isBurnEnabled = true;
        emit TokenBurningEnabled(_msgSender());
    }

    /**
     * @notice Disables token burning functionality.
     * @dev Reverts if burning is already disabled. Only callable by owner.
     */
    function disableBurning() external onlyOwner {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (!$.isBurnEnabled) {
            revert ExpectedBurn();
        }
        $.isBurnEnabled = false;
        emit TokenBurningDisabled(_msgSender());
    }

    /**
     * @notice Pauses all token operations.
     * @dev Reverts if contract is already paused. Only callable by owner.
     */
    function pause() external onlyOwner {
        _requireNotPaused();
        _pause();
    }

    /**
     * @notice Unpauses all token operations.
     * @dev Reverts if contract is not paused. Only callable by owner.
     */
    function unpause() external onlyOwner {
        _requirePaused();
        _unpause();
    }

    /**
     * @notice Updates the treasury address for minting payments.
     * @param treasury New treasury address.
     * @dev Reverts if treasury address is zero. Only callable by owner.
     */
    function setTreasury(address treasury) external onlyOwner {
        _setTreasury(treasury);
    }

    /**
     * @notice Updates the signing address for validating operations.
     * @param _signAddress New signer address.
     * @dev Only callable by owner.
     */
    function setSignAddress(address _signAddress) external onlyOwner {
        _setSignAddress(_signAddress);
    }

    /**
     * @notice Updates the maximum supply cap.
     * @param _maxSupply New maximum token supply.
     * @dev Must be greater than current supply. Only callable by owner.
     */
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        _setMaxSupply(_maxSupply);
    }

    /**
     * @notice Updates the maximum tokens per wallet limit.
     * @param _maxTokensPerWallet New maximum tokens per wallet.
     * @dev Must be greater than zero and less than maxSupply. Only callable by owner.
     */
    function setMaxTokensPerWallet(uint256 _maxTokensPerWallet) external onlyOwner {
        _setMaxTokensPerWallet(_maxTokensPerWallet);
    }

    /**
     * @notice Updates the ERC20 token contract used for minting payments.
     * @param minterToken Address of the ERC20 token contract.
     * @dev Must be a valid contract address. Only callable by owner.
     */
    function setAllowedExecuteMint(IERC20Metadata minterToken) external onlyOwner {
        _setAllowedExecuteMint(minterToken);
    }

    /**
     * @notice Updates the base URI for token metadata.
     * @param baseURI New base URI string.
     * @dev Emits BatchMetadataUpdate for the entire collection. Only callable by owner.
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _setBaseURI(baseURI);
        // Refreshes the whole collection (https://docs.opensea.io/docs/metadata-standards#metadata-updates)
        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    /**
     * @notice Sets the operator filter registry address.
     * @param registry Address of the registry contract.
     * @dev Used for marketplace filtering. Only callable by owner.
     */
    function setOperatorRegistry(address registry) external virtual onlyOwner {
        _setOperatorRegistry(registry);
    }

    /**
     * @notice Updates the trusted forwarder for meta-transactions.
     * @param forwarder New forwarder address.
     * @dev Set to address(0) to disable meta-transactions. Only callable by owner.
     */
    function setTrustedForwarder(address forwarder) external virtual onlyOwner {
        _setTrustedForwarder(forwarder);
    }

    /**
     * @notice Registers the contract with OpenSea's operator filter registry.
     * @param subscriptionOrRegistrantToCopy Address to copy or subscribe to.
     * @param subscribe True to subscribe, false to copy the list.
     * @dev Pass address(0) to register without subscription. Only callable by owner.
     */
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyOwner {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /**
     * @notice Safely transfers multiple tokens between addresses.
     * @param from Source address.
     * @param to Destination address.
     * @param ids Array of token IDs to transfer.
     * @param data Additional data for receiver callback.
     * @dev Verifies receiver contract compatibility. Requires approval or ownership.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual whenNotPaused onlyAllowedOperator(from) {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        address msgSender = _msgSender();
        uint256 numTokens = ids.length;
        for (uint256 i; i < numTokens; i++) {
            uint256 tokenId = ids[i];
            // Setting an "auth" arguments enables the `_isAuthorized` check which verifies that the token exists
            // (from != 0). Therefore, it is not needed to verify that the return value is not 0 here.
            address previousOwner = _update(to, tokenId, msgSender);
            if (previousOwner != from) {
                revert ERC721IncorrectOwner(from, tokenId, previousOwner);
            }
            _checkOnERC721ReceivedImpl(from, to, tokenId, data);
        }
    }

    /**
     * @notice Transfers multiple tokens between addresses.
     * @param from Source address.
     * @param to Destination address.
     * @param ids Array of token IDs to transfer.
     * @dev Requires approval or ownership. Does not verify receiver compatibility.
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) external virtual whenNotPaused onlyAllowedOperator(from) {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        address msgSender = _msgSender();
        uint256 numTokens = ids.length;
        for (uint256 i; i < numTokens; i++) {
            uint256 tokenId = ids[i];
            // Setting an "auth" arguments enables the `_isAuthorized` check which verifies that the token exists
            // (from != 0). Therefore, it is not needed to verify that the return value is not 0 here.
            address previousOwner = _update(to, tokenId, msgSender);
            if (previousOwner != from) {
                revert ERC721IncorrectOwner(from, tokenId, previousOwner);
            }
        }
    }

    /**
     * @notice Sets default royalty information for all tokens.
     * @param receiver Royalty recipient address.
     * @param feeNumerator Royalty fee in basis points.
     * @dev Only callable by owner.
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit DefaultRoyaltySet(_msgSender(), receiver, feeNumerator);
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Removes default royalty configuration.
     * @dev Only callable by owner.
     */
    function resetDefaultRoyalty() external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit DefaultRoyaltyReset(_msgSender());
        _deleteDefaultRoyalty();
    }

    /**
     * @notice Sets royalty information for a specific token.
     * @param tokenId Token ID to configure.
     * @param receiver Royalty recipient address.
     * @param feeNumerator Royalty fee in basis points.
     * @dev Overrides default royalty for the specified token. Only callable by owner.
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit TokenRoyaltySet(_msgSender(), tokenId, receiver, feeNumerator);
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /**
     * @notice Resets token-specific royalty configuration.
     * @param tokenId Token ID to reset.
     * @dev Returns token to default royalty configuration. Only callable by owner.
     */
    function resetTokenRoyalty(uint256 tokenId) external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit TokenRoyaltyReset(_msgSender(), tokenId);
        _resetTokenRoyalty(tokenId);
    }

    /**
     * @notice Sets approval for an operator to manage caller's tokens.
     * @param operator Address to grant approval to.
     * @param approved True to approve, false to revoke.
     * @dev Overrides ERC721 implementation to add operator filtering.
     */
    function setApprovalForAll(
        address operator,
        bool approved
    ) public override whenNotPaused onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @notice Approves an operator to transfer a specific token.
     * @param operator Address to grant approval to.
     * @param tokenId ID of token to approve.
     * @dev Overrides ERC721 implementation to add operator filtering.
     */
    function approve(
        address operator,
        uint256 tokenId
    ) public override whenNotPaused onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    /**
     * @notice Transfers a token between addresses.
     * @param from Source address.
     * @param to Destination address.
     * @param tokenId ID of token to transfer.
     * @dev Overrides ERC721 implementation to add operator filtering.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override whenNotPaused onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @notice Safely transfers a token between addresses.
     * @param from Source address.
     * @param to Destination address.
     * @param tokenId ID of token to transfer.
     * @param data Additional data for receiver callback.
     * @dev Overrides ERC721 implementation to add operator filtering.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override whenNotPaused onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @notice Retrieves personalization traits for a token.
     * @param tokenId Token ID to query.
     * @return Bit mask of token's personalization traits.
     */
    function personalizationOf(uint256 tokenId) external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.personalizationTraits[tokenId];
    }

    /**
     * @notice Returns the number of tokens minted by an address.
     * @param wallet Address to query.
     * @return Number of tokens minted by the address.
     */
    function mintedCount(address wallet) external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.mintedCount[wallet];
    }

    /**
     * @notice Checks if an address can mint tokens in a specific wave.
     * @param waveIndex Wave configuration index.
     * @param wallet Address to check.
     * @param amount Number of tokens to check.
     * @return Reason code indicating mint permission status.
     */
    function isMintDenied(uint256 waveIndex, address wallet, uint256 amount) external view returns (MintDenialReason) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (waveIndex >= $.waveData.length) {
            return MintDenialReason.NotConfigured;
        }
        WaveData storage waveData = $.waveData[waveIndex];
        return _isMintDenied($, waveData, wallet, amount);
    }

    /**
     * @notice Returns the fee denominator for royalty calculations.
     * @return Fee denominator value (10000 for basis points).
     * @dev Used in conjunction with royalty fee numerator.
     */
    function feeDenominator() external pure virtual returns (uint96) {
        return _feeDenominator();
    }

    /**
     * @notice Returns the current chain ID.
     * @return Current blockchain network ID.
     */
    function chain() external view returns (uint256) {
        return block.chainid;
    }

    /**
     * @notice Returns the maximum token supply cap.
     * @return Maximum number of tokens that can be minted.
     */
    function maxSupply() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.maxSupply;
    }

    /**
     * @notice Returns the treasury address for minting payments.
     * @return Address receiving minting payments.
     */
    function mintTreasury() external view returns (address) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.mintTreasury;
    }

    /**
     * @notice Returns the base URI for token metadata.
     * @return Base URI string.
     */
    function baseTokenURI() external view returns (string memory) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.baseTokenURI;
    }

    /**
     * @notice Returns the maximum tokens allowed for a specific wave.
     * @param waveIndex Wave configuration index.
     * @return Maximum tokens allowed in the wave.
     */
    function waveMaxTokensOverall(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveMaxTokensOverall;
    }

    /**
     * @notice Returns the maximum tokens per wallet for a specific wave.
     * @param waveIndex Wave configuration index.
     * @return Maximum tokens allowed per wallet in the wave.
     */
    function waveMaxTokensPerWallet(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveMaxTokensPerWallet;
    }

    /**
     * @notice Returns the token price for a specific wave.
     * @param waveIndex Wave configuration index.
     * @return Price per token in the wave's payment token.
     */
    function waveSingleTokenPrice(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveSingleTokenPrice;
    }

    /**
     * @notice Returns the total tokens minted in a specific wave.
     * @param waveIndex Wave configuration index.
     * @return Total tokens minted in the wave.
     */
    function waveTotalMinted(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveTotalMinted;
    }

    /**
     * @notice Returns the number of tokens minted by an address in a specific wave.
     * @param waveIndex Wave configuration index.
     * @param owner Address to query.
     * @return Number of tokens minted by the address in the wave.
     */
    function waveOwnerToClaimedCounts(uint256 waveIndex, address owner) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveOwnerToClaimedCounts[owner];
    }

    /**
     * @notice Returns the total number of configured waves.
     * @return Number of minting waves configured.
     */
    function waveCount() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.waveData.length;
    }

    /**
     * @notice Returns the ERC20 token used for minting payments.
     * @return Address of the payment token contract.
     */
    function allowedToExecuteMint() external view returns (IERC20) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.allowedToExecuteMint;
    }

    /**
     * @notice Returns the global maximum tokens per wallet limit.
     * @return Maximum tokens allowed per wallet across all waves.
     */
    function maxTokensPerWallet() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.maxTokensPerWallet;
    }

    /**
     * @notice Returns the current total supply of minted tokens.
     * @return Current number of minted tokens.
     */
    function totalSupply() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.totalSupply;
    }

    /**
     * @notice Returns the burn functionality status.
     * @return True if token burning is enabled.
     */
    function isBurnEnabled() external view returns (bool) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.isBurnEnabled;
    }

    /**
     * @notice Checks interface support using ERC165.
     * @param interfaceId Interface identifier to check.
     * @return True if interface is supported.
     * @dev Adds support for ERC4906 interface.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC2981Upgradeable, ERC721Upgradeable) returns (bool) {
        return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
    }

    /**
     * @notice Internal function to perform minting operations.
     * @param waveData Wave configuration data.
     * @param wallet Address receiving tokens.
     * @param amount Number of tokens to mint.
     * @param waveIndex Wave configuration index.
     * @dev Handles payment processing and token minting.
     */
    function _doMint(WaveData storage waveData, address wallet, uint256 amount, uint256 waveIndex) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        MintDenialReason reason = _isMintDenied($, waveData, wallet, amount);
        if (reason != MintDenialReason.None) {
            revert CannotMint(reason, wallet, amount, waveIndex);
        }
        uint256 _price = waveData.waveSingleTokenPrice * amount;
        if (_price > 0) {
            SafeERC20.safeTransferFrom($.allowedToExecuteMint, wallet, $.mintTreasury, _price);
        }
        uint256 _totalSupply = $.totalSupply;
        waveData.waveOwnerToClaimedCounts[wallet] += amount;
        waveData.waveTotalMinted += amount;
        $.totalSupply += amount;
        $.mintedCount[wallet] += amount;
        for (uint256 i; i < amount; i++) {
            // @dev _safeMint already checks the destination _wallet
            // @dev start with tokenId = 1
            _safeMint(wallet, _totalSupply + i + 1);
            emit WaveMint(_totalSupply + i + 1, wallet, waveIndex);
        }
    }

    /**
     * @notice Internal function to check minting permissions.
     * @param $ Storage pointer.
     * @param waveData Wave configuration data.
     * @param wallet Address attempting to mint.
     * @param amount Number of tokens requested.
     * @return Reason code indicating mint permission status.
     */
    function _isMintDenied(
        NFTCollectionStorage storage $,
        WaveData storage waveData,
        address wallet,
        uint256 amount
    ) internal view returns (MintDenialReason) {
        if ($.mintedCount[wallet] + amount > $.maxTokensPerWallet) {
            return MintDenialReason.GlobalMaxTokensPerWalletExceeded;
        }
        if (amount == 0) {
            return MintDenialReason.InvalidAmount;
        }
        if (waveData.waveTotalMinted + amount > waveData.waveMaxTokensOverall) {
            return MintDenialReason.WaveMaxTokensOverallExceeded;
        }
        if (waveData.waveOwnerToClaimedCounts[wallet] + amount > waveData.waveMaxTokensPerWallet) {
            return MintDenialReason.WaveMaxTokensPerWalletExceeded;
        }
        if ($.totalSupply + amount > $.maxSupply) {
            return MintDenialReason.MaxSupplyExceeded;
        }
        return MintDenialReason.None;
    }

    /**
     * @notice Helper function to retrieve wave data by index.
     * @param waveIndex Index of the wave configuration.
     * @return waveData Storage pointer to the wave configuration.
     * @dev Accepts indices >= waveData.length to access the latest wave.
     */
    function _getWaveData(uint256 waveIndex) internal view returns (WaveData storage) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        uint256 waveDataLen = $.waveData.length;
        if (waveIndex >= waveDataLen) {
            waveIndex = waveDataLen - 1;
        }
        return $.waveData[waveIndex];
    }

    /**
     * @notice Returns the base URI for token metadata.
     * @return Base URI string for token metadata.
     * @dev Internal implementation of ERC721 _baseURI.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.baseTokenURI;
    }

    /**
     * @notice Returns the message data for meta-transactions.
     * @return Message data with meta-transaction context.
     * @dev ERC2771 compatible msg.data getter.
     */
    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }

    /**
     * @notice Returns the message sender for meta-transactions.
     * @return sender Effective message sender accounting for meta-transactions.
     * @dev ERC2771 compatible msg.sender getter.
     */
    function _msgSender()
        internal
        view
        override(
            ContextUpgradeable,
            ERC2771HandlerUpgradeable,
            UpdatableOperatorFiltererUpgradeable,
            NFTCollectionSignature
        )
        returns (address sender)
    {
        sender = ERC2771HandlerUpgradeable._msgSender();
    }

    /**
     * @notice Returns the context suffix length for meta-transactions.
     * @return Length of the meta-transaction context (20 bytes for address).
     * @dev ERC2771 specification implementation.
     */
    function _contextSuffixLength()
        internal
        view
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (uint256)
    {
        return ERC2771HandlerUpgradeable._contextSuffixLength();
    }

    /**
     * @notice Updates token personalization traits.
     * @param tokenId Token ID to update.
     * @param personalizationMask New trait configuration.
     * @dev No input validation - calling functions must perform checks.
     */
    function _updateTokenTraits(uint256 tokenId, uint256 personalizationMask) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        $.personalizationTraits[tokenId] = personalizationMask;
        emit Personalized(_msgSender(), tokenId, personalizationMask);
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice Checks if an address is a contract.
     * @param account Address to check.
     * @return True if the address contains code.
     * @dev Can be bypassed if called during contract construction.
     */
    function _isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize/address.code.length, which returns 0
        // for contracts in construction, since the code is only stored at the end
        // of the constructor execution.
        return account.code.length > 0;
    }

    /**
     * @notice Updates the base token URI.
     * @param baseURI New base URI for token metadata.
     * @dev Validates URI length and emits update event.
     */
    function _setBaseURI(string calldata baseURI) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (bytes(baseURI).length == 0) {
            revert InvalidBaseTokenURI(baseURI);
        }
        emit BaseURISet(_msgSender(), $.baseTokenURI, baseURI);
        $.baseTokenURI = baseURI;
    }

    /**
     * @notice Updates the treasury address.
     * @param _treasury New treasury address.
     * @dev Validates address is non-zero and emits update event.
     */
    function _setTreasury(address _treasury) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (_treasury == address(0)) {
            revert InvalidTreasury(_treasury);
        }
        emit TreasurySet(_msgSender(), $.mintTreasury, _treasury);
        $.mintTreasury = _treasury;
    }

    /**
     * @notice Updates the allowed minting token.
     * @param _minterToken New ERC20 token for minting payments.
     * @dev Validates contract address and emits update event.
     */
    function _setAllowedExecuteMint(IERC20Metadata _minterToken) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (!_isContract(address(_minterToken))) {
            revert InvalidAllowedToExecuteMint(_minterToken);
        }
        emit AllowedExecuteMintSet(_msgSender(), $.allowedToExecuteMint, _minterToken);
        $.allowedToExecuteMint = _minterToken;
    }

    /**
     * @notice Updates the maximum supply cap.
     * @param _maxSupply New maximum token supply.
     * @dev Validates against current supply and emits update event.
     */
    function _setMaxSupply(uint256 _maxSupply) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (_maxSupply == 0) {
            revert LowMaxSupply(0, $.totalSupply);
        }
        if (_maxSupply < $.totalSupply) {
            revert LowMaxSupply(_maxSupply, $.totalSupply);
        }
        emit MaxSupplySet(_msgSender(), $.maxSupply, _maxSupply);
        $.maxSupply = _maxSupply;
    }

    /**
     * @notice Updates the maximum tokens per wallet.
     * @param _maxTokensPerWallet New maximum tokens per wallet.
     * @dev Validates against maxSupply and emits update event.
     */
    function _setMaxTokensPerWallet(uint256 _maxTokensPerWallet) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (_maxTokensPerWallet == 0 || _maxTokensPerWallet > $.maxSupply) {
            revert InvalidMaxTokensPerWallet(_maxTokensPerWallet, $.maxSupply);
        }
        emit MaxTokensPerWalletSet(_msgSender(), $.maxTokensPerWallet, _maxTokensPerWallet);
        $.maxTokensPerWallet = _maxTokensPerWallet;
    }

    /**
     * @notice Burns a token with validation checks.
     * @param tokenId Token ID to burn.
     * @dev Verifies burn is enabled and caller is authorized.
     */
    function _burnWithCheck(uint256 tokenId) internal virtual {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (!$.isBurnEnabled) {
            revert ExpectedBurn();
        }
        address sender = _msgSender();
        // Setting an "auth" arguments enables the `_isAuthorized` check which verifies that the token exists
        // (from != 0). Therefore, it is not needed to verify that the return value is not 0 here.
        address previousOwner = _update(address(0), tokenId, sender);
        emit TokenBurned(sender, tokenId, previousOwner);
    }

    /**
     * @notice Validates ERC721 receiver implementation.
     * @param from Source address.
     * @param to Destination address.
     * @param tokenId Token ID being transferred.
     * @param data Additional transfer data.
     * @dev Reverts if receiver contract does not implement IERC721Receiver.
     */
    function _checkOnERC721ReceivedImpl(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 retval) {
                if (retval != IERC721Receiver.onERC721Received.selector) {
                    revert ERC721InvalidReceiver(to);
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert ERC721InvalidReceiver(to);
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
    }
}
