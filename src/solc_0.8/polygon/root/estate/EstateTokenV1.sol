//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";

contract EstateTokenV1 is EstateBaseToken {
    using MapLib for MapLib.Map;
    event EstateTokenLandsRemoved(uint256 indexed estateId, uint256 indexed newId, uint256[][3] lands);
    event EstateTokenUpdated(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256[][3] landToAdd,
        uint256[][3] landToRemove
    );

    function update(
        uint256 oldId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove
    ) external returns (uint256) {
        require(_isApprovedOrOwner(_msgSender(), oldId), "caller is not owner nor approved");
        (Estate storage estate, ) = _estate(oldId);
        _addLand(estate, _msgSender(), landToAdd);
        _removeLand(estate, _msgSender(), landToRemove);
        require(estate.land.isAdjacent(), "not adjacent");
        estate.id = _incrementTokenVersion(estate.id);
        emit EstateTokenUpdated(oldId, estate.id, landToAdd, landToRemove);
        return estate.id;
    }

    function burn(uint256 estateId, uint256[][3] calldata landToRemove) external {
        require(_isApprovedOrOwner(_msgSender(), estateId), "caller is not owner nor approved");
        (Estate storage estate, ) = _estate(estateId);
        _removeLand(estate, _msgSender(), landToRemove);
        require(estate.land.isEmpty(), "map not empty");
        _burnEstate(estate.id);
    }

    /// @notice Return the URI of a specific token.
    /// @param estateId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 estateId) public view override returns (string memory uri) {
        require(ownerOf(estateId) != address(0), "BURNED_OR_NEVER_MINTED");
        (Estate storage estate, ) = _estate(estateId);
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    StringsUpgradeable.toHexString(uint256(estate.metaData), 32),
                    "/",
                    "estateTokenV1.json"
                )
            );
    }

    function _removeLand(
        Estate storage estate,
        address to,
        uint256[][3] calldata quads
    ) internal virtual {
        uint256 len = quads[0].length;
        require(len == quads[1].length && len == quads[2].length, "Invalid data");
        MapLib.Map storage map = estate.land;
        for (uint256 i; i < len; i++) {
            require(map.contain(quads[1][i], quads[2][i], quads[0][i]), "Quad missing");
            map.clear(quads[1][i], quads[2][i], quads[0][i]);
        }
        ILandToken(_s().landToken).batchTransferQuad(address(this), to, quads[0], quads[1], quads[2], "");
    }
}
