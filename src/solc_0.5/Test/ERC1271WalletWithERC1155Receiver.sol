pragma solidity 0.5.9;

import "../contracts_common/Interfaces/ERC1271.sol";
import "../contracts_common/Interfaces/ERC1271Constants.sol";
import "../contracts_common/Libraries/SigUtil.sol";

contract ERC1271WalletWithERC1155Receiver is ERC1271, ERC1271Constants {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    address owner;
    mapping(address => bool) authorizedSigners;

    constructor(address _signer) public {
        owner = msg.sender;
        authorizedSigners[_signer] = true;
    }

    function isValidSignature(bytes memory _data, bytes memory _signature)
        public
        view
        returns (bytes4 magicValue)
    {
        address signer = SigUtil.recoverWithZeroOnFailure(
            keccak256(_data),
            _signature
        );
        if (authorizedSigners[signer]) {
            return ERC1271_MAGICVALUE;
        }
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external returns (bytes4) {
        return ERC1155_RECEIVED;
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external returns (bytes4) {
        return ERC1155_BATCH_RECEIVED;
    }
}
