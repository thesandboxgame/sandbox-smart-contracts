// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../common/BaseWithStorage/ERC20/extensions/ERC20ExecuteExtension.sol";
//import "./erc20/ERC20BaseToken.sol";
import "../common/BaseWithStorage/ERC20/ERC20BaseToken.sol";

//import "./erc20/ERC20BasicApproveExtension.sol";

/*ERC20ExecuteExtension,*/
/*ERC20BasicApproveExtension,*/
contract SandBaseToken is
    ERC20BaseToken /*, ERC20ExecuteExtension*/
{
    constructor(
        address sandAdmin,
        address executionAdmin,
        address beneficiary
    ) public {
        _admin = sandAdmin;
        _executionAdmin = executionAdmin;
        _mint(beneficiary, 3000000000000000000000000000);
    }

    /// @notice A descriptive name for the tokens
    /// @return name of the tokens
    function name() public view override returns (string memory) {
        return "SAND";
    }

    /// @notice An abbreviated name for the tokens
    /// @return symbol of the tokens
    function symbol() public view override returns (string memory) {
        return "SAND";
    }
}
