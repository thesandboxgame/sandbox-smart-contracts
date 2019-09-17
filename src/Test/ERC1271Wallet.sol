pragma solidity 0.5.9;

import "../../contracts_common/src/Interfaces/ERC1271.sol";
import "../../contracts_common/src/Interfaces/ERC1271Constants.sol";
import "../../contracts_common/src/Libraries/SigUtil.sol";

contract ERC1271Wallet is ERC1271, ERC1271Constants {
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
}
