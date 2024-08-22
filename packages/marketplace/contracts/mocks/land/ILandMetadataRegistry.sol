//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @title ILandMetadataRegistry
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Interface implemented by the LandMetadataRegistry
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
    /// @return true if the land is premium
    function isPremium(uint256 tokenId) external view returns (bool);

    /// @notice return the id that identifies the neighborhood
    /// @param tokenId the token id
    /// @return the neighborhoodId number
    function getNeighborhoodId(uint256 tokenId) external view returns (uint256);

    /// @notice return the neighborhood name
    /// @param tokenId the token id
    /// @return the neighborhood name
    function getNeighborhoodName(uint256 tokenId) external view returns (string memory);

    /// @notice return the neighborhood name using neighborhood id as the key
    /// @param neighborhoodId the number that identifies the neighborhood
    /// @return the neighborhood name
    function getNeighborhoodNameForId(uint256 neighborhoodId) external view returns (string memory);
}
