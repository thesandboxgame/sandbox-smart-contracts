// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/security/ReentrancyGuardUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/access/Ownable2StepUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/utils/ContextUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/security/PausableUpgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/token/common/ERC2981Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/token/ERC721/ERC721Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts-0.8.13/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts-0.8.13/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts-0.8.13/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts-0.8.13/token/ERC20/utils/SafeERC20.sol";
import {IERC4906} from "../common/IERC4906.sol";
import {UpdatableOperatorFiltererUpgradeable} from "./UpdatableOperatorFiltererUpgradeable.sol";
import {ERC2771HandlerUpgradeable} from "./ERC2771HandlerUpgradeable.sol";
import {ERC721BurnMemoryUpgradeable} from "./ERC721BurnMemoryUpgradeable.sol";

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
 * - supports ERC2771 for services like Biconomy
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
IERC4906
{
    /**
     * @notice Structure used to mint in batch
     * @param wallet destination address that will receive the tokens
     * @param amount of tokens to mint
     */
    struct BatchMintingData {
        address wallet;
        uint256 amount;
    }

    /**
     * @notice Structure used to group default minting parameters in order to avoid stack too deep error
     * @param mintPrice default mint price for both allowlist and public minting
     * @param maxPublicTokensPerWallet maximum tokens mint per wallet in the public minting
     * @param maxAllowListTokensPerWallet maximum tokens mint per wallet in the allowlist minting
     * @param maxMarketingTokens maximum allowed tokens to be minted in the marketing phase
     */
    struct MintingDefaults {
        uint256 mintPrice;
        uint256 maxPublicTokensPerWallet;
        uint256 maxAllowListTokensPerWallet;
        uint256 maxMarketingTokens;
    }

    /**
     * @notice default minting price in full tokens (not WEI) when used, this must be
     *         multiplied by the token "allowedToExecuteMint" token decimals
     */
    uint256 public constant DEFAULT_MINT_PRICE_FULL = 100;

    /**
     * @notice maximum amount of tokens that can be minted
     */
    uint256 public maxSupply;

    /**
     * @notice treasury address where the payment for minting are sent
     */
    address public mintTreasury;

    /**
     * @notice standard base token URL for ERC721 metadata
     */
    string public baseTokenURI;

    /**
     * @notice max tokens to buy per wave, cumulating all addresses
     */
    uint256 public waveMaxTokensOverall;

    /**
     * @notice max tokens to buy, per wallet in a given wave
     */
    uint256 public waveMaxTokensPerWallet;

    /**
     * @notice price of one token mint (in the token denoted by the allowedToExecuteMint contract)
     */
    uint256 internal waveSingleTokenPrice;

    /**
     * @notice number of total minted tokens in the current running wave
     */
    uint256 public waveTotalMinted;

    /**
      * @notice mapping of [owner -> wave index -> minted count]
      */
    mapping(address => mapping(uint256 => uint256)) public waveOwnerToClaimedCounts;

    /**
     * @notice each wave has an index to help track minting/tokens per wallet
     */
    uint256 public indexWave;

    /**
     * @notice default are used when calling predefined wave setup functions:
     *         setMarketingMint, setAllowlistMint and setPublicMint
     *         see struct MintingDefaults for more details
     */
    MintingDefaults public mintingDefaults;

    /**
     * @notice ERC20 contract through which the minting will be done (approveAndCall)
     *         When there is a price for the minting, the payment will be done using this token
     */
    IERC20 public allowedToExecuteMint;

    /**
      * @notice all signatures must come from this specific address, otherwise they are invalid
      */
    address public signAddress;

    /**
     * @notice stores the personalization mask for a tokenId
     */
    mapping(uint256 => uint256) internal personalizationTraits;

    /**
     * @dev map used to mark if a specific signatureId was used
     *      values are 0 (default, unused) and 1 (used)
     *      Used to avoid a signature reuse
     */
    mapping(uint256 => uint256) private _signatureIds;

    /**
     * @notice total amount of tokens minted till now
     */
    uint256 public totalSupply;

    /**
     * @notice Event emitted when the contract was initialized.
     * @dev emitted at proxy startup, only once
     * @param baseURI an URI that will be used as the base for token URI
     * @param name name of the ERC721 token
     * @param symbol token symbol of the ERC721 token
     * @param mintTreasury collection treasury address (where the payments are sent)
     * @param signAddress signer address that is allowed to create mint signatures
     * @param allowedToExecuteMint token address that is used for payments and that is allowed to execute mint
     * @param maxSupply max supply of tokens to be allowed to be minted per contract
     */
    event ContractInitialized(
        string indexed baseURI,
        string indexed name,
        string indexed symbol,
        address mintTreasury,
        address signAddress,
        address allowedToExecuteMint,
        uint256 maxSupply
    );

    /**
     * @notice Event emitted when a wave was set up
     * @dev emitted when setupWave is called
     * @param operator the sender of the transaction
     * @param waveMaxTokens the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param waveMaxTokensToBuy max tokens to buy, per wallet in a given wave
     * @param waveSingleTokenPrice the price to mint a token in a given wave, in wei
     * @param prevMinted the amount of tokens minted in previous wave
     * @param waveIndex the current wave index
     */
    event WaveSetup(
        address indexed operator,
        uint256 waveMaxTokens,
        uint256 waveMaxTokensToBuy,
        uint256 waveSingleTokenPrice,
        uint256 prevMinted,
        uint256 waveIndex
    );

    /**
     * @notice Event emitted when an address was set as allowed to mint
     * @dev emitted when setAllowedExecuteMint is called
     * @param operator the sender of the transaction
     * @param oldToken old address that is used for payments and that is allowed to execute mint
     * @param newToken new address that is used for payments and that is allowed to execute mint
     */
    event AllowedExecuteMintSet(address indexed operator, IERC20 indexed oldToken, IERC20 indexed newToken);

    /**
     * @notice Event emitted when the treasury address was saved
     * @dev emitted when setTreasury is called
     * @param operator the sender of the transaction
     * @param oldTreasury old collection treasury address (where the payments are sent)
     * @param newTreasury new collection treasury address (where the payments are sent)
     */
    event TreasurySet(address indexed operator, address indexed oldTreasury, address indexed newTreasury);

    /**
     * @notice Event emitted when the base token URI for the contract was set or changed
     * @dev emitted when setBaseURI is called
     * @param operator the sender of the transaction
     * @param oldBaseURI old URI that will be used as the base for token metadata URI
     * @param newBaseURI new URI that will be used as the base for token metadata URI
     */
    event BaseURISet(address indexed operator, string oldBaseURI, string newBaseURI);

    /**
     * @notice Event emitted when the signer address was set or changed
     * @dev emitted when setSignAddress is called
     * @param operator the sender of the transaction
     * @param oldSignAddress old signer address that is allowed to create mint signatures
     * @param newSignAddress new signer address that is allowed to create mint signatures
     */
    event SignAddressSet(address indexed operator, address indexed oldSignAddress, address indexed newSignAddress);

    /**
     * @notice Event emitted when the default values used by wave manipulation functions were changed
     * @dev emitted when initialize or setWaveDefaults is called
     * @param operator the sender of the transaction
     * @param oldMintPrice old default mint price for both allow list and public minting
     * @param newMintPrice new default mint price for both allow list and public minting
     * @param maxPublicTokensPerWallet maximum tokens mint per wallet in the public minting
     * @param maxAllowListTokensPerWallet maximum tokens mint per wallet in the allow list minting
     * @param maxMarketingTokens maximum allowed tokens to be minted in the marketing phase
     */
    event DefaultMintingValuesSet(
        address indexed operator,
        uint256 oldMintPrice,
        uint256 newMintPrice,
        uint256 maxPublicTokensPerWallet,
        uint256 maxAllowListTokensPerWallet,
        uint256 maxMarketingTokens
    );

    /**
     * @notice Event emitted when a token personalization was made.
     * @dev emitted when personalize is called
     * @param operator the sender of the transaction
     * @param tokenId id of the token which had the personalization done
     * @param personalizationMask the exact personalization that was done, as a custom meaning bit-mask
     */
    event Personalized(address indexed operator, uint256 indexed tokenId, uint256 indexed personalizationMask);


    /**
     * @notice Event emitted when a token personalization was made.
     * @param operator the sender of the transaction
     * @param receiver the receiver of the royalties
     * @param feeNumerator percentage of the royalties in feeDenominator units
     */
    event DefaultRoyaltySet(address indexed operator, address indexed receiver, uint96 feeNumerator);


    /**
     * @notice Event emitted when default royalties are reset
     * @param operator the sender of the transaction
     */
    event DefaultRoyaltyReset(address indexed operator);

    /**
     * @notice Event emitted when a token personalization was made.
     * @param operator the sender of the transaction
     * @param tokenId the token id
     * @param receiver the receiver of the royalties
     * @param feeNumerator percentage of the royalties in feeDenominator units
     */
    event TokenRoyaltySet(address indexed operator, uint256 indexed tokenId, address indexed receiver, uint96 feeNumerator);


    /**
     * @notice Event emitted when default royalties are reset
     * @param operator the sender of the transaction
     */
    event TokenRoyaltyReset(address indexed operator, uint256 indexed tokenId);


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
     * @dev calls all the init functions from the base classes. Emits {ContractInitialized} event
     * @param _collectionOwner the address that will be set as the owner of the collection
     * @param _initialBaseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _mintTreasury collection treasury address (where the payments are sent)
     * @param _signAddress signer address that is allowed to create mint signatures
     * @param _initialTrustedForwarder trusted forwarder address
     * @param _allowedToExecuteMint token address that is used for payments and that is allowed to execute mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
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
        MintingDefaults memory _mintingDefaults
    ) external virtual initializer {
        __NFTCollection_init(
            _collectionOwner,
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _initialTrustedForwarder,
            _allowedToExecuteMint,
            _maxSupply,
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
     * @param _mintTreasury collection treasury address (where the payments are sent)
     * @param _signAddress signer address that is allowed to create mint signatures
     * @param _initialTrustedForwarder trusted forwarder address
     * @param _allowedToExecuteMint token address that is used for payments and that is allowed to execute mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _mintingDefaults default minting values for predefined wave helpers
     */
    function __NFTCollection_init(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _allowedToExecuteMint,
        uint256 _maxSupply,
        MintingDefaults memory _mintingDefaults
    ) internal onlyInitializing {
        require(bytes(_initialBaseURI).length != 0, "NFTCollection: baseURI is not set");
        require(bytes(_name).length != 0, "NFTCollection: name is empty");
        require(bytes(_symbol).length != 0, "NFTCollection: symbol is empty");
        require(_mintTreasury != address(0), "NFTCollection: treasury is zero address");
        require(_signAddress != address(0), "NFTCollection: sign address is zero address");
        require(_isContract(_allowedToExecuteMint), "NFTCollection: executor address is not a contract");
        require(_maxSupply > 0, "NFTCollection: max supply should be more than 0");

        require(_mintingDefaults.mintPrice > 0, "NFTCollection: public mint price cannot be 0");
        require(
            _mintingDefaults.maxPublicTokensPerWallet <= _maxSupply &&
            _mintingDefaults.maxAllowListTokensPerWallet <= _maxSupply,
            "NFTCollection: invalid tokens per wallet configuration"
        );
        require(_mintingDefaults.maxMarketingTokens <= _maxSupply, "NFTCollection: invalid marketing share");

        __ReentrancyGuard_init();
        // @dev we don't want to set the owner to _msgSender, so, we don't call __Ownable_init
        _transferOwnership(_collectionOwner);
        __ERC2981_init();
        _setTrustedForwarder(_initialTrustedForwarder);
        __ERC721_init(_name, _symbol);
        __Pausable_init();
        baseTokenURI = _initialBaseURI;
        mintTreasury = _mintTreasury;
        signAddress = _signAddress;
        allowedToExecuteMint = IERC20(_allowedToExecuteMint);
        maxSupply = _maxSupply;

        emit DefaultMintingValuesSet(
            _msgSender(),
            0,
            _mintingDefaults.mintPrice,
            _mintingDefaults.maxPublicTokensPerWallet,
            _mintingDefaults.maxAllowListTokensPerWallet,
            _mintingDefaults.maxMarketingTokens
        );
        mintingDefaults = _mintingDefaults;

        emit ContractInitialized(
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _allowedToExecuteMint,
            _maxSupply
        );
    }

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
    ) external onlyOwner {
        require(_waveMaxTokensOverall <= maxSupply, "NFTCollection: _waveMaxTokens exceeds maxSupply");
        require(_waveMaxTokensOverall > 0, "NFTCollection: max tokens to mint is 0");
        require(_waveMaxTokensPerWallet > 0, "NFTCollection: max tokens to mint per wallet is 0");
        require(_waveMaxTokensPerWallet <= _waveMaxTokensOverall, "NFTCollection: invalid supply configuration");
        _setupWave(_waveMaxTokensOverall, _waveMaxTokensPerWallet, _waveSingleTokenPrice);
    }

    /**
     * @notice helper function to set all token configs to that of the marketing minting phase.
     *         Uses default values set on contract initialization
     * @custom:event {WaveSetup}
     */
    function setMarketingMint() external onlyOwner {
        _setupWave(mintingDefaults.maxMarketingTokens, mintingDefaults.maxMarketingTokens, 0);
    }

    /**
     * @notice helper function to set all token configs to that of the allow list minting phase.
     *         Uses default values set on contract initialization
     * @custom:event {WaveSetup}
     */
    function setAllowListMint() external onlyOwner {
        // @dev maxSupply <= totalSupply, see: _checkTotalNotReached
        _setupWave(maxSupply - totalSupply, mintingDefaults.maxAllowListTokensPerWallet, mintingDefaults.mintPrice);
    }

    /**
     * @notice helper function to set all token configs to that of the public minting phase.
     *         Uses default values set on contract initialization
     * @custom:event {WaveSetup}
     */
    function setPublicMint() external onlyOwner {
        // @dev maxSupply <= totalSupply, see: _checkTotalNotReached
        _setupWave(maxSupply - totalSupply, mintingDefaults.maxPublicTokensPerWallet, mintingDefaults.mintPrice);
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
        bytes calldata _signature
    ) external whenNotPaused nonReentrant {
        require(indexWave > 0, "NFTCollection: contract is not configured");
        require(_msgSender() == address(allowedToExecuteMint), "NFTCollection: caller is not allowed");
        require(_wallet != address(0), "NFTCollection: wallet is zero address");
        require(_amount > 0, "NFTCollection: amount cannot be 0");

        _checkAndSetSignature({_address : _wallet, _signatureId : _signatureId, _signature : _signature});

        require(_checkWaveNotComplete(_amount), "NFTCollection: wave completed");
        require(_checkLimitPerWalletNotReached(_wallet, _amount), "NFTCollection: max allowed");
        require(_checkTotalNotReached(_amount), "NFTCollection: max reached");

        uint256 _price = price(_amount);
        if (_price > 0) {
            SafeERC20.safeTransferFrom(allowedToExecuteMint, _wallet, mintTreasury, _price);
        }

        for (uint256 i; i < _amount; i++) {
            // @dev start with tokenId = 1
            _safeMint(_wallet, totalSupply + i + 1);
        }
        waveOwnerToClaimedCounts[_wallet][indexWave - 1] += _amount;
        waveTotalMinted += _amount;
        totalSupply += _amount;
    }

    /**
     * @notice batch minting function, used by owner to airdrop directly to users.
     * @dev this methods takes a list of destination wallets and can only be used by the owner of the contract
     * @custom:event {Transfer}
     * @param wallets list of destination wallets and amounts
     */
    function batchMint(BatchMintingData[] calldata wallets) external whenNotPaused nonReentrant onlyOwner {
        require(indexWave > 0, "NFTCollection: contract is not configured");
        uint256 len = wallets.length;
        require(len > 0, "NFTCollection: wallets length cannot be 0");

        for (uint256 i; i < len; i++) {
            address wallet = wallets[i].wallet;
            uint256 amount = wallets[i].amount;
            require(amount > 0, "NFTCollection: amount cannot be 0");
            require(_checkWaveNotComplete(amount), "NFTCollection: wave completed");
            require(_checkTotalNotReached(amount), "NFTCollection: max reached");
            require(_checkLimitPerWalletNotReached(wallet, amount), "NFTCollection: max allowed");

            for (uint256 j; j < amount; j++) {
                // @dev _mint already checks the destination address
                // @dev start with tokenId = 1
                _mint(wallet, totalSupply + j + 1);
            }
            waveOwnerToClaimedCounts[wallet][indexWave - 1] += amount;
            waveTotalMinted += amount;
            totalSupply += amount;
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
        bytes calldata _signature
    ) external whenNotPaused {
        address sender = _msgSender();
        require(ownerOf(_tokenId) == sender, "NFTCollection: sender is not owner");

        _checkAndSetSignature({_address : sender, _signatureId : _signatureId, _signature : _signature});

        emit MetadataUpdate(_tokenId);
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
        bytes calldata _signature,
        uint256 _tokenId,
        uint256 _personalizationMask
    ) external whenNotPaused {
        require(ownerOf(_tokenId) == _msgSender(), "NFTCollection: sender is not owner");

        require(_signatureIds[_signatureId] == 0, "NFTCollection: signatureId already used");
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
            "NFTCollection: signature check failed"
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
    function operatorPersonalize(uint256 _tokenId, uint256 _personalizationMask) external onlyOwner
    {
        require(_exists(_tokenId), "NFTCollection: invalid token ID");
        _updateTokenTraits(_tokenId, _personalizationMask);
    }

    /**
     * @notice Burns `tokenId`. The caller must own `tokenId` or be an approved operator.
     * @dev See {ERC721BurnMemoryEnumerableUpgradeable.burn}.
     * @custom:event TokenBurned
     * @param tokenId the token id to be burned
     */
    function burn(uint256 tokenId) external whenNotPaused {
        _burn(tokenId);
    }

    /**
     * @notice enables burning of tokens
     * @dev reverts if burning already enabled.
     * @custom:event TokenBurningEnabled
     */
    function enableBurning() external onlyOwner {
        _enableBurning();
    }

    /**
     * @notice disables burning of tokens
     * @dev reverts if burning already disabled.
     * @custom:event TokenBurningDisabled
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
     * @custom:event {TreasurySet}
     * @param _treasury new treasury address to be saved
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "NFTCollection: owner is zero address");
        emit TreasurySet(_msgSender(), mintTreasury, _treasury);
        mintTreasury = _treasury;
    }

    /**
     * @notice updates the sign address.
     * @custom:event {SignAddressSet}
     * @param _signAddress new signer address to be set
     */
    function setSignAddress(address _signAddress) external onlyOwner {
        require(_signAddress != address(0), "NFTCollection: sign address is zero address");
        emit SignAddressSet(_msgSender(), signAddress, _signAddress);
        signAddress = _signAddress;
    }

    /**
     * @notice updates which address is allowed to execute the mint function.
     * @dev also resets default mint price
     * @custom:event {AllowedExecuteMintSet}
     * @custom:event {DefaultMintingValuesSet}
     * @param _minterToken the address that will be allowed to execute the mint function
     */
    function setAllowedExecuteMint(IERC20Metadata _minterToken) external onlyOwner nonReentrant {
        require(_isContract(address(_minterToken)), "NFTCollection: executor address is not a contract");
        uint256 newPrice = DEFAULT_MINT_PRICE_FULL * 10 ** IERC20Metadata(_minterToken).decimals();

        emit AllowedExecuteMintSet(_msgSender(), allowedToExecuteMint, _minterToken);
        emit DefaultMintingValuesSet(
            _msgSender(),
            mintingDefaults.mintPrice,
            newPrice,
            mintingDefaults.maxPublicTokensPerWallet,
            mintingDefaults.maxAllowListTokensPerWallet,
            mintingDefaults.maxMarketingTokens
        );
        allowedToExecuteMint = _minterToken;
        mintingDefaults.mintPrice = newPrice;
    }

    /**
     * @notice updates the base token URI for the contract
     * @custom:event {BaseURISet}
     * @param baseURI an URI that will be used as the base for token URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        require(bytes(baseURI).length != 0, "NFTCollection: baseURI is not set");
        emit BaseURISet(_msgSender(), baseTokenURI, baseURI);
        baseTokenURI = baseURI;

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
     */
    function register(address subscriptionOrRegistrantToCopy, bool subscribe) external onlyOwner {
        require(subscriptionOrRegistrantToCopy != address(0), "invalid address");
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
        address msgSender = _msgSender();
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 tokenId = ids[i];
            require(_isApprovedOrOwner(msgSender, tokenId), "ERC721: caller is not token owner or approved");
            _safeTransfer(from, to, tokenId, data);
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
        address msgSender = _msgSender();
        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 tokenId = ids[i];
            require(_isApprovedOrOwner(msgSender, tokenId), "ERC721: caller is not token owner or approved");
            _transfer(from, to, tokenId);
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
    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
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
    function setApprovalForAll(address operator, bool approved)
    public
    override
    onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev See OpenZeppelin {IERC721-approve}
     */
    function approve(address operator, uint256 tokenId)
    public
    override
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
    ) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev See OpenZeppelin {IERC721-safeTransferFrom}
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override onlyAllowedOperator(from) {
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
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @notice get the personalization of the indicated tokenID
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
        return _amount > 0
        && _checkWaveNotComplete(_amount)
        && _checkLimitPerWalletNotReached(_wallet, _amount)
        && _checkTotalNotReached(_amount);

    }

    /**
     * @notice get the price of minting the indicated number of tokens for the current wave
     * @param _count the number of tokens to estimate mint price for
     * @return price of minting all the tokens
     */
    function price(uint256 _count) public view virtual returns (uint256) {
        return waveSingleTokenPrice * _count;
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
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC2981Upgradeable, ERC721Upgradeable)
    returns (bool)
    {
        return ERC2981Upgradeable.supportsInterface(interfaceId)
        || ERC721Upgradeable.supportsInterface(interfaceId);
    }

    /**
     * @notice function to setup wave parameters. A wave is defined as a combination of allowed number tokens to be
     *         minted in total, per wallet and minting price
     * @custom:event {WaveSetup}
     * @param _waveMaxTokensOverall the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param _waveMaxTokensPerWallet max tokens to buy, per wallet in a given wave
     * @param _waveSingleTokenPrice the price to mint a token in a given wave, in wei
     *                              denoted by the allowedToExecuteMint contract
     */
    function _setupWave(
        uint256 _waveMaxTokensOverall,
        uint256 _waveMaxTokensPerWallet,
        uint256 _waveSingleTokenPrice
    ) internal {
        waveMaxTokensOverall = _waveMaxTokensOverall;
        waveMaxTokensPerWallet = _waveMaxTokensPerWallet;
        waveSingleTokenPrice = _waveSingleTokenPrice;
        emit WaveSetup(_msgSender(), _waveMaxTokensOverall, _waveMaxTokensPerWallet, _waveSingleTokenPrice, waveTotalMinted, indexWave);
        waveTotalMinted = 0;
        indexWave++;
    }

    /**
     * @notice get base TokenURI
     * @return baseTokenURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
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
    override(ContextUpgradeable, ERC2771HandlerUpgradeable)
    returns (address sender)
    {
        sender = ERC2771HandlerUpgradeable._msgSender();
    }

    /**
     * @notice checks that the provided signature is valid, while also taking into
     *         consideration the provided address and signatureId.
     * @param _address address to be used in validating the signature
     * @param _signatureId signing signature ID
     * @param _signature signing signature value
     */
    function _checkAndSetSignature(
        address _address,
        uint256 _signatureId,
        bytes calldata _signature
    ) internal {
        require(_signatureIds[_signatureId] == 0, "NFTCollection: signatureId already used");
        require(
            _checkSignature(_address, _signatureId, address(this), block.chainid, _signature) == signAddress,
            "NFTCollection: signature failed"
        );
        _signatureIds[_signatureId] = 1;
    }

    /**
     * @notice validates signature
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
        bytes calldata _signature
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
        bytes calldata _signature
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
        return waveTotalMinted + _amount <= waveMaxTokensOverall;
    }

    /**
     * @notice checks if current contract limits are respected if minting the indicated amount
     * @param _wallet minting wallet, whose restrictions will be considered
     * @param _amount number of tokens to mint
     * @return if amount can be safely minted
     */
    function _checkLimitPerWalletNotReached(address _wallet, uint256 _amount) internal view returns (bool) {
        return waveOwnerToClaimedCounts[_wallet][indexWave - 1] + _amount <= waveMaxTokensPerWallet;
    }

    /**
     * @notice checks if the total supply was not reached
     * @param _amount number of tokens to mint
     * @return if amount can be safely minted
     */
    function _checkTotalNotReached(uint256 _amount) internal view returns (bool) {
        return totalSupply + _amount <= maxSupply;
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

        emit Personalized(_msgSender(), _tokenId, _personalizationMask);
        emit MetadataUpdate(_tokenId);
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
