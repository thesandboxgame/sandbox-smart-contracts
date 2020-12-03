//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

/// @title Interface for the Game token

interface IGameToken {
    function getGameManager() external view returns (address);

    function setGameManager(address gameManager) external;

    function createGame(
        address from,
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        address[] calldata editors,
        string calldata uri,
        uint96 randomId
    ) external returns (uint256 id);

    function destroyGame(
        address from,
        address to,
        uint256 gameId
    ) external;

    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) external;

    function destroyAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values
    ) external;

    function addAssets(
        address from,
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        string calldata uri
    ) external;

    function removeAssets(
        uint256 gameId,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        address to,
        string calldata uri
    ) external;

    function getAssetBalances(uint256 gameId, uint256[] calldata assetIds) external view returns (uint256[] calldata);

    function setGameEditor(
        address from,
        uint256 gameId,
        address editor,
        bool isEditor
    ) external;

    function isGameEditor(uint256 gameId, address editor) external view returns (bool isEditor);

    function creatorOf(uint256 id) external view returns (address);

    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external;

    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function tokenURI(uint256 gameId) external view returns (string memory uri);

    function setTokenURI(
        address from,
        uint256 gameId,
        string calldata URI
    ) external;

    function onERC1155Received(
        address operator,
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external view returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external view returns (bytes4);
}
