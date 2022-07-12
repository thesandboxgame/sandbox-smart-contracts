//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";

contract EstateTokenV1 is EstateBaseToken {
    using MapLib for MapLib.Map;

    /// @notice update an estate adding and removing lands in one step
    /// @param oldId the estate id that will be updated
    /// @param landToAdd The set of quads to add.
    /// @param landToRemove The set of quads to remove.
    /// @return estateId the new estate Id
    function update(
        uint256 oldId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove
    ) external returns (uint256) {
        require(_isApprovedOrOwner(_msgSender(), oldId), "caller is not owner nor approved");
        require(landToAdd[0].length > 0 || landToRemove[0].length > 0, "nothing to update");
        Estate storage estate = _estate(oldId);
        _addLand(estate, _msgSender(), landToAdd);
        _removeLand(estate, _msgSender(), landToRemove);
        require(!estate.land.isEmpty(), "estate cannot be empty");
        require(estate.land.isAdjacent(), "not adjacent");
        estate.id = _incrementTokenVersion(estate.id);
        emit EstateTokenUpdated(oldId, estate.id, _msgSender(), estate.land.getMap());
        return estate.id;
    }

    /// @notice burn an estate
    /// @dev to be able to burn an estate it must be empty
    /// @param estateId the estate id that will be updated
    /// @param landToRemove The set of quads to remove.
    function burn(uint256 estateId, uint256[][3] calldata landToRemove) external {
        require(_isApprovedOrOwner(_msgSender(), estateId), "caller is not owner nor approved");
        Estate storage estate = _estate(estateId);
        _removeLand(estate, _msgSender(), landToRemove);
        require(estate.land.isEmpty(), "map not empty");
        _burnEstate(estate);
        emit EstateTokenBurned(estateId, _msgSender());
    }

    /// @notice completely burn an estate (Used by the bridge)
    /// @param from user that is trying to use the bridge
    /// @param estateId the id of the estate token
    /// @return tiles the list of tiles (aka lands) to add to the estate
    function burnEstate(address from, uint256 estateId)
        external
        virtual
        override
        returns (TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        require(hasRole(BURNER_ROLE, _msgSender()), "not authorized");
        require(_isApprovedOrOwner(from, estateId), "caller is not owner nor approved");
        Estate storage estate = _estate(estateId);
        tiles = estate.land.getMap();
        _burnEstate(estate);
        emit EstateBridgeBurned(estateId, _msgSender(), from, tiles);
        return tiles;
    }

    /// @dev See https://docs.opensea.io/docs/contract-level-metadata
    /// @return the metadata url for the whole contract
    function contractURI() public view returns (string memory) {
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, "estate.json")) : "";
    }

    function _removeLand(
        Estate storage estate,
        address to,
        uint256[][3] calldata quads
    ) internal virtual {
        uint256 len = quads[0].length;
        require(len == quads[1].length && len == quads[2].length, "invalid quad data");
        MapLib.Map storage map = estate.land;
        for (uint256 i; i < len; i++) {
            require(map.contain(quads[1][i], quads[2][i], quads[0][i]), "quad missing");
            map.clear(quads[1][i], quads[2][i], quads[0][i]);
        }
        ILandToken(_s().landToken).batchTransferQuad(address(this), to, quads[0], quads[1], quads[2], "");
    }
}
