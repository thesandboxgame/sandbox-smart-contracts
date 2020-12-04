// SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "../common/BaseWithStorage/WithMetaTransaction.sol";
import "../common/interfaces/IGameToken.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract GameManager is WithMetaTransaction, IGameManager {
    ///////////////////////////////  Libs //////////////////////////////
    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    IGameToken gameToken;

    bool _feesEnabled;

    mapping(address => bool) internal _whitelisted;

    ///////////////////////////////  Events ////////////////////////////

    ///////////////////////////////  Modifiers /////////////////////////

    // modifier authorizedAccessOnly(from) {
    //     require(msg.sender == from || _isValidMetaTx(from), "UNAUTHORIZED_ACCESS");
    //     _;
    // }

    modifier ownerOrEditorsOnly(uint256 id, address from) {
        require(
            gameToken.ownerOf(id) == msg.sender || gameToken.isGameEditor(id, msg.sender) || _isValidMetaTx(from),
            "EDITOR_ACCESS_DENIED"
        );
        _;
    }

    ///////////////////////////////  Functions /////////////////////////

    constructor(address gameTokenContract, address admin) {
        gameToken = gameTokenContract;
        _admin = admin;
    }

    /// @notice Function to create a new GAME token
    /// @param from The address of the one creating the game, included in the gameId
    /// @param to The address who will be assigned ownership of this game
    /// @param assetIds The ids of the assets to add to this game
    /// @param values the amount of each token id to add to game
    /// @param editors The addresses to allow to edit (can also be set later)
    /// @param randomId A random id created on the backend.
    /// @return id The id of the new GAME token (erc721)
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address[] memory editors,
        string memory uri,
        uint96 randomId
    ) external override returns (uint256 gameId) {
      require(msg.sender == from || _isValidMetaTx(from), "UNAUTHORIZED_ACCESS")
      gameToken.createGame(from, to, assetIds, values, editors,uri, randomId);
    }

    /// @notice Function to add assets to an existing GAME
    /// @param from The address of the current owner of assets
    /// @param gameId The id of the GAME to add asset to
    /// @param assetIds The id of the asset to add to GAME
    /// @param values The amount of each asset to add to GAME
    /// @param uri The new uri to set
    function addAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        string memory uri
    ) external override ownerOrEditorsOnly(gameId, from) {

        gameToken.addAssets(from, gameId, assetIds, values, uri);
    }

    /// @notice Function to remove assets from a GAME
    /// @param gameId The GAME to remove assets from
    /// @param assetIds An array of asset Ids to remove
    /// @param values An array of the number of each asset id to remove
    /// @param to The address to send removed assets to
    /// @param uri The URI string to update the GAME token's URI
    function removeAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to,
        string memory uri
    ) external override ownerOrEditorsOnly(gameId, from) {
        gameToken.removeAssets(gameId, assetIds, values, uri);
    }
}
