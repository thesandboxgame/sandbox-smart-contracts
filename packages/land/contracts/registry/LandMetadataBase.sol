// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";

/**
 * @title LandMetadataRegistry
 * @author The Sandbox
 * @notice Store information about the lands (premiumness and neighborhood)
 */
abstract contract LandMetadataBase is AccessControlEnumerableUpgradeable {
    string public constant UNKNOWN_NEIGHBORHOOD = "unknown";
    uint256 public constant LANDS_PER_WORD = 32;
    uint256 public constant BITS_PER_LAND = 256 / LANDS_PER_WORD;
    uint256 public constant LAND_MASK = 0xFF;
    uint256 public constant PREMIUM_MASK = 0x80;
    uint256 public constant NEIGHBORHOOD_MASK = 0x7F;

    struct LandMetadataStorage {
        /// @dev tokenId / 32 => premiumness + neighborhood metadata
        /// @dev zero means no metadata definition
        mapping(uint256 => uint256) _metadata;
        /// @dev neighborhood number to string mapping
        mapping(uint256 => string) _neighborhoodName;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.land.registry.LandMetadataBase
    bytes32 internal constant METADATA_STORAGE_LOCATION =
        0x8cfaa91df3342c358a2782e14267fc6692d3715672a46842d54671de765d4c00;

    function _getLandMetadataStorage() private pure returns (LandMetadataStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := METADATA_STORAGE_LOCATION
        }
    }

    /// @notice set the packed metadata (premiumness + neighborhood) for a land
    /// @param tokenId the token id
    /// @param neighborhoodId the number that identifies the neighborhood
    /// @param premium true if is premium
    function _setMetadataForTokenId(uint256 tokenId, uint256 neighborhoodId, bool premium) internal {
        uint256 bits = _getBits(tokenId);
        uint256 mask = ~(LAND_MASK << bits);
        uint256 metadata = neighborhoodId;
        if (premium) metadata |= PREMIUM_MASK;
        _setMetadata(tokenId, (_getMetadata(tokenId) & mask) | (metadata << bits));
    }

    /// @notice get the packed metadata for a single land
    /// @param tokenId the base token id floor 32
    /// @return neighborhoodId the number that identifies the neighborhood
    /// @return premium true if is premium
    function _getMetadataForTokenId(uint256 tokenId) internal view returns (uint256 neighborhoodId, bool premium) {
        uint256 bits = _getBits(tokenId);
        uint256 metadata = _getMetadata(tokenId) >> bits;
        return (metadata & NEIGHBORHOOD_MASK, (metadata & PREMIUM_MASK) != 0);
    }

    /// @notice set the packed metadata for 32 lands at once
    /// @param tokenId the base token id floor 32
    /// @param metadata the packed metadata for 32 lands
    function _setMetadata(uint256 tokenId, uint256 metadata) internal {
        LandMetadataStorage storage $ = _getLandMetadataStorage();
        $._metadata[_getKey(tokenId)] = metadata;
    }

    /// @notice return the packed metadata for 32 lands at once
    /// @param tokenId the base token id floor 32
    function _getMetadata(uint256 tokenId) internal view returns (uint256) {
        LandMetadataStorage storage $ = _getLandMetadataStorage();
        return $._metadata[_getKey(tokenId)];
    }

    /// @notice set neighborhood name
    /// @param neighborhoodId the number that identifies the neighborhood
    /// @param name human readable name
    function _setNeighborhoodName(uint256 neighborhoodId, string memory name) internal {
        LandMetadataStorage storage $ = _getLandMetadataStorage();
        $._neighborhoodName[neighborhoodId] = name;
    }

    /// @notice return the neighborhood name
    /// @param neighborhoodId the number that identifies the neighborhood
    function _getNeighborhoodName(uint256 neighborhoodId) internal view returns (string memory) {
        LandMetadataStorage storage $ = _getLandMetadataStorage();
        if (neighborhoodId == 0) {
            return UNKNOWN_NEIGHBORHOOD;
        }
        return $._neighborhoodName[neighborhoodId];
    }

    /// @notice return the amount of bits must be shifted to access the packed metadata for a land
    /// @param tokenId the token id
    function _getBits(uint256 tokenId) internal pure returns (uint256) {
        return (tokenId % LANDS_PER_WORD) * BITS_PER_LAND;
    }

    /// @notice return the tokenId floor 32
    /// @param tokenId the token id
    function _getKey(uint256 tokenId) internal pure returns (uint256) {
        return LANDS_PER_WORD * (tokenId / LANDS_PER_WORD);
    }
}
