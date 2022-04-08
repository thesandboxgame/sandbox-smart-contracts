//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseERC721} from "../../../assetERC721/BaseERC721.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev AssetERC721 will be minted only on L2 and can be transferred to L1 but not minted on L1.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract PolygonAssetERC721 is BaseERC721 {
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(address trustedForwarder, address admin) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _trustedForwarder = trustedForwarder;
        __ERC721_init("Sandbox's ASSETs ERC721", "ASSETERC721");
    }

    /// @notice Creates a new token for `to`
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @param to The address that will receive a new token
    /// @param id The id of the new token
    function mint(address to, uint256 id) public override(BaseERC721) onlyRole(MINTER_ROLE) {
        BaseERC721.mint(to, id);
    }

    /// @notice Creates a new token for `to`
    /// @dev Minting is only permitted to MINTER_ROLE
    /// @dev Use this function to retain metadata
    /// @param to The address that will receive a new token
    /// @param id The id of the new token
    /// @param data Associated token metadata, which is decoded & used to set the token's metadata hash.
    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) public override(BaseERC721) onlyRole(MINTER_ROLE) {
        BaseERC721.mint(to, id, data);
    }

    /// @notice Set the metadatahash for a given token id.
    /// @dev The metadata hash for the ERC721 may need to be manually set or overridden.
    /// @param id The token id.
    /// @param uri The full token URI to be used for the token id.
    function setTokenURI(uint256 id, string memory uri) external onlyRole(METADATA_ROLE) {
        tokenUris[id] = uri;
    }

    /// @notice A distinct Uniform Resource Identifier (URI) for a given asset.
    /// @param id The token to get the uri of.
    /// @return URI The token's URI string.
    function tokenURI(uint256 id) public view override returns (string memory) {
        require(ownerOf(id) != address(0), "ZERO_ADDRESS");
        return tokenUris[id];
    }
}
