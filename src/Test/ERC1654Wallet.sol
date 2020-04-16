pragma solidity 0.6.4;

import "../contracts_common/src/Interfaces/ERC1654.sol";
import "../contracts_common/src/Interfaces/ERC1654Constants.sol";
import "../contracts_common/src/Libraries/SigUtil.sol";


contract ERC1654Wallet is ERC1654, ERC1654Constants {
    address owner;
    mapping(address => bool) authorizedSigners;

    constructor(address _signer) public {
        owner = msg.sender;
        authorizedSigners[_signer] = true;
    }

    // override is not supported by prettier-plugin-solidity
    // prettier-ignore
    function isValidSignature(bytes32 _hash, bytes calldata _signature)
        override // solidity needs it even for interface
        external
        view
        returns (bytes4 magicValue)
    {
        address signer = SigUtil.recoverWithZeroOnFailure(
            _hash,
            _signature
        );
        if (authorizedSigners[signer]) {
            return ERC1654_MAGICVALUE;
        }
    }
}
