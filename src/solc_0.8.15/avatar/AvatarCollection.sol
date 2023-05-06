// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;


import { OwnableUpgradeable } from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "openzeppelin-contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { AccessControlUpgradeable, ContextUpgradeable } from "openzeppelin-contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { ECDSA } from "openzeppelin-contracts/utils/cryptography/ECDSA.sol";
import { UpdatableOperatorFiltererUpgradeable } from "operator-filter-registry/upgradeable/UpdatableOperatorFiltererUpgradeable.sol";
import { CollectionAccessControl } from "./CollectionAccessControl.sol";
import { CollectionStateManagement } from "./CollectionStateManagement.sol";
import { ERC2771HandlerUpgradeable } from "../common/BaseWithStorage/ERC2771/ERC2771HandlerUpgradeable.sol";
import {
    ERC721BurnMemoryEnumerableUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC721Upgradeable,
    IERC721Upgradeable
    } from "./ERC721BurnMemoryEnumerableUpgradeable.sol";



import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

/* solhint-disable max-states-count */
contract AvatarCollection is
    ReentrancyGuardUpgradeable,
    CollectionStateManagement,
    CollectionAccessControl,
    ERC721BurnMemoryEnumerableUpgradeable,
    ERC2771HandlerUpgradeable,
    UpdatableOperatorFiltererUpgradeable
{

    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice max token supply
    uint256 public maxSupply;

    /// @notice max tokens to buy per wave, cumulating all addresses
    uint256 public waveMaxTokens;

    /// @notice max tokens to buy, per wallet in a given wave
    uint256 public waveMaxTokensToBuy;

    /// @notice price of one token mint (in the token owned by the mintTreasury which in our case is SAND)
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
    address public mintTreasury;
    address public signAddress;
    string public baseTokenURI;

    IERC20 immutable public paymentToken;

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

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
     * @param _mintTreasury address belonging to SAND token owner
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
        address _mintTreasury,
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
     * @notice Event emitted when the treasury address was saved
     * @dev emitted when setTreasury is called
     * @param _owner new owner address to be saved
     */
    event TreasurySet(address _owner);

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

    /*//////////////////////////////////////////////////////////////
                            Initializers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice mitigate a possible Implementation contract takeover, as indicate by
     *         https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract
     */
    constructor(address _paymentToken) {
        require(_isContract(_paymentToken), "AvatarCollection: payment address is not a contract");
        paymentToken = IERC20(_paymentToken);

        _disableInitializers();
    }

    function initialize(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe,
        uint256 _maxSupply
    ) external virtual initializer {
        __AvatarCollection_init(
            _collectionOwner,
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _initialTrustedForwarder,
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe,
            _maxSupply
        );
    }

    /**
     * @notice initialization function in accordance with the upgradable pattern
     * @dev calls all the init functions from the base classes. Emits {ContractInitialized} event
     * @param _initialBaseURI an URI that will be used as the base for token URI
     * @param _name name of the ERC721 token
     * @param _symbol token symbol of the ERC721 token
     * @param _mintTreasury address belonging to SAND token owner
     * @param _signAddress signer address that is allowed to mint
     * @param _initialTrustedForwarder trusted forwarder address
     * @param _registry filter registry to which to register with. For blocking operators that do not respect royalties
     * @param _operatorFiltererSubscription subscription address to use as a template for
     * @param _operatorFiltererSubscriptionSubscribe if to subscribe tot the operatorFiltererSubscription address or
     *                                               just copy entries from it
     * @param _maxSupply max supply of tokens to be allowed to be minted per contract
     */
    function __AvatarCollection_init(
        address _collectionOwner,
        string memory _initialBaseURI,
        string memory _name,
        string memory _symbol,
        address payable _mintTreasury,
        address _signAddress,
        address _initialTrustedForwarder,
        address _registry,
        address _operatorFiltererSubscription,
        bool _operatorFiltererSubscriptionSubscribe,
        uint256 _maxSupply) internal onlyInitializing {

        require(bytes(_initialBaseURI).length != 0, "AvatarCollection: BaseURI is not set");
        require(bytes(_name).length != 0, "AvatarCollection: Name is empty");
        require(bytes(_symbol).length != 0, "AvatarCollection: symbol is empty");
        require(_signAddress != address(0), "AvatarCollection: Sign address is zero address");
        require(_initialTrustedForwarder != address(0), "AvatarCollection: Trusted forwarder is zero address");
        require(_mintTreasury != address(0), "AvatarCollection: Sand owner is zero address");
        require(_maxSupply > 0, "AvatarCollection: Max supply should be more than 0");

        baseTokenURI = _initialBaseURI;

        __ReentrancyGuard_init();
        __InitializeAccessControl(_collectionOwner); // owner is also initialized here
        __ERC2771Handler_initialize(_initialTrustedForwarder);
        __ERC721_init(_name, _symbol);
        __UpdatableOperatorFiltererUpgradeable_init(
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe
        );

        mintTreasury = _mintTreasury;
        signAddress = _signAddress;
        maxSupply = _maxSupply;

        emit ContractInitialized(
            _initialBaseURI,
            _name,
            _symbol,
            _mintTreasury,
            _signAddress,
            _maxSupply,
            _registry,
            _operatorFiltererSubscription,
            _operatorFiltererSubscriptionSubscribe
        );
    }

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

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
        require(_wallet != address(0), "Wallet is zero address");
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
            SafeERC20.safeTransferFrom(IERC20(_msgSender()), _wallet, mintTreasury, _price);
        }

        waveOwnerToClaimedCounts[_wallet][indexWave - 1] += _amount;

        waveTotalMinted += _amount;

        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = getRandomToken(_wallet, totalSupply());
            _safeMint(_wallet, tokenId);
        }
    }

    function mintWithSand(
        address _wallet,
        uint256 _amount
    ) external nonReentrant {
        require(paused == 0, "Contract is paused");
        require(_wallet != address(0), "Wallet is zero address");
        require(_amount > 0, "Amount cannot be 0");

        require(_checkWaveNotComplete(_amount), "Wave completed");
        require(_checkLimitNotReached(_wallet, _amount), "Max allowed");

        uint256 _price = price(_amount);
        if (_price > 0) {
            uint256 oldAllowance = paymentToken.allowance(_msgSender(), address(this));
            paymentToken.approve(address(this), _price);
            SafeERC20.safeTransferFrom(paymentToken, _wallet, mintTreasury, _price);
            paymentToken.approve(address(this), oldAllowance);
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
        require(ownerOf(_tokenId) == _msgSender(), "AvatarCollection: sender is not owner");

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
        require(_address != address(0), "Address is zero address");
        allowedToExecuteMint = _address;
        emit AllowedExecuteMintSet(_address);
    }

    /**
     * @notice saving locally the SAND token owner
     * @dev sets mintTreasury = _treasury
     * @custom:event {TreasurySet}
     * @param _treasury new treasury address to be saved
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Owner is zero address");
        mintTreasury = _treasury;
        emit TreasurySet(_treasury);
    }

    /**
     * @notice sets the sign address. Emits {SignAddressSet} event
     * @dev sets signAddress = _signAddress; address can't be 0
     * @param _signAddress new signer address to be set
     */
    function setSignAddress(address _signAddress) external onlyOwner {
        require(_signAddress != address(0), "Sign address is zero address");
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
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721EnumerableUpgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
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

    /*//////////////////////////////////////////////////////////////
                    Internal and private functions
    //////////////////////////////////////////////////////////////*/

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

    function _isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize/address.code.length, which returns 0
        // for contracts in construction, since the code is only stored at the end
        // of the constructor execution.

        return account.code.length > 0;
    }

    /**
    Empty storage space in contracts for future enhancements
    ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13
     */
    uint256[50] private __gap;
}
