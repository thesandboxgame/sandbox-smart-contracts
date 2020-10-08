pragma solidity 0.6.5;

import "../BaseWithStorage/ERC721BaseToken.sol";


contract GameToken is ERC721BaseToken {
    /**
     * @notice function to allow token owner to set game editors
     * @param id the id of the GAME token owned by owner
     * @param editor the address of the editor to set
     * @param isEditor add or remove the ability to edit
     */
    function setGameEditor(
        uint256 id,
        address editor,
        bool isEditor
    ) external {
        require(msg.sender == _ownerOf(id), "EDITOR_ACCESS_DENIED");
        _gameEditors[id][editor] = isEditor;
    }

    /**
     * @notice function to get game editor status
     * @param id the id of the GAME token owned by owner
     * @param editor the address of the editor to set
     * @return isEditor editor status of editor for given tokenId
     */
    function isGameEditor(uint256 id, address editor) external returns (bool isEditor) {
        return _gameEditors[id][editor];
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
     * @param id The id of the token
     * @return tokenURI The URI of the token
     */
    function tokenURI(uint256 id) public view returns (string memory tokenURI) {
        require(_ownerOf(id) != address(0), "Id does not exist");
        string memory URI = _metaData[id];
        return URI;
    }

    /**
     * @notice Set the URI of a specific token
     * @param id the id of the token
     * @param URI the URI string for the token's metadata
     */
    function setTokenURI(uint256 id, string memory URI) public {
        require(msg.sender == _ownerOf(id) || _gameEditors[id][msg.sender], "URI_ACCESS_DENIED");
        _metaData[id] = URI;
    }

    mapping(uint256 => string) private _metaData;
    mapping(uint256 => mapping(address => bool)) private _gameEditors;

    constructor(address metaTransactionContract, address admin) public ERC721BaseToken(metaTransactionContract, admin) {}
}
