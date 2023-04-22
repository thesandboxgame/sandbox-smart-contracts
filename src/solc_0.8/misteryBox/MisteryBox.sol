// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-0.8/utils/math/SafeMath.sol";
import "./libraries/MisteryBoxHelper.sol";

contract MisteryBox is Ownable {
    using MisteryBoxHelper for MisteryBoxHelper.ContractType;
    using MisteryBoxHelper for MisteryBoxHelper.TransferData;
    using SafeMath for uint256;

    function safeBatchTransferFrom(MisteryBoxHelper.TransferData[] memory transfers) external onlyOwner {
        uint256 numTransfers = transfers.length;
        for (uint256 i = 0; i < numTransfers; i++) {
            require(transfers[i].from != address(0), "FROM IS ZERO ADDRESS");
            require(transfers[i].to != address(0), "CAN'T SEND TO ZERO ADDRESS");
            require(MisteryBoxHelper.isContractTypeValid(transfers[i].contractType), "INVALID CONTRACT TYPE");

            uint8 contractType = transfers[i].contractType;
            address contractAddress = transfers[i].contractAddress;
            address from = transfers[i].from;
            address to = transfers[i].to;
            uint256 tokenId = transfers[i].tokenId;
            uint256 amount = transfers[i].amount;

            if (MisteryBoxHelper.isERC721(contractType)) {
                require(amount == 1, "AMOUNT MUST BE 1 FOR ERC721");
                IERC721(contractAddress).safeTransferFrom(from, to, tokenId);
            } else if (MisteryBoxHelper.isERC1155(contractType)) {
                require(amount >= 1, "AMOUNT MUST BE GREATER OR EQUAL THAN 1 FOR ERC1155");
                IERC1155(contractAddress).safeTransferFrom(from, to, tokenId, amount, "");
            }
        }
    }
}
