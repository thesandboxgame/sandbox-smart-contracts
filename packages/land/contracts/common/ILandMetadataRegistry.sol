//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/// @title IContext
/// @notice L1 Land contract doesn't use OZ context
/// @dev We use this interface to manage that because (we don't want to affect storage)
/// @dev Will be implemented in Land and PolygonLand
interface ILandMetadataRegistry {
    /// @notice return the metadata for one land
    /// @param tokenId the token id
    /// @return premium true if the land is premium
    /// @return neighborhoodId the number that identifies the neighborhood
    /// @return neighborhoodName the neighborhood name
    function getMetadata(
        uint256 tokenId
    ) external view returns (bool premium, uint256 neighborhoodId, string memory neighborhoodName);

    /// @notice return true if a land is premium
    /// @param tokenId the token id
    function isPremium(uint256 tokenId) external view returns (bool);

    /// @notice return the id that identifies the neighborhood
    /// @param tokenId the token id
    function getNeighborhoodId(uint256 tokenId) external view returns (uint256);

    /// @notice return the neighborhood name
    /// @param tokenId the token id
    function getNeighborhoodName(uint256 tokenId) external view returns (string memory);

    /// @notice return the neighborhood name using neighborhood id as the key
    /// @param neighborhoodId the number that identifies the neighborhood
    function getNeighborhoodNameForId(uint256 neighborhoodId) external view returns (string memory);
}
