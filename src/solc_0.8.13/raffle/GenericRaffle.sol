// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

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
contract GenericRaffle is
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC2771HandlerUpgradeable,
    UpdatableOperatorFiltererUpgradeable
{
    using Address for address;
    uint256 public maxSupply;

    event TogglePaused(bool _pause);
    event Personalized(uint256 _tokenId, uint256 _personalizationMask);
    event ContractInitialized(
        string baseURI,
        string _name,
        string _symbol,
        address _sandOwner,
        address _signAddress,
        uint256 _maxSupply
    );
    event WaveSetup(
        uint256 _waveType,
        uint256 _waveMaxTokens,
        uint256 _waveMaxTokensToBuy,
        uint256 _waveSingleTokenPrice
    );
    event AllowedExecuteMintSet(address _address);
    event SandOwnerSet(address _owner);
    event BaseURISet(string baseURI);
    event SignAddressSet(address _signAddress);

    uint256 public waveType = 0;
    uint256 public waveMaxTokens;
    uint256 public waveMaxTokensToBuy;
    uint256 public waveSingleTokenPrice;
    uint256 public waveTotalMinted;

    uint256 public erc1155Id;
    address public contractAddress;

    mapping(address => mapping(uint256 => uint256)) public waveOwnerToClaimedCounts;
    mapping(uint256 => uint256) public personalizationTraits; // stores the personalization for a tokenId
    uint256 public indexWave;
    uint256 public paused;

    mapping(uint256 => uint256) private signatureIds;
    mapping(uint256 => uint256) private availableIds;

    address public allowedToExecuteMint;
    address public sandOwner;
    address public signAddress;
    string public baseTokenURI;

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

        emit ContractInitialized(baseURI, _name, _symbol, _sandOwner, _signAddress, _maxSupply);
    }

    function setupWave(
        uint256 _waveType,
        uint256 _waveMaxTokens,
        uint256 _waveMaxTokensToBuy,
        uint256 _waveSingleTokenPrice,
        address _contractAddress,
        uint256 _erc1155Id
    ) external onlyOwner {
        require(_waveMaxTokens <= maxSupply, "_waveMaxTokens should not exceed maxSupply");
        require(_waveType < 3 && _waveMaxTokens > 0 && _waveMaxTokensToBuy > 0, "Invalid configuration");
        if (_waveType != 0) {
            require(_contractAddress != address(0x0), "Invalid contract address");
            require(_contractAddress.isContract(), "Contract address must be that of a contract");
        }
        require(_waveMaxTokensToBuy <= _waveMaxTokens, "Invalid supply configuration");

        waveType = _waveType;
        waveMaxTokens = _waveMaxTokens;
        waveMaxTokensToBuy = _waveMaxTokensToBuy;
        waveSingleTokenPrice = _waveSingleTokenPrice;
        waveTotalMinted = 0;
        contractAddress = _waveType == 0 ? address(0x0) : _contractAddress;
        erc1155Id = _waveType == 2 ? _erc1155Id : 0;
        indexWave++;

        emit WaveSetup(_waveType, _waveMaxTokens, _waveMaxTokensToBuy, _waveSingleTokenPrice);
    }

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

        if (waveType == 1) {
            require(IERC721(contractAddress).balanceOf(_wallet) > 0, "No NFT");
        } else if (waveType == 2) {
            require(IERC1155(contractAddress).balanceOf(_wallet, erc1155Id) > 0, "No NFT");
        }

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

    function toggleSale() external onlyOwner {
        paused = paused == 0 ? 1 : 0;
        emit TogglePaused(paused == 1);
    }

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

    function setAllowedExecuteMint(address _address) external onlyOwner {
        require(_address != address(0x0), "Address is zero address");
        allowedToExecuteMint = _address;
        emit AllowedExecuteMintSet(_address);
    }

    function setSandOwnerAddress(address _owner) external onlyOwner {
        require(_owner != address(0x0), "Owner is zero address");
        sandOwner = _owner;
        emit SandOwnerSet(_owner);
    }

    function setSignAddress(address _signAddress) external onlyOwner {
        require(_signAddress != address(0x0), "Sign address is zero address");
        signAddress = _signAddress;
        emit SignAddressSet(_signAddress);
    }

    function personalizationOf(uint256 _tokenId) external view returns (uint256) {
        return personalizationTraits[_tokenId];
    }

    function checkMintAllowed(address _wallet, uint256 _amount) external view returns (bool) {
        return _checkWaveNotComplete(_amount) && _checkLimitNotReached(_wallet, _amount);
    }

    function chain() external view returns (uint256) {
        return block.chainid;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        require(bytes(baseURI).length != 0, "baseURI is not set");
        baseTokenURI = baseURI;
        emit BaseURISet(baseURI);
    }

    function renounceOwnership() public virtual override onlyOwner {
        revert("Renounce ownership is not available");
    }

    function setApprovalForAll(address operator, bool approved)
        public
        override(ERC721Upgradeable, IERC721Upgradeable)
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    function approve(address operator, uint256 tokenId)
        public
        override(ERC721Upgradeable, IERC721Upgradeable)
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721Upgradeable, IERC721Upgradeable) onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    function price(uint256 _count) public view virtual returns (uint256) {
        return waveSingleTokenPrice * _count;
    }

    function owner() public view override(OwnableUpgradeable, UpdatableOperatorFiltererUpgradeable) returns (address) {
        return OwnableUpgradeable.owner();
    }

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

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    function _checkWaveNotComplete(uint256 _amount) internal view returns (bool) {
        return _amount > 0 && waveTotalMinted + _amount <= waveMaxTokens;
    }

    function _checkLimitNotReached(address _wallet, uint256 _amount) internal view returns (bool) {
        return
            waveOwnerToClaimedCounts[_wallet][indexWave - 1] + _amount <= waveMaxTokensToBuy &&
            totalSupply() + _amount <= maxSupply;
    }

    // Thx Cyberkongs VX <3
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

    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[50] private __gap;
}
