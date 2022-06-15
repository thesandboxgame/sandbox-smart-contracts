//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Strings} from "@openzeppelin/contracts-0.8/utils/Strings.sol";
import {IPolygonLand} from "../../../common/interfaces/IPolygonLand.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";

contract PolygonEstateTokenV1 is EstateBaseToken, Initializable {
    using MapLib for MapLib.Map;

    event EstateTokenUpdated(
        uint256 indexed estateId,
        uint256 indexed newId,
        uint256[][3] landToAdd, //(size, x, y)
        uint256[][3] landToRemove //(size, x, y)
    );
    // Removal of land must be done via the registry!!! aka REMOVER_ROLE
    bytes32 public constant REMOVER_ROLE = keccak256("REMOVER_ROLE");

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        uint8 chainIndex
    ) external initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
    }

    function update(
        uint256 estateId,
        uint256[][3] calldata landToAdd, //(size, x, y)
        uint256[][3] calldata landToRemove //(size, x, y)
    ) external returns (uint256) {
        require(hasRole(REMOVER_ROLE, _msgSender()), "not remover");
        (uint256 newId, uint256 newStorageId) =
            _updateLandsEstate(_msgSender(), estateId, _storageId(estateId), landToAdd);
        _landTileSet(newStorageId).remove(landToRemove);
        uint256 len = landToRemove[0].length;
        for (uint256 i; i < len; i++) {
            uint256 size = landToRemove[0][i];
            uint256 x = landToRemove[1][i];
            uint256 y = landToRemove[2][i];
            if (!IPolygonLand(_s().landToken).exists(size, x, y)) {
                IPolygonLand(_s().landToken).mint(_msgSender(), size, x, y, "");
            } else {
                IPolygonLand(_s().landToken).transferQuad(address(this), _msgSender(), size, x, y, "");
            }
        }
        emit EstateTokenUpdated(estateId, newId, landToAdd, landToRemove);
        return newId;
    }

    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata tiles
    ) external override returns (uint256) {
        return _mintEstate(from, metaData, tiles);
    }

    function burnEstate(address from, uint256 estateId)
        external
        override
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        uint256 storageId = _storageId(estateId);
        return _burnEstate(from, estateId, storageId);
    }

    /// @notice Return the URI of a specific token.
    /// @param estateId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 estateId) external view override returns (string memory uri) {
        require(_ownerOf(estateId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 storageId = _storageId(estateId);
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    Strings.toHexString(uint256(_s().metaData[storageId]), 32),
                    "/",
                    "PolygonEstateTokenV1.json"
                )
            );
    }
}
