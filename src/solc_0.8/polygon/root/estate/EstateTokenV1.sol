//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../estate/EstateBaseToken.sol";
import "../../../common/interfaces/IEstateToken.sol";

// solhint-disable-next-line no-empty-blocks
contract EstateTokenV1 is EstateBaseToken, Initializable, IEstateToken {
    /// @dev Emits when a estate is updated.
    /// @param estateId The id of the newly minted token.
    /// @param data The changes made to the Estate.
    event EstateTokenCreated(uint256 indexed estateId, IEstateToken.EstateCRUDData data);

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param data The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IEstateToken.UpdateEstateLands data);

    function initV1(
        address trustedForwarder,
        address admin,
        ILandToken land,
        uint8 chainIndex
    ) public initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
    }

    // @todo Add access-control: minter-only? could inherit WithMinter.sol, the game token creator is minter only
    /// @notice Create a new estate token with lands.
    /// @param from The address of the one creating the estate.
    /// @param data The data to use to create the estate.
    function createEstate(address from, IEstateToken.EstateCRUDData calldata data) external override returns (uint256) {
        uint256 estateId;
        (estateId, ) = _createEstate(from, data.freeLandData, data.uri);
        emit EstateTokenCreated(estateId, data);
        return estateId;
    }

    function updateLandsEstate(address from, IEstateToken.UpdateEstateLands calldata data)
        external
        override
        returns (uint256)
    {
        uint256 newId;
        (newId, ) = _updateLandsEstate(from, data.estateId, data.landToAdd, data.landToRemove, data.uri);
        emit EstateTokenUpdated(data.estateId, newId, data);
        return newId;
    }

    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) external override returns (uint256) {
        return _mintEstate(from, metaData, freeLand);
    }

    function burnEstate(address from, uint256 estateId)
        external
        override
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles)
    {
        return _burnEstate(from, estateId, _storageId(estateId));
    }

    /// @notice Return the URI of a specific token.
    /// @param gameId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 gameId) external view override returns (string memory uri) {
        require(_ownerOf(gameId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 id = _storageId(gameId);
        return string(abi.encodePacked("ipfs://bafybei", hash2base32(metaData[id]), "/", "game.json"));
    }

    function estateData(uint256 estateId)
        external
        view
        override
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory)
    {
        return _estateData(estateId);
    }
}
