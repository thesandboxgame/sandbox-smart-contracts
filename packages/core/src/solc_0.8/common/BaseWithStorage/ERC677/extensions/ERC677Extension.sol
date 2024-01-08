//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../interfaces/IERC677.sol";
import "../../../interfaces/IERC677Receiver.sol";
import "../../ERC20/extensions/ERC20Internal.sol";
import "@openzeppelin/contracts-0.8/utils/Address.sol";
import "@openzeppelin/contracts-0.8/utils/Context.sol";
import "hardhat/console.sol";

abstract contract ERC677Extension is ERC20Internal, IERC677, Context {
    using Address for address;

    /// @notice Transfers tokens to an address with _data if the recipient is a contact.
    /// @param _to The address to transfer to.
    /// @param _value The amount to be transferred.
    /// @param _data The extra data to be passed to the receiving contract.
    function transferAndCall(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external override returns (bool success) {
        console.log("inside 677");
        console.log("to address is");
        console.log(_to);
        console.log("msg sender is");
        console.log(_msgSender());
        _transfer(_msgSender(), _to, _value);
        if (_to.isContract()) {
            IERC677Receiver receiver = IERC677Receiver(_to);
            receiver.onTokenTransfer(_msgSender(), _value, _data);
        }
        return true;
    }
}
