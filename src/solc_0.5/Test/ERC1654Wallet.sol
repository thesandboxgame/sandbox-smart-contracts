pragma solidity 0.5.9;

import "../contracts_common/Interfaces/ERC1654.sol";
import "../contracts_common/Interfaces/ERC1654Constants.sol";
import "../contracts_common/Libraries/SigUtil.sol";

contract ERC1654Wallet is ERC1654, ERC1654Constants {
    address owner;
    mapping(address => bool) authorizedSigners;

    constructor(address _signer) public {
        owner = msg.sender;
        authorizedSigners[_signer] = true;
    }

    function isValidSignature(bytes32 _hash, bytes memory _signature)
        public
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
