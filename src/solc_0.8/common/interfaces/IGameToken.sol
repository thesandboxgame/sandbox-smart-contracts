//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

/// @title Interface for the Game token

interface IGameToken {
    struct GameData {
        uint256[] assetIdsToRemove;
        uint256[] assetAmountsToRemove;
        uint256[] assetIdsToAdd;
        uint256[] assetAmountsToAdd;
        bytes32 uri;
    }

    function createGame(
        address from,
        address to,
        GameData calldata creation,
        address editor,
        uint64 subId
    ) external returns (uint256 id);

    function burn(uint256 gameId) external;

    function burnFrom(address from, uint256 gameId) external;

    function recoverAssets(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external;

    function burnAndRecover(
        address from,
        address to,
        uint256 gameId,
        uint256[] calldata assetIds
    ) external;

    function updateGame(
        address from,
        uint256 gameId,
        GameData calldata update
    ) external returns (uint256);

    function getAssetBalances(uint256 gameId, uint256[] calldata assetIds) external view returns (uint256[] calldata);

    function setGameEditor(
        address gameCreator,
        address editor,
        bool isEditor
    ) external;

    function isGameEditor(address gameOwner, address editor) external view returns (bool isEditor);

    function creatorOf(uint256 id) external view returns (address);

    function transferCreatorship(
        address sender,
        address original,
        address to
    ) external;

    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function tokenURI(uint256 gameId) external returns (string memory uri);

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
