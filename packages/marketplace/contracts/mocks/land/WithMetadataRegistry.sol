//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

import {IErrors} from "./IErrors.sol";
import {ILandMetadataRegistry} from "@sandbox-smart-contracts/land/contracts/interfaces/ILandMetadataRegistry.sol";

/// @title WithMetadataRegistry
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Add support for the metadata registry
abstract contract WithMetadataRegistry is IErrors {
    /// @notice value returned when the neighborhood is not set yet.
    string private constant UNKNOWN_NEIGHBORHOOD = "unknown";

    /// @notice emitted when the metadata registry is set
    /// @param metadataRegistry the address of the metadata registry
    event MetadataRegistrySet(address indexed metadataRegistry);

    struct MetadataRegistryStorage {
        ILandMetadataRegistry _metadataRegistry;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.land.common.WithMetadataRegistry
    bytes32 internal constant METADATA_REGISTRY_STORAGE_LOCATION =
        0x3899f13de39885dfce849839be8330453b5866928dd0e5933e36794349628400;

    function _getMetadataRegistryStorage() private pure returns (MetadataRegistryStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := METADATA_REGISTRY_STORAGE_LOCATION
        }
    }

    /// @notice Get the address of the Metadata Registry
    /// @return The address of the Metadata Registry
    function getMetadataRegistry() external view returns (ILandMetadataRegistry) {
        MetadataRegistryStorage storage $ = _getMetadataRegistryStorage();
        return $._metadataRegistry;
    }

    /// @notice return the metadata for one land
    /// @param tokenId the token id
    /// @return premium true if the land is premium
    /// @return neighborhoodId the number that identifies the neighborhood
    /// @return neighborhoodName the neighborhood name
    function getMetadata(uint256 tokenId) external view returns (bool, uint256, string memory) {
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
        if (metadataRegistry == address(0)) {
            revert InvalidAddress();
        }
        MetadataRegistryStorage storage $ = _getMetadataRegistryStorage();
        $._metadataRegistry = ILandMetadataRegistry(metadataRegistry);
        emit MetadataRegistrySet(metadataRegistry);
    }
}
