pragma solidity ^0.5.2;

import "./ERC20Basic.sol";

/**
 * @title ERC20 interface
 * @dev see https://eips.ethereum.org/EIPS/eip-20
 */
/* interface */
contract ERC20 is ERC20Basic {
    function transferFrom(address from, address to, uint256 value)
        public
        returns (bool);
    function approve(address spender, uint256 value) public returns (bool);
    function allowance(address owner, address spender)
        public
        view
        returns (uint256);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
