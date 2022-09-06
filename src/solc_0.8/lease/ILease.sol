// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {ILeaseImpl} from "./ILeaseImpl.sol";

interface ILease is IERC721 {
    struct Agreement {
        ILeaseImpl impl;
        address owner;
        address user;
    }

    function getAgreement(uint256 agreementId) external view returns (ILease.Agreement memory);

    function isLeased(uint256 agreementId) external view returns (bool);
}
