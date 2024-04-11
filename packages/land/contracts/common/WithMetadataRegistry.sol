//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

import {ILandMetadataRegistry} from "../interfaces/ILandMetadataRegistry.sol";

/// @title WithMetadataRegistry
/// @author The Sandbox
/// @notice Add the metadata registry
abstract contract WithMetadataRegistry {
    string public constant UNKNOWN_NEIGHBORHOOD = "unknown";
    event MetadataRegistrySet(address indexed metadataRegistry);

    struct MetadataRegistryStorage {
        ILandMetadataRegistry _metadataRegistry;
    }
    // keccak256(abi.encode(uint256(keccak256("thesandbox.storage.MetadataRegistryStorage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant METADATA_REGISTRY_STORAGE_LOCATION =
        0x7b994d828e558930590ae1ddae4c5bd615266630f0fe588779b4fe34b2e8bb00;

    function _getMetadataRegistryStorage() private pure returns (MetadataRegistryStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := METADATA_REGISTRY_STORAGE_LOCATION
        }
    }

    /// @notice Get the address of the Metadata Registry
    /// @return metadataRegistry The address of the Metadata Registry
    function getMetadataRegistry() external view returns (ILandMetadataRegistry metadataRegistry) {
        MetadataRegistryStorage storage $ = _getMetadataRegistryStorage();
        return $._metadataRegistry;
    }

    /// @notice return the metadata for one land
    /// @param tokenId the token id
    /// @return premium true if the land is premium
    /// @return neighborhoodId the number that identifies the neighborhood
    /// @return neighborhoodName the neighborhood name
    function getMetadata(
        uint256 tokenId
    ) external view returns (bool premium, uint256 neighborhoodId, string memory neighborhoodName) {
        ILandMetadataRegistry registry = _getMetadataRegistryStorage()._metadataRegistry;
        if (registry == ILandMetadataRegistry(address(0))) {
            return (false, 0, UNKNOWN_NEIGHBORHOOD);
        }
        return registry.getMetadata(tokenId);
    }

    /// @notice return true if a land is premium
    /// @param tokenId the token id
    function isPremium(uint256 tokenId) external view returns (bool) {
        ILandMetadataRegistry registry = _getMetadataRegistryStorage()._metadataRegistry;
        if (registry == ILandMetadataRegistry(address(0))) {
            return false;
        }
        return registry.isPremium(tokenId);
    }

    /// @notice return the id that identifies the neighborhood
    /// @param tokenId the token id
    function getNeighborhoodId(uint256 tokenId) external view returns (uint256) {
        ILandMetadataRegistry registry = _getMetadataRegistryStorage()._metadataRegistry;
        if (registry == ILandMetadataRegistry(address(0))) {
            return 0;
        }
        return registry.getNeighborhoodId(tokenId);
    }

    /// @notice set the address of the metadata registry
    /// @param metadataRegistry the address of the metadata registry
    function _setMetadataRegistry(address metadataRegistry) internal {
        require(metadataRegistry != address(0), "invalid registry address");
        MetadataRegistryStorage storage $ = _getMetadataRegistryStorage();
        $._metadataRegistry = ILandMetadataRegistry(metadataRegistry);
        emit MetadataRegistrySet(metadataRegistry);
    }
}
