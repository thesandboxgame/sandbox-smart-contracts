// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";

interface IRoyaltyManager {
    event RecipientSet(address commonRecipient);

    event SplitSet(uint16 commonSplit);

    event RoyaltySet(uint16 royaltyBps, address contractAddress);

    function setRecipient(address payable _commonRecipient) external;

    function setSplit(uint16 commonSplit) external;

    function getCommonRecipient() external view returns (Recipient memory recipient);

    function getCreatorSplit() external view returns (uint16);

    function getRoyaltyInfo() external view returns (address, uint16);

    function deploySplitter(address creator, address payable recipient) external returns (address payable);

    function getCreatorRoyaltySplitter(address creator) external view returns (address payable);
}
