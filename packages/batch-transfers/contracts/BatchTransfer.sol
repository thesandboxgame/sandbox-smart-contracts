//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/// @custom:security-contact contact-blockchain@sandbox.game
contract BatchTransfer is AccessControl {
    /// @notice The role that allows an address to use the contract
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// Grant the contract deployer the default admin role
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /// @notice Batch transfer ERC721 and ERC1155 tokens
    /// @param contracts The addresses of the contracts
    /// @param recipients The addresses of the recipients
    /// @param tokenIds The token IDs
    /// @param amounts The amounts of tokens
    /// @param isERC1155 Whether the token is ERC1155 or not
    /// @dev The arrays must have the same length
    function batchTransfer(
        address[] calldata contracts,
        address[][] calldata recipients,
        uint256[][] calldata tokenIds,
        uint256[][] calldata amounts,
        bool[] calldata isERC1155
    ) external onlyRole(OPERATOR_ROLE) {
        require(
            contracts.length == recipients.length &&
                recipients.length == tokenIds.length &&
                tokenIds.length == amounts.length &&
                amounts.length == isERC1155.length,
            "Arrays must have the same length"
        );
        for (uint256 i = 0; i < contracts.length; i++) {
            if (isERC1155[i]) {
                for (uint256 j = 0; j < recipients[i].length; j++) {
                    IERC1155(contracts[i]).safeTransferFrom(
                        _msgSender(),
                        recipients[i][j],
                        tokenIds[i][j],
                        amounts[i][j],
                        ""
                    );
                }
            } else {
                require(tokenIds[i].length == 1, "ERC721: Only one token can be transferred at a time");
                require(recipients[i].length == 1, "ERC721: Only one recipient can be specified");
                IERC721(contracts[i]).safeTransferFrom(_msgSender(), recipients[i][0], tokenIds[i][0]);
            }
        }
    }
}
