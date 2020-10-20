pragma solidity 0.6.5;

import "../BaseWithStorage/ERC721BaseToken.sol";
import "../interfaces/AssetToken.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

// @review remove all console.logs !
import "@nomiclabs/buidler/console.sol";


contract GameToken is ERC721BaseToken {
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public _nextId;

    event Minter(address newMinter);
    event AssetsAdded(uint256 indexed id, uint256[] assets, uint256[] values);
    event AssetsRemoved(uint256 indexed id, uint256[] assets, uint256[] values, address to);

    /// @notice return the current minter
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

    function _ownerOf(uint256 id) internal override view returns (address) {
        uint256 data = _owners[id];
        return address(data);
    }

    /**
     * @notice Function to create a new GAME token
     * @param from The address of the one creating the game (may be different from msg.sender if metaTx)
     * @param to The address who will be assigned ownership of this game
     * @param assetIds The ids of the assets to add to this game
     * @param editors The addresses to allow to edit (Can also be set later)
     *  */

    // @review make sure assetIds.length == quantities.length
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

        if (assetIds.length != 0) {
            EnumerableSet.UintSet storage gameAssets = _assetsInGame[gameId];
            EnumerableSet.UintSet storage assetQuantities = _assetQuantities[gameId];
            if (assetIds.length > 1) {
                for (uint256 i = 0; i < assetIds.length; i++) {
                    gameAssets.add(assetIds[i]);
                    assetQuantities.add(values[i]);
                }
                _asset.safeBatchTransferFrom(from, address(this), assetIds, values, "");
            } else {
                _asset.transferFrom(from, address(this), assetIds[0]);
            }
        }
        emit AssetsAdded(gameId, assetIds, values);
        return gameId;
    }

    // @review Add burnGame function. see comments here: https://github.com/thesandboxgame/sandbox-private-contracts/pull/138#discussion_r507714939

    // @review Could be made into a wrapper which calls addMultipleAssets with correct params...
    function addSingleAsset(
        uint256 gameId,
        uint256 assetId,
        uint256 value
    ) external {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        _assetsInGame[gameId].add(assetId);
        _asset.safeTransferFrom(msg.sender, address(this), assetId);
        uint256[] memory assets;
        uint256[] memory values;
        assets[0] = assetId;
        values[0] = value;

        emit AssetsAdded(gameId, assets, values);
    }

    // @review Could be made into a wrapper which calls removeMultipleAssets with correct params...
    function removeSingleAsset(
        uint256 gameId,
        uint256 assetId,
        uint256 value,
        address to
    ) external {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(to != address(0), "INVALID_TO_ADDRESS");
        _assetsInGame[gameId].remove(assetId);
        // @review does this work?
        _asset.safeTransferFrom(address(this), to, assetId);
        uint256[] memory assets;
        uint256[] memory values;
        assets[0] = assetId;
        values[0] = value;
        emit AssetsRemoved(gameId, assets, values, to);
    }

    function addMultipleAssets(
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) external {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        EnumerableSet.UintSet storage gameAssets = _assetsInGame[gameId];
        for (uint256 i = 0; i < assetIds.length; i++) {
            gameAssets.add(assetIds[i]);
            _asset.safeTransferFrom(msg.sender, address(this), assetIds[i]);
        }
        emit AssetsAdded(gameId, assetIds, values);
    }

    function removeMultipleAssets(
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        address to
    ) external {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "ACCESS_DENIED");
        require(to != address(0), "INVALID_TO_ADDRESS");
        EnumerableSet.UintSet storage gameAssets = _assetsInGame[gameId];
        for (uint256 i = 0; i < assetIds.length; i++) {
            gameAssets.remove(assetIds[i]);
            _asset.safeTransferFrom(address(this), to, assetIds[i]);
        }
        emit AssetsRemoved(gameId, assetIds, values, to);
    }

    function getGameAssets(uint256 gameId) external view returns (uint256[] memory assetIds, uint256[] memory quantities) {
        // uint256[] memory assets;
        // uint256[] memory quantities;
        for (uint256 i = 0; i < _assetsInGame[gameId].length(); i++) {
            assetIds[i] = _assetsInGame[gameId].at(i);
            quantities[i] = _assetQuantities[gameId].at(i);
        }
        return (assetIds, quantities);
    }

    /**
     * @notice Function to allow token owner to set game editors
     * @param gameId The id of the GAME token owned by owner
     * @param editor The address of the editor to set
     * @param isEditor Add or remove the ability to edit
     */
    function setGameEditor(
        uint256 gameId,
        address editor,
        bool isEditor
    ) external {
        require(msg.sender == _ownerOf(gameId), "EDITOR_ACCESS_DENIED");
        _gameEditors[gameId][editor] = isEditor;
    }

    /**
     * @notice Function to get game editor status
     * @param gameId the id of the GAME token owned by owner
     * @param editor the address of the editor to set
     * @return isEditor editor status of editor for given tokenId
     */
    function isGameEditor(uint256 gameId, address editor) external view returns (bool isEditor) {
        return _gameEditors[gameId][editor];
    }

    /**
     * @notice Return the name of the token contract
     * @return The name of the token contract
     */
    function name() external pure returns (string memory) {
        return "Sandbox's GAMEs";
    }

    /**
     * @notice Return the symbol of the token contract
     * @return The symbol of the token contract
     */
    function symbol() external pure returns (string memory) {
        return "GAME";
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
        // @review if this reverts we have no way to use batch transfers from our asset contract when adding assets to a game ! Maybe we have to add logic here to return the correct bytes4 if the caller is trusted asset contract...

        if (msg.sender == address(_asset)) {
            return 0xbc197c81;
        } else {
            revert("NOT_ERC1155_RECEIVER");
        }
    }

    /**
     * @notice Return the URI of a specific token
     * @param gameId The id of the token
     * @return tokenURI The URI of the token
     */
    function tokenURI(uint256 gameId) public view returns (string memory tokenURI) {
        require(_ownerOf(gameId) != address(0), "Id does not exist");
        string memory URI = _metaData[gameId];
        return URI;
    }

    /**
     * @notice Set the URI of a specific game token
     * @param gameId The id of the game token
     * @param URI The URI string for the token's metadata
     */
    function setTokenURI(uint256 gameId, string memory URI) public {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "URI_ACCESS_DENIED");
        _metaData[gameId] = URI;
    }

    /**
     * @dev Function to create a new gameId and associate it with an owner
     * @param to The address of the Game owner
     * @return id The newly created gameId
     */
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

    mapping(uint256 => string) private _metaData;
    mapping(uint256 => mapping(address => bool)) private _gameEditors;
    mapping(uint256 => EnumerableSet.UintSet) private _assetsInGame;
    mapping(uint256 => EnumerableSet.UintSet) private _assetQuantities;

    constructor(
        address metaTransactionContract,
        address admin,
        AssetToken asset
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _asset = asset;
        _nextId = 1;
    }
}
