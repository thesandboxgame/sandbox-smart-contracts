pragma solidity 0.6.5;

import "../BaseWithStorage/ERC721BaseToken.sol";


contract GameToken is ERC721BaseToken {
    uint256 public _nextId;

    // mapping(uint256 => uint24[]) _assetsInGame;
    // @review Admin functions needed?

    /**
     * @notice Function to create a new GAME token
     * @param from The address of the one creating the game (may be different from msg.sender if metaTx)
     * @param to The address who will be assigned ownerdhip of this game
     * @param assetIds The ids of the assets to add to this game
     * @param editors The addresses to allow to edit (Can also be set later)
     *  */
    function createGame(
        address from,
        address to,
        uint256[] memory assetIds,
        address[] memory editors
    ) public {
        // anyone can "create" a GAME token by transfering assets to the Game contract.
        // @review Any restrictions?
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_GAME_CONTRACT");
        require(assetIds.length != 0, "INSUFFICIENT_ASSETS_SPECIFIED");
        // require msg.sender/"from" address owns or is approved for all assets
        uint256 gameId = _mintGame(to);
        // If no editors passed in, set Game owner as editor
        if (editors.length == 0) {
            _gameEditors[gameId][from] = true;
        } else {
            for (uint256 i = 0; i < editors.length; i++) {
                _gameEditors[gameId][editors[i]] = true;
            }
        }
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
        uint256 gameId = _nextId++;
        _owners[gameId] = uint256(to);
        // _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, gameId);
        return gameId;
    }

    mapping(uint256 => string) private _metaData;
    mapping(uint256 => mapping(address => bool)) private _gameEditors;

    constructor(address metaTransactionContract, address admin) public ERC721BaseToken(metaTransactionContract, admin) {
        _nextId = 1;
    }
}
