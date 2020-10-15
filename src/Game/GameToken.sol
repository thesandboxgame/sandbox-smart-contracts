pragma solidity 0.6.5;

import "../BaseWithStorage/ERC721BaseToken.sol";
import "../interfaces/AssetToken.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@nomiclabs/buidler/console.sol";


contract GameToken is ERC721BaseToken {
    using EnumerableSet for EnumerableSet.UintSet;

    uint256 public _nextId;

    event Minter(address newMinter);
    event NewGame(uint256 indexed id, address indexed gameOwner, uint256[] assets);
    event AssetsAdded(uint256 indexed id, uint256[] assets);
    event AssetsRemoved(uint256 indexed id, uint256[] assets);

    // @review Admin functions needed?

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

    /**
     * @notice Function to create a new GAME token
     * @param from The address of the one creating the game (may be different from msg.sender if metaTx)
     * @param to The address who will be assigned ownership of this game
     * @param assetIds The ids of the assets to add to this game
     * @param editors The addresses to allow to edit (Can also be set later)
     *  */
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        address[] memory editors
    ) public returns (uint256 id) {
        // @review consider metaTransactions here! should we require "from", "to" or msg.sender to be the minter?
        require(msg.sender == _minter || _minter == address(0), "INVALID_MINTER");
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        uint256 gameId = _mintGame(to);

        if (editors.length != 0) {
            for (uint256 i = 0; i < editors.length; i++) {
                _gameEditors[gameId][editors[i]] = true;
            }
        }

        if (assetIds.length != 0) {
            EnumerableSet.UintSet storage gameAssets = _assetsInGame[gameId];
            for (uint256 i = 0; i < assetIds.length; i++) {
                // @review using openzeppelin's enumerable set lib:
                // https://docs.openzeppelin.com/contracts/3.x/api/utils#EnumerableSet-add-struct-EnumerableSet-AddressSet-address-
                gameAssets.add(assetIds[i]);
                _asset.safeTransferFrom(from, address(this), assetIds[i]);
            }
        }

        emit NewGame(gameId, to, assetIds);
        return gameId;
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
    function isGameEditor(uint256 gameId, address editor) external returns (bool isEditor) {
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
        uint256 testOwner = _owners[gameId];
        console.log("to: ", uint256(to));
        console.log("test owner: ", testOwner);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, gameId);
        return gameId;
    }

    address internal _minter;
    AssetToken _asset;

    // EnumerableSet.UintSet private _assetsSet;
    mapping(uint256 => string) private _metaData;
    mapping(uint256 => mapping(address => bool)) private _gameEditors;
    mapping(uint256 => EnumerableSet.UintSet) private _assetsInGame;

    constructor(
        address metaTransactionContract,
        address admin,
        AssetToken asset
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _asset = asset;
        _nextId = 1;
    }
}
