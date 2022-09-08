// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ILeaseImpl} from "./ILeaseImpl.sol";

interface ILease {
    struct Agreement {
        ILeaseImpl impl;
        address owner;
        address user;
    }

    function getAgreement(uint256 agreementId) external view returns (ILease.Agreement memory);

    function isLeased(uint256 agreementId) external view returns (bool);
}
