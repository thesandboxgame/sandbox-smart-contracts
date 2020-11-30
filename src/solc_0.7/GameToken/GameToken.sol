//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "../common/BaseWithStorage/ERC721BaseToken.sol";
import "../common/Interfaces/AssetToken.sol";
import "../common/Interfaces/IGameToken.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "hardhat/console.sol";

contract GameToken is ERC721BaseToken, IGameToken {
    ///////////////////////////////  Libs //////////////////////////////

    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    // contract responsible for forwarding specific calls to GameToken contract.
    address internal _gameManager;
    AssetToken _asset;

    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    uint256 private constant CREATOR_OFFSET_MULTIPLIER = uint256(2)**(256 - 160);

    mapping(uint256 => mapping(uint256 => uint256)) private _gameAssets;
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
        address gameManager,
        AssetToken asset
    ) ERC721BaseToken(metaTransactionContract, admin) {
        _asset = asset;
        _gameManager = gameManager;
    }

    ///////////////////////////////  Modifiers //////////////////////////////

    modifier gameManagerOnly() {
        require(msg.sender == _gameManager || _gameManager == address(0), "INVALID_GAME_MANAGER");
        _;
    }

    modifier ownerOrEditorOnly(uint256 id) {
        require(msg.sender == _ownerOf(id) || _gameEditors[id][msg.sender], "OWNER_EDITOR_ACCESS_DENIED");
        _;
    }

    modifier notToZero(address to) {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        _;
    }

    ///////////////////////////////  Functions //////////////////////////////

    /// @notice Function to remove assets from a GAME
    /// @param gameId The GAME to remove assets from
    /// @param assetIds An array of asset Ids to remove
    /// @param values An array of the number of each asset id to remove
    /// @param to The address to send removed assets to
    /// @param uri The URI string to update the GAME token's URI

    // @refactor ! https://github.com/thesandboxgame/sandbox-private-contracts/pull/152#discussion_r529665560
    function removeAssets(
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to,
        string memory uri
    ) public override gameManagerOnly() ownerOrEditorOnly(gameId) notToZero(to) {
        require(assetIds.length == values.length && assetIds.length != 0, "INVALID_INPUT_LENGTHS");

        for (uint256 i = 0; i < assetIds.length; i++) {
            uint256 currentValue = _gameAssets[gameId][assetIds[i]];
            require(values[i] <= currentValue, "INVALID_ASSET_REMOVAL");
            _gameAssets[gameId][assetIds[i]] = currentValue.sub(values[i]);
        }

        if (assetIds.length == 1) {
            _asset.safeTransferFrom(address(this), to, assetIds[0], values[0], "");
        } else {
            _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");
        }

        _setTokenURI(gameId, uri);
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
    ) external override notToZero(to) {
        require(
            msg.sender == sender || _isValidMetaTx(sender) || _superOperators[msg.sender],
            "TRANSFER_ACCESS_DENIED"
        );
        require(sender != address(0), "ZERO_SENDER_FORBIDDEN");
        address current = _creatorship[original];
        if (current == address(0)) {
            current = original;
        }
        require(current != to, "CURRENT_=_TO");
        require(current == sender, "CURRENT_!=_SENDER");
        if (to == original) {
            _creatorship[original] = address(0);
        } else {
            _creatorship[original] = to;
        }
        emit CreatorshipTransfer(original, current, to);
    }

    // @review comments !
    /// @notice Set the GameManager contract address
    /// If set at deployment, resetting to address(0) will allow anyone to mint games
    /// @param gameManager address of the GameManager
    function setGameManager(address gameManager) external override {
        require(msg.sender == _admin, "ADMIN_NOT_AUTHORIZED");
        require(gameManager != _gameManager, "GAME_MANAGER_ALREADY_SET");
        _gameManager = gameManager;
        emit Minter(gameManager);
    }

    /// @notice Function to create a new GAME token
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx)
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
    ) external override gameManagerOnly() notToZero(to) returns (uint256 id) {
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        uint256 gameId = _mintGame(from, to, randomId);

        if (editors.length != 0) {
            for (uint256 i = 0; i < editors.length; i++) {
                _gameEditors[gameId][editors[i]] = true;
            }
        }

        if (assetIds.length != 0) {
            addAssets(from, gameId, assetIds, values, uri);
        }

        _setTokenURI(gameId, uri);
        return gameId;
    }

    /// @notice Function to burn a GAME token
    /// @param from The address of the one destroying the game
    /// @param to The address to send all game assets to
    /// @param gameId The id of the game to destroy

    // @refactor ! https://github.com/thesandboxgame/sandbox-private-contracts/pull/152#discussion_r529665097
    function destroyGame(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) external override gameManagerOnly() {
        _destroyGame(from, to, gameId, assetIds, values);
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
    function creatorOf(uint256 id) public view override returns (address) {
        require(id != uint256(0), "GAME_NEVER_MINTED");
        address originalCreator = address(id / CREATOR_OFFSET_MULTIPLIER);
        address newCreator = _creatorship[originalCreator];
        if (newCreator != address(0)) {
            return newCreator;
        }
        return originalCreator;
    }

    /// @notice return the current gameManager
    /// @return address of gameManager
    function getGameManager() external view override returns (address) {
        return _gameManager;
    }

    function onERC1155BatchReceived(
        address operator,
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external view override returns (bytes4) {
        if (operator == address(this)) {
            return ERC1155_BATCH_RECEIVED;
        }
        revert("ERC1155_BATCH_REJECTED");
    }

    function onERC1155Received(
        address operator,
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external view override returns (bytes4) {
        if (operator == address(this)) {
            return ERC1155_RECEIVED;
        }
        revert("ERC1155_REJECTED");
    }

    /// @notice Return the name of the token contract
    /// @return The name of the token contract
    // @review What should the actual name be?
    function name() external pure override returns (string memory) {
        return "Sandbox's GAMEs";
    }

    /// @notice Function to get the symbol of the token contract
    /// @return The symbol of the token contract
    // @review What should the actual symbol be?
    function symbol() external pure override returns (string memory) {
        return "GAME";
    }

    /// @notice Function to add assets to an existing GAME
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx)
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
    ) public override gameManagerOnly() ownerOrEditorOnly(gameId) {
        require(assetIds.length == values.length && assetIds.length != 0, "INVALID_INPUT_LENGTHS");
        for (uint256 i = 0; i < assetIds.length; i++) {
            _gameAssets[gameId][assetIds[i]] = values[i];
        }
        if (assetIds.length == 1) {
            _asset.safeTransferFrom(from, address(this), assetIds[0], values[0], "");
        } else {
            _asset.safeBatchTransferFrom(from, address(this), assetIds, values, "");
        }
        _setTokenURI(gameId, uri);
        emit AssetsAdded(gameId, assetIds, values);
    }

    /// @notice Set the URI of a specific game token
    /// @param gameId The id of the game token
    /// @param URI The URI string for the token's metadata
    function setTokenURI(uint256 gameId, string calldata URI) external override {
        require(msg.sender == _ownerOf(gameId) || _gameEditors[gameId][msg.sender], "URI_ACCESS_DENIED");
        _setTokenURI(gameId, URI);
    }

    function _setTokenURI(uint256 gameId, string memory URI) internal {
        _metaData[gameId] = URI;
    }

    /// @notice Return the URI of a specific token
    /// @param gameId The id of the token
    /// @return uri The URI of the token
    function tokenURI(uint256 gameId) public view override returns (string memory uri) {
        require(_ownerOf(gameId) != address(0), "BURNED_OR_NEVER_MINTED");
        string memory URI = _metaData[gameId];
        return URI;
    }

    /// @notice transfer all assets from a burnt game
    /// @param from previous owner of the burnt game
    /// @param gameId estate id
    /// @param to address that will receive the assets
    function withdrawFromDestroyedGame(
        address from,
        address to,
        uint256 gameId,
        uint256[] memory assetIds,
        uint256[] memory values
    ) public override notToZero(to) {
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        _check_withdrawal_authorized(from, gameId);
        uint256 length = assetIds.length;
        require(length > 0, "WITHDRAWAL_COMPLETE");
        uint256[] memory amounts = new uint256[](length);

        if (values[0] == uint256(0)) {
            for (uint256 i = 0; i < length; i++) {
                amounts[i] = _gameAssets[gameId][i];
            }
            _asset.safeBatchTransferFrom(address(this), to, assetIds, amounts, "");
            emit AssetsRemoved(gameId, assetIds, amounts, to);
        } else {
            require(assetIds.length == values.length, "INVALID_INPUT_LENGTHS");
            _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");
            emit AssetsRemoved(gameId, assetIds, values, to);
        }
    }

    function _destroyGame(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) internal notToZero(to) {
        address owner = _ownerOf(gameId);
        require(from == owner, "DESTROY_ACCESS_DENIED");
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        // @review don't try to do this here (block gas limit)
        // extract to transferAllFromDestroyedGame()
        if (assetIds.length != 0) {
            removeAssets(gameId, assetIds, values, to, "");
        }
        delete _metaData[gameId];
        _creatorship[creatorOf(gameId)] = address(0);
        _burn(from, owner, gameId);
    }

    function _check_withdrawal_authorized(address from, uint256 gameId) internal view {
        require(from != address(0), "SENDER_ZERO_ADDRESS");
        require(from == _withdrawalOwnerOf(gameId), "LAST_OWNER_NOT_EQUAL_SENDER");
        // @review does this need metaTx support?
        require(
            msg.sender == from ||
                _isValidMetaTx(msg.sender) ||
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender],
            "WITHDRAWAL_NOT_AUTHORIZED"
        );
    }

    function _withdrawalOwnerOf(uint256 id) internal view returns (address) {
        uint256 data = _owners[id];
        if ((data & (2**160)) == 2**160) {
            return address(data);
        }
        return address(0);
    }

    /// @dev Function to create a new gameId and associate it with an owner
    /// @param from The address of the Game creator
    /// @param to The address of the Game owner
    /// @param randomId The id to use when generating the new GameId
    /// @return id The newly created gameId
    function _mintGame(
        address from,
        address to,
        uint96 randomId
    ) internal returns (uint256 id) {
        uint256 gameId = generateGameId(from, randomId);
        _owners[gameId] = uint256(to);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, gameId);
        return gameId;
    }

    /// @dev Function to create a new gameId and associate it with an owner
    /// @param creator The address of the Game creator
    /// @param randomId The id to use when generating the new GameId
    function generateGameId(address creator, uint96 randomId) internal pure returns (uint256) {
        return uint256(creator) * CREATOR_OFFSET_MULTIPLIER + uint96(randomId);
    }
}
