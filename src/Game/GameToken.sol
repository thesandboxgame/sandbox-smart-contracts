pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../BaseWithStorage/ERC721BaseToken.sol";
import "../interfaces/AssetToken.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../common/Libraries/SafeMathWithRequire.sol";

// @review remove all console.logs !
import "@nomiclabs/buidler/console.sol";


contract GameToken is ERC721BaseToken {
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeMathWithRequire for uint256;

    uint256 public _nextId;

    event Minter(address newMinter);
    event AssetsAdded(uint256 indexed id, uint256[] assets, uint256[] values);
    event AssetsRemoved(uint256 indexed id, uint256[] assets, uint256[] values, address to);

    /// @notice return the current minter
    /// @return address of minter
    function getMinter() external view returns (address) {
        return _minter;
    }

    /// @notice Set the Minter that will be the only address able to create Estate
    /// @param minter address of the minter
    function setMinter(address minter) external {
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
    /// @return id The id of the new GAME token (erc721)
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address[] memory editors
    ) public returns (uint256 id) {
        // @review consider metaTransactions here. should we require "from", "to" or msg.sender to be the minter?
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        require(assetIds.length == values.length, "INVALID_INPUT_LENGTHS");
        uint256 gameId = _mintGame(to);

        if (editors.length != 0) {
            for (uint256 i = 0; i < editors.length; i++) {
                _gameEditors[gameId][editors[i]] = true;
            }
        }
        // a single asset is defined as 1 tokenID, and a value of 1 for that id. For anything else, use addMultipleAssets
        if (assetIds.length != 0) {
            if (assetIds.length == 1 && values[0] == 1) {
                // Case: a single asset id with a value of 1
                addSingleAsset(from, gameId, assetIds[0]);
            } else {
                // Case: Either multiple assetIds, or single assetId with value > 1
                addMultipleAssets(from, gameId, assetIds, values);
            }
        }
        emit AssetsAdded(gameId, assetIds, values);
        return gameId;
    }

    /// @notice Function to add a single asset to an existing GAME
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx)
    /// @param gameId The id of the GAME to add asset to
    /// @param assetId The id of the asset to add to GAME. Value is 1. If vaule needs to be > 1, use `addMultipleAssets(...)` instead.
    function addSingleAsset(
        address from,
        uint256 gameId,
        uint256 assetId
    ) public {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        // here "add" is from EnumerableSet.sol
        _gameData[gameId]._assets.add(assetId);
        uint256 assetValues = _gameData[gameId]._values[assetId];
        // here "add" is from SafeMathWithRequire.sol
        _gameData[gameId]._values[assetId] = assetValues.add(1);
        _asset.transferFrom(from, address(this), assetId);
        uint256[] memory assets = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        assets[0] = assetId;
        values[0] = uint256(1);

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
        uint256[] memory values
    ) public {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(assetIds.length == values.length, "INVALID_INPUT_LENGTHS");
        for (uint256 i = 0; i < assetIds.length; i++) {
            _gameData[gameId]._assets.add(assetIds[i]);
            uint256 assetValues = _gameData[gameId]._values[assetIds[i]];
            _gameData[gameId]._values[assetIds[i]] = assetValues.add(values[i]);
            console.log("Asset ID in addMultiple()", assetIds[i]);
            console.log("Value in addMultiple()", values[i]);
        }
        _asset.safeBatchTransferFrom(from, address(this), assetIds, values, "");
        emit AssetsAdded(gameId, assetIds, values);
    }

    // @review Add burnGame function. see comments here: https://github.com/thesandboxgame/sandbox-private-contracts/pull/138#discussion_r507714939

    // @review Could be made into a wrapper which calls removeMultipleAssets with correct params...
    function removeSingleAsset(
        uint256 gameId,
        uint256 assetId,
        address to
    ) external {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(to != address(0), "INVALID_TO_ADDRESS");
        // "remove" is from EnumerableSet.sol
        _gameData[gameId]._assets.remove(assetId);
        uint256 assetValues = _gameData[gameId]._values[assetId];
        // "sub" is from SafeMathWithRequire.sol
        _gameData[gameId]._values[assetId] = assetValues.sub(1);
        _asset.safeTransferFrom(address(this), to, assetId);
        uint256[] memory assets = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        assets[0] = assetId;
        values[0] = uint256(1);
        emit AssetsRemoved(gameId, assets, values, to);
    }

    function removeMultipleAssets(
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        address to
    ) external {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(to != address(0), "INVALID_TO_ADDRESS");
        require(assetIds.length == values.length, "INVALID_INPUT_LENGTHS");
        for (uint256 i = 0; i < assetIds.length; i++) {
            // "remove" is from EnumerableSet.sol
            _gameData[gameId]._assets.remove(assetIds[i]);
            uint256 assetValues = _gameData[gameId]._values[assetIds[i]];
            // "sub" is from SafeMathWithRequire.sol
            _gameData[gameId]._values[assetIds[i]] = assetValues.sub(values[i]);
            _asset.safeTransferFrom(address(this), to, assetIds[i]);
        }
        emit AssetsRemoved(gameId, assetIds, values, to);
    }

    // @review consider removing this
    function getNumberOfAssets(uint256 gameId) external view returns (uint256) {
        return _gameData[gameId]._assets.length();
    }

    /// @notice Function to get all assets and their quantities for a GAME
    /// @param gameId The id of the GAME to get assets for

    function getGameAssets(uint256 gameId) external view returns (uint256[] memory, uint256[] memory) {
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

    /// @notice Function to allow token owner to set game editors
    /// @param gameId The id of the GAME token owned by owner
    /// @param editor The address of the editor to set
    /// @param isEditor Add or remove the ability to edit
    function setGameEditor(
        uint256 gameId,
        address editor,
        bool isEditor
    ) external {
        require(msg.sender == _ownerOf(gameId), "EDITOR_ACCESS_DENIED");
        _gameEditors[gameId][editor] = isEditor;
    }

    /// @notice Function to get game editor status
    /// @param gameId The id of the GAME token owned by owner
    /// @param editor The address of the editor to set
    /// @return isEditor Editor status of editor for given tokenId
    function isGameEditor(uint256 gameId, address editor) external view returns (bool isEditor) {
        return _gameEditors[gameId][editor];
    }

    /// @notice Return the name of the token contract
    /// @return The name of the token contract
    // @review What should the actual name be?
    // @review Do we want to be able to update metadata?
    function name() external pure returns (string memory) {
        return "Sandbox's GAMEs";
    }

    /// @notice Function to get the symbol of the token contract
    /// @return The symbol of the token contract
    // @review What should the actual symbol be?
    function symbol() external pure returns (string memory) {
        return "GAME";
    }

    /// @notice Return the URI of a specific token
    /// @param gameId The id of the token
    /// @return tokenURI The URI of the token
    function tokenURI(uint256 gameId) public view returns (string memory tokenURI) {
        require(_ownerOf(gameId) != address(0), "Id does not exist");
        string memory URI = _metaData[gameId];
        return URI;
    }

    /// @notice Set the URI of a specific game token
    /// @param gameId The id of the game token
    /// @param URI The URI string for the token's metadata
    function setTokenURI(uint256 gameId, string memory URI) public {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "URI_ACCESS_DENIED");
        _metaData[gameId] = URI;
    }

    function onERC1155Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        revert("NOT_ERC1155_RECEIVER");
    }

    function onERC1155BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external view returns (bytes4) {
        if (msg.sender == address(_asset)) {
            return 0xbc197c81;
        } else {
            revert("NOT_ERC1155_RECEIVER");
        }
    }

    /// @dev Function to create a new gameId and associate it with an owner
    /// @param to The address of the Game owner
    /// @return id The newly created gameId
    function _mintGame(address to) internal returns (uint256 id) {
        uint256 gameId = _nextId;
        _nextId = _nextId + 1;
        _owners[gameId] = uint256(to);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, gameId);
        return gameId;
    }

    address internal _minter;
    AssetToken _asset;

    struct Data {
        EnumerableSet.UintSet _assets;
        mapping(uint256 => uint256) _values;
    }

    mapping(uint256 => Data) private _gameData;

    mapping(uint256 => string) private _metaData;
    mapping(uint256 => mapping(address => bool)) private _gameEditors;

    constructor(
        address metaTransactionContract,
        address admin,
        AssetToken asset
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _asset = asset;
        _nextId = 1;
    }
}
