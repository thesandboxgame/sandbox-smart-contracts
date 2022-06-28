// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
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

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event EstateTokenUpdated(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256[][3] landToAdd,
        uint256[][3] landToRemove
    );

    /// @dev Fallback function that calls the registry. Will run if call data is empty.
    receive() external payable {
        _fallback();
    }

    /// @dev Fallback function that  calls the registry. Will run if no other function in the contract matches the call data.
    fallback() external payable {
        _fallback();
    }

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        uint8 chainIndex
    ) external initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
        _setupRole(ADMIN_ROLE, admin);
    }

    function update(
        uint256 estateId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove,
        uint256[] calldata expToUnlink
    ) external returns (uint256 newEstateId, uint256 newStorageId) {
        require(_ownerOf(estateId) == _msgSender(), "Invalid Owner");
        uint256 storageId = _storageId(estateId);
        _addLand(_msgSender(), estateId, storageId, landToAdd);
        _removeLand(_msgSender(), estateId, storageId, landToRemove, expToUnlink);
        require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        (newEstateId, newStorageId) = _incrementTokenVersion(_msgSender(), estateId);
        emit EstateTokenUpdated(estateId, newEstateId, landToAdd, landToRemove);
        return (newEstateId, newStorageId);
    }

    // Used by the bridge
    function burnEstate(address from, uint256 estateId)
        external
        override
        returns (bytes32 metaData, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        require(hasRole(BURNER_ROLE, _msgSender()) || _ownerOf(estateId) == _msgSender(), "Invalid Owner");
        uint256 storageId = _storageId(estateId);
        metaData = _s().metaData[storageId];
        delete _s().metaData[storageId];
        MapLib.Map storage map = _landTileSet(storageId);
        tiles = map.getMap();
        map.clear();
        IEstateExperienceRegistry r = _ps().registryToken;
        if (address(r) != address(0)) {
            require(!r.isLinked(tiles), "must unlink first");
        }
        _burn(from, _ownerOf(estateId), estateId);
        emit EstateBurned(estateId);
        return (metaData, tiles);
    }

    function setRegistry(IEstateExperienceRegistry registry) external {
        require(hasRole(ADMIN_ROLE, _msgSender()), "not admin");
        _ps().registryToken = registry;
    }

    function getRegistry() external view returns (IEstateExperienceRegistry) {
        return _ps().registryToken;
    }

    /// @notice Return the URI of a specific token.
    /// @param estateId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 estateId) external view override returns (string memory uri) {
        require(_ownerOf(estateId) != address(0), "invalid estateId");
        uint256 storageId = _storageId(estateId);
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    StringsUpgradeable.toHexString(uint256(_s().metaData[storageId]), 32),
                    "/",
                    "PolygonEstateTokenV1.json"
                )
            );
    }

    // Complete the removal process.
    function _removeLand(
        address to,
        uint256,
        uint256 storageId,
        uint256[][3] calldata quads,
        uint256[] calldata expToUnlink
    ) internal {
        IEstateExperienceRegistry r = _ps().registryToken;
        if (address(r) != address(0)) {
            r.batchUnLink(expToUnlink);
            require(!r.isLinked(quads), "must unlink first");
        }
        uint256 len = quads[0].length;
        require(len == quads[1].length && len == quads[2].length, "Invalid quad data");
        address landToken = _s().landToken;
        MapLib.Map storage map = _landTileSet(storageId);
        for (uint256 i; i < len; i++) {
            _removeQuad(to, map, landToken, quads[0][i], quads[1][i], quads[2][i]);
        }
    }

    function _removeQuad(
        address to,
        MapLib.Map storage map,
        address landToken,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        require(map.contain(x, y, size), "Quad missing");
        map.clear(x, y, size);
        if (!IPolygonLand(landToken).exists(size, x, y)) {
            IPolygonLand(landToken).mint(to, size, x, y, "");
        } else {
            IPolygonLand(landToken).transferQuad(address(this), to, size, x, y, "");
        }
    }

    function _ps() internal pure returns (PolygonEstateTokenStorage storage ds) {
        bytes32 storagePosition = keccak256("PolygonEstateToken.PolygonEstateTokenStorage");
        assembly {
            ds.slot := storagePosition
        }
    }

    // If unknown => call the registry.
    function _fallback() internal virtual {
        address implementation = address(_ps().registryToken);
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := call(gas(), implementation, callvalue(), 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
                // delegatecall returns 0 on error.
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}
