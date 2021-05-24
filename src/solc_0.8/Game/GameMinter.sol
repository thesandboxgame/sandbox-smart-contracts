// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "./GameBaseToken.sol";
import "../common/interfaces/IGameMinter.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "../common/BaseWithStorage/ERC2771Handler.sol";

contract GameMinter is ERC2771Handler, IGameMinter {
    ///////////////////////////////  Data //////////////////////////////

    GameBaseToken internal immutable _gameToken;
    // @todo confirm actual fees
    uint256 internal immutable _gameMintingFee;
    uint256 internal immutable _gameUpdateFee;
    address internal immutable _feeBeneficiary;
    IERC20 internal immutable _sand;

    ///////////////////////////////  Functions /////////////////////////

    constructor(
        GameBaseToken gameTokenContract,
        address trustedForwarder,
        uint256 gameMintingFee,
        uint256 gameUpdateFee,
        address feeBeneficiary,
        IERC20 sand
    ) {
        _gameToken = gameTokenContract;
        _gameMintingFee = gameMintingFee;
        _gameUpdateFee = gameUpdateFee;
        _feeBeneficiary = feeBeneficiary;
        _sand = sand;
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
    }

    /// @notice Function to create a new GAME token
    /// @param to The address who will be assigned ownership of this game.
    /// @param creation The struct containing ids & ammounts of assets to add to this game,
    /// along with the uri to set.
    /// @param editor The address to allow to edit (can also be set later).
    /// @param subId A random id created on the backend.
    /// @return gameId The id of the new GAME token (erc721)
    function createGame(
        address to,
        GameBaseToken.GameData calldata creation,
        address editor,
        uint64 subId
    ) external override returns (uint256 gameId) {
        address msgSender = _msgSender();
        _chargeSand(msgSender, _gameMintingFee);
        return _gameToken.createGame(msgSender, to, creation, editor, subId);
    }

    /// @notice Update an existing GAME token.This actually burns old token
    /// and mints new token with same basId & incremented version.
    /// @param gameId The current id of the GAME token.
    /// @param update The values to use for the update.
    /// @return newId The new gameId.
    function updateGame(uint256 gameId, GameBaseToken.GameData memory update)
        external
        override
        returns (uint256 newId)
    {
        address gameOwner = _gameToken.ownerOf(gameId);
        address msgSender = _msgSender();
        require(msgSender == gameOwner || _gameToken.isGameEditor(gameOwner, msgSender), "AUTH_ACCESS_DENIED");
        _chargeSand(msgSender, _gameUpdateFee);
        return _gameToken.updateGame(msgSender, gameId, update);
    }

    /// @dev Charge a fee in Sand if conditions are met.
    /// @param from The address responsible for paying the fee.
    /// @param sandFee The fee that applies to the current operation (create || update).
    function _chargeSand(address from, uint256 sandFee) internal {
        if (_feeBeneficiary != address(0) && sandFee != 0) {
            _sand.transferFrom(from, _feeBeneficiary, sandFee);
        }
    }
}
