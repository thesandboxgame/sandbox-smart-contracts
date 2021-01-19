// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "../common/BaseWithStorage/WithMetaTransaction.sol";
import "./GameToken.sol";
import "../common/Interfaces/IGameMinter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract GameMinter is WithMetaTransaction, IGameMinter {
    ///////////////////////////////  Libs //////////////////////////////
    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    GameToken internal immutable _gameToken;
    uint256 internal immutable _gameMintingFee;
    uint256 internal immutable _gameUpdateFee;
    address internal immutable _feeBeneficiary;
    IERC20 internal immutable _sand;

    ///////////////////////////////  Functions /////////////////////////

    constructor(
        GameToken gameTokenContract,
        address metaTransactionContract,
        uint256 gameMintingFee,
        uint256 gameUpdateFee,
        address feeBeneficiary,
        IERC20 sand
    ) {
        _gameToken = gameTokenContract;
        _setMetaTransactionProcessor(metaTransactionContract, METATX_SANDBOX);
        _gameMintingFee = gameMintingFee;
        _gameUpdateFee = gameUpdateFee;
        _feeBeneficiary = feeBeneficiary;
        _sand = sand;
    }

    /// @notice Function to create a new GAME token
    /// @param from The address of the one creating the game, included in the gameId
    /// @param to The address who will be assigned ownership of this game
    /// @param creation The struct containing ids & ammounts of assets to add to this game,
    /// along with the uri to set.
    /// @param editor The address to allow to edit (can also be set later).
    /// @param subId A random id created on the backend.
    /// @return gameId The id of the new GAME token (erc721)
    function createGame(
        address from,
        address to,
        GameToken.Update calldata creation,
        address editor,
        uint64 subId
    ) external override returns (uint256 gameId) {
        require(msg.sender == from || _isValidMetaTx(from), "CREATE_ACCESS_DENIED");
        _chargeSand(from, _gameMintingFee);
        return _gameToken.createGame(from, to, creation, editor, subId);
    }

    /// @notice Update an existing GAME token.This actually burns old token
    /// and mints new token with same basId & incremented version.
    /// @param from The one updating the GAME token.
    /// @param gameId The current id of the GAME token.
    /// @param update The values to use for the update.
    /// @return newId The new gameId.
    function updateGame(
        address from,
        uint256 gameId,
        GameToken.Update memory update
    ) external override returns (uint256 newId) {
        _checkAuthorization(from, gameId);
        _chargeSand(from, _gameUpdateFee);
        return _gameToken.updateGame(from, gameId, update);
    }

    function _chargeSand(address from, uint256 sandFee) internal {
        if (_feeBeneficiary != address(0) && sandFee != 0) {
            _sand.transferFrom(from, _feeBeneficiary, sandFee);
        }
    }

    function _checkAuthorization(address from, uint256 id) internal view {
        address gameOwner = _gameToken.ownerOf(id);
        require(
            msg.sender == gameOwner ||
                _gameToken.isGameEditor(gameOwner, msg.sender) ||
                (_isValidMetaTx(from) && (from == gameOwner || _gameToken.isGameEditor(gameOwner, from))),
            "AUTH_ACCESS_DENIED"
        );
    }
}
