// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IPolygonLand} from "./IPolygonLand.sol";

/**
 * @title IPolygonLandWithSetApproval
 * @author The Sandbox
 * @notice Approve for all interface for the LAND on the chain root
 */
interface IPolygonLandWithSetApproval is IPolygonLand {
    /**
     * @notice Approve or disapprove the operator for all the tokens
     * @param operator address to approve
     * @param approved should it be approved or not
     */
    function setApprovalForAll(address operator, bool approved) external;
}
