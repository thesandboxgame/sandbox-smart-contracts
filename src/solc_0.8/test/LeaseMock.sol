// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ILease} from "../lease/ILease.sol";
import {ILeaseImpl} from "../lease/ILeaseImpl.sol";

contract LeaseMock is ILease {
    mapping(uint256 => ILease.Agreement) public ret;

    function setAgreement(
        uint256 agreementId,
        ILeaseImpl impl,
        address owner,
        address user
    ) external {
        ret[agreementId] = ILease.Agreement({impl: impl, owner: owner, user: user});
    }

    function isLeased(uint256 agreementId) external view override returns (bool) {
        return ret[agreementId].impl.isLeased(agreementId);
    }

    function getAgreement(uint256 agreementId) external view override returns (ILease.Agreement memory) {
        return ret[agreementId];
    }
}
