//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

//import "../common/BaseWithStorage/ERC20/ERC20Token.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts-0.8/access/AccessControl.sol";

contract Gem is ERC20Burnable, AccessControl {
    uint16 public immutable gemId;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        uint16 _gemId
    )
        /* address operator */
        ERC20(
            name,
            symbol /* admin, operator */
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        gemId = _gemId;
    }
}
