//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "../common/BaseWithStorage/wip/ERC20BaseToken.sol";
import "../common/Interfaces/ERC677.sol";
import "../common/Interfaces/ERC677Receiver.sol";

contract ERC677Token is ERC20BaseToken, ERC677 {
    /**
     * @dev transfer token to a contract address with additional data if the recipient is a contact.
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     * @param _data The extra data to be passed to the receiving contract.
     */
    function transferAndCall(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external override returns (bool success) {
        _transfer(msg.sender, _to, _value);
        if (isContract(_to)) {
            ERC677Receiver receiver = ERC677Receiver(_to);
            receiver.onTokenTransfer(msg.sender, _value, _data);
        }
        return true;
    }

    // //////////////////// INTERNALS ////////////////////

    function isContract(address _addr) private view returns (bool hasCode) {
        uint256 length;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            length := extcodesize(_addr)
        }
        return length > 0;
    }

    // /////////////////// CONSTRUCTOR ////////////////////
    // solhint-disable-next-line
    constructor(
        string memory name,
        string memory symbol,
        address admin
    )
        ERC20BaseToken(name, symbol, admin) // solhint-disable-next-line no-empty-blocks
    {}
}
