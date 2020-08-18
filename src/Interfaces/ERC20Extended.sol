pragma solidity 0.6.5;

import "../common/Interfaces/ERC20.sol";


interface ERC20Extended is ERC20 {
    function burnFor(address from, uint256 amount) external;

    function burn(uint256 amount) external;

    function approveFor(
        address owner,
        address spender,
        uint256 amount
    ) external returns (bool success);
}
