// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../common/BaseWithStorage/WithMetaTransaction.sol";
import "../common/Interfaces/IGameToken.sol";
import "../common/Interfaces/IGameMinter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract GameMinter is WithMetaTransaction, IGameMinter {
    ///////////////////////////////  Libs //////////////////////////////
    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    IGameToken internal immutable _gameToken;

    uint256 internal constant SAND_DECIMALS = 10**18;
    uint256 internal immutable _gameMintingFee;
    uint256 internal immutable _gameModificationFee;
    address internal immutable _feeBeneficiary;
    IERC20 internal immutable _sand;

    ///////////////////////////////  Functions /////////////////////////

    constructor(
        IGameToken gameTokenContract,
        address metaTransactionContract,
        uint256 gameMintingFee,
        uint256 gameModificationFee,
        address feeBeneficiary,
        IERC20 sand
    ) {
        _gameToken = gameTokenContract;
        _setMetaTransactionProcessor(metaTransactionContract, METATX_SANDBOX);
        _gameMintingFee = gameMintingFee;
        _gameModificationFee = gameModificationFee;
        _feeBeneficiary = feeBeneficiary;
        _sand = sand;
    }

    /// @notice Function to create a new GAME token
    /// @param from The address of the one creating the game, included in the gameId
    /// @param to The address who will be assigned ownership of this game
    /// @param assetIds The ids of the assets to add to this game
    /// @param values the amount of each token id to add to game
    /// @param editor The address to allow to edit (can also be set later)
    /// @param randomId A random id created on the backend.
    /// @return gameId The id of the new GAME token (erc721)
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address editor,
        string memory uri,
        uint96 randomId
    ) external override returns (uint256 gameId) {
        require(msg.sender == from || _isValidMetaTx(from), "CREATE_ACCESS_DENIED");
        _chargeSand(from, _gameMintingFee);
        uint256 id = _gameToken.createGame(from, to, assetIds, values, editor, uri, randomId);
        return id;
    }

    /// @notice Function to add assets to an existing GAME
    /// @param from The address of the current owner of assets
    /// @param gameId The id of the GAME to add asset to
    /// @param assetIds The id of the asset to add to GAME
    /// @param values The amount of each asset to add to GAME
    /// @param uri The new uri to set
    /// @param editor The game editor address (ignored if address(0)). Use only to perform
    /// a metaTx on behalf of editor instead of owner.
    function addAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        string memory uri,
        address editor
    ) external override {
        _checkAuthorization(from, gameId, editor);
        _chargeSand(from, _gameModificationFee);
        _gameToken.addAssets(from, gameId, assetIds, values, uri);
    }

    /// @notice Function to remove assets from a GAME
    /// @param from The address of the one initiating the call
    /// @param gameId The GAME to remove assets from
    /// @param assetIds An array of asset Ids to remove
    /// @param values An array of the number of each asset id to remove
    /// @param to The address to send removed assets to
    /// @param uri The URI string to update the GAME token's URI
    /// @param editor The game editor address (ignored if address(0)). Use only to perform
    /// a metaTx on behalf of editor instead of owner.
    function removeAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to,
        string memory uri,
        address editor
    ) external override {
        _checkAuthorization(from, gameId, editor);
        _chargeSand(from, _gameModificationFee);
        _gameToken.removeAssets(gameId, assetIds, values, to, uri);
    }

    /// @notice Set the URI of a specific game token
    /// @param from The address of the game owner
    /// @param gameId The id of the game token
    /// @param uri The URI string for the token's metadata
    /// @param editor The game editor address (ignored if address(0)). Use only to perform
    /// a metaTx on behalf of editor instead of owner.
    function setTokenUri(
        address from,
        uint256 gameId,
        string calldata uri,
        address editor
    ) external override {
        _checkAuthorization(from, gameId, editor);
        _chargeSand(from, _gameModificationFee);
        _gameToken.setTokenURI(gameId, uri);
    }

    function _chargeSand(address from, uint256 sandFee) internal {
        // @review is this assignment needed?
        // address feeBeneficiary = _feeBeneficiary;
        if (_feeBeneficiary != address(0) && sandFee != 0) {
            _sand.transferFrom(from, _feeBeneficiary, sandFee);
        }
    }

    function _checkAuthorization(
        address from,
        uint256 id,
        address editor
    ) internal view {
        if (editor == address(0)) {
            require(
                _gameToken.ownerOf(id) == msg.sender || _gameToken.isGameEditor(id, msg.sender) || _isValidMetaTx(from),
                "AUTH_ACCESS_DENIED"
            );
        } else {
            require(_isValidMetaTx(editor) && _gameToken.isGameEditor(id, editor), "METATX_ACCESS_DENIED");
        }
    }
}
