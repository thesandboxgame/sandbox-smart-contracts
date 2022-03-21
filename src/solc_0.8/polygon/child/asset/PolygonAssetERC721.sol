//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";
import {IChildToken} from "../../../common/interfaces/pos-portal/child/IChildToken.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev AssetERC721 will be minted only on L2 and can be transferred to L1 but not minted on L1.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract PolygonAssetERC721 is BaseERC721, IChildToken {
    event Deposit(address indexed from, uint256 tokenId);
    event DepositBatch(address indexed from, uint256[] tokenIds);
    event WithdrawnBatch(address indexed user, uint256[] tokenIds);
    event Withdrawn(address indexed user, uint256 tokenId);
    event Minted(address indexed user, uint256 tokenId);

    bytes32 public constant CHILD_MANAGER_ROLE = keccak256("CHILD_MANAGER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");
    uint256 public constant PACK_INDEX = 0x00000000000000000000000000000000000000000000000000000000000007FF;

    // We only mint on L2, so we track tokens transferred to L1 to avoid minting them twice.
    mapping(uint256 => bool) public withdrawnTokens;

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(address trustedForwarder, address admin) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        __ERC721_init("Sandbox's ASSETs ERC721", "ASSETERC721");
    }

    /// @notice called when token is deposited on root chain
    /// @dev Should be callable only by ChildChainManager
    /// @dev Should handle deposit by minting the required tokenId(s) for user
    /// @dev Should set `withdrawnTokens` mapping to `false` for the tokenId being deposited
    /// @dev Minting can also be done by other functions
    /// @param user user address for whom deposit is being done
    /// @param depositData abi encoded tokenIds. Batch deposit also supported.
    function deposit(address user, bytes calldata depositData) external override onlyRole(CHILD_MANAGER_ROLE) {
        require(user != address(0x0), "INVALID_USER");
        if (depositData.length == 32) {
            // deposit single
            uint256 tokenId = abi.decode(depositData, (uint256));
            _deposit(user, tokenId);
            emit Deposit(user, tokenId);
        } else {
            // deposit batch
            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
            for (uint256 i; i < tokenIds.length; i++) {
                _deposit(user, tokenIds[i]);
            }
            emit DepositBatch(user, tokenIds);
        }
    }

    /// @notice Withdraw tokens
    /// @param tokenId tokenId of the token to be withdrawn
    function withdraw(uint256 tokenId) public {
        _withdraw(tokenId);
        emit Withdrawn(_msgSender(), tokenId);
    }

    /// @notice called when user wants to withdraw multiple tokens back to root chain
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
    /// @param tokenIds tokenId list to withdraw
    function withdrawBatch(uint256[] calldata tokenIds) external {
        // Iteratively burn ERC721 tokens, for performing batch withdraw
        for (uint256 i; i < tokenIds.length; i++) {
            _withdraw(tokenIds[i]);
        }
        // At last emit this event, which will be used
        // in MintableERC721 predicate contract on L1
        // while verifying burn proof
        emit WithdrawnBatch(_msgSender(), tokenIds);
    }

    /// @notice Creates a new token for `to`
    /// @param to The address that will receive a new token
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @param id The id of the new token
    /// @param data Associated token metadata, which is decoded & used to set the token's metadata hash.
    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) public override onlyRole(MINTER_ROLE) {
        require(!withdrawnTokens[id], "TOKEN_EXISTS_ON_ROOT_CHAIN");
        BaseERC721.mint(to, id, data);
        emit Minted(to, id);
    }

    /// @notice Creates a new token for `to`
    /// @param to The address that will receive a new token
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @param id The id of the new token
    function mint(address to, uint256 id) public override onlyRole(MINTER_ROLE) {
        require(!withdrawnTokens[id], "TOKEN_EXISTS_ON_ROOT_CHAIN");
        BaseERC721.mint(to, id);
        emit Minted(to, id);
    }

    /// @notice Set the metadatahash for a given token id.
    /// @dev The metadata hash for the ERC721 may need to be manually set or overridden.
    /// @param id The token id.
    /// @param data The metadatahash to be used for the token id.
    function setTokenMetadata(uint256 id, bytes memory data) external onlyRole(METADATA_ROLE) {
        _setTokenMetadataHash(id, data);
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
    /// @param id The token to get the uri of.
    /// @return URI The token's URI string.
    function tokenURI(uint256 id) public view override returns (string memory) {
        require(ownerOf(id) != address(0), "ZERO_ADDRESS");
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    hash2base32(metadataHashes[id]),
                    "/",
                    uint2str(id & PACK_INDEX),
                    ".json"
                )
            );
    }

    /// @notice Deposit tokens
    /// @param user The address for deposit
    /// @param tokenId The tokenId to mint to user's account
    function _deposit(address user, uint256 tokenId) internal {
        // We only accept tokens that were minted on L2, withdrawn and now came from L1
        require(withdrawnTokens[tokenId], "TOKEN_NOT_EXISTS_ON_ROOT_CHAIN");
        withdrawnTokens[tokenId] = false;
        _safeMint(user, tokenId);
    }

    /// @notice Withdraw tokens
    /// @param tokenId The tokenId of the token to be withdrawn
    function _withdraw(uint256 tokenId) internal {
        require(ownerOf(tokenId) == _msgSender(), "NOT_OWNER");
        withdrawnTokens[tokenId] = true;
        _burn(tokenId);
    }

    /// @dev Helper functions to obtain full tokenURI found below

    bytes32 private constant base32Alphabet = 0x6162636465666768696A6B6C6D6E6F707172737475767778797A323334353637;

    // solium-disable-next-line security/no-assign-params
    function hash2base32(bytes32 hash) private pure returns (string memory _uintAsString) {
        uint256 _i = uint256(hash);
        uint256 k = 52;
        bytes memory bstr = new bytes(k);
        bstr[--k] = base32Alphabet[uint8((_i % 8) << 2)]; // uint8 s = uint8((256 - skip) % 5);  // (_i % (2**s)) << (5-s)
        _i /= 8;
        while (k > 0) {
            bstr[--k] = base32Alphabet[_i % 32];
            _i /= 32;
        }
        return string(bstr);
    }

    // solium-disable-next-line security/no-assign-params
    function uint2str(uint256 _i) public pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }

        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }

        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            bstr[--k] = bytes1(uint8(48 + uint8(_i % 10)));
            _i /= 10;
        }

        return string(bstr);
    }
}
