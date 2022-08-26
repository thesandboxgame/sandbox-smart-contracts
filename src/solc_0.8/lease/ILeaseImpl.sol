// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";

/// TODO: Consider IERC20 for all the agreements ?
interface ILeaseImpl {
    struct Agreement {
        ILeaseImpl impl;
        address owner;
        address user;
    }

    function isLeased(uint256 leaseId) external view returns (bool);

    function accept(uint256 agreementId) external;

    function renew(uint256 agreementId) external;

    function clean(uint256 agreementId) external;
}
