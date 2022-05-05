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
    /// @param update The changes made to the Estate.
    event EstateTokenCreated(uint256 indexed estateId, IEstateToken.EstateCRUDData update);

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IEstateToken.UpdateEstateLands update);

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
    /* /// @param from The address of the one creating the estate.
    /// @param to The address that will own the estate. */
    /// @param creation The data to use to create the estate.
    function createEstate(address from, IEstateToken.EstateCRUDData calldata creation)
        external
        override
        onlyMinter()
        returns (uint256)
    {
        uint256 estateId;
        (estateId, ) = _createEstate(from, creation.tiles, creation.quadTuple, creation.uri);
        emit EstateTokenCreated(estateId, creation);
        return estateId;
    }

    function updateLandsEstate(address from, IEstateToken.UpdateEstateLands calldata update)
        external
        override
        onlyMinter()
        returns (uint256)
    {
        uint256 newId;
        (newId, ) = _updateLandsEstate(
            from,
            update.estateId,
            update.tilesToAdd,
            update.quadsToAdd,
            update.quadsToRemove,
            update.uri
        );
        emit EstateTokenUpdated(update.estateId, newId, update);
        return newId;
    }
}
