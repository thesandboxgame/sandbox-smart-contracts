//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-0.8/utils/Strings.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../estate/EstateBaseToken.sol";
import "../../../common/interfaces/IEstateToken.sol";

// solhint-disable-next-line no-empty-blocks
contract EstateTokenV1 is EstateBaseToken, Initializable, IEstateToken {
    using MapLib for MapLib.Map;

    event EstateTokenUpdated(
        uint256 indexed oldId,
        uint256 indexed newId,
        uint256[][3] landToAdd,
        uint256[][3] landToRemove
    );

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        uint8 chainIndex
    ) public initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
    }

    function update(
        uint256 estateId,
        uint256[][3] calldata landToAdd,
        uint256[][3] calldata landToRemove
    ) external returns (uint256) {
        uint256 storageId = _storageId(estateId);
        (uint256 newId, ) = _updateLandsEstate(_msgSender(), estateId, storageId, landToAdd);
        _landTileSet(storageId).remove(landToRemove);
        ILandToken(_s().landToken).batchTransferQuad(
            address(this),
            _msgSender(),
            landToRemove[0],
            landToRemove[1],
            landToRemove[2],
            ""
        );
        require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        emit EstateTokenUpdated(estateId, newId, landToAdd, landToRemove);
        return newId;
    }

    // TODO: Rules for this one. Used from the tunnel
    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata tiles
    ) external override returns (uint256) {
        return _mintEstate(from, metaData, tiles);
    }

    // TODO: Rules for this one. Used from the tunnel
    function burnEstate(address from, uint256 estateId)
        external
        override
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        return _burnEstate(from, estateId, _storageId(estateId));
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
                    "estateTokenV1.json"
                )
            );
    }
}
