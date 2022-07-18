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

        uint256 alen = landToAdd[0].length;
        require(alen == landToAdd[1].length && alen == landToAdd[2].length, "invalid add data");
        uint256 rlen = landToRemove[0].length;
        require(rlen == landToRemove[1].length && rlen == landToRemove[2].length, "invalid remove data");
        require(alen > 0 || rlen > 0, "nothing to update");
        return _update(_msgSender(), oldId, landToAdd, landToRemove);
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
        _burnEstate(estate, from);
        emit EstateBridgeBurned(estateId, _msgSender(), from, tiles);
        return tiles;
    }

    /// @dev See https://docs.opensea.io/docs/contract-level-metadata
    /// @return the metadata url for the whole contract
    function contractURI() public view returns (string memory) {
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, "estate.json")) : "";
    }
}
