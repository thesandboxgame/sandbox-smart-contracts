// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../common/BaseWithStorage/WithMetaTransaction.sol";
import "../common/Interfaces/IGameToken.sol";
import "../common/Interfaces/IGameMinter.sol";
import "openzeppelin/contracts/math/SafeMath.sol";

contract GameMinter is WithMetaTransaction, IGameMinter {
    ///////////////////////////////  Libs //////////////////////////////
    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    IGameToken gameToken;

    uint256 internal constant SAND_DECIMALS = 10**18;
    uint256 internal immutable GAME_MINTING_FEE;
    uint256 internal immutable GAME_MODIFICATION_FEE;;
    address internal immutable _feeCollector;

    ///////////////////////////////  Functions /////////////////////////

    constructor(
        address gameTokenContract,
        address metaTransactionContract,
        uint256 gameMintingFee,
        uint256 gameModificationFee,
        address feeCollector
    ) {
        gameToken = IGameToken(gameTokenContract);
        _setMetaTransactionProcessor(metaTransactionContract, METATX_SANDBOX);
        GAME_MINTING_FEE = gameMintingFee;
        GAME_MODIFICATION_FEE = gameModificationFee;
        _feeCollector = feeCollector;
    }

    /// @notice Function to create a new GAME token
    /// @param from The address of the one creating the game, included in the gameId
    /// @param to The address who will be assigned ownership of this game
    /// @param assetIds The ids of the assets to add to this game
    /// @param values the amount of each token id to add to game
    /// @param editors The addresses to allow to edit (can also be set later)
    /// @param randomId A random id created on the backend.
    /// @return gameId The id of the new GAME token (erc721)
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address[] memory editors,
        string memory uri,
        uint96 randomId
    ) external payable override returns (uint256 gameId) {
        require(msg.sender == from || _isValidMetaTx(from), "CREATE_ACCESS_DENIED");
        _chargeSand(from, assetIds.length.mul(GAME_MINTING_FEE));
        uint256 id = gameToken.createGame(from, to, assetIds, values, editors, uri, randomId);
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
    ) external payable override {
        _checkAuthorization(from, gameId, editor);
        _chargeSand(from, assetIds.length.mul(GAME_MODIFICATION_FEE));
        gameToken.addAssets(from, gameId, assetIds, values, uri);
    }

    /// @notice Function to remove assets from a GAME
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
    ) external payable override {
        _checkAuthorization(from, gameId, editor);
        _chargeSand(from, assetIds.length.mul(GAME_MODIFICATION_FEE));
        gameToken.removeAssets(gameId, assetIds, values, to, uri);
    }

    /// @notice Set the URI of a specific game token
    /// @param from The address of the game owner
    /// @param gameId The id of the game token
    /// @param URI The URI string for the token's metadata
    /// @param editor The game editor address (ignored if address(0)). Use only to perform
    /// a metaTx on behalf of editor instead of owner.
    function setTokenUri(uint256 gameId, string calldata URI) external payable override {
        _checkAuthorization(from, gameId, editor);
        _chargeSand(from, GAME_MODIFICATION_FEE);
    }

    function _chargeSand(address from, uint256 sandFee) internal {
        address feeCollector = _feeCollector;
        if (feeCollector != address(0) && sandFee != 0) {
            _sand.transferFrom(from, _feeCollector, sandFee);
        }
    }

    function _checkAuthorization(address from, uint256 id, address editor) internal view {
        if (editor == address(0)) {
            require(
                gameToken.ownerOf(id) == msg.sender ||
                    gameToken.isGameEditor(id, msg.sender) ||
                    _isValidMetaTx(from),
                "URI_ACCESS_DENIED"
            );
        } else {
            require(_isValidMetaTx(editor), "METATX_ACCESS_DENIED");
        }
    }
}
