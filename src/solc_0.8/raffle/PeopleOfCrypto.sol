// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-0.8/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-0.8/security/ReentrancyGuard.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

/* solhint-disable max-states-count */
contract PeopleOfCrypto is ERC721EnumerableUpgradeable, OwnableUpgradeable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 8_430;

    event TogglePaused(bool _pause);
    event Personalized(uint256 _tokenId, uint256 _personalizationMask);

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

    function initialize(
        string memory baseURI,
        string memory _name,
        string memory _symbol,
        address payable _sandOwner,
        address _signAddress
    ) public initializer {
        __ERC721_init(_name, _symbol);
        __Ownable_init_unchained();
        setBaseURI(baseURI);
        require(_sandOwner != address(0), "Sand owner is zero address");
        sandOwner = _sandOwner;
        signAddress = _signAddress;
    }

    function setupWave(
        uint256 _waveType,
        uint256 _waveMaxTokens,
        uint256 _waveMaxTokensToBuy,
        uint256 _waveSingleTokenPrice,
        address _contractAddress,
        uint256 _erc1155Id
    ) external onlyOwner {
        require(_waveType < 3 && _waveMaxTokens > 0 && _waveMaxTokensToBuy > 0, "Invalid configuration");
        if (_waveType != 0) {
            require(_contractAddress != address(0x0), "Invalid contract address");
        }
        require(_waveMaxTokensToBuy <= _waveMaxTokens, "Invalid supply configuration");

        waveType = _waveType;
        waveMaxTokens = _waveMaxTokens;
        waveMaxTokensToBuy = _waveMaxTokensToBuy;
        waveSingleTokenPrice = _waveSingleTokenPrice;
        waveTotalMinted = 0;
        contractAddress = _waveType == 0 ? address(0) : _contractAddress;
        erc1155Id = _waveType == 2 ? _erc1155Id : 0;
        indexWave++;
    }

    function price(uint256 _count) public view virtual returns (uint256) {
        return waveSingleTokenPrice * _count;
    }

    function chain() public view returns (uint256) {
        return block.chainid;
    }

    function checkWaveNotComplete(uint256 _amount) internal view returns (bool) {
        return _amount > 0 && waveTotalMinted + _amount <= waveMaxTokens;
    }

    function checkLimitNotReached(address _wallet, uint256 _amount) internal view returns (bool) {
        return
            waveOwnerToClaimedCounts[_wallet][indexWave - 1] + _amount <= waveMaxTokensToBuy &&
            totalSupply() + _amount <= MAX_SUPPLY;
    }

    function checkMintAllowed(address _wallet, uint256 _amount) public view returns (bool) {
        return checkWaveNotComplete(_amount) && checkLimitNotReached(_wallet, _amount);
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
        require(signatureIds[_signatureId] == 0, "signatureId already used");
        require(
            checkSignature(_wallet, _signatureId, address(this), block.chainid, _signature) == signAddress,
            "Signature failed"
        );

        signatureIds[_signatureId] = 1;

        require(checkWaveNotComplete(_amount), "Wave completed");
        require(checkLimitNotReached(_wallet, _amount), "Max allowed");

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

    function checkSignature(
        address _wallet,
        uint256 _signatureId,
        address _contractAddress,
        uint256 _chainId,
        bytes memory _signature
    ) public pure returns (address) {
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

    function checkPersonalizationSignature(
        address _wallet,
        uint256 _signatureId,
        address _contractAddress,
        uint256 _chainId,
        uint256 _tokenId,
        uint256 _personalizationMask,
        bytes memory _signature
    ) public pure returns (address) {
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

    // Thx Cyberkongs VX <3
    function getRandomToken(address _wallet, uint256 _totalMinted) private returns (uint256) {
        uint256 remaining = MAX_SUPPLY - _totalMinted;
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

    function personalizationOf(uint256 _tokenId) external view returns (uint256) {
        return personalizationTraits[_tokenId];
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
            checkPersonalizationSignature(
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
        allowedToExecuteMint = _address;
    }

    function setSandOwnerAddress(address _owner) external onlyOwner {
        sandOwner = _owner;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function setSignAddress(address _signAddress) external onlyOwner {
        signAddress = _signAddress;
    }
}
