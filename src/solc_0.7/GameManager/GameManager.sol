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
    // @review RE: whitelist
    // If we implement a whitelist for creating games, how do we manage a whitelisted user who wants to sell their GAME token to a non-whitelisted user?
    modifier whitelistedOnly(from) {
        require(whitelisted[msg.sender] || _isValidMetaTx(from), "WHITELIST_ACCESS_DENIED");
        _;
    }

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

    // @note Add functions to manage whitelist

    // @note Add functions and storage to manage fees

    // @note add to interface
    function setFeesEnabled(bool enabled) external adminOny() {
        require(enabled != _feesEnabled, "ENABLED_ALREADY_SET");
        _feesEnabled = enabled;
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
    ) external override whitelistedOnly(from) returns (uint256 gameId) {
        require(msg.sender == from || _isValidMetaTx(from), "UNAUTHORIZED_ACCESS");
    }

    function addAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        string memory uri
    ) external override ownerOrEditorsOnly(gameId, from) {
        gameToken.recoverAssets(from, gameId, assetIds, values, uri);
    }

    // @review on gameToken, should this func have a "from" param ?
    function removeAssets(
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to,
        string memory uri
    ) external override ownerOrEditorsOnly(gameId, from) {
        gameToken.recoverAssets(from, gameId, assetIds, values, uri);
    }

    function destroyAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) external override ownerOrEditorsOnly(gameId, from) {
        gameToken.recoverAssets(from, to, gameId, assetIds, values);
    }

    function destroyGame(
        address from,
        address to,
        uint256 gameId
    ) external override ownerOrEditorsOnly(gameId, from) {}

    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values
    ) external override ownerOrEditorsOnly(gameId, from) {
        gameToken.recoverAssets(from, to, gameId, assetIds, values);
    }
}
