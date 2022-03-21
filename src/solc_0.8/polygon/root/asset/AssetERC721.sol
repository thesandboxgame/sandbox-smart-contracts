//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";
import {IRootERC721} from "../../../common/interfaces/pos-portal/root/IRootERC721.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract AssetERC721 is BaseERC721, IRootERC721 {
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");
    uint256 public constant PACK_INDEX = 0x00000000000000000000000000000000000000000000000000000000000007FF;

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(address trustedForwarder, address admin) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        __ERC721_init("Sandbox's ASSETs ERC721", "ASSETERC721");
    }

    /// @notice Set the metadatahash for a given token id.
    /// @dev The metadata hash for the ERC721 may need to be manually set or overridden.
    /// @param id The token id.
    /// @param data The metadatahash to be used for the token id.
    function setTokenMetadata(uint256 id, bytes memory data) external override onlyRole(METADATA_ROLE) {
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
