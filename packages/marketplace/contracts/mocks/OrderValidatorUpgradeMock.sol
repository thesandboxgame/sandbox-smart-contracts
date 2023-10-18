pragma solidity 0.8.19;

import {OrderValidator} from "../OrderValidator.sol";

contract OrderValidatorUpgradeMock is OrderValidator {
    uint256 public newVariable1;
    uint256 public newVariable2;
    address public newVariable3;

    function getNewVariable1() external view returns (uint256) {
        return newVariable1;
    }
}
