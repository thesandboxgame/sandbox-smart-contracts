// SPDX-License-Identifier: MIT
// solhint-disable one-contract-per-file
pragma solidity 0.8.15;

import {Ownable} from "@openzeppelin/contracts-0.8.15/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts-0.8.15/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20, Ownable {

    constructor(uint256 _initialSupply) ERC20("MOCKTOKEN", "MOCK") {
        _mint(msg.sender, _initialSupply * 1e18);
    }

    function donateTo(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    }

    /// @dev instead of using approve and call we use this method directly for testing.
    function mint(
        MintInterface target,
        address _wallet,
        uint256 _amount,
        uint256 _signatureId,
        bytes calldata _signature
    ) external {
        target.mint(_wallet, _amount, _signatureId, _signature);
    }
    /// @notice Approve `target` to spend `amount` and call it with data.
    /// @param target The address to be given rights to transfer and destination of the call.
    /// @param amount The number of tokens allowed.
    /// @param data The bytes for the call.
    /// @return The data of the call.
    function approveAndCall(
        address target,
        uint256 amount,
        bytes calldata data
    ) external payable returns (bytes memory) {
        require(doFirstParamEqualsAddress(data, _msgSender()), "FIRST_PARAM_NOT_SENDER");

        _approve(_msgSender(), target, amount);

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returnData) = target.call{value : msg.value}(data);
        if (success) {
            return returnData;
        }
        if (returnData.length > 0) {
            // The easiest way to bubble the revert reason is using memory via assembly
            /// @solidity memory-safe-assembly
            assembly {
                let returndata_size := mload(returnData)
                revert(add(32, returnData), returndata_size)
            }
        } else {
            revert("Empty error from destination");
        }
    }

    function doFirstParamEqualsAddress(bytes memory data, address _address)
    internal
    pure
    returns (bool)
    {
        if (data.length < (36 + 32)) {
            return false;
        }
        uint256 value;
        assembly {
            value := mload(add(data, 36))
        }
        return value == uint160(_address);
    }

}

interface MintInterface {
    function mint(
        address _wallet,
        uint256 _amount,
        uint256 _signatureId,
        bytes calldata _signature
    ) external;
}