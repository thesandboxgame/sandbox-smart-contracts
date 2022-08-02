pragma solidity 0.5.9;

import "./Sand/erc20/ERC20ExecuteExtension.sol";
import "./Sand/erc20/ERC20BaseToken.sol";
import "./Sand/erc20/ERC20BasicApproveExtension.sol";

contract Sand is ERC20BasicApproveExtension,ERC20ExecuteExtension, ERC20BaseToken {

    constructor(address sandAdmin, address executionAdmin, address beneficiary) public {
        _admin = sandAdmin;
        _executionAdmin = executionAdmin;
        _mint(beneficiary, 3000000000000000000000000000);
    }

    /// @notice A descriptive name for the tokens
    /// @return name of the tokens
    function name() public view returns (string memory) {
        return "SAND";
    }

    /// @notice An abbreviated name for the tokens
    /// @return symbol of the tokens
    function symbol() public view returns (string memory) {
        return "SAND";
    }

}
