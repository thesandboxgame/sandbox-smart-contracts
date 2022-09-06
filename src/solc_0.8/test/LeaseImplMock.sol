// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ILeaseImpl} from "../lease/ILeaseImpl.sol";

contract LeaseImplMock is ILeaseImpl {
    mapping(uint256 => bool) public ret;

    event Clean(uint256 agreementId);

    function setLeased(uint256 agreementId, bool isLeased_) external {
        ret[agreementId] = isLeased_;
    }

    function isLeased(uint256 agreementId) external view override returns (bool) {
        return ret[agreementId];
    }

    function clean(uint256 agreementId) external override {
        emit Clean(agreementId);
    }
}
