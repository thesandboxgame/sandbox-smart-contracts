pragma solidity 0.6.5;


/// @title Interface for the Game token

interface GameTokenInterface {
    event AssetsAdded(uint256 indexed id, uint24[] list);
    event AssetsRemoved(uint256 indexed id, uint256 numRemoved);

    function createGame(
        address from,
        address to,
        uint256[] calldata assetIds,
        address[] calldata editors
    ) external;

    function addAssets(
        address from,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external;

    function removeAssets(
        address from,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external;

    function setGameEditor(
        uint256 gameId,
        address editor,
        bool isEditor
    ) external;

    function creatorOf(uint256 id) external view returns (address);

    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external;

    function isGameEditor(uint256 gameId, address editor) external returns (bool isEditor);

    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function tokenURI(uint256 gameId) external view returns (string memory tokenURI);

    function setTokenURI(uint256 gameId, string calldata URI) external;
}
