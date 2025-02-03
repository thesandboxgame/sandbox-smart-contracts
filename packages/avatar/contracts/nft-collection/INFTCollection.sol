// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts-5.0.2/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts-5.0.2/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title INFTCollection
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice Events emitted and Error raised by the NFTCollection
 */
interface INFTCollection {

    /**
     * @notice minting can be denied because of the following reasons
    **/
    enum MintDenialReason {
        None,
        NotConfigured,
        InvalidAmount,
        GlobalMaxTokensPerWalletExceeded,
        WaveMaxTokensOverallExceeded,
        WaveMaxTokensPerWalletExceeded,
        MaxSupplyExceeded
    }

    /**
     * @notice Structure to hold initialization parameters
     * @param _collectionOwner the address that will be set as the owner of the collection
     * @param _initialBaseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _mintTreasury collection treasury address (where the payments are sent)
     * @param _signAddress signer address that is allowed to create mint signatures
     * @param _initialTrustedForwarder trusted forwarder address
     * @param _allowedToExecuteMint token address that is used for payments and that is allowed to execute mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _maxTokensPerWallet max tokens per wallet
     */
    struct InitializationParams {
        address collectionOwner;
        string initialBaseURI;
        string name;
        string symbol;
        address payable mintTreasury;
        address signAddress;
        address initialTrustedForwarder;
        IERC20Metadata allowedToExecuteMint;
        uint256 maxSupply;
        uint256 maxTokensPerWallet;
    }

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
     * @notice Structure used save minting wave information
     * @param waveMaxTokensOverall max tokens to buy per wave, cumulating all addresses
     * @param waveMaxTokensPerWallet max tokens to buy, per wallet in a given wave
     * @param waveSingleTokenPrice price of one token mint (in the token denoted by the allowedToExecuteMint contract)
     * @param waveTotalMinted number of total minted tokens in the current running wave
     * @param waveOwnerToClaimedCounts mapping of [owner -> minted count]
     */
    struct WaveData {
        uint256 waveMaxTokensOverall;
        uint256 waveMaxTokensPerWallet;
        uint256 waveSingleTokenPrice;
        uint256 waveTotalMinted;
        mapping(address => uint256) waveOwnerToClaimedCounts;
    }

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
     * @param maxTokensPerWallet maximum amount of tokens that can be minted per wallet across all waves
     */
    event ContractInitialized(
        string indexed baseURI,
        string indexed name,
        string indexed symbol,
        address mintTreasury,
        address signAddress,
        IERC20Metadata allowedToExecuteMint,
        uint256 maxSupply,
        uint256 maxTokensPerWallet
    );

    /**
     * @notice Event emitted when a wave was set up
     * @dev emitted when setupWave is called
     * @param operator the sender of the transaction
     * @param waveMaxTokens the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param waveMaxTokensToBuy max tokens to buy, per wallet in a given wave
     * @param waveSingleTokenPrice the price to mint a token in a given wave, in wei
     * @param waveIndex the current wave index
     */
    event WaveSetup(
        address indexed operator,
        uint256 waveMaxTokens,
        uint256 waveMaxTokensToBuy,
        uint256 waveSingleTokenPrice,
        uint256 waveIndex
    );

    /**
     * @notice Event emitted when a wave mint is completed
     * @param tokenId the token id
     * @param wallet the wallet address of the receiver
     * @param waveIndex the wave index
     */
    event WaveMint(uint256 tokenId, address indexed wallet, uint256 waveIndex);

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
     * @notice Event emitted when the max supply is set or changed
     * @dev emitted when setSignAddress is called
     * @param operator the sender of the transaction
     * @param oldMaxSupply old maximum amount of tokens that can be minted
     * @param newMaxSupply new maximum amount of tokens that can be minted
     */
    event MaxSupplySet(address indexed operator, uint256 oldMaxSupply, uint256 newMaxSupply);

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
    event TokenRoyaltySet(
        address indexed operator,
        uint256 indexed tokenId,
        address indexed receiver,
        uint96 feeNumerator
    );

    /**
     * @notice Event emitted when default royalties are reset
     * @param operator the sender of the transaction
     * @param tokenId the token id
     */
    event TokenRoyaltyReset(address indexed operator, uint256 indexed tokenId);

    /**
     * @notice Event emitted when the max tokens per wallet is set
     * @param operator the sender of the transaction
     * @param oldMaxTokensPerWallet old maximum tokens per wallet
     * @param newMaxTokensPerWallet new maximum tokens per wallet
     */
    event MaxTokensPerWalletSet(address indexed operator, uint256 oldMaxTokensPerWallet, uint256 newMaxTokensPerWallet);

    /**
      * @notice event emitted when a token was burned
     * @param operator the sender of the transaction
     * @param tokenId the id of the token that was burned
     * @param burner the owner that burned the token
     */
    event TokenBurned(address indexed operator, uint256 indexed tokenId, address indexed burner);

    /**
     * @notice event emitted when token burning was enabled
     * @param operator the sender of the transaction
     */
    event TokenBurningEnabled(address indexed operator);

    /**
     * @notice event emitted when token burning was disabled
     * @param operator the sender of the transaction
     */
    event TokenBurningDisabled(address indexed operator);

    /**
     * @notice The operation failed because the base token uri is empty.
     * @param baseURI an URI that will be used as the base for token URI
     */
    error InvalidBaseTokenURI(string baseURI);

    /**
     * @notice The operation failed the wave index is zero, no wave was ever configured
     */
    error ContractNotConfigured();

    /**
     * @notice The operation failed because the token name is invalid
     * @param name name of the ERC721 token
     */
    error InvalidName(string name);

    /**
     * @notice The operation failed because the token symbol is invalid
     * @param symbol token symbol of the ERC721 token
     */
    error InvalidSymbol(string symbol);

    /**
     * @notice The operation failed because the treasury is wrong
     * @param mintTreasury collection treasury address (where the payments are sent)
     */
    error InvalidTreasury(address mintTreasury);

    /**
     * @notice The operation failed because the allowedToExecuteMint is not a contract or wrong
     * @param allowedToExecuteMint token address that is used for payments and that is allowed to execute mint
     */
    error InvalidAllowedToExecuteMint(IERC20Metadata allowedToExecuteMint);

    /**
     * @notice The operation failed because the maxSupply is lower than totalSupply
     * @param maxSupply max supply of tokens to be allowed to be minted per contract
     * @param totalSupply amount of tokens minted till now
     */
    error LowMaxSupply(uint256 maxSupply, uint256 totalSupply);

    /**
     * @notice The operation failed because the batch data len is zero
     */
    error InvalidBatchData();

    /**
     * @notice The operation failed because the wave arguments are wrong
     * @param waveMaxTokensOverall the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param waveMaxTokensPerWallet max tokens to buy, per wallet in a given wave
     */
    error InvalidWaveData(uint256 waveMaxTokensOverall, uint256 waveMaxTokensPerWallet);

    /**
     * @notice The operation failed because the wave is completed
     * @param reason the reason for the denial
     * @param wallet wallet to be checked if it can mint
     * @param amount amount to be checked if can be minted
     * @param waveIndex the current wave index
     */
    error CannotMint(MintDenialReason reason, address wallet, uint256 amount, uint256 waveIndex);

    /**
     * @notice The operation failed because the max tokens per wallet is invalid
     * @param maxTokensPerWallet max tokens per wallet
     */
    error InvalidMaxTokensPerWallet(uint256 maxTokensPerWallet, uint256 maxSupply);

    /**
     * @notice The operation failed because the wave max tokens per wallet is higher than the global max tokens per wallet
     * @param waveMaxTokensPerWallet wave max tokens per wallet
     * @param maxTokensPerWallet global max tokens per wallet
     */
    error WaveMaxTokensHigherThanGlobalMax(uint256 waveMaxTokensPerWallet, uint256 maxTokensPerWallet);

    /**
     * @notice The operation failed because burning is enabled.
     */
    error EnforcedBurn();

    /**
     * @notice The operation failed because burning is disabled.
     */
    error ExpectedBurn();
}
