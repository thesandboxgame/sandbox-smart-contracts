pragma solidity 0.6.5;

import "../common/Libraries/AddressUtils.sol";
import "../common/Interfaces/ERC721.sol";
import "../common/Interfaces/ERC721TokenReceiver.sol";
import "../common/Interfaces/ERC721MandatoryTokenReceiver.sol";
import "../common/BaseWithStorage/SuperOperators.sol";
import "../common/BaseWithStorage/MetaTransactionReceiver.sol";


contract MockERC721 is ERC721, SuperOperators, MetaTransactionReceiver {
    using AddressUtils for address;

    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    mapping(address => uint256) public _numNFTPerAddress;
    mapping(uint256 => uint256) public _owners;
    mapping(address => mapping(address => bool)) public _operatorsForAll;
    mapping(uint256 => address) public _operators;

    constructor(address metaTransactionContract, address admin) internal {
        _admin = admin;
        _setMetaTransactionProcessor(metaTransactionContract, true);
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        _numNFTPerAddress[from]--;
        _numNFTPerAddress[to]++;
        _owners[id] = uint256(to);
        emit Transfer(from, to, id);
    }

    function balanceOf(address owner) public override view returns (uint256) {
        require(owner != address(0), "owner is zero address");
        return _numNFTPerAddress[owner];
    }

    function _ownerOf(uint256 id) internal view returns (address) {
        return address(_owners[id]);
    }

    function _ownerAndOperatorEnabledOf(uint256 id) internal view returns (address owner, bool operatorEnabled) {
        uint256 data = _owners[id];
        owner = address(data);
        operatorEnabled = (data / 2**255) == 1;
    }

    function ownerOf(uint256 id) public override view returns (address owner) {
        // TODO: does not return owner
        owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
    }

    function _approveFor(
        address owner,
        address operator,
        uint256 id
    ) internal {
        if (operator == address(0)) {
            _owners[id] = uint256(owner); // no need to resset the operator, it will be overriden next time
        } else {
            _owners[id] = uint256(owner) + 2**255;
            _operators[id] = operator;
        }
        emit Approval(owner, operator, id);
    }

    function approveFor(
        address sender,
        address operator,
        uint256 id
    ) public {
        address owner = _ownerOf(id);
        require(sender != address(0), "sender is zero address");
        require(
            msg.sender == sender || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender] || _operatorsForAll[sender][msg.sender],
            "not authorized to approve"
        );
        require(owner == sender, "owner != sender");
        _approveFor(owner, operator, id);
    }

    function approve(address operator, uint256 id) public override {
        address owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == msg.sender || _superOperators[msg.sender] || _operatorsForAll[owner][msg.sender], "not authorized to approve");
        _approveFor(owner, operator, id);
    }

    function getApproved(uint256 id) public override view returns (address) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        if (operatorEnabled) {
            return _operators[id];
        } else {
            return address(0);
        }
    }

    function _checkTransfer(
        address from,
        address to,
        uint256 id
    ) internal view returns (bool isMetaTx) {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == from, "not owner in _checkTransfer");
        require(to != address(0), "can't send to zero address");
        isMetaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        if (msg.sender != from && !isMetaTx) {
            require(
                _superOperators[msg.sender] || _operatorsForAll[from][msg.sender] || (operatorEnabled && _operators[id] == msg.sender),
                "not approved to transfer"
            );
        }
    }

    function _checkInterfaceWith10000Gas(address _contract, bytes4 interfaceId) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory call_data = abi.encodeWithSelector(ERC165ID, interfaceId);
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let call_ptr := add(0x20, call_data)
            let call_size := mload(call_data)
            let output := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(output, 0x0)
            success := staticcall(10000, _contract, call_ptr, call_size, output, 0x20) // 32 bytes
            result := mload(output)
        }
        // (10000 / 63) "not enough for supportsInterface(...)" // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result;
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public override {
        bool metaTx = _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(_checkOnERC721Received(metaTx ? from : msg.sender, from, to, id, ""), "erc721 transfer rejected by to");
        }
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public override {
        bool metaTx = _checkTransfer(from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(metaTx ? from : msg.sender, from, to, id, data), "ERC721: transfer rejected by to");
        }
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) public override {
        safeTransferFrom(from, to, id, "");
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data
    ) public {
        _batchTransferFrom(from, to, ids, data, false);
    }

    function _batchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data,
        bool safe
    ) internal {
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        bool authorized = msg.sender == from || metaTx || _superOperators[msg.sender] || _operatorsForAll[from][msg.sender];

        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "not owner in batchTransferFrom");
            require(authorized || (operatorEnabled && _operators[id] == msg.sender), "not authorized");
            _owners[id] = uint256(to);
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _numNFTPerAddress[from] -= numTokens;
            _numNFTPerAddress[to] += numTokens;
        }

        if (to.isContract() && (safe || _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER))) {
            require(_checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, data), "erc721 batch transfer rejected by to");
        }
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data
    ) public {
        _batchTransferFrom(from, to, ids, data, true);
    }

    function supportsInterface(bytes4 id) public override view returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) public {
        require(sender != address(0), "Invalid sender address");
        require(msg.sender == sender || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender], "not authorized to approve for all");

        _setApprovalForAll(sender, operator, approved);
    }

    function setApprovalForAll(address operator, bool approved) public override {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(!_superOperators[operator], "super operator can't have their approvalForAll changed");
        _operatorsForAll[sender][operator] = approved;

        emit ApprovalForAll(sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public override view returns (bool isOperator) {
        return _operatorsForAll[owner][operator] || _superOperators[operator];
    }

    function _burn(
        address from,
        address owner,
        uint256 id
    ) public {
        require(from == owner, "not owner");
        _owners[id] = 2**160; // cannot mint it again
        _numNFTPerAddress[from]--;
        emit Transfer(from, address(0), id);
    }

    function burn(uint256 id) public {
        _burn(msg.sender, _ownerOf(id), id);
    }

    function burnFrom(address from, uint256 id) public {
        require(from != address(0), "Invalid sender address");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(
            msg.sender == from ||
                _metaTransactionContracts[msg.sender] ||
                (operatorEnabled && _operators[id] == msg.sender) ||
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender],
            "not authorized to burn"
        );
        _burn(from, owner, id);
    }

    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = ERC721TokenReceiver(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }

    function _checkOnERC721BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = ERC721MandatoryTokenReceiver(to).onERC721BatchReceived(operator, from, ids, _data);
        return (retval == _ERC721_BATCH_RECEIVED);
    }

    function mint(address to, uint256 tokenId) public {
        require(to != address(0), "to is zero address");
        require(_owners[tokenId] == 0, "Already minted");
        emit Transfer(address(0), to, tokenId);
        _owners[tokenId] = uint256(to);
        _numNFTPerAddress[to] += 1;
    }
}


contract MockLand is MockERC721 {
    constructor(address metaTransactionContract, address admin) public MockERC721(metaTransactionContract, admin) {}

    function name() external pure returns (string memory) {
        return "Mock LANDs";
    }

    function symbol() external pure returns (string memory) {
        return "MOCKLAND";
    }
}
