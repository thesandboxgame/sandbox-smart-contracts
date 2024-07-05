//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// access control
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

error InvalidTokenContract();

/// @custom:security-contact contact-blockchain@sandbox.game
contract BatchTransfer is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function batchTransfer(
        address[] calldata contracts,
        address[] calldata recipients,
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
            address contractAddress = contracts[i];
            address recipient = recipients[i];
            uint256[] memory ids = tokenIds[i];
            uint256[] memory values = amounts[i];
            bool erc1155 = isERC1155[i];

            if (erc1155) {
                IERC1155(contractAddress).safeBatchTransferFrom(_msgSender(), recipient, ids, values, "");
            } else {
                IERC721(contractAddress).safeTransferFrom(_msgSender(), recipient, ids[0]);
            }
        }
    }
}
