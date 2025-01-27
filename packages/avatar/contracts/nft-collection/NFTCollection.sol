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
import {ERC721BurnMemoryUpgradeable} from "./ERC721BurnMemoryUpgradeable.sol";
import {NFTCollectionSignature} from "./NFTCollectionSignature.sol";
import {INFTCollection} from "./INFTCollection.sol";

/**
 * @title NFTCollection
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice ERC721 contract for Avatar collections.
 *         May be initialized via {CollectionFactory} or other similar factories
 * @dev Some features:
 * - upgradable
 * - ownable (2 step transfer)
 * - OpenSea royalty compliant
 * - ERC2981 compliant
 * - ERC4906 compliant
 * - ERC165 compliant
 * - supports ERC2771 for meta transactions
 * - supports "burn memory" - keeping track of who burned what token for faster in-game gating checks
 * - minting is supported via an ERC20 token contract that supports approveAndCall
 *   as mint price is in non-native tokens
 * - custom batch operations for minting and transfer
 */
contract NFTCollection is
ReentrancyGuardUpgradeable,
Ownable2StepUpgradeable,
ERC721BurnMemoryUpgradeable,
ERC2981Upgradeable,
ERC2771HandlerUpgradeable,
UpdatableOperatorFiltererUpgradeable,
PausableUpgradeable,
NFTCollectionSignature,
IERC4906,
INFTCollection
{
    struct NFTCollectionStorage {
        /**
         * @notice maximum amount of tokens that can be minted
         */
        uint256 maxSupply; // public
        /**
         * @notice maximum amount of tokens that can be minted per wallet across all waves
         */
        uint256 maxTokensPerWallet; // public
        /**
         * @notice treasury address where the payment for minting are sent
         */
        address mintTreasury; // public
        /**
         * @notice standard base token URL for ERC721 metadata
         */
        string baseTokenURI;
        /**
         * @notice saved information of minting waves
         */
        WaveData[] waveData;
        /**
         * @notice ERC20 contract through which the minting will be done (approveAndCall)
         *         When there is a price for the minting, the payment will be done using this token
         */
        IERC20 allowedToExecuteMint;
        /**
         * @notice stores the personalization mask for a tokenId
         */
        mapping(uint256 => uint256) personalizationTraits;
        /**
         * @notice stores the number of tokens minted by an address
         */
        mapping(address => uint256) mintedCount;
        /**
         * @notice total amount of tokens minted till now
         */
        uint256 totalSupply;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.avatar.nft-collection.NFTCollection
    bytes32 internal constant NFT_COLLECTION_STORAGE_LOCATION =
    0x54137d560768c3c24834e09621a4fafd063f4a5812823197e84bcd3fbaff7d00;

    function _getNFTCollectionStorage() private pure returns (NFTCollectionStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := NFT_COLLECTION_STORAGE_LOCATION
        }
    }

    /**
     * @notice mitigate a possible Implementation contract takeover, as indicate by
     *         https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice external entry point initialization function in accordance with the upgradable pattern
     */
    function initialize(InitializationParams calldata params) external virtual initializer {
        __NFTCollection_init(params);
    }

    /**
     * @notice initialization function in accordance with the upgradable pattern
     */
    function __NFTCollection_init(InitializationParams calldata params) internal onlyInitializing {
        if (bytes(params.name).length == 0) {
            revert InvalidName(params.name);
        }
        if (bytes(params.symbol).length == 0) {
            revert InvalidSymbol(params.symbol);
        }
        __ReentrancyGuard_init();
        // We don't want to set the owner to _msgSender, so, we call _transferOwnership instead of __Ownable_init
        _transferOwnership(params.collectionOwner);
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
     * @notice function to setup a new wave. A wave is defined as a combination of allowed number tokens to be
     *         minted in total, per wallet and minting price
     * @param _waveMaxTokensOverall the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param _waveMaxTokensPerWallet max tokens to buy, per wallet in a given wave
     * @param _waveSingleTokenPrice the price to mint a token in a given wave, in wei
     *                              denoted by the allowedToExecuteMint contract
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
     * @notice token minting function on the last wave. Price is set by wave and is paid in tokens denoted
     *         by the allowedToExecuteMint contract
     * @param wallet minting wallet
     * @param amount number of token to mint
     * @param signatureId signing signature ID
     * @param signature signing signature value
     * @dev this method is backward compatible with the previous contract, so, it uses last configured wave
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
     * @notice token minting function on a certain wave. Price is set by wave and is paid in tokens denoted
     *         by the allowedToExecuteMint contract
     * @param wallet minting wallet
     * @param amount number of token to mint
     * @param waveIndex the index of the wave used to mint
     * @param signatureId signing signature ID
     * @param signature signing signature value
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
     * @notice function to setup wave parameters. A wave is defined as a combination of allowed number tokens to be
     *         minted in total, per wallet and minting price
     * @param waveIndex the index of the wave to be canceled
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
     * @notice batch minting function, used by owner to airdrop directly to users.
     * @dev this methods takes a list of destination wallets and can only be used by the owner of the contract
     * @param waveIndex the index of the wave used to mint
     * @param wallets list of destination wallets and amounts
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
            if (amount == 0 || $.totalSupply + amount > $.maxSupply) {
                revert CannotMint(wallet, amount);
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
     * @notice helper function to emit the {MetadataUpdate} event in order for marketplaces to, on demand,
     *         refresh metadata, for the provided token ID. Off-chain, gaming mechanics are done and this
     *         function is ultimately called to signal the end of a reveal.
     * @dev will revert if owner of token is not caller or if signature is not valid
     * @param tokenId the ID belonging to the NFT token for which to emit the event
     * @param signatureId validation signature ID
     * @param signature validation signature
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
     * @notice personalize token traits according to the provided personalization bit-mask
     * @dev after checks, it is reduced to personalizationTraits[_tokenId] = _personalizationMask
     * @param tokenId what token to personalize
     * @param personalizationMask a mask where each bit has a custom meaning in-game
     * @param signatureId the ID of the provided signature
     * @param signature signing signature
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
     * @notice personalize token traits but can be called by owner or special roles address
     *         Used to change the traits of a token based on an in-game action
     * @dev reverts if token does not exist or if not authorized
     * @param tokenId what token to personalize
     * @param personalizationMask a mask where each bit has a custom meaning in-game
     */
    function operatorPersonalize(uint256 tokenId, uint256 personalizationMask) external onlyOwner {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        _updateTokenTraits(tokenId, personalizationMask);
    }

    /**
     * @notice Burns `tokenId`. The caller must own `tokenId` or be an approved operator.
     * @dev See {ERC721BurnMemoryEnumerableUpgradeable.burn}.
     * @param tokenId the token id to be burned
     */
    function burn(uint256 tokenId) external whenNotPaused {
        _burnWithCheck(tokenId);
    }

    /**
     * @notice enables burning of tokens
     * @dev reverts if burning already enabled.
     */
    function enableBurning() external onlyOwner {
        _enableBurning();
    }

    /**
     * @notice disables burning of tokens
     * @dev reverts if burning already disabled.
     */
    function disableBurning() external onlyOwner {
        _disableBurning();
    }

    /**
     * @notice pauses the contract
     * @dev reverts if not owner of the collection or if not un-paused
     */
    function pause() external onlyOwner {
        _requireNotPaused();
        _pause();
    }

    /**
     * @notice unpauses the contract
     * @dev reverts if not owner of the collection or if not paused
     */
    function unpause() external onlyOwner {
        _requirePaused();
        _unpause();
    }

    /**
     * @notice update the treasury address
     * @param treasury new treasury address to be saved
     */
    function setTreasury(address treasury) external onlyOwner {
        _setTreasury(treasury);
    }

    /**
     * @notice updates the sign address.
     * @param _signAddress new signer address to be set
     */
    function setSignAddress(address _signAddress) external onlyOwner {
        _setSignAddress(_signAddress);
    }

    /**
     * @notice updates the sign address.
     * @param _maxSupply maximum amount of tokens that can be minted
     */
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        _setMaxSupply(_maxSupply);
    }

    /**
     * @notice Set the maximum number of tokens that can be minted per wallet across all waves
     * @param _maxTokensPerWallet new maximum tokens per wallet
     */
    function setMaxTokensPerWallet(uint256 _maxTokensPerWallet) external onlyOwner {
        _setMaxTokensPerWallet(_maxTokensPerWallet);
    }

    /**
     * @notice updates which address is allowed to execute the mint function.
     * @dev also resets default mint price
     * @param minterToken the address that will be allowed to execute the mint function
     */
    function setAllowedExecuteMint(IERC20Metadata minterToken) external onlyOwner {
        _setAllowedExecuteMint(minterToken);
    }

    /**
     * @notice updates the base token URI for the contract
     * @param baseURI an URI that will be used as the base for token URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _setBaseURI(baseURI);
        // Refreshes the whole collection (https://docs.opensea.io/docs/metadata-standards#metadata-updates)
        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    /**
     * @notice sets filter registry address deployed in test
     * @param registry the address of the registry
     */
    function setOperatorRegistry(address registry) external virtual onlyOwner {
        _setOperatorRegistry(registry);
    }

    /**
     * @notice set the trusted forwarder
     * @param forwarder the new trusted forwarder address
     * @dev address(0) disables the forwarder
     */
    function setTrustedForwarder(address forwarder) external virtual onlyOwner {
        _setTrustedForwarder(forwarder);
    }

    /**
     * @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.
     * @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
     * @param subscribe bool to signify subscription 'true' or to copy the list 'false'.
     * @dev subscriptionOrRegistrantToCopy == address(0), just register
     */
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyOwner {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /**
     * @notice Transfer many tokens between 2 addresses, while ensuring the receiving contract has a receiver method.
     * @param from The sender of the token.
     * @param to The recipient of the token.
     * @param ids The ids of the tokens.
     * @param data Additional data.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual onlyAllowedOperator(from) {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        address msgSender = _msgSender();
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
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
     * @notice Transfer many tokens between 2 addresses.
     * @param from The sender of the token.
     * @param to The recipient of the token.
     * @param ids The ids of the tokens.
     */
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) external virtual onlyAllowedOperator(from) {
        if (to == address(0)) {
            revert ERC721InvalidReceiver(address(0));
        }
        address msgSender = _msgSender();
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
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
     * @notice Sets the royalty information that all ids in this contract will default to.
     * @param receiver the receiver of the royalties
     * @param feeNumerator percentage of the royalties in feeDenominator units
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit DefaultRoyaltySet(_msgSender(), receiver, feeNumerator);
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Removes default royalty information.
     */
    function resetDefaultRoyalty() external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit DefaultRoyaltyReset(_msgSender());
        _deleteDefaultRoyalty();
    }

    /**
     * @notice Sets the royalty information for a specific token id, overriding the global default.
     * @param tokenId the tokenId for
     * @param receiver the receiver of the royalties
     * @param feeNumerator percentage of the royalties in feeDenominator units
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit TokenRoyaltySet(_msgSender(), tokenId, receiver, feeNumerator);
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /**
     * @notice Resets royalty information for the token id back to the global default.
     */
    function resetTokenRoyalty(uint256 tokenId) external onlyOwner {
        /// @dev ERC2981Upgradeable don't emit and don't give access to the old value
        emit TokenRoyaltyReset(_msgSender(), tokenId);
        _resetTokenRoyalty(tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-setApprovalForAll}
     */
    function setApprovalForAll(address operator, bool approved) public override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev See OpenZeppelin {IERC721-approve}
     */
    function approve(address operator, uint256 tokenId) public override onlyAllowedOperatorApproval(operator) {
        super.approve(operator, tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-transferFrom}
     */
    function transferFrom(address from, address to, uint256 tokenId) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-safeTransferFrom}
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @notice get the personalization of the indicated tokenID
     * @param tokenId the token ID to check
     * @return the personalization data as uint256
     */
    function personalizationOf(uint256 tokenId) external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.personalizationTraits[tokenId];
    }

    /**
     * @notice get the number of tokens minted by an address
     * @param wallet minting wallet
     * @return the number of tokens minted by an address
     */
    function mintedCount(address wallet) external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.mintedCount[wallet];
    }

    /**
     * @notice check if the indicated wallet can mint the indicated amount
     * @param wallet wallet to be checked if it can mint
     * @param amount amount to be checked if can be minted
     * @param waveIndex the index of the wave used to mint
     * @return if can mint or not
     */
    function isMintAllowed(uint256 waveIndex, address wallet, uint256 amount) external view returns (bool) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        if (waveIndex >= $.waveData.length) {
            return false;
        }
        WaveData storage waveData = $.waveData[waveIndex];
        return _isMintAllowed($, waveData, wallet, amount);
    }

    /**
     * @dev The denominator with which to interpret the fee set in {_setTokenRoyalty} and {_setDefaultRoyalty} as a
     * fraction of the sale price. Defaults to 10000 so fees are expressed in basis points, but may be customized by an
     * override.
     */
    function feeDenominator() external pure virtual returns (uint96) {
        return _feeDenominator();
    }

    /**
     * @notice helper automation function
     * @return current chainID for the blockchain
     */
    function chain() external view returns (uint256) {
        return block.chainid;
    }

    /**
     * @notice return maximum amount of tokens that can be minted
     */
    function maxSupply() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.maxSupply;
    }

    /**
     * @notice return treasury address where the payment for minting are sent
     */
    function mintTreasury() external view returns (address) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.mintTreasury;
    }

    /**
     * @notice return standard base token URL for ERC721 metadata
     */
    function baseTokenURI() external view returns (string memory) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.baseTokenURI;
    }

    /**
     * @notice return max tokens to buy per wave, cumulating all addresses
     * @param waveIndex the index of the wave used to mint
     */
    function waveMaxTokensOverall(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveMaxTokensOverall;
    }

    /**
     * @notice return max tokens to buy, per wallet in a given wave
     * @param waveIndex the index of the wave used to mint
     */
    function waveMaxTokensPerWallet(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveMaxTokensPerWallet;
    }

    /**
     * @notice return price of one token mint (in the token denoted by the allowedToExecuteMint contract)
     * @param waveIndex the index of the wave used to mint
     */
    function waveSingleTokenPrice(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveSingleTokenPrice;
    }

    /**
     * @notice return number of total minted tokens in the current running wave
     * @param waveIndex the index of the wave used to mint
     */
    function waveTotalMinted(uint256 waveIndex) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveTotalMinted;
    }

    /**
     * @notice return mapping of [owner -> wave index -> minted count]
     * @param waveIndex the index of the wave used to mint
     * @param owner the owner for which the count is returned
     */
    function waveOwnerToClaimedCounts(uint256 waveIndex, address owner) external view returns (uint256) {
        WaveData storage waveData = _getWaveData(waveIndex);
        return waveData.waveOwnerToClaimedCounts[owner];
    }

    /**
     * @notice the total amount of waves configured till now
     */
    function waveCount() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.waveData.length;
    }

    /**
     * @notice return ERC20 contract through which the minting will be done (approveAndCall)
     */
    function allowedToExecuteMint() external view returns (IERC20) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.allowedToExecuteMint;
    }

    /**
     * @notice Get the maximum number of tokens that can be minted per wallet across all waves
     */
    function maxTokensPerWallet() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.maxTokensPerWallet;
    }

    /**
     * @notice return the total amount of tokens minted till now
     */
    function totalSupply() external view returns (uint256) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.totalSupply;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC2981Upgradeable, ERC721Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice complete the minting called from waveMint and mint
     * @param waveData the data of the wave used to mint
     * @param wallet minting wallet
     * @param amount number of token to mint
     */
    function _doMint(WaveData storage waveData, address wallet, uint256 amount, uint256 waveIndex) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();

        if ($.mintedCount[wallet] + amount > $.maxTokensPerWallet) {
            revert GlobalMaxTokensPerWalletExceeded(amount, $.mintedCount[wallet], $.maxTokensPerWallet);
        }

        if (!_isMintAllowed($, waveData, wallet, amount)) {
            revert CannotMint(wallet, amount);
        }
        uint256 _price = waveData.waveSingleTokenPrice * amount;
        if (_price > 0) {
            SafeERC20.safeTransferFrom($.allowedToExecuteMint, wallet, $.mintTreasury, _price);
        }
        uint256 _totalSupply = $.totalSupply;
        for (uint256 i; i < amount; i++) {
            // @dev _safeMint already checks the destination _wallet
            // @dev start with tokenId = 1
            _safeMint(wallet, _totalSupply + i + 1);
            emit WaveMint(_totalSupply + i + 1, wallet, waveIndex);
        }
        waveData.waveOwnerToClaimedCounts[wallet] += amount;
        waveData.waveTotalMinted += amount;
        $.totalSupply += amount;
        $.mintedCount[wallet] += amount;
    }

    /**
     * @notice return true if the indicated wallet can mint the indicated amount
     * @param $ storage access
     * @param waveData wave data used to check
     * @param wallet wallet to be checked if it can mint
     * @param amount amount to be checked if can be minted
     */
    function _isMintAllowed(
        NFTCollectionStorage storage $,
        WaveData storage waveData,
        address wallet,
        uint256 amount
    ) internal view returns (bool) {
        return
        amount > 0 &&
        (waveData.waveTotalMinted + amount <= waveData.waveMaxTokensOverall) &&
        (waveData.waveOwnerToClaimedCounts[wallet] + amount <= waveData.waveMaxTokensPerWallet) &&
        $.totalSupply + amount <= $.maxSupply;
    }

    /**
     * @notice a helper function to ensure consistency when waveIndex is passed as argument to an external function
     * @param waveIndex the index of the wave used to mint
     * @return waveData the wave data used
     * @dev we accept waveIndex gte to waveData.length so we can access the wave used by mint easily
     */
    function _getWaveData(uint256 waveIndex) internal view returns (WaveData storage waveData) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        uint256 waveDataLen = $.waveData.length;
        if (waveIndex >= waveDataLen) {
            waveIndex = waveDataLen - 1;
        }
        return $.waveData[waveIndex];
    }

    /**
     * @notice get base TokenURI
     * @return baseTokenURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        return $.baseTokenURI;
    }

    /**
     * @notice ERC2771 compatible msg.data getter
     * @return msg.data
     */
    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }

    /**
     * @notice ERC2771 compatible msg.sender getter
     * @return sender msg.sender
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
     * @dev ERC-2771 specifies the context as being a single address (20 bytes).
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
     * @notice actually updates the variables that store the personalization traits per token.
     * @dev no checks are done on input validations. Calling functions are expected to do them
     * @param tokenId the ID for the token to personalize
     * @param personalizationMask the personalization mask that will be applied
     */
    function _updateTokenTraits(uint256 tokenId, uint256 personalizationMask) internal {
        NFTCollectionStorage storage $ = _getNFTCollectionStorage();
        $.personalizationTraits[tokenId] = personalizationMask;
        emit Personalized(_msgSender(), tokenId, personalizationMask);
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice verifies it the provided address is a smart contract (by code size)
     * @dev can be bypassed if called from contract constructors
     * @param account account address to verify if it is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize/address.code.length, which returns 0
        // for contracts in construction, since the code is only stored at the end
        // of the constructor execution.
        return account.code.length > 0;
    }

    /**
     * @notice updates the base token URI for the contract
     * @param baseURI an URI that will be used as the base for token URI
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
     * @notice update the treasury address
     * @param _treasury new treasury address to be saved
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
     * @notice updates which address is allowed to execute the mint function.
     * @dev also resets default mint price
     * @param _minterToken the address that will be allowed to execute the mint function
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
     * @notice updates maximum supply
     * @param _maxSupply maximum amount of tokens that can be minted
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
     * @notice Set the maximum number of tokens that can be minted per wallet across all waves
     * @param _maxTokensPerWallet new maximum tokens per wallet
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
     * @notice taken from ERC721Upgradeable because it is declared private.
     * @dev Private function to invoke {IERC721Receiver-onERC721Received} on a target address. This will revert if the
     * recipient doesn't accept the token transfer. The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param data bytes optional data to send along with the call
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
