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

    // @review do we want to support metaTxs for these functions?
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

    function addAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        string memory uri
    ) external override ownerOrEditorsOnly(gameId, from) {

        gameToken.addAssets(from, gameId, assetIds, values, uri);
    }

    // @review on gameToken, should this func have a "from" param ?
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
