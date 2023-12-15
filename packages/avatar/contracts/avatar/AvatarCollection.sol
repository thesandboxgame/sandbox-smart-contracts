// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/access/OwnableUpgradeable.sol";
import {
    ReentrancyGuardUpgradeable
} from "@openzeppelin/contracts-upgradeable-0.8.13/security/ReentrancyGuardUpgradeable.sol";
import {
    AccessControlUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable-0.8.13/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/security/PausableUpgradeable.sol";
import {
    ERC721EnumerableUpgradeable,
    ERC721Upgradeable,
    IERC721Upgradeable
} from "@openzeppelin/contracts-upgradeable-0.8.13/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

import {ECDSA} from "@openzeppelin/contracts-0.8.15/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts-0.8.15/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts-0.8.15/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts-0.8.15/token/ERC20/utils/SafeERC20.sol";

import {
    UpdatableOperatorFiltererUpgradeable
} from "../common/OperatorFilterer/UpdatableOperatorFiltererUpgradeable.sol";

import {ERC2771HandlerUpgradeable} from "../common/BaseWithStorage/ERC2771/ERC2771HandlerUpgradeable.sol";
import {IERC4906} from "../common/IERC4906.sol";

import {CollectionAccessControl} from "./CollectionAccessControl.sol";
import {ERC721BurnMemoryEnumerableUpgradeable} from "./ERC721BurnMemoryEnumerableUpgradeable.sol";

/**
 * @title AvatarCollection
 * @author qed.team x The Sandbox
 * @notice ERC721 contract for future Avatar collections.
 *         Is expected to be initialize via {CollectionFactory} or other similar factories
 *
 * Some features:
 * - upgradable
 * - ownable (2 step transfer) and multi-role support for simplifying logistics
 * - OpenSea royalty compliant
 * - ERC4906 compliant
 * - ERC165 compliant
 * - supports ERC2771 for services like Biconomy
 * - supports "burn memory" - keeping track of who burned what token for faster in-game gating checks
 * - minting is only supported via an ERC20 token contract that supports approveAndCall
 *   as mint price is in non-native tokens
 */
contract AvatarCollection is
    ReentrancyGuardUpgradeable,
    CollectionAccessControl,
    ERC721BurnMemoryEnumerableUpgradeable,
    ERC2771HandlerUpgradeable,
    UpdatableOperatorFiltererUpgradeable,
    PausableUpgradeable,
    IERC4906
{
    /*//////////////////////////////////////////////////////////////
                           Type declarations
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Structure used to group default minting parameters in order to avoid stack too deep error
     * @param mintPrice default mint price for both allowlist and public minting
     * @param maxPublicTokensPerWallet maximum tokens mint per wallet in the public minting
     * @param maxAllowlistTokensPerWallet maximum tokens mint per wallet in the allowlist minting
     * @param maxMarketingTokens maximum allowed tokens to be minted in the marketing phase
     */
    struct MintingDefaults {
        uint256 mintPrice;
        uint256 maxPublicTokensPerWallet;
        uint256 maxAllowlistTokensPerWallet;
        uint256 maxMarketingTokens;
    }

    /**
     * @notice Structure used to group registry filter parameters in order to avoid stack too deep error
     * @param registry filter registry to which to register with. For blocking operators that do not respect royalties
     * @param operatorFiltererSubscription subscription address to use as a template for
     * @param operatorFiltererSubscriptionSubscribe if to subscribe to the operatorFiltererSubscription address or
     *                                              just copy entries from it
     */
    struct OpenseaRegistryFilterParameters {
        address registry;
        address operatorFiltererSubscription;
        bool operatorFiltererSubscriptionSubscribe;
    }

    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice default minting price in full tokens (not WEI) when used, this must be
    ///         multiplied by the token "allowedToExecuteMint" token decimals
    uint256 public constant DEFAULT_MINT_PRICE_FULL = 100;

    /// @notice max token supply
    uint256 public maxSupply;

    /// @notice treasury address where mint tokens are sent
    address public mintTreasury;

    /// @notice standard base token URL for ERC721 metadata
    string public baseTokenURI;

    /// @notice max tokens to buy per wave, cumulating all addresses
    uint256 public waveMaxTokensOverall;

    /// @notice max tokens to buy, per wallet in a given wave
    uint256 public waveMaxTokensPerWallet;

    /// @notice price of one token mint (in the token denoted by the allowedToExecuteMint contract)
    uint256 public waveSingleTokenPrice;

    /// @notice number of total minted tokens in the current running wave
    uint256 public waveTotalMinted;

    /// @notice mapping of [owner -> wave index -> minted count]
    mapping(address => mapping(uint256 => uint256)) public waveOwnerToClaimedCounts;

    /// @notice each wave has an index to help track minting/tokens per wallet
    uint256 public indexWave;

    /// @notice default are used when calling predefined wave setup functions:
    ///         setMarketingMint, setAllowlistMint and setPublicMint
    ///         see struct MintingDefaults for more details
    MintingDefaults public mintingDefaults;

    /// @notice ERC20 contract through which the minting will be done
    address public allowedToExecuteMint;

    /// @notice all signatures must come from this specific address, otherwise are invalid
    address public signAddress;

    /// @notice stores the personalization for a tokenId
    mapping(uint256 => uint256) public personalizationTraits;

    /// @dev map used to mark if a specific signatureId was used
    ///      values are 0 (default, unused) and 1 (used)
    ///      Used to mitigate a possible signature reuse attack
    mapping(uint256 => uint256) private _signatureIds;

    /// @dev helper mapping used to determine which IDs are available for minting
    mapping(uint256 => uint256) private _availableIds;

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Event emitted when a token personalization was made.
     * @dev emitted when personalize is called
     * @param _tokenId id of the token which had the personalization done
     * @param _personalizationMask the exact personalization that was done, as a custom meaning bit-mask
     */
    event Personalized(uint256 indexed _tokenId, uint256 indexed _personalizationMask);

    /**
     * @notice Event emitted when the contract was initialized.
     * @dev emitted at proxy startup, once only
     * @param baseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _mintTreasury collection treasury address
     * @param _signAddress signer address that is allowed to create mint signatures
     * @param _allowedToExecuteMint token address that is allowed to execute the mint function
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _registry filter registry to which to register with. For blocking operators that do not respect royalties
     * @param _operatorFiltererSubscription subscription address to use as a template for
     * @param _operatorFiltererSubscriptionSubscribe if to subscribe to the operatorFiltererSubscription address or
     *                                               just copy entries from it
     */
    event ContractInitialized(
        string indexed baseURI,
        string indexed _name,
        string indexed _symbol,
        address _mintTreasury,
        address _signAddress,
        address _allowedToExecuteMint,
        uint256 _maxSupply,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe
    );

    /**
     * @notice Event emitted when a wave was set up
     * @dev emitted when setupWave is called
     * @param _waveMaxTokens the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param _waveMaxTokensToBuy max tokens to buy, per wallet in a given wave
     * @param _waveSingleTokenPrice the price to mint a token in a given wave, in wei
     */
    event WaveSetup(
        uint256 indexed _waveMaxTokens,
        uint256 indexed _waveMaxTokensToBuy,
        uint256 indexed _waveSingleTokenPrice
    );

    /**
     * @notice Event emitted when an address was set as allowed to mint
     * @dev emitted when setAllowedExecuteMint is called
     * @param _address the address that will be allowed to set execute the mint function
     */
    event AllowedExecuteMintSet(address indexed _address);

    /**
     * @notice Event emitted when the treasury address was saved
     * @dev emitted when setTreasury is called
     * @param _owner new owner address to be saved
     */
    event TreasurySet(address indexed _owner);

    /**
     * @notice Event emitted when the base token URI for the contract was set or changed
     * @dev emitted when setBaseURI is called
     * @param baseURI an URI that will be used as the base for token URI
     */
    event BaseURISet(string indexed baseURI);

    /**
     * @notice Event emitted when the signer address was set or changed
     * @dev emitted when setSignAddress is called
     * @param _signAddress new signer address to be set
     */
    event SignAddressSet(address indexed _signAddress);

    /**
     * @notice Event emitted when the default values used by wave manipulation functions were changed
     * @dev emitted when initialize or setWaveDefaults is called
     * @param mintPrice default mint price for both allowlist and public minting
     * @param maxPublicTokensPerWallet maximum tokens mint per wallet in the public minting
     * @param maxAllowlistTokensPerWallet maximum tokens mint per wallet in the allowlist minting
     * @param maxMarketingTokens maximum allowed tokens to be minted in the marketing phase
     */
    event DefaultMintingValuesSet(
        uint256 indexed mintPrice,
        uint256 indexed maxPublicTokensPerWallet,
        uint256 indexed maxAllowlistTokensPerWallet,
        uint256 maxMarketingTokens
    );

    /*//////////////////////////////////////////////////////////////
                            Initializers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice mitigate a possible Implementation contract takeover, as indicate by
     *         https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice external entry point initialization function in accordance with the upgradable pattern
     * @dev calls all the init functions from the base classes. Emits {ContractInitialized} event
     * @param _collectionOwner the address that will be set as the owner of the collection
     * @param _initialBaseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _mintTreasury collection treasury address
     * @param _signAddress signer address that is allowed to create mint signatures
     * @param _initialTrustedForwarder trusted forwarder address
     * @param _allowedToExecuteMint ERC20 token contract through which mint will be done
     *                              It is the only one allowed to call mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _filterParams Opensea registry filter initialization parameters
     * @param _mintingDefaults default minting values for predefined wave helpers
     */
    function initialize(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _allowedToExecuteMint,
        uint256 _maxSupply,
        OpenseaRegistryFilterParameters memory _filterParams,
        MintingDefaults memory _mintingDefaults
    ) external virtual initializer {
        __AvatarCollection_init(
            _collectionOwner,
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _initialTrustedForwarder,
            _allowedToExecuteMint,
            _maxSupply,
            _filterParams,
            _mintingDefaults
        );
    }

    /**
     * @notice initialization function in accordance with the upgradable pattern
     * @dev calls all the init functions from the base classes. Emits {ContractInitialized} event
     * @param _collectionOwner the address that will be set as the owner of the collection
     * @param _initialBaseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _mintTreasury collection treasury address
     * @param _signAddress signer address that is allowed to create mint signatures
     * @param _initialTrustedForwarder trusted forwarder address
     * @param _allowedToExecuteMint ERC20 token contract through which mint will be done
     *                              It is the only one allowed to call mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _filterParams Opensea registry filter initialization parameters
     * @param _mintingDefaults default minting values for predefined wave helpers
     */
    function __AvatarCollection_init(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _allowedToExecuteMint,
        uint256 _maxSupply,
        OpenseaRegistryFilterParameters memory _filterParams,
        MintingDefaults memory _mintingDefaults
    ) internal onlyInitializing {
        require(bytes(_initialBaseURI).length != 0, "AvatarCollection: baseURI is not set");
        require(bytes(_name).length != 0, "AvatarCollection: name is empty");
        require(bytes(_symbol).length != 0, "AvatarCollection: symbol is empty");
        require(_signAddress != address(0), "AvatarCollection: sign address is zero address");
        require(_initialTrustedForwarder != address(0), "AvatarCollection: trusted forwarder is zero address");
        require(_mintTreasury != address(0), "AvatarCollection: treasury is zero address");
        require(_isContract(_allowedToExecuteMint), "AvatarCollection: executor address is not a contract");
        require(_maxSupply > 0, "AvatarCollection: max supply should be more than 0");

        require(_mintingDefaults.mintPrice > 0, "AvatarCollection: public mint price cannot be 0");
        require(
            _mintingDefaults.maxPublicTokensPerWallet <= _maxSupply &&
                _mintingDefaults.maxAllowlistTokensPerWallet <= _maxSupply,
            "AvatarCollection: invalid tokens per wallet configuration"
        );
        require(_mintingDefaults.maxMarketingTokens <= _maxSupply, "AvatarCollection: invalid marketing share");

        __ReentrancyGuard_init();
        __InitializeAccessControl(_collectionOwner); // owner is also initialized here
        __ERC2771Handler_initialize(_initialTrustedForwarder);
        __Pausable_init();
        __ERC721_init(_name, _symbol);
        __UpdatableOperatorFiltererUpgradeable_init(
            _filterParams.registry,
            _filterParams.operatorFiltererSubscription,
            _filterParams.operatorFiltererSubscriptionSubscribe
        );

        baseTokenURI = _initialBaseURI;
        mintTreasury = _mintTreasury;
        signAddress = _signAddress;
        allowedToExecuteMint = _allowedToExecuteMint;
        maxSupply = _maxSupply;
        mintingDefaults = _mintingDefaults;

        emit DefaultMintingValuesSet(
            _mintingDefaults.mintPrice,
            _mintingDefaults.maxPublicTokensPerWallet,
            _mintingDefaults.maxAllowlistTokensPerWallet,
            _mintingDefaults.maxMarketingTokens
        );

        emit ContractInitialized(
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _allowedToExecuteMint,
            _maxSupply,
            _filterParams.registry,
            _filterParams.operatorFiltererSubscription,
            _filterParams.operatorFiltererSubscriptionSubscribe
        );
    }

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice function to setup wave parameters. A wave is defined as a combination of allowed number tokens to be
     *         minted in total, per wallet and minting price
     * @custom:event {WaveSetup}
     * @param _waveMaxTokensOverall the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param _waveMaxTokensPerWallet max tokens to buy, per wallet in a given wave
     * @param _waveSingleTokenPrice the price to mint a token in a given wave, in wei
     *                              denoted by the allowedToExecuteMint contract
     */
    function setupWave(
        uint256 _waveMaxTokensOverall,
        uint256 _waveMaxTokensPerWallet,
        uint256 _waveSingleTokenPrice
    ) external authorizedRole(CONFIGURATOR_ROLE) {
        require(_waveMaxTokensOverall <= maxSupply, "AvatarCollection: _waveMaxTokens exceeds maxSupply");
        require(_waveMaxTokensOverall > 0, "AvatarCollection: max tokens to mint is 0");
        require(_waveMaxTokensPerWallet > 0, "AvatarCollection: max tokens to mint per wallet is 0");
        require(_waveMaxTokensPerWallet <= _waveMaxTokensOverall, "AvatarCollection: invalid supply configuration");

        waveMaxTokensOverall = _waveMaxTokensOverall;
        waveMaxTokensPerWallet = _waveMaxTokensPerWallet;
        waveSingleTokenPrice = _waveSingleTokenPrice;
        waveTotalMinted = 0;
        indexWave++;

        emit WaveSetup(_waveMaxTokensOverall, _waveMaxTokensPerWallet, _waveSingleTokenPrice);
    }

    /**
     * @notice helper function to set all token configs to that of the marketing minting phase.
     *         Can be called by owner or specially designated role, CONFIGURATOR.
     *         Uses default values set on contract initialization
     * @dev reverts if not authorized
     * @custom:event {WaveSetup}
     */
    function setMarketingMint() external authorizedRole(CONFIGURATOR_ROLE) {
        waveMaxTokensOverall = mintingDefaults.maxMarketingTokens;
        waveMaxTokensPerWallet = mintingDefaults.maxMarketingTokens;
        waveSingleTokenPrice = 0;
        waveTotalMinted = 0;
        indexWave++;

        emit WaveSetup(waveMaxTokensOverall, waveMaxTokensPerWallet, 0);
    }

    /**
     * @notice helper function to set all token configs to that of the allowlist minting phase.
     *         Can be called by owner or specially designated role, CONFIGURATOR.
     *         Uses default values set on contract initialization
     * @dev reverts if not authorized
     * @custom:event {WaveSetup}
     */
    function setAllowlistMint() external authorizedRole(CONFIGURATOR_ROLE) {
        waveMaxTokensOverall = maxSupply - totalSupply();
        waveMaxTokensPerWallet = mintingDefaults.maxAllowlistTokensPerWallet;
        waveSingleTokenPrice = mintingDefaults.mintPrice;
        waveTotalMinted = 0;
        indexWave++;

        emit WaveSetup(waveMaxTokensOverall, waveMaxTokensPerWallet, waveSingleTokenPrice);
    }

    /**
     * @notice helper function to set all token configs to that of the public minting phase.
     *         Can be called by owner or specially designated role, CONFIGURATOR.
     *         Uses default values set on contract initialization
     * @dev reverts if not authorized
     * @custom:event {WaveSetup}
     */
    function setPublicMint() external authorizedRole(CONFIGURATOR_ROLE) {
        waveMaxTokensOverall = maxSupply - totalSupply();
        waveMaxTokensPerWallet = mintingDefaults.maxPublicTokensPerWallet;
        waveSingleTokenPrice = mintingDefaults.mintPrice;
        waveTotalMinted = 0;
        indexWave++;

        emit WaveSetup(waveMaxTokensOverall, waveMaxTokensPerWallet, waveSingleTokenPrice);
    }

    /**
     * @notice token minting function. Price is set by wave and is paid in tokens denoted
     *         by the allowedToExecuteMint contract
     * @custom:event {Transfer}
     * @param _wallet minting wallet
     * @param _amount number of token to mint
     * @param _signatureId signing signature ID
     * @param _signature signing signature value
     */
    function mint(
        address _wallet,
        uint256 _amount,
        uint256 _signatureId,
        bytes memory _signature
    ) external whenNotPaused nonReentrant {
        require(indexWave > 0, "AvatarCollection: contract is not configured");
        require(_msgSender() == allowedToExecuteMint, "AvatarCollection: caller is not allowed");
        require(_wallet != address(0), "AvatarCollection: wallet is zero address");
        require(_amount > 0, "AvatarCollection: amount cannot be 0");

        _checkAndSetSignature({_address: _wallet, _signatureId: _signatureId, _signature: _signature});

        require(_checkWaveNotComplete(_amount), "AvatarCollection: wave completed");
        require(_checkLimitNotReached(_wallet, _amount), "AvatarCollection: max allowed");

        uint256 _price = price(_amount);
        if (_price > 0) {
            SafeERC20.safeTransferFrom(IERC20(_msgSender()), _wallet, mintTreasury, _price);
        }

        waveOwnerToClaimedCounts[_wallet][indexWave - 1] += _amount;

        waveTotalMinted += _amount;

        for (uint256 i; i < _amount; ) {
            _safeMint(_wallet, _getRandomToken(_wallet, totalSupply()));

            unchecked {++i;}
        }
    }

    /**
     * @notice helper function to emit the {MetadataUpdate} event in order for marketplaces to, on demand,
     *         refresh metadata, for the provided token ID. Off-chain, gaming mechanics are done and this
     *         function is ultimately called to signal the end of a reveal.
     * @dev will revert if owner of token is not caller or if signature is not valid
     * @custom:event {MetadataUpdate}
     * @param _tokenId the ID belonging to the NFT token for which to emit the event
     * @param _signatureId validation signature ID
     * @param _signature validation signature
     */
    function reveal(
        uint256 _tokenId,
        uint256 _signatureId,
        bytes memory _signature
    ) external whenNotPaused {
        address sender = _msgSender();
        require(ownerOf(_tokenId) == sender, "AvatarCollection: sender is not owner");

        _checkAndSetSignature({_address: sender, _signatureId: _signatureId, _signature: _signature});

        emit MetadataUpdate(_tokenId);
    }

    /**
     * @notice pauses the contract
     * @dev reverts if not owner of the collection or if not un-paused
     */
    function pause() external onlyOwner {
        super._pause();
    }

    /**
     * @notice unpauses the contract
     * @dev reverts if not owner of the collection or if not paused
     */
    function unpause() external onlyOwner {
        super._unpause();
    }

    /**
     * @notice personalize token traits according to the provided personalization bit-mask
     * @dev after checks, it is reduced to personalizationTraits[_tokenId] = _personalizationMask
     * @custom:event {Personalized}
     * @custom:event {MetadataUpdate}
     * @param _signatureId the ID of the provided signature
     * @param _signature signing signature
     * @param _tokenId what token to personalize
     * @param _personalizationMask a mask where each bit has a custom meaning in-game
     */
    function personalize(
        uint256 _signatureId,
        bytes memory _signature,
        uint256 _tokenId,
        uint256 _personalizationMask
    ) external whenNotPaused {
        require(ownerOf(_tokenId) == _msgSender(), "AvatarCollection: sender is not owner");

        require(_signatureIds[_signatureId] == 0, "AvatarCollection: signatureId already used");
        require(
            _checkPersonalizationSignature(
                _msgSender(),
                _signatureId,
                address(this),
                block.chainid,
                _tokenId,
                _personalizationMask,
                _signature
            ) == signAddress,
            "AvatarCollection: signature check failed"
        );

        _signatureIds[_signatureId] = 1;

        _updateTokenTraits(_tokenId, _personalizationMask);
    }

    /**
     * @notice personalize token traits but can be called by owner or special roles address
     *         Used to change the traits of a token based on an in-game action
     * @dev reverts if token does not exist or if not authorized
     * @custom:event {Personalized}
     * @custom:event {MetadataUpdate}
     * @param _tokenId what token to personalize
     * @param _personalizationMask a mask where each bit has a custom meaning in-game
     */
    function operatorPersonalize(uint256 _tokenId, uint256 _personalizationMask)
        external
        authorizedRole(TRANSFORMER_ROLE)
    {
        require(_exists(_tokenId), "AvatarCollection: invalid token ID");

        _updateTokenTraits(_tokenId, _personalizationMask);
    }

    /**
     * @notice Burns `tokenId`. The caller must own `tokenId` or be an approved operator.
     * @dev See {ERC721BurnMemoryEnumerableUpgradeable.burn}.
     *      Inherited in order to add the whenNotPaused modifier
     * @custom:event TokenBurned
     * @param tokenId the token id to be burned
     */
    function burn(uint256 tokenId) public override whenNotPaused {
        super.burn(tokenId);
    }

    /**
     * @notice enables burning of tokens
     * @dev reverts if burning already enabled.
     *      Inherited in order to add the onlyOwner modifier
     * @custom:event TokenBurningEnabled
     */
    function enableBurning() public override onlyOwner {
        super.enableBurning();
    }

    /**
     * @notice disables burning of tokens
     * @dev reverts if burning already disabled.
     *      Inherited in order to add the onlyOwner modifier
     * @custom:event TokenBurningDisabled
     */
    function disableBurning() public override onlyOwner {
        super.disableBurning();
    }

    /**
     * @notice saving locally the treasury address
     * @dev sets mintTreasury = _treasury
     * @custom:event {TreasurySet}
     * @param _treasury new treasury address to be saved
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "AvatarCollection: owner is zero address");
        mintTreasury = _treasury;
        emit TreasurySet(_treasury);
    }

    /**
     * @notice sets the sign address. Emits {SignAddressSet} event
     * @dev sets signAddress = _signAddress; address can't be 0
     * @custom:event {SignAddressSet}
     * @param _signAddress new signer address to be set
     */
    function setSignAddress(address _signAddress) external onlyOwner {
        require(_signAddress != address(0), "AvatarCollection: sign address is zero address");
        signAddress = _signAddress;
        emit SignAddressSet(_signAddress);
    }

    /**
     * @notice sets which address is allowed to execute the mint function. Also resets default mint price
     * @dev sets allowedToExecuteMint = _address; address must belong to a contract or reverts
     * @custom:event {AllowedExecuteMintSet}
     * @custom:event {DefaultMintingValuesSet}
     * @param _minterToken the address that will be allowed to execute the mint function
     */
    function setAllowedExecuteMint(address _minterToken) external onlyOwner {
        require(_isContract(_minterToken), "AvatarCollection: executor address is not a contract");
        allowedToExecuteMint = _minterToken;
        mintingDefaults.mintPrice = DEFAULT_MINT_PRICE_FULL * 10**IERC20Metadata(_minterToken).decimals();

        emit DefaultMintingValuesSet(
            mintingDefaults.mintPrice,
            mintingDefaults.maxPublicTokensPerWallet,
            mintingDefaults.maxAllowlistTokensPerWallet,
            mintingDefaults.maxMarketingTokens
        );
        emit AllowedExecuteMintSet(_minterToken);
    }

    /**
     * @notice sets the base token URI for the contract
     * @dev sets baseTokenURI = baseURI
     * @custom:event {BaseURISet}
     * @param baseURI an URI that will be used as the base for token URI
     */
    function setBaseURI(string memory baseURI) external authorizedRole(CONFIGURATOR_ROLE) {
        require(bytes(baseURI).length != 0, "AvatarCollection: baseURI is not set");
        baseTokenURI = baseURI;
        emit BaseURISet(baseURI);

        // Refreshes the whole collection (https://docs.opensea.io/docs/metadata-standards#metadata-updates)
        emit MetadataUpdate(type(uint256).max);
    }

    /**
     * @notice get the personalization of the indicated tokenID
     * @dev returns personalizationTraits[_tokenId]
     * @param _tokenId the token ID to check
     * @return the personalization data as uint256
     */
    function personalizationOf(uint256 _tokenId) external view returns (uint256) {
        return personalizationTraits[_tokenId];
    }

    /**
     * @notice check if the indicated wallet can mint the indicated amount
     * @param _wallet wallet to be checked if it can mint
     * @param _amount amount to be checked if can be minted
     * @return if can mint or not
     */
    function checkMintAllowed(address _wallet, uint256 _amount) external view returns (bool) {
        return _checkWaveNotComplete(_amount) && _checkLimitNotReached(_wallet, _amount);
    }

    /**
     * @notice get the price of minting the indicated number of tokens for the current wave
     * @dev returns waveSingleTokenPrice * _count; Does not check if it is possible
     *      to actually mint that much
     * @param _count the number of tokens to estimate mint price for
     * @return price of minting all the tokens
     */
    function price(uint256 _count) public view virtual returns (uint256) {
        return waveSingleTokenPrice * _count;
    }

    /**
     * @notice helper automation function
     * @dev returns block.chainid
     * @return current chainID for the blockchain
     */
    function chain() external view returns (uint256) {
        return block.chainid;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return interfaceId == type(AccessControlUpgradeable).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @notice returns the owner of the contract
     * @dev returns OwnableUpgradeable.owner()
     * @return owner of current contract
     */
    function owner() public view override(OwnableUpgradeable, UpdatableOperatorFiltererUpgradeable) returns (address) {
        return OwnableUpgradeable.owner();
    }

    /**
     * @dev See OpenZeppelin {IERC721-setApprovalForAll}
     */
    function setApprovalForAll(address operator, bool approved)
        public
        override(ERC721Upgradeable, IERC721Upgradeable)
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev See OpenZeppelin {IERC721-approve}
     */
    function approve(address operator, uint256 tokenId)
        public
        override(ERC721Upgradeable, IERC721Upgradeable)
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-transferFrom}
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-safeTransferFrom}
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-safeTransferFrom}
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /*//////////////////////////////////////////////////////////////
                    Internal and private functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice get base TokenURI
     * @dev returns baseTokenURI
     * @return baseTokenURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * @notice ERC2771 compatible msg.data getter
     * @dev returns ERC2771HandlerUpgradeable._msgData()
     * @return msg.data
     */
    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }

    /**
     * @notice ERC2771 compatible msg.sender getter
     * @dev returns ERC2771HandlerUpgradeable._msgSender()
     * @return sender msg.sender
     */
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        sender = ERC2771HandlerUpgradeable._msgSender();
    }

    /**
     * @notice checks that the provided signature is valid, while also taking into
     *         consideration the provided address and signatureId
     * @param _address address to be used in validating the signature
     * @param _signatureId signing signature ID
     * @param _signature signing signature value
     */
    function _checkAndSetSignature(
        address _address,
        uint256 _signatureId,
        bytes memory _signature
    ) internal {
        require(_signatureIds[_signatureId] == 0, "AvatarCollection: signatureId already used");
        require(
            _checkSignature(_address, _signatureId, address(this), block.chainid, _signature) == signAddress,
            "AvatarCollection: signature failed"
        );
        _signatureIds[_signatureId] = 1;
    }

    /**
     * @notice validates signature
     * @dev uses ECDSA.recover on the provided params
     * @param _wallet wallet that was used in signature generation
     * @param _signatureId id of signature
     * @param _contractAddress contract address that was used in signature generation
     * @param _chainId chain ID for which the signature was generated
     * @param _signature signature
     * @return address that validates the provided signature
     */
    function _checkSignature(
        address _wallet,
        uint256 _signatureId,
        address _contractAddress,
        uint256 _chainId,
        bytes memory _signature
    ) internal pure returns (address) {
        return
            ECDSA.recover(
                keccak256(
                    abi.encodePacked(
                        "\x19Ethereum Signed Message:\n32",
                        keccak256(abi.encode(_wallet, _signatureId, _contractAddress, _chainId))
                    )
                ),
                _signature
            );
    }

    /**
     * @notice validate personalization mask
     * @dev uses ECDSA.recover on the provided params
     * @param _wallet wallet that was used in signature generation
     * @param _signatureId id of signature
     * @param _contractAddress contract address that was used in signature generation
     * @param _chainId chain ID for which the signature was generated
     * @param _tokenId token ID for which the signature was generated
     * @param _personalizationMask a mask where each bit has a custom meaning in-game
     * @param _signature signature
     * @return address that validates the provided signature
     */
    function _checkPersonalizationSignature(
        address _wallet,
        uint256 _signatureId,
        address _contractAddress,
        uint256 _chainId,
        uint256 _tokenId,
        uint256 _personalizationMask,
        bytes memory _signature
    ) internal pure returns (address) {
        return
            ECDSA.recover(
                keccak256(
                    abi.encodePacked(
                        "\x19Ethereum Signed Message:\n32",
                        keccak256(
                            abi.encode(
                                _wallet,
                                _signatureId,
                                _contractAddress,
                                _chainId,
                                _tokenId,
                                _personalizationMask
                            )
                        )
                    )
                ),
                _signature
            );
    }

    /**
     * @notice check if the current wave can still mint the indicated amount
     * @param _amount number of tokens to check if can be minted
     * @return if wave can mint the indicated amount
     */
    function _checkWaveNotComplete(uint256 _amount) internal view returns (bool) {
        return _amount > 0 && waveTotalMinted + _amount <= waveMaxTokensOverall;
    }

    /**
     * @notice checks if current contract limits are respected if minting the indicated amount
     * @param _wallet minting wallet, whose restrictions will be considered
     * @param _amount number of tokens to mint
     * @return if amount can be safely minted
     */
    function _checkLimitNotReached(address _wallet, uint256 _amount) internal view returns (bool) {
        return
            waveOwnerToClaimedCounts[_wallet][indexWave - 1] + _amount <= waveMaxTokensPerWallet &&
            totalSupply() + _amount <= maxSupply;
    }

    /**
     * @notice actually updates the variables that store the personalization traits per token.
     * @dev no checks are done on input validations. Calling functions are expected to do them
     * @custom:event {Personalized}
     * @custom:event {MetadataUpdate}
     * @param _tokenId the ID for the token to personalize
     * @param _personalizationMask the personalization mask that will be applied
     */
    function _updateTokenTraits(uint256 _tokenId, uint256 _personalizationMask) internal {
        personalizationTraits[_tokenId] = _personalizationMask;

        emit Personalized(_tokenId, _personalizationMask);
        emit MetadataUpdate(_tokenId);
    }

    /**
     * @notice Pseudo-random number function. Good enough for our need, thx CyberKongs VX <3!
     * @dev pseudo-random implementation using keccak256 over various parameters.
     *      This function does not provide true randomness, it is pseudo-random. A determined attacker
     *      can identify what token ID will be generated but this has no impact as we shuffle metadata
     *      off-chain before any minting.
     * @param _wallet the calling account address
     * @param _totalSupply total amount of tokens stored by the contract up until this point.
     * @return pseudo-random value
     */
    function _getRandomToken(address _wallet, uint256 _totalSupply) private returns (uint256) {
        uint256 remaining = maxSupply - _totalSupply;
        uint256 rand =
            uint256(keccak256(abi.encodePacked(_wallet, block.difficulty, block.timestamp, remaining))) % remaining;
        uint256 value = rand;

        if (_availableIds[rand] != 0) {
            value = _availableIds[rand];
        }

        if (_availableIds[remaining - 1] == 0) {
            _availableIds[rand] = remaining - 1;
        } else {
            _availableIds[rand] = _availableIds[remaining - 1];
        }

        return value;
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
     * Empty storage space in contracts for future enhancements
     * ref: https://github.com/OpenZeppelin/<at>openzeppelin/contracts-upgradeable/issues/13
     */
    uint256[50] private __gap;
}
