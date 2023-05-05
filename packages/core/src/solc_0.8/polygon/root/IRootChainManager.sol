// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

interface IRootChainManager {
    event TokenMapped(address indexed rootToken, address indexed childToken, bytes32 indexed tokenType);

    event PredicateRegistered(bytes32 indexed tokenType, address indexed predicateAddress);

    function registerPredicate(bytes32 tokenType, address predicateAddress) external;

    function mapToken(
        address rootToken,
        address childToken,
        bytes32 tokenType
    ) external;

    function cleanMapToken(address rootToken, address childToken) external;

    function remapToken(
        address rootToken,
        address childToken,
        bytes32 tokenType
    ) external;

    function depositEtherFor(address user) external payable;

    function depositFor(
        address user,
        address rootToken,
        bytes calldata depositData
    ) external;

    function exit(bytes calldata inputData) external;
}
