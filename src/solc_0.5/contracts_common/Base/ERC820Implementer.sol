pragma solidity ^0.5.2;

contract ERC820Registry {
    function getManager(address addr) public view returns (address);
    function setManager(address addr, address newManager) public;
    function getInterfaceImplementer(address addr, bytes32 iHash)
        public
        view
        returns (address);
    function setInterfaceImplementer(
        address addr,
        bytes32 iHash,
        address implementer
    ) public;
}

contract ERC820Implementer {
    ERC820Registry constant erc820Registry = ERC820Registry(
        0x820b586C8C28125366C998641B09DCbE7d4cBF06
    );

    function setInterfaceImplementation(string memory ifaceLabel, address impl)
        internal
    {
        bytes32 ifaceHash = keccak256(bytes(ifaceLabel));
        erc820Registry.setInterfaceImplementer(address(this), ifaceHash, impl);
    }

    function interfaceAddr(address addr, string memory ifaceLabel)
        internal
        view
        returns (address)
    {
        bytes32 ifaceHash = keccak256(bytes(ifaceLabel));
        return erc820Registry.getInterfaceImplementer(addr, ifaceHash);
    }

    function delegateManagement(address newManager) internal {
        erc820Registry.setManager(address(this), newManager);
    }
}
