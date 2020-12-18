//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma abicoder v2;

import "../common/BaseWithStorage/ERC721BaseToken.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "../common/Interfaces/IAssetToken.sol";
import "../common/Interfaces/IGameToken.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
// @review remove import !!!
import "hardhat/console.sol";

contract GameToken is ERC721BaseToken, WithMinter, IGameToken {
    ///////////////////////////////  Libs //////////////////////////////

    using SafeMath for uint256;

    ///////////////////////////////  Data //////////////////////////////

    IAssetToken internal immutable _asset;

    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    uint256 private constant CREATOR_OFFSET_MULTIPLIER = uint256(2)**(256 - 160);
    uint256 private constant SUBID_MULTIPLIER = uint256(2)**(256 - 224);

    mapping(uint256 => mapping(uint256 => uint256)) private _gameAssets;
    mapping(address => address) private _creatorship; // creatorship transfer

    mapping(uint256 => string) private _metaData;
    mapping(address => mapping(address => bool)) private _gameEditors;

    ///////////////////////////////  Events //////////////////////////////

    /// @dev Emits when a game is updated.
    /// @param oldId The id of the previous erc721 GAME token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Game: new assets, removed assets, uri
    /// @param to The receiving address for the removed assets.

    event GameTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IGameToken.Update update, address to);

    /// @dev Emits when creatorship of a GAME token is transferred.
    /// @param original The original creator of the GAME token.
    /// @param from The current 'creator' of the token.
    /// @param to The new 'creator' of the token.
    event CreatorshipTransfer(address indexed original, address indexed from, address indexed to);

    /// @dev Emits when an address has its gameEditor status changed.
    /// @param gameOwner The owner of the GAME token.
    /// @param gameEditor The address whose editor rights to update.
    /// @param isEditor WHether the address 'gameEditor' should be an editor.
    event GameEditorSet(address indexed gameOwner, address gameEditor, bool isEditor);

    constructor(
        address metaTransactionContract,
        address admin,
        IAssetToken asset,
        address initialMinter
    ) ERC721BaseToken(metaTransactionContract, admin) {
        _asset = asset;
        _minter = initialMinter;
    }

    ///////////////////////////////  Modifiers //////////////////////////////

    modifier notToZero(address to) {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        _;
    }

    modifier notToThis(address to) {
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        _;
    }

    ///////////////////////////////  Functions //////////////////////////////

    /// @notice Get the amount of each assetId in a GAME.
    /// @param gameId The game to query.
    /// @param assetIds The assets to get balances for.
    function getAssetBalances(uint256 gameId, uint256[] calldata assetIds)
        external
        view
        override
        returns (uint256[] memory)
    {
        require(_ownerOf(gameId) != address(0), "NONEXISTANT_TOKEN");
        uint256 length = assetIds.length;
        uint256[] memory assets;
        assets = new uint256[](length);
        uint256 baseId = _extractBaseId(gameId);
        for (uint256 i = 0; i < length; i++) {
            assets[i] = _gameAssets[baseId][assetIds[i]];
        }
        return assets;
    }

    /// @notice Allow token owner to set game editors.
    /// @param gameCreator The address of a GAME token creator.
    /// @param editor The address of the editor to set.
    /// @param isEditor Add or remove the ability to edit.
    function setGameEditor(
        address gameCreator,
        address editor,
        bool isEditor
    ) external override {
        require(msg.sender == gameCreator || _isValidMetaTx(gameCreator), "EDITOR_ACCESS_DENIED");
        _setGameEditor(gameCreator, editor, isEditor);
    }

    /// @notice Transfers creatorship of `original` from `sender` to `to`.
    /// @param sender The address of current registered creator.
    /// @param original The address of the original creator whose creation are saved in the ids themselves.
    /// @param to The address which will be given creatorship for all tokens originally minted by `original`.
    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external override notToZero(to) {
        require(
            msg.sender == sender || _isValidMetaTx(sender) || _superOperators[msg.sender],
            "TRANSFER_ACCESS_DENIED"
        );
        require(sender != address(0), "NOT_FROM_ZEROADDRESS");
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

    /// @notice Create a new GAME token.
    /// @param from The address of the one creating the game (may be different from msg.sender if metaTx).
    /// @param to The address who will be assigned ownership of this game.
    /// @param assetIds The ids of the assets to add to this game.
    /// @param values the amount of each token id to add to game.
    /// @param editor The address to allow to edit (can also be set later).
    /// @param subId A random id created on the backend.
    /// @return id The id of the new GAME token (erc721).
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        uint256[] memory values,
        address editor,
        string memory uri,
        uint64 subId
    ) external override onlyMinter() notToZero(to) notToThis(to) returns (uint256 id) {
        uint256 gameId = _mintGame(from, to, subId, 0);
        uint256 baseId = _extractBaseId(gameId);
        // @review goal: prevent id reuse.
        // caller should not be able to pass an already-used address + subId combo
        // require(_owners[baseId] == 0, "NO_ID_REUSE");
        // require(_withdrawalOwnerOf(baseId) == address(0), "NO_ID_REUSE");
        if (editor != address(0)) {
            _setGameEditor(to, editor, true);
        }

        if (assetIds.length != 0) {
            _addAssets(from, baseId, assetIds, values);
        }
        _metaData[baseId] = uri;
        _numNFTPerAddress[to]++;

        Update memory creation;
        creation.assetIdToAdd = assetIds;
        creation.assetAmountsToAdd = values;
        creation.uri = uri;

        emit GameTokenUpdated(0, gameId, creation, to);
        return gameId;
    }

    /// @notice Get game editor status.
    /// @param gameOwner The address of the owner of the GAME.
    /// @param editor The address of the editor to set.
    /// @return isEditor Editor status of editor for given tokenId.
    function isGameEditor(address gameOwner, address editor) external view override returns (bool isEditor) {
        return _gameEditors[gameOwner][editor];
    }

    /// @notice Called by other contracts to check if this can receive erc1155 batch.
    /// @param operator The address of the operator in the current tx.
    /// @return the bytes4 value 0xbc197c81.
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

    /// @notice Called by other contracts to check if this can receive erc1155 tokens.
    /// @param operator The address of the operator in the current tx.
    /// @return the bytes4 value 0xf23a6e61.
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

    /// @notice Return the name of the token contract.
    /// @return The name of the token contract.
    function name() external pure override returns (string memory) {
        return "The Sandbox: GAME token";
    }

    /// @notice Get the symbol of the token contract.
    /// @return the symbol of the token contract.
    function symbol() external pure override returns (string memory) {
        return "GAME";
    }

    /// @notice Burn a GAME token and recover assets.
    /// @param from The address of the one destroying the game.
    /// @param to The address to send all GAME assets to.
    /// @param gameId The id of the GAME to destroy.
    /// @param assetIds The assets to recover from the burnt GAME.
    function destroyAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external override {
        _destroyGame(from, to, gameId);
        _recoverAssets(from, to, gameId, assetIds);
    }

    /// @notice Burn a GAME token.
    /// @param from The address of the one destroying the game.
    /// @param to The address to send all GAME assets to.
    /// @param gameId The id of the GAME to destroy.
    function destroyGame(
        address from,
        address to,
        uint256 gameId
    ) external override {
        _destroyGame(from, to, gameId);
    }

    // minter need to ensure from is checked
    function updateGame(
        address from,
        address to,
        uint256 gameId,
        IGameToken.Update memory update
    ) public override onlyMinter() notToZero(to) notToThis(to) returns (uint256) {
        uint256 baseId = _extractBaseId(gameId);
        _addAssets(from, baseId, update.assetIdToAdd, update.assetAmountsToAdd);
        _removeAssets(baseId, update.assetIdToRemove, update.assetAmountsToRemove, to);

        // do not check for changes as uri is most likely to change if using ipfs
        // on that note, using ipfs solely would allow us to use 32bytes only : reducing the cost and ensuring token is fully immutable
        // should we reconsider ?
        // use dns url does not bring advantage as we could always have a centralised mapping `baseId -> uri` that would fit the same purpose
        _metaData[baseId] = update.uri;

        uint256 newId = _bumpGameVersion(from, gameId);
        emit GameTokenUpdated(gameId, newId, update, to);

        return newId;
    }

    /// @notice Add assets to an existing GAME.
    /// @param from The address of the current owner of assets.
    /// @param baseId The baseId of the GAME to add assets to.
    /// @param assetIds The id of the asset to add to GAME.
    /// @param amounts The amount of each asset to add to GAME.
    function _addAssets(
        address from,
        uint256 baseId,
        uint256[] memory assetIds,
        uint256[] memory amounts
    ) internal {
        if (assetIds.length == 0) {
            return;
        }
        require(assetIds.length == amounts.length, "INVALID_INPUT_LENGTHS");
        uint256 currentValue;
        for (uint256 i = 0; i < assetIds.length; i++) {
            currentValue = _gameAssets[baseId][assetIds[i]];
            require(amounts[i] != 0, "INVALID_ASSET_ADDITION");
            _gameAssets[baseId][assetIds[i]] = currentValue.add(amounts[i]);
        }
        if (assetIds.length == 1) {
            _asset.safeTransferFrom(from, address(this), assetIds[0], amounts[0], "");
        } else {
            _asset.safeBatchTransferFrom(from, address(this), assetIds, amounts, "");
        }
    }

    /// @notice Remove assets from a GAME.
    /// @param baseId The baseId of the GAME to remove assets from.
    /// @param assetIds An array of asset Ids to remove.
    /// @param values An array of the number of each asset id to remove.
    /// @param to The address to send removed assets to.
    function _removeAssets(
        uint256 baseId,
        uint256[] memory assetIds,
        uint256[] memory values,
        address to
    ) internal {
        if (assetIds.length == 0) {
            return;
        }
        require(assetIds.length == values.length && assetIds.length != 0, "INVALID_INPUT_LENGTHS");
        uint256 currentValue;
        for (uint256 i = 0; i < assetIds.length; i++) {
            currentValue = _gameAssets[baseId][assetIds[i]];
            require(currentValue != 0 && values[i] != 0 && values[i] <= currentValue, "INVALID_ASSET_REMOVAL");
            _gameAssets[baseId][assetIds[i]] = currentValue.sub(values[i]);
        }

        if (assetIds.length == 1) {
            _asset.safeTransferFrom(address(this), to, assetIds[0], values[0], "");
        } else {
            _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");
        }
    }

    /// @notice Get the creator of the token type `id`.
    /// @param id The id of the token to get the creator of.
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

    /// @notice Return the URI of a specific token.
    /// @param gameId The id of the token.
    /// @return uri The URI of the token.
    function tokenURI(uint256 gameId) public view override returns (string memory uri) {
        require(_ownerOf(gameId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 baseId = _extractBaseId(gameId);
        return _metaData[baseId];
    }

    /// @notice Transfer assets from a burnt GAME.
    /// @param from Previous owner of the burnt game.
    /// @param to Address that will receive the assets.
    /// @param gameId Id of the burnt GAME token.
    /// @param assetIds The assets to recover from the burnt GAME.
    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] memory assetIds
    ) public override {
        _recoverAssets(from, to, gameId, assetIds);
    }

    /// @notice Check if the contract supports an interface.
    /// 0x01ffc9a7 is ERC-165.
    /// 0x80ac58cd is ERC-721.
    /// @param id The id of the interface.
    /// @return if the interface is supported.
    function supportsInterface(bytes4 id) public pure override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }

    /// @dev See destroyGame.
    function _destroyGame(
        address from,
        address to,
        uint256 gameId
    ) internal notToZero(to) notToThis(to) {
        address owner = _ownerOf(gameId);
        require(msg.sender == owner || _isValidMetaTx(from), "DESTROY_ACCESS_DENIED");
        require(from == owner, "DESTROY_INVALID_FROM");
        uint256 baseId = _extractBaseId(gameId);
        delete _metaData[baseId];
        _creatorship[creatorOf(gameId)] = address(0);
        _burn(from, owner, gameId);
    }

    /// @dev See recoverAssets.
    function _recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] memory assetIds
    ) internal notToZero(to) notToThis(to) {
        require(_ownerOf(gameId) == address(0), "ONLY_FROM_BURNED_TOKEN");
        bool validMetaTx = _isValidMetaTx(from);
        // @review if it is a valid metaTx, we still need to check the _owners mapping
        if (!validMetaTx) {
            require(from == msg.sender, "INVALID_RECOVERY_CALLER");
            _check_withdrawal_authorized(from, gameId);
        }
        require(assetIds.length > 0, "WITHDRAWAL_COMPLETE");
        uint256[] memory values;
        values = new uint256[](assetIds.length);
        uint256 baseId = _extractBaseId(gameId);
        for (uint256 i = 0; i < assetIds.length; i++) {
            values[i] = _gameAssets[baseId][assetIds[i]];
            delete _gameAssets[baseId][assetIds[i]];
        }
        // uint256[][2] memory emptyArray = new uint256[][](0);
        _asset.safeBatchTransferFrom(address(this), to, assetIds, values, "");
        // emit GameTokenUpdated(gameId, emptyArray, "", assetIds, values, to, gameId);
    }

    /// @dev Check if a withdrawal is allowed.
    /// @param from The address requesting the withdrawal.
    /// @param gameId The id of the GAME token to withdraw assets from.
    function _check_withdrawal_authorized(address from, uint256 gameId) internal view {
        require(from != address(0), "SENDER_ZERO_ADDRESS");
        require(from == _withdrawalOwnerOf(gameId), "LAST_OWNER_NOT_EQUAL_SENDER");
    }

    /// @dev Get the address allowed to withdraw assets from the GAME token.
    /// If too many assets in GAME, block.gaslimit won't allow detroy and withdraw in 1 tx.
    /// A game owner may destroy their GAME token, then withdraw assets in a later tx (even
    /// though ownerOf(id) would be address(0) after burning.)
    /// @param id The id of the GAME token to query.
    /// @return the address of the owner before burning.
    // @review compare this to _ownerOf()
    function _withdrawalOwnerOf(uint256 id) internal view returns (address) {
        uint256 data = _owners[id];
        if ((data & (2**160)) == 2**160) {
            return address(data);
        }
        return address(0);
    }

    /// @dev Create a new gameId and associate it with an owner.
    /// @param from The address of one creating the game.
    /// @param to The address of the Game owner.
    /// @param subId The id to use when generating the new GameId.
    /// @param version The version number part of the gameId.
    /// @return id The newly created gameId.
    function _mintGame(
        address from,
        address to,
        uint64 subId,
        uint32 version
    ) internal returns (uint256 id) {
        uint32 idVersion;
        if (version == 0) {
            idVersion = 1;
        } else {
            idVersion = version;
        }
        uint256 gameId = _generateGameId(from, subId, idVersion);
        _owners[gameId] = uint256(to);
        emit Transfer(address(0), to, gameId);
        return gameId;
    }

    /// @dev Allow token owner to set game editors.
    /// @param gameCreator The address of a GAME creator,
    /// @param editor The address of the editor to set.
    /// @param isEditor Add or remove the ability to edit.
    function _setGameEditor(
        address gameCreator,
        address editor,
        bool isEditor
    ) internal {
        emit GameEditorSet(gameCreator, editor, isEditor);
        _gameEditors[gameCreator][editor] = isEditor;
    }

    function _bumpGameVersion(address from, uint256 gameId) internal returns (uint256) {
        address originalCreator = address(gameId / CREATOR_OFFSET_MULTIPLIER);
        uint64 subId = uint64(gameId / SUBID_MULTIPLIER);
        uint32 version = uint32(gameId);
        version++;
        address owner = _ownerOf(gameId);
        uint256 newId = _mintGame(originalCreator, owner, subId, version);
        address newOwner = _ownerOf(newId);
        assert(owner == newOwner);
        _burn(from, owner, gameId);
        return newId;
    }

    function _extractBaseId(uint256 gameId) internal pure returns (uint256) {
        // Right-shift to drop the version
        uint224 shiftedBaseId = uint224(gameId / 10**8);
        // Left-shift to pad with 0s again
        return shiftedBaseId * 10**8;
    }

    /// @dev Create a new gameId and associate it with an owner.
    /// This is a packed id, consisting of 3 parts:
    /// the creator's address, a uint64 subId and a uint32 version number.
    /// @param creator The address of the Game creator.
    /// @param subId The id to use when generating the new GameId.
    function _generateGameId(
        address creator,
        uint64 subId,
        uint32 version
    ) internal pure returns (uint256) {
        return uint256(creator) * CREATOR_OFFSET_MULTIPLIER + uint64(subId) * SUBID_MULTIPLIER + uint32(version);
    }
}
