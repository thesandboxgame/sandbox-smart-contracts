//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "../common/BaseWithStorage/ERC721BaseToken.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../common/Interfaces/AssetToken.sol";
import "../common/Interfaces/GameToken.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// @review remove all console.logs !
// import "hardhat/console.sol";

contract GameToken is ERC721BaseToken, GameTokenInterface {
    ///////////////////////////////  Libs //////////////////////////////

    using EnumerableSet for EnumerableSet.UintSet;
    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    struct Data {
        EnumerableSet.UintSet _assets;
        mapping(uint256 => uint256) _values;
    }

    uint256 public _nextId;

    address internal _minter;
    AssetToken _asset;

    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    uint256 private constant CREATOR_OFFSET_MULTIPLIER = uint256(2)**(256 - 160);

    mapping(uint256 => Data) private _gameData;
    mapping(address => address) private _creatorship; // creatorship transfer

    mapping(uint256 => string) private _metaData;
    mapping(uint256 => mapping(address => bool)) private _gameEditors;

    ///////////////////////////////  Events //////////////////////////////

    event Minter(address newMinter);
    event AssetsAdded(uint256 indexed id, uint256[] assets, uint256[] values);
    event AssetsRemoved(uint256 indexed id, uint256[] assets, uint256[] values, address to);
    event CreatorshipTransfer(address indexed original, address indexed from, address indexed to);

    constructor(
        address metaTransactionContract,
        address admin,
        AssetToken asset
    ) ERC721BaseToken(metaTransactionContract, admin) {
        _asset = asset;
        _nextId = 1;
    }

    ///////////////////////////////  Functions //////////////////////////////

    /// @notice Function to remove multiple assets from a GAME
    /// @param gameId The GAME to remove assets from
    /// @param assetId The asset Id to remove
    /// @param to The address to send the removed asset to
    /// @param uri The URI string to update the GAME token's URI
    function removeSingleAsset(
        uint256 gameId,
        uint256 assetId,
        address to,
        string memory uri
    ) external override {
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(to != address(0), "INVALID_TO_ADDRESS");
        // "sub" is from SafeMath.sol
        _gameData[gameId]._values[assetId] = _gameData[gameId]._values[assetId].sub(1);
        uint256 remainingAssets = _gameData[gameId]._values[assetId];

        if (remainingAssets == 0) {
            // "remove" is from EnumerableSet.sol
            require(_gameData[gameId]._assets.remove(assetId), "ASSET_NOT_IN_GAME");
        }

        _asset.safeTransferFrom(address(this), to, assetId);
        uint256[] memory assets = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        assets[0] = assetId;
        values[0] = uint256(1);

        setTokenURI(gameId, uri);
        emit AssetsRemoved(gameId, assets, values, to);
    }

    /// @notice Function to remove multiple assets from a GAME
    /// @param gameId The GAME to remove assets from
    /// @param assetIds An array of asset Ids to remove
    /// @param values An array of the number of each asset id to remove
    /// @param to The address to send removed assets to
    /// @param uri The URI string to update the GAME token's URI
    function removeMultipleAssets(
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to,
        string memory uri
    ) public override {
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(to != address(0), "INVALID_TO_ADDRESS");
        require(
            assetIds.length == values.length && assetIds.length <= getNumberOfAssets(gameId),
            "INVALID_INPUT_LENGTHS"
        );
        for (uint256 i = 0; i < assetIds.length; i++) {
            // "remove" is from EnumerableSet.sol
            uint256 assetValues = _gameData[gameId]._values[assetIds[i]];
            if (values[i] >= _gameData[gameId]._values[assetIds[i]]) {
                _gameData[gameId]._assets.remove(assetIds[i]);
            }
            // "sub" is from SafeMath.sol
            _gameData[gameId]._values[assetIds[i]] = assetValues.sub(values[i]);
        }
        _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");

        setTokenURI(gameId, uri);
        emit AssetsRemoved(gameId, assetIds, values, to);
    }

    /// @notice Function to allow token owner to set game editors
    /// @param gameId The id of the GAME token owned by owner
    /// @param editor The address of the editor to set
    /// @param isEditor Add or remove the ability to edit
    function setGameEditor(
        uint256 gameId,
        address editor,
        bool isEditor
    ) external override {
        require(msg.sender == _ownerOf(gameId), "EDITOR_ACCESS_DENIED");
        _gameEditors[gameId][editor] = isEditor;
    }

    /// @notice Transfers creatorship of `original` from `sender` to `to`.
    /// @param sender address of current registered creator.
    /// @param original address of the original creator whose creation are saved in the ids themselves.
    /// @param to address which will be given creatorship for all tokens originally minted by `original`.
    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external override {
        require(msg.sender == sender || _isValidMetaTx(sender) || _superOperators[msg.sender], "require meta approval");
        require(sender != address(0), "sender is zero address");
        require(to != address(0), "destination is zero address");
        address current = _creatorship[original];
        if (current == address(0)) {
            current = original;
        }
        require(current != to, "current == to");
        require(current == sender, "current != sender");
        if (to == original) {
            _creatorship[original] = address(0);
        } else {
            _creatorship[original] = to;
        }
        emit CreatorshipTransfer(original, current, to);
    }

    /// @notice Set the Minter that will be the only address able to create Estate
    /// @param minter address of the minter
    function setMinter(address minter) external override {
        require(msg.sender == _admin, "ADMIN_NOT_AUTHORIZED");
        require(minter != _minter, "MINTER_SAME_ALREADY_SET");
        _minter = minter;
        emit Minter(minter);
    }

    /// @notice Function to create a new GAME token
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx)
    /// @param to The address who will be assigned ownership of this game
    /// @param assetIds The ids of the assets to add to this game
    /// @param values the amount of each token id to add to game
    /// @param editors The addresses to allow to edit (Can also be set later)
    /// @return id The id of the new GAME token (er1c721)
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address[] memory editors,
        string memory uri
    ) external override returns (uint256 id) {
        // @review consider metaTransactions here. should we require "from", "to" or msg.sender to be the minter?
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        uint256 gameId = _mintGame(from, to);

        if (editors.length != 0) {
            for (uint256 i = 0; i < editors.length; i++) {
                _gameEditors[gameId][editors[i]] = true;
            }
        }
        // a single asset is defined as 1 tokenID, and a value of 1 for that id. For anything else, use addMultipleAssets
        if (assetIds.length != 0) {
            if (assetIds.length == 1 && values[0] == 1) {
                // Case: a single asset id with a value of 1
                addSingleAsset(from, gameId, assetIds[0], uri);
            } else {
                // Case: Either multiple assetIds, or single assetId with value > 1
                addMultipleAssets(from, gameId, assetIds, values, uri);
            }
        }
        setTokenURI(gameId, uri);
        emit AssetsAdded(gameId, assetIds, values);
        return gameId;
    }

    /// @notice Function to burn a GAME token
    /// @param from The address of the one destroying the game
    /// @param to The address to send all game assets to
    /// @param gameId The id of the game to destroy
    function destroyGame(
        address from,
        address to,
        uint256 gameId
    ) external override {
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        // @review Add metaTx support
        require(from == _ownerOf(gameId), "ACCESS_DENIED");
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_GAME_CONTRACT");

        // @note ensure all assets are removed first
        // uint256[] calldata assets;
        // uint256[] calldata values;
        (uint256[] memory assets, uint256[] memory values) = getGameAssets(gameId);
        removeMultipleAssets(gameId, assets, values, to, "");
        assert(_gameData[gameId]._assets.length() == 0);
        _burnGame(gameId);
    }

    function _burnGame(uint256 gameId) private {
        emit Transfer(_ownerOf(gameId), address(0), gameId);
    }

    /// @notice Function to get game editor status
    /// @param gameId The id of the GAME token owned by owner
    /// @param editor The address of the editor to set
    /// @return isEditor Editor status of editor for given tokenId
    function isGameEditor(uint256 gameId, address editor) external view override returns (bool isEditor) {
        return _gameEditors[gameId][editor];
    }

    /// @notice Get the creator of the token type `id`.
    /// @param id the id of the token to get the creator of.
    /// @return the creator of the token type `id`.
    function creatorOf(uint256 id) external view override returns (address) {
        require(id != uint256(0), "NEVER_MINTED");
        address originalCreator = address(id / CREATOR_OFFSET_MULTIPLIER);
        address newCreator = _creatorship[originalCreator];
        if (newCreator != address(0)) {
            return newCreator;
        }
        return originalCreator;
    }

    /// @notice Function to get all assets and their quantities for a GAME
    /// @param gameId The id of the GAME to get assets for
    function getGameAssets(uint256 gameId) public view override returns (uint256[] memory, uint256[] memory) {
        uint256 assetLength = _gameData[gameId]._assets.length();
        uint256[] memory gameAssets;
        uint256[] memory quantities;

        if (assetLength != 0) {
            gameAssets = new uint256[](assetLength);
            quantities = new uint256[](assetLength);
            for (uint256 i = 0; i < assetLength; i++) {
                gameAssets[i] = _gameData[gameId]._assets.at(i);
                quantities[i] = _gameData[gameId]._values[gameAssets[i]];
            }
        } else {
            gameAssets = new uint256[](1);
            quantities = new uint256[](1);
            gameAssets[0] = uint256(0);
            quantities[0] = uint256(0);
        }
        return (gameAssets, quantities);
    }

    /// @notice return the current minter
    /// @return address of minter
    function getMinter() external view override returns (address) {
        return _minter;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external view override returns (bytes4) {
        require(msg.sender == address(_asset), "UNAUTHORIZED_SENDER");
        // @review
        // require(from == operator, "SELF_EXECUTED_TRANSFER_ONLY");
        require(ids.length > 0, "EMPTY_TRANSFER_DISALLOWED");
        require(ids.length == values.length, "need to contains Asset");
        // @review
        // require(data.length > 0, "EMPTY_DATA_DISALLOWED");
        return ERC1155_BATCH_RECEIVED;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external view override returns (bytes4) {
        require(msg.sender == address(_asset), "UNAUTHORIZED_SENDER");
        // @review below.
        // require(from == operator, "SELF_EXECUTED_TRANSFER_ONLY");
        require(id != uint256(0) && value > 0, "EMPTY_TRANSFER_DISALLOWED");
        // @review
        // require(data.length > 0, "EMPTY_DATA_DISALLOWED");
        return ERC1155_RECEIVED;
    }

    /// @notice Return the name of the token contract
    /// @return The name of the token contract
    // @review What should the actual name be?
    // @review Do we want to be able to update metadata?
    function name() external pure override returns (string memory) {
        return "Sandbox's GAMEs";
    }

    /// @notice Function to get the symbol of the token contract
    /// @return The symbol of the token contract
    // @review What should the actual symbol be?
    function symbol() external pure override returns (string memory) {
        return "GAME";
    }

    /// @notice Function to add a single asset to an existing GAME
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx)
    /// @param gameId The id of the GAME to add asset to
    /// @param assetId The id of the asset to add to GAME. Value is 1. If vaule needs to be > 1, use `addMultipleAssets(...)` instead.
    function addSingleAsset(
        address from,
        uint256 gameId,
        uint256 assetId,
        string memory uri
    ) public override {
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        // here "add" is from EnumerableSet.sol
        _gameData[gameId]._assets.add(assetId);
        uint256 assetValues = _gameData[gameId]._values[assetId];
        // here "add" is from SafeMath.sol
        _gameData[gameId]._values[assetId] = assetValues.add(1);
        _asset.safeTransferFrom(from, address(this), assetId, 1, "");
        uint256[] memory assets = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        assets[0] = assetId;
        values[0] = uint256(1);

        setTokenURI(gameId, uri);
        emit AssetsAdded(gameId, assets, values);
    }

    /// @notice Function to add multiple assets to an existing GAME
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx)
    /// @param gameId The id of the GAME to add asset to
    /// @param assetIds The id of the asset to add to GAME
    /// @param values The amount of each asset to add to GAME
    function addMultipleAssets(
        address from,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        string memory uri
    ) public override {
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(assetIds.length == values.length, "INVALID_INPUT_LENGTHS");
        for (uint256 i = 0; i < assetIds.length; i++) {
            _gameData[gameId]._assets.add(assetIds[i]);
            uint256 assetValues = _gameData[gameId]._values[assetIds[i]];
            _gameData[gameId]._values[assetIds[i]] = assetValues.add(values[i]);
        }
        _asset.safeBatchTransferFrom(from, address(this), assetIds, values, "");

        setTokenURI(gameId, uri);
        emit AssetsAdded(gameId, assetIds, values);
    }

    /// @notice Set the URI of a specific game token
    /// @param gameId The id of the game token
    /// @param URI The URI string for the token's metadata
    function setTokenURI(uint256 gameId, string memory URI) public override {
        require(
            msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender] || msg.sender == _minter,
            "URI_ACCESS_DENIED"
        );
        _metaData[gameId] = URI;
    }

    // @review Add burnGame function. see comments here: https://github.com/thesandboxgame/sandbox-private-contracts/pull/138#discussion_r507714939

    function getNumberOfAssets(uint256 gameId) public view override returns (uint256) {
        return _gameData[gameId]._assets.length();
    }

    /// @notice Return the URI of a specific token
    /// @param gameId The id of the token
    /// @return uri The URI of the token
    function tokenURI(uint256 gameId) public view override returns (string memory uri) {
        require(_ownerOf(gameId) != address(0), "Id does not exist");
        string memory URI = _metaData[gameId];
        return URI;
    }

    /// @dev Function to create a new gameId and associate it with an owner
    /// @param to The address of the Game owner
    /// @return id The newly created gameId
    function _mintGame(address from, address to) internal returns (uint256 id) {
        uint256 gameId = generateGameId(from);
        _nextId = _nextId + 1;
        _owners[gameId] = uint256(to);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, gameId);
        return gameId;
    }

    function generateGameId(address creator) internal view returns (uint256) {
        return uint256(creator) * CREATOR_OFFSET_MULTIPLIER + uint96(_nextId);
    }
}
