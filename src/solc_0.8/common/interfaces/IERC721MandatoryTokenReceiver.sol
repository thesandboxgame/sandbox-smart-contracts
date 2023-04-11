//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

/**
 * @title IERC721MandatoryTokenReceiver
 * @author The Sandbox
 * @notice Interface for any contract that wants to support safeBatchTransfers
 * from ERC721 asset contracts.
 * @dev The ERC-165 identifier for this interface is 0x5e8bf644.
 */
interface IERC721MandatoryTokenReceiver {
    /**
     * @notice Whenever tokens are transferred to this contract via {IERC721-safeBatchTransferFrom}
     * by `operator` from `from`, this function is called.
     * @param operator sender
     * @param from owner of the tokens
     * @param ids token ids
     * @param data extra data
     */
    function onERC721BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        bytes calldata data
    ) external returns (bytes4); // needs to return 0x4b808c46

    /**
     * @notice Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     * @param operator sender
     * @param from owner of the token
     * @param tokenId token id
     * @param data extra data
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4); // needs to return 0x150b7a02
}
