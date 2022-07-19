// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IPolygonLand} from "../../../common/interfaces/IPolygonLand.sol";
import {IEstateExperienceRegistry} from "../../../common/interfaces/IEstateExperienceRegistry.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";

contract PolygonEstateTokenV1 is EstateBaseToken {
    using MapLib for MapLib.Map;

    struct PolygonEstateTokenStorage {
        IEstateExperienceRegistry registryToken;
    }

    /// @dev Emitted when the registry is changed
    /// @param operator The msg sender
    /// @param oldRegistry old address of the registry
    /// @param newRegistry new address of the registry
    event EstateRegistryChanged(
        address indexed operator,
        IEstateExperienceRegistry oldRegistry,
        IEstateExperienceRegistry newRegistry
    );

    /// @notice update an estate adding and removing lands, and unlinking experiences in one step
    /// @dev to be able to remove lands they must be completely unlinked from any experience (in the registry)
    /// @param estateId the estate id that will be updated
    /// @param landToAdd The set of quads to add.
    /// @param expToUnlink experiences to unlink
    /// @param landToRemove The set of quads to remove.
    /// @return estateId the new estate Id
    function update(
        uint256 estateId,
        uint256[][3] calldata landToAdd,
        uint256[] calldata expToUnlink,
        uint256[][3] calldata landToRemove
    ) external returns (uint256) {
        require(_isApprovedOrOwner(_msgSender(), estateId), "caller is not owner nor approved");

        uint256 alen = landToAdd[0].length;
        require(alen == landToAdd[1].length && alen == landToAdd[2].length, "invalid add data");
        uint256 rlen = landToRemove[0].length;
        require(rlen == landToRemove[1].length && rlen == landToRemove[2].length, "invalid remove data");

        uint256 xlen = expToUnlink.length;
        IEstateExperienceRegistry registry = _ps().registryToken;
        if (address(registry) == address(0)) {
            require(xlen == 0, "invalid data");
            require(alen > 0 || rlen > 0, "nothing to update");
        } else {
            require(alen > 0 || rlen > 0 || xlen > 0, "nothing to update");
            if (xlen > 0) {
                registry.batchUnLinkFrom(_msgSender(), expToUnlink);
            }
            require(!registry.isLinked(landToRemove), "must unlink first");
        }
        return _update(_msgSender(), estateId, landToAdd, landToRemove);
    }

    /// @notice set the registry contract address
    /// @param registry the registry contract address
    function setRegistry(IEstateExperienceRegistry registry) external {
        require(hasRole(ADMIN_ROLE, _msgSender()), "not admin");
        require(address(registry) != address(0), "invalid address");
        IEstateExperienceRegistry old = _ps().registryToken;
        _ps().registryToken = registry;
        emit EstateRegistryChanged(_msgSender(), old, registry);
    }

    /// @notice get the registry contract address
    /// @return registry the registry contract address
    function getRegistry() external view returns (IEstateExperienceRegistry) {
        return _ps().registryToken;
    }

    /// @dev See https://docs.opensea.io/docs/contract-level-metadata
    /// @return the metadata url for the whole contract
    function contractURI() public view returns (string memory) {
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, "polygon_estate.json")) : "";
    }

    function _ps() internal pure returns (PolygonEstateTokenStorage storage ds) {
        bytes32 storagePosition = keccak256("PolygonEstateToken.PolygonEstateTokenStorage");
        assembly {
            ds.slot := storagePosition
        }
    }
}
