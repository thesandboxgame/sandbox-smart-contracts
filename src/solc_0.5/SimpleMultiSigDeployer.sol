pragma solidity 0.5.9;

import "./SimpleMultiSig.sol";

contract SimpleMultiSigDeployer {
    event MultiSigDeployed(
        string indexed name,
        address indexed multiSigAddress,
        uint256 threshold,
        address[] owners
    );
    event MultiSigOwner(string indexed name, address indexed owner);

    mapping(string => SimpleMultiSig) deployed;
    address owner;
    constructor(address _owner) public {
        owner = _owner;
    }

    // TODO ?
    // function deploySimpleMultiSig(uint256 threshold_, address[] calldata owners_, uint256 chainId, string calldata name) external {
    //     require(msg.sender == owner, "only owner can deploy");
    //     require(address(deployed[name]) == address(0), "same name already deployed");
    //     SimpleMultiSig simpleMultiSig = new SimpleMultiSig(threshold_, owners_, chainId);
    //     deployed[name] = simpleMultiSig;
    //     for(uint256 i = 0; i < owners_.length; i++) {
    //         emit MultiSigOwner(name, owners_[i]);
    //     }
    //     emit MultiSigDeployed(name, address(simpleMultiSig), threshold_, owners_);
    // }

    function isDeployed(string calldata name) external view returns (bool) {
        return address(deployed[name]) != address(0);
    }

    function transferOwnership(address _newOwner) external {
        require(msg.sender == owner, "only owner can change owner");
        owner = _newOwner;
    }
}
