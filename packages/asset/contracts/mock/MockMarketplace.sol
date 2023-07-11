// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC1155} from "@openzeppelin/contracts/interfaces/IERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IRoyaltyEngineV1} from "@manifoldxyz/royalty-registry-solidity/contracts/IRoyaltyEngineV1.sol";

contract MockMarketplace {
    IRoyaltyEngineV1 royaltyEngine;

    constructor(address _royaltyEngine) {
        royaltyEngine = IRoyaltyEngineV1(_royaltyEngine);
    }

    function distributeRoyaltyEIP2981(
        uint256 erc20TokenAmount,
        IERC20 erc20Contract,
        address NFTContract,
        uint256 NFTId,
        address NFTBuyer,
        address NFTSeller,
        bool is1155
    ) external payable {
        if (msg.value == 0) {
            require(erc20TokenAmount > 0, "erc20 token ammount can't be zero");
            (address royaltyReceiver, uint256 value) = IERC2981(NFTContract).royaltyInfo(NFTId, erc20TokenAmount);
            erc20Contract.transferFrom(NFTBuyer, royaltyReceiver, value);
            erc20Contract.transferFrom(NFTBuyer, NFTSeller, (erc20TokenAmount - value));
        } else {
            (address royaltyReceiver, uint256 value) = IERC2981(NFTContract).royaltyInfo(NFTId, msg.value);
            (bool sent, ) = royaltyReceiver.call{value: value}("");
            require(sent, "Failed to send distributeRoyaltyEIP2981Ether");
            (bool sentToSeller, ) = NFTSeller.call{value: msg.value - value}("");
            require(sentToSeller, "Failed to send to seller");
        }
        if (is1155) {
            IERC1155(NFTContract).safeTransferFrom(NFTSeller, NFTBuyer, NFTId, 1, "0x");
        } else {
            IERC721(NFTContract).safeTransferFrom(NFTSeller, NFTBuyer, NFTId, "0x");
        }
    }

    function distributeRoyaltyRoyaltyEngine(
        uint256 erc20TokenAmount,
        IERC20 erc20Contract,
        address NFTContract,
        uint256 NFTId,
        address NFTBuyer,
        address NFTSeller,
        bool is1155
    ) external payable {
        if (msg.value == 0) {
            require(erc20TokenAmount > 0, "erc20 token ammount can't be zero");
            uint256 TotalRoyalty;
            (address payable[] memory recipients, uint256[] memory amounts) =
                royaltyEngine.getRoyalty(address(NFTContract), NFTId, erc20TokenAmount);
            for (uint256 i; i < recipients.length; i++) {
                erc20Contract.transferFrom(NFTBuyer, recipients[i], amounts[i]);
                TotalRoyalty += amounts[i];
            }
            erc20Contract.transferFrom(NFTBuyer, NFTSeller, (erc20TokenAmount - TotalRoyalty));
        } else {
            (address payable[] memory recipients, uint256[] memory amounts) =
                royaltyEngine.getRoyalty(address(NFTContract), NFTId, msg.value);
            uint256 TotalRoyalty;
            for (uint256 i; i < recipients.length; i++) {
                (bool sent, ) = recipients[i].call{value: amounts[i]}("");
                require(sent, "Failed to send Ether");
                TotalRoyalty += amounts[i];
            }
            (bool sentToSeller, ) = NFTSeller.call{value: msg.value - TotalRoyalty}("");
            require(sentToSeller, "Failed to send to seller");
        }
        if (is1155) {
            IERC1155(NFTContract).safeTransferFrom(NFTSeller, NFTBuyer, NFTId, 1, "0x");
        } else {
            IERC721(NFTContract).safeTransferFrom(NFTSeller, NFTBuyer, NFTId, "0x");
        }
    }
}
