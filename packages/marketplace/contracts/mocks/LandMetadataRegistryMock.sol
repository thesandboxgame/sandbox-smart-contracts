// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {IErrors} from "@sandbox-smart-contracts/land/contracts/interfaces/IErrors.sol";
import {ILandMetadataRegistry} from "@sandbox-smart-contracts/land/contracts/interfaces/ILandMetadataRegistry.sol";
import {LandMetadataBase} from "@sandbox-smart-contracts/land/contracts/registry/LandMetadataBase.sol";

/// @title LandMetadataRegistry
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Store information about the lands (premiumness and neighborhood)
contract LandMetadataRegistryMock is
    IErrors,
    ILandMetadataRegistry,
    AccessControlEnumerableUpgradeable,
    LandMetadataBase
{
    struct BatchSetNameData {
        // the number that identifies the neighborhood
        uint256 neighborhoodId;
        // the name of the neighborhood
        string name;
    }

    struct BatchSetData {
        // baseTokenId the token id floor 32
        uint256 baseTokenId;
        // metadata: premiumness << 8 | neighborhoodId
        uint256 metadata;
    }

    /// @notice This event is emitted when the metadata is set for a single land
    /// @param operator the sender of the transaction
    /// @param tokenId the token id
    /// @param oldNeighborhoodId the number that identifies the neighborhood before changing it
    /// @param wasPremium true if land was premium
    /// @param newNeighborhoodId the number that identifies the neighborhood
    /// @param isPremium true if land is premium
    event MetadataSet(
        address indexed operator,
        uint256 indexed tokenId,
        uint256 oldNeighborhoodId,
        bool wasPremium,
        uint256 newNeighborhoodId,
        bool isPremium
    );

    /// @notice This event is emitted when the neighborhood name is set
    /// @param operator the sender of the transaction
    /// @param neighborhoodId the number that identifies the neighborhood
    /// @param name human readable name
    event NeighborhoodNameSet(address indexed operator, uint256 indexed neighborhoodId, string name);

    /// @notice This event is emitted when the metadata is set in batch
    /// @param operator the sender of the transaction
    /// @param data token id and metadata
    event BatchMetadataSet(address indexed operator, BatchSetData[] data);

    modifier onlyAdmin() {
        if (!hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
            revert OnlyAdmin();
        }
        _;
    }

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer method, called during deployment
    /// @param admin_ address that have admin access and can assign roles.
    function initialize(address admin_) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlEnumerable_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
    }

    /// @notice set the premiumness for one land
    /// @param tokenId the token id
    /// @param premium true if the land is premium
    function setPremium(uint256 tokenId, bool premium) external onlyAdmin {
        (uint256 neighborhoodId, bool wasPremium) = _getMetadataForTokenId(tokenId);
        _setMetadataForTokenId(tokenId, neighborhoodId, premium);
        emit MetadataSet(_msgSender(), tokenId, neighborhoodId, wasPremium, neighborhoodId, premium);
    }

    /// @notice set the neighborhood for one land
    /// @param tokenId the token id
    /// @param newNeighborhoodId the number that identifies the neighborhood
    function setNeighborhoodId(uint256 tokenId, uint256 newNeighborhoodId) external onlyAdmin {
        _isValidNeighborhoodId(newNeighborhoodId);
        (uint256 oldNeighborhoodId, bool wasPremium) = _getMetadataForTokenId(tokenId);
        _setMetadataForTokenId(tokenId, newNeighborhoodId, wasPremium);
        emit MetadataSet(_msgSender(), tokenId, oldNeighborhoodId, wasPremium, newNeighborhoodId, wasPremium);
    }

    /// @notice set the premiumness for one land
    /// @param tokenId the token id
    /// @param premium true if the land is premium
    /// @param newNeighborhoodId the number that identifies the neighborhood
    function setMetadata(uint256 tokenId, bool premium, uint256 newNeighborhoodId) external onlyAdmin {
        _isValidNeighborhoodId(newNeighborhoodId);
        (uint256 oldNeighborhoodId, bool wasPremium) = _getMetadataForTokenId(tokenId);
        _setMetadataForTokenId(tokenId, newNeighborhoodId, premium);
        emit MetadataSet(_msgSender(), tokenId, oldNeighborhoodId, wasPremium, newNeighborhoodId, premium);
    }

    /// @notice set neighborhood name
    /// @param neighborhoodId the number that identifies the neighborhood
    /// @param name human readable name
    function setNeighborhoodName(uint256 neighborhoodId, string calldata name) external onlyAdmin {
        _isValidNeighborhoodId(neighborhoodId);
        _setNeighborhoodName(neighborhoodId, name);
        emit NeighborhoodNameSet(_msgSender(), neighborhoodId, name);
    }

    /// @notice set neighborhood name in batch
    /// @param data array of neighborhood ids and names to set
    function batchSetNeighborhoodName(BatchSetNameData[] calldata data) external onlyAdmin {
        uint256 len = data.length;
        for (uint256 i; i < len; i++) {
            _isValidNeighborhoodId(data[i].neighborhoodId);
            _setNeighborhoodName(data[i].neighborhoodId, data[i].name);
            emit NeighborhoodNameSet(_msgSender(), data[i].neighborhoodId, data[i].name);
        }
    }

    /// @notice set the metadata for 32 lands at the same time in batch
    /// @param data token id and metadata
    /// @dev use with care, we can set to the metadata for some lands to unknown (zero)
    function batchSetMetadata(BatchSetData[] calldata data) external onlyAdmin {
        uint256 len = data.length;
        for (uint256 i; i < len; i++) {
            BatchSetData calldata d = data[i];
            if (_getBits(d.baseTokenId) != 0) {
                revert InvalidBaseTokenId(d.baseTokenId);
            }
            _setMetadata(d.baseTokenId, d.metadata);
        }
        emit BatchMetadataSet(_msgSender(), data);
    }

    /// @notice return the metadata for one land
    /// @param tokenId the token id
    /// @return premium true if the land is premium
    /// @return neighborhoodId the number that identifies the neighborhood
    /// @return neighborhoodName the neighborhood name
    function getMetadata(
        uint256 tokenId
    ) external view returns (bool premium, uint256 neighborhoodId, string memory neighborhoodName) {
        (neighborhoodId, premium) = _getMetadataForTokenId(tokenId);
        neighborhoodName = _getNeighborhoodName(neighborhoodId);
    }

    /// @notice return true if a land is premium
    /// @param tokenId the token id
    /// @return true if the land is premium
    function isPremium(uint256 tokenId) external view returns (bool) {
        (, bool premium) = _getMetadataForTokenId(tokenId);
        return premium;
    }

    /// @notice return the id that identifies the neighborhood
    /// @param tokenId the token id
    /// @return the neighborhoodId number
    function getNeighborhoodId(uint256 tokenId) external view returns (uint256) {
        (uint256 neighborhoodId, ) = _getMetadataForTokenId(tokenId);
        return neighborhoodId;
    }

    /// @notice return the neighborhood name
    /// @param tokenId the token id
    /// @return the neighborhood name
    function getNeighborhoodName(uint256 tokenId) external view returns (string memory) {
        (uint256 neighborhoodId, ) = _getMetadataForTokenId(tokenId);
        return _getNeighborhoodName(neighborhoodId);
    }

    /// @notice return the neighborhood name using neighborhood id as the key
    /// @param neighborhoodId the number that identifies the neighborhood
    /// @return the neighborhood name
    function getNeighborhoodNameForId(uint256 neighborhoodId) external view returns (string memory) {
        return _getNeighborhoodName(neighborhoodId);
    }

    /// @notice return the metadata of 32 lands at once
    /// @param tokenIds the token ids
    /// @return the raw metadata for a series of tokenIds
    /// @dev used to debug, extracting a lot of information that must be unpacked at once.
    function batchGetMetadata(uint256[] calldata tokenIds) external view returns (BatchSetData[] memory) {
        uint256 len = tokenIds.length;
        BatchSetData[] memory ret = new BatchSetData[](len);
        for (uint256 i; i < len; i++) {
            ret[i] = BatchSetData({baseTokenId: _getKey(tokenIds[i]), metadata: _getMetadata(tokenIds[i])});
        }
        return ret;
    }

    function getLandMetadataStorageSlot() external pure returns (bytes32) {
        return METADATA_STORAGE_LOCATION;
    }
}
