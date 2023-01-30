// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {Address} from "@openzeppelin/contracts-0.8.13/utils/Address.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-0.8.13/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts-0.8.13/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8.13/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-0.8.13/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-0.8.13/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-0.8.13/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable-0.8.13/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-0.8.13/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable-0.8.13/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

import {ERC2771HandlerUpgradeable} from "../common/BaseWithStorage/ERC2771/ERC2771HandlerUpgradeable.sol";
import {
    UpdatableOperatorFiltererUpgradeable
} from "../common/OperatorFilterer/UpdatableOperatorFiltererUpgradeable.sol";

/* solhint-disable max-states-count */
/**
 * @title GenericRaffle
 * @notice Smart contract based used for creating Original Sandbox Collections
 *         There are 2 different roles that operate within the contract:
 *         - owner -> standard owner implementation (calls setupWave, updateOperatorFilterRegistryAddress,
 *                    and other sensistive functions)
 *         - allowedToExecuteMint -> address allowed to execute mint function. Can be set by owner
 */
contract GenericRaffle is
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC2771HandlerUpgradeable,
    UpdatableOperatorFiltererUpgradeable
{
    using Address for address;
    /// @notice max token supply
    uint256 public maxSupply;

    /**
     * @notice Event emitted when sale state was changed.
     * @dev emitted when toggleSale is called
     * @param _pause if the sale was was paused or not
     */
    event SaleToggled(bool _pause);

    /**
     * @notice Event emitted when a token personalization was made.
     * @dev emitted when personalize is called
     * @param _tokenId id of the token which had the personalization done
     * @param _personalizationMask the exact personalization that was done, as a custom meaning bit-mask
     */
    event Personalized(uint256 _tokenId, uint256 _personalizationMask);

    /**
     * @notice Event emitted when the contract was initialized.
     * @dev emitted at proxy startup, once only
     * @param baseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _sandOwner address belonging to SAND token owner
     * @param _signAddress signer address that is allowed to mint
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     * @param _registry filter registry to which to register with. For blocking operators that do not respect royalties
     * @param _operatorFiltererSubscription subscription address to use as a template for
     * @param _operatorFiltererSubscriptionSubscribe if to subscribe tot the operatorFiltererSubscription address or
     *                                               just copy entries from it
     */
    event ContractInitialized(
        string baseURI,
        string _name,
        string _symbol,
        address _sandOwner,
        address _signAddress,
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
     * @param _waveSingleTokenPrice the price to mint a token in a given wave. In SAND wei
     */
    event WaveSetup(uint256 _waveMaxTokens, uint256 _waveMaxTokensToBuy, uint256 _waveSingleTokenPrice);

    /**
     * @notice Event emitted when an address was set as allowed to mint
     * @dev emitted when setAllowedExecuteMint is called
     * @param _address the address that will be allowed to set execute the mint function
     */
    event AllowedExecuteMintSet(address _address);

    /**
     * @notice Event emitted when the SAND contract owner was saved
     * @dev emitted when setSandOwnerAddress is called
     * @param _owner new owner address to be saved
     */
    event SandOwnerSet(address _owner);

    /**
     * @notice Event emitted when the base token URI for the contract was set or changed
     * @dev emitted when setBaseURI is called
     * @param baseURI an URI that will be used as the base for token URI
     */
    event BaseURISet(string baseURI);

    /**
     * @notice Event emitted when the signer address was set or changed
     * @dev emitted when setSignAddress is called
     * @param _signAddress new signer address to be set
     */
    event SignAddressSet(address _signAddress);

    /// @notice max tokens to buy per wave, cumulating all addresses
    uint256 public waveMaxTokens;
    /// @notice max tokens to buy, per wallet in a given wave
    uint256 public waveMaxTokensToBuy;
    /// @notice price of one token mint (in the token owned by the sandOwner which in our case is SAND)
    uint256 public waveSingleTokenPrice;
    /// @notice number of total minted tokens in the current running wave
    uint256 public waveTotalMinted;

    mapping(address => mapping(uint256 => uint256)) public waveOwnerToClaimedCounts;
    /// @notice stores the personalization for a tokenId
    mapping(uint256 => uint256) public personalizationTraits;
    uint256 public indexWave;
    uint256 public paused;

    mapping(uint256 => uint256) private signatureIds;
    mapping(uint256 => uint256) private availableIds;

    address public allowedToExecuteMint;
    address public sandOwner;
    address public signAddress;
    string public baseTokenURI;

    /**
     * @notice mitigate a possible Implementation contract takeover, as indicate by
     *         https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice initialization function in accordance with the upgradable pattern
     * @dev calls all the init functions from the base classes. Emits {ContractInitialized} event
     * @param baseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _sandOwner address belonging to SAND token owner
     * @param _signAddress signer address that is allowed to mint
     * @param _trustedForwarder trusted forwarder address
     * @param _registry filter registry to which to register with. For blocking operators that do not respect royalties
     * @param _operatorFiltererSubscription subscription address to use as a template for
     * @param _operatorFiltererSubscriptionSubscribe if to subscribe tot the operatorFiltererSubscription address or
     *                                               just copy entries from it
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     */
    function __GenericRaffle_init(
        string memory baseURI,
        string memory _name,
        string memory _symbol,
        address payable _sandOwner,
        address _signAddress,
        address _trustedForwarder,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe,
        uint256 _maxSupply
    ) internal onlyInitializing {
        __ERC721_init(_name, _symbol);
        __ERC2771Handler_initialize(_trustedForwarder);
        __Ownable_init_unchained();
        __ReentrancyGuard_init();
        __UpdatableOperatorFiltererUpgradeable_init(
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe
        );
        setBaseURI(baseURI);
        require(bytes(baseURI).length != 0, "baseURI is not set");
        require(bytes(_name).length != 0, "_name is not set");
        require(bytes(_symbol).length != 0, "_symbol is not set");
        require(_signAddress != address(0x0), "Sign address is zero address");
        require(_trustedForwarder != address(0x0), "Trusted forwarder is zero address");
        require(_sandOwner != address(0x0), "Sand owner is zero address");
        require(_maxSupply > 0, "Max supply should be more than 0");
        sandOwner = _sandOwner;
        signAddress = _signAddress;
        maxSupply = _maxSupply;

        emit ContractInitialized(
            baseURI,
            _name,
            _symbol,
            _sandOwner,
            _signAddress,
            _maxSupply,
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe
        );
    }

    /**
     * @notice function to setup wave parameters. A wave is defined as a combination of allowed number tokens to be
     *         minted in total, per wallet and minting price
     * @dev emits {WaveSetup} event
     * @param _waveMaxTokens the allowed number of tokens to be minted in this wave (cumulative by all minting wallets)
     * @param _waveMaxTokensToBuy max tokens to buy, per wallet in a given wave
     * @param _waveSingleTokenPrice the price to mint a token in a given wave. In SAND wei
     */
    function setupWave(
        uint256 _waveMaxTokens,
        uint256 _waveMaxTokensToBuy,
        uint256 _waveSingleTokenPrice
    ) external onlyOwner {
        require(_waveMaxTokens <= maxSupply, "_waveMaxTokens should not exceed maxSupply");
        require(_waveMaxTokens > 0 && _waveMaxTokensToBuy > 0, "Invalid configuration");
        require(paused == 0, "Contract is paused");
        require(_waveMaxTokensToBuy <= _waveMaxTokens, "Invalid supply configuration");

        waveMaxTokens = _waveMaxTokens;
        waveMaxTokensToBuy = _waveMaxTokensToBuy;
        waveSingleTokenPrice = _waveSingleTokenPrice;
        waveTotalMinted = 0;
        indexWave++;

        emit WaveSetup(_waveMaxTokens, _waveMaxTokensToBuy, _waveSingleTokenPrice);
    }

    /**
     * @notice token minting function. Price is set by wave and is paid in SAND tokens
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
    ) external nonReentrant {
        require(indexWave > 0, "Contract is not configured");
        require(_msgSender() == allowedToExecuteMint, "Not allowed");
        require(paused == 0, "Contract is paused");
        require(_wallet != address(0x0), "Wallet is zero address");
        require(_amount > 0, "Amount cannot be 0");
        require(signatureIds[_signatureId] == 0, "signatureId already used");
        require(
            _checkSignature(_wallet, _signatureId, address(this), block.chainid, _signature) == signAddress,
            "Signature failed"
        );

        signatureIds[_signatureId] = 1;

        require(_checkWaveNotComplete(_amount), "Wave completed");
        require(_checkLimitNotReached(_wallet, _amount), "Max allowed");

        uint256 _price = price(_amount);
        if (_price > 0) {
            SafeERC20.safeTransferFrom(IERC20(_msgSender()), _wallet, sandOwner, _price);
        }

        waveOwnerToClaimedCounts[_wallet][indexWave - 1] += _amount;

        waveTotalMinted += _amount;

        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = getRandomToken(_wallet, totalSupply());
            _safeMint(_wallet, tokenId);
        }
    }

    /**
     * @notice pause or unpause the contract. Emits the {SaleToggled} event
     * @dev toggle the paused
     */
    function toggleSale() external onlyOwner {
        paused = paused == 0 ? 1 : 0;
        emit SaleToggled(paused == 1);
    }

    /**
     * @notice personalize token traits
     * @dev after checks, it is reduced to personalizationTraits[_tokenId] = _personalizationMask
     *      emits {Personalized} event
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
    ) external {
        require(ownerOf(_tokenId) == _msgSender(), "You must be the owner of the token in order to personalize it");

        require(signatureIds[_signatureId] == 0, "SignatureId already used");
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
            "Signature failed"
        );

        signatureIds[_signatureId] = 1;

        personalizationTraits[_tokenId] = _personalizationMask;
        emit Personalized(_tokenId, _personalizationMask);
    }

    /**
     * @notice sets which address is allowed to execute the mint function.
     *         Emits {AllowedExecuteMintSet} event
     * @dev sets allowedToExecuteMint = _address; address can't be 0
     * @param _address the address that will be allowed to set execute the mint function
     */
    function setAllowedExecuteMint(address _address) external onlyOwner {
        require(_address != address(0x0), "Address is zero address");
        allowedToExecuteMint = _address;
        emit AllowedExecuteMintSet(_address);
    }

    /**
     * @notice saving locally the SAND token owner. Emits {SandOwnerSet} event
     * @dev just sets sandOwner = _owner
     * @param _owner new owner address to be saved
     */
    function setSandOwnerAddress(address _owner) external onlyOwner {
        require(_owner != address(0x0), "Owner is zero address");
        sandOwner = _owner;
        emit SandOwnerSet(_owner);
    }

    /**
     * @notice sets the sign address. Emits {SignAddressSet} event
     * @dev sets signAddress = _signAddress; address can't be 0
     * @param _signAddress new signer address to be set
     */
    function setSignAddress(address _signAddress) external onlyOwner {
        require(_signAddress != address(0x0), "Sign address is zero address");
        signAddress = _signAddress;
        emit SignAddressSet(_signAddress);
    }

    /**
     * @notice get the personalization of the indicated tokenID
     * @dev returns personalizationTraits[_tokenId]
     * @param _tokenId the token ID to check
     * @return uint256 the personalization data as uint256
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
     * @notice helper automation function
     * @dev returns block.chainid
     * @return uint256 current chainID for the blockchain
     */
    function chain() external view returns (uint256) {
        return block.chainid;
    }

    /**
     * @notice sets the base token URI for the contract. Emits a {BaseURISet} event.
     * @dev sets baseTokenURI = baseURI
     * @param baseURI an URI that will be used as the base for token URI
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        require(bytes(baseURI).length != 0, "baseURI is not set");
        baseTokenURI = baseURI;
        emit BaseURISet(baseURI);
    }

    /**
     * @notice function renounces ownership of contract. Currently it is disable,
     *         as to not risk loosing mint funds
     * @dev reverts on call
     */
    function renounceOwnership() public virtual override onlyOwner {
        revert("Renounce ownership is not available");
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

    /**
     * @notice get the price of minting the indicated number of tokens for the current wave
     * @dev returns waveSingleTokenPrice * _count; Does not check if it is possible
     *      to actually mint that much
     * @param _count the number of tokens to estimate mint price for
     * @return uint256 price of minting all the tokens
     */
    function price(uint256 _count) public view virtual returns (uint256) {
        return waveSingleTokenPrice * _count;
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
        return ERC2771HandlerUpgradeable._msgSender();
    }

    /**
     * @notice check if the current wave can still mint the indicated amount
     * @param _amount number of tokens to check if can be minted
     * @return if wave can mint the indicated amount
     */
    function _checkWaveNotComplete(uint256 _amount) internal view returns (bool) {
        return _amount > 0 && waveTotalMinted + _amount <= waveMaxTokens;
    }

    /**
     * @notice checks if current contract limits are respected if minting the indicated amount
     * @param _wallet minting wallet, whose restrictions will be considered
     * @param _amount number of tokens to mint
     * @return if amount can be safely minted
     */
    function _checkLimitNotReached(address _wallet, uint256 _amount) internal view returns (bool) {
        return
            waveOwnerToClaimedCounts[_wallet][indexWave - 1] + _amount <= waveMaxTokensToBuy &&
            totalSupply() + _amount <= maxSupply;
    }

    /**
     * @notice Pseudo-random number function. Good enough for our need, thx Cyberkongs VX <3!
     * @dev standard pseudo-random implementation using keccak256 over various parameters.
     * @param _wallet the calling account address
     * @param _totalMinted total minted tokens up to this point
     * @return pseudo-random value
     */
    function getRandomToken(address _wallet, uint256 _totalMinted) private returns (uint256) {
        uint256 remaining = maxSupply - _totalMinted;
        uint256 rand =
            uint256(keccak256(abi.encodePacked(_wallet, block.difficulty, block.timestamp, remaining))) % remaining;
        uint256 value = rand;

        if (availableIds[rand] != 0) {
            value = availableIds[rand];
        }

        if (availableIds[remaining - 1] == 0) {
            availableIds[rand] = remaining - 1;
        } else {
            availableIds[rand] = availableIds[remaining - 1];
        }

        return value;
    }

    /**
    Empty storage space in contracts for future enhancements
    ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13
     */
    uint256[50] private __gap;
}
