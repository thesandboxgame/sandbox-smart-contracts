//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

import {ILandMetadataRegistry} from "./ILandMetadataRegistry.sol";

/// @title WithAdmin
/// @author The Sandbox
/// @notice Add an admin to the contract
abstract contract WithMetadataRegistry {
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
        MetadataRegistryStorage storage $ = _getMetadataRegistryStorage();
        return $._metadataRegistry.getMetadata(tokenId);
    }

    function _setMetadataRegistry(address metadataRegistry) internal {
        MetadataRegistryStorage storage $ = _getMetadataRegistryStorage();
        require(metadataRegistry != address(0), "Invalid registry address");
        $._metadataRegistry = ILandMetadataRegistry(metadataRegistry);
        emit MetadataRegistrySet(metadataRegistry);
    }
}
