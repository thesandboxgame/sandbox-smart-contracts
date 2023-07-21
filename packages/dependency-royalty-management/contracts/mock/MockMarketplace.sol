// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IRoyaltyEngineV1} from "@manifoldxyz/royalty-registry-solidity/contracts/IRoyaltyEngineV1.sol";

contract MockMarketplace {
    IRoyaltyEngineV1 public royaltyEngine;

    constructor(address _royaltyEngine) {
        royaltyEngine = IRoyaltyEngineV1(_royaltyEngine);
    }

    function distributeRoyaltyEIP2981(
        uint256 erc20TokenAmount,
        IERC20 erc20Contract,
        address nftContract,
        uint256 nftId,
        address nftBuyer,
        address nftSeller,
        bool is1155
    ) external payable {
        if (msg.value == 0) {
            require(erc20TokenAmount > 0, "erc20 token ammount can't be zero");
            (address royaltyReceiver, uint256 value) = IERC2981(nftContract).royaltyInfo(nftId, erc20TokenAmount);
            erc20Contract.transferFrom(nftBuyer, royaltyReceiver, value);
            erc20Contract.transferFrom(nftBuyer, nftSeller, (erc20TokenAmount - value));
        } else {
            (address royaltyReceiver, uint256 value) = IERC2981(nftContract).royaltyInfo(nftId, msg.value);
            (bool sent, ) = royaltyReceiver.call{value: value}("");
            require(sent, "Failed to send distributeRoyaltyEIP2981Ether");
            (bool sentToSeller, ) = nftSeller.call{value: msg.value - value}("");
            require(sentToSeller, "Failed to send to seller");
        }
        if (is1155) {
            IERC1155(nftContract).safeTransferFrom(nftSeller, nftBuyer, nftId, 1, "0x");
        } else {
            IERC721(nftContract).safeTransferFrom(nftSeller, nftBuyer, nftId, "0x");
        }
    }

    function distributeRoyaltyRoyaltyEngine(
        uint256 erc20TokenAmount,
        IERC20 erc20Contract,
        address nftContract,
        uint256 nftId,
        address nftBuyer,
        address nftSeller,
        bool is1155
    ) external payable {
        if (msg.value == 0) {
            require(erc20TokenAmount > 0, "erc20 token ammount can't be zero");
            uint256 TotalRoyalty;
            (address payable[] memory recipients, uint256[] memory amounts) =
                royaltyEngine.getRoyalty(address(nftContract), nftId, erc20TokenAmount);
            for (uint256 i; i < recipients.length; i++) {
                erc20Contract.transferFrom(nftBuyer, recipients[i], amounts[i]);
                TotalRoyalty += amounts[i];
            }
            erc20Contract.transferFrom(nftBuyer, nftSeller, (erc20TokenAmount - TotalRoyalty));
        } else {
            (address payable[] memory recipients, uint256[] memory amounts) =
                royaltyEngine.getRoyalty(address(nftContract), nftId, msg.value);
            uint256 TotalRoyalty;
            for (uint256 i; i < recipients.length; i++) {
                (bool sent, ) = recipients[i].call{value: amounts[i]}("");
                require(sent, "Failed to send Ether");
                TotalRoyalty += amounts[i];
            }
            (bool sentToSeller, ) = nftSeller.call{value: msg.value - TotalRoyalty}("");
            require(sentToSeller, "Failed to send to seller");
        }
        if (is1155) {
            IERC1155(nftContract).safeTransferFrom(nftSeller, nftBuyer, nftId, 1, "0x");
        } else {
            IERC721(nftContract).safeTransferFrom(nftSeller, nftBuyer, nftId, "0x");
        }
    }
}
