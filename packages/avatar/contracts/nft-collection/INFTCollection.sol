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
        IERC20Metadata allowedToExecuteMint,
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
    event TokenRoyaltySet(address indexed operator, uint256 indexed tokenId, address indexed receiver, uint96 feeNumerator);


    /**
     * @notice Event emitted when default royalties are reset
     * @param operator the sender of the transaction
     */
    event TokenRoyaltyReset(address indexed operator, uint256 indexed tokenId);

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
     * @notice The operation failed because the signAddress is wrong
     * @param signAddress signer address that is allowed to create mint signatures
     */
    error InvalidSignAddress(address signAddress);

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
     * @notice The operation failed because signature is invalid or it was already used
     * @param signatureId the ID of the provided signature
     */
    error InvalidSignature(uint256 signatureId);

    /**
     * @notice The operation failed because the wave arguments are wrong
     * @param waveMaxTokensOverall the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param waveMaxTokensPerWallet max tokens to buy, per wallet in a given wave
     */
    error InvalidWaveData(uint256 waveMaxTokensOverall, uint256 waveMaxTokensPerWallet);

    /**
     * @notice The operation failed because the wave is completed
     * @param wallet wallet to be checked if it can mint
     * @param amount amount to be checked if can be minted
     */
    error CannotMint(address wallet, uint256 amount);

}
