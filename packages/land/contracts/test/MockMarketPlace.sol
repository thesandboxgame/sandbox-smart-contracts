//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IToken {
    function safeTransferFrom(address from, address to, uint256 id) external;

    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) external;

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external;
}

contract MockMarketPlace {
    bytes4 private constant ERC721_IS_RECEIVER = 0x150b7a02;
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param land the contract address on which the token transfer will take place
    /// @param from adderess from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param data aditional data accompanying the transfer.
    function transferLand(address land, address from, address to, uint256 id, bytes memory data) external {
        IToken(land).safeTransferFrom(from, to, id, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param asset the contract address on which the token transfer will take place
    /// @param from Address whose token is to be transferred.
    /// @param to Recipient.
    /// @param id The token id to be transferred.
    function transferTokenERC721(address asset, address from, address to, uint256 id) external {
        IToken(asset).safeTransferFrom(from, to, id);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param asset the contract address on which the token transfer will take place
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param ids The ids of the tokens to be transferred.
    /// @param data Additional data.
    function batchTransferTokenERC721(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data
    ) external {
        IToken(asset).safeBatchTransferFrom(from, to, ids, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param land the contract address on which the token transfer will take place
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param id The id of the token to be transferred.
    function transferLand(address land, address from, address to, uint256 id) external {
        IToken(land).safeTransferFrom(from, to, id);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return ERC721_RECEIVED;
    }

    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == 0x01ffc9a7 || _interfaceId == ERC721_IS_RECEIVER;
    }
}
