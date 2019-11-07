/* solhint-disable func-order, code-complexity */
pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/AddressUtils.sol";
import "../../../contracts_common/src/Interfaces/ERC721TokenReceiver.sol";
import "../../../contracts_common/src/Interfaces/ERC721Events.sol";
import "../../../contracts_common/src/BaseWithStorage/SuperOperators.sol";
import "../../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";


contract ERC721BaseToken is ERC721Events, SuperOperators, MetaTransactionReceiver {
    using AddressUtils for address;

    // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IERC721Receiver(0).onERC721Received.selector`
    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;

    mapping (address => uint256) public _numNFTPerAddress;
    mapping (uint256 => uint256) public _owners;
    mapping (address => mapping(address => bool)) public _operatorsForAll;
    mapping (uint256 => address) public _operators;

    constructor(
        address metaTransactionContract,
        address admin
    ) internal {
        _admin = admin;
        _setMetaTransactionProcessor(metaTransactionContract, true);
    }

    function _transferFrom(address from, address to, uint256 id) internal {
        address owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
        require(owner == from, "Specified owner is not the real owner");
        require(to != address(0), "can't send to zero address");
        if (msg.sender != from && !_metaTransactionContracts[msg.sender]) {
            require(
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender] ||
                _operators[id] == msg.sender,
                "Operator not approved to transfer"
            );
        }
        _numNFTPerAddress[from]--;
        _numNFTPerAddress[to]++;
        _owners[id] = uint256(to);
        _operators[id] = address(0);
        emit Transfer(from, to, id);
    }

    /**
     * @notice Return the number of Land owned by an address
     * @param owner The address to look for
     * @return The number of Land token owned by the address
     */
    function balanceOf(address owner) external view returns (
        uint256 _balance
    ) {
        require(owner != address(0), "owner is zero address");
        return _numNFTPerAddress[owner];
    }


    function _ownerOf(uint256 id) internal view returns (address) {
        return address(_owners[id]);
    }

    /**
     * @notice Return the owner of a Land
     * @param id The id of the Land
     * @return The address of the owner
     */
    function ownerOf(uint256 id) external view returns (address owner) {
        owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approveFor(
        address sender,
        address operator,
        uint256 id
    ) external {
        address owner = _ownerOf(id);
        require(sender != address(0), "sender is zero address");
        require(
            msg.sender == sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender] ||
            _operatorsForAll[sender][msg.sender],
            "not authorized to approve"
        );
        require(owner == sender, "owner != sender");

        _operators[id] = operator;
        emit Approval(sender, operator, id);
    }

    /**
     * @notice Approve an operator to spend tokens on the sender behalf
     * @param operator The address receiving the approval
     * @param id The id of the token
     */
    function approve(address operator, uint256 id) external {
        address owner = _ownerOf(id);
        require(owner != address(0), "token does not exist");
        require(
            owner == msg.sender ||
            _superOperators[msg.sender] ||
            _operatorsForAll[owner][msg.sender],
            "not authorized to approve"
        );
        _operators[id] = operator;
        emit Approval(msg.sender, operator, id);
    }

    /**
     * @notice Get the approved operator for a specific token
     * @param id The id of the token
     * @return The address of the operator
     */
    function getApproved(uint256 id) external view returns (address) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return _operators[id];
    }

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
    */
    function transferFrom(address from, address to, uint256 id) external {
        _transferFrom(from, to, id);
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param id The id of the token
     * @param data Additional data
     */
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public {
        _transferFrom(from, to, id);
        require(
            _checkOnERC721Received(from, to, id, data),
            "ERC721: transfer rejected"
        );
    }

    /**
     * @notice Transfer a token between 2 addresses letting the receiver knows of the transfer
     * @param from The send of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function safeTransferFrom(address from, address to, uint256 id) external {
        safeTransferFrom(from, to, id, "");
    }

    /**
     * @notice Transfer many tokens between 2 addresses
     * @param from The sender of the token
     * @param to The recipient of the token
     * @param ids The ids of the tokens
    */
    function batchTransferFrom(address from, address to, uint256[] calldata ids) external {
        bool authorized = msg.sender == from ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender] ||
            _operatorsForAll[from][msg.sender];

        uint256 numTokens = ids.length;
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");

        for(uint256 i = 0; i < numTokens; i ++) {
            uint256 id = ids[i];
            address owner = _ownerOf(id);
            require(owner == from, "Specified owner is not the real owner");
            require(authorized || _operators[id] == msg.sender, "not authorized");
            _owners[id] = uint256(to);
            _operators[id] = address(0);
            emit Transfer(from, to, id);
        }

        _numNFTPerAddress[from] -= numTokens;
        _numNFTPerAddress[to] += numTokens;
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external {
        require(sender != address(0), "Invalid sender address");
        require(
            msg.sender == sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender],
            "not authorized to approve for all"
        );

        _setApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
    function setApprovalForAll(address operator, bool approved) external {
        _setApprovalForAll(msg.sender, operator, approved);
    }


    function _setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) internal {
        require(
            !_superOperators[operator],
            "super operator can't have their approvalForAll changed"
        );
        _operatorsForAll[sender][operator] = approved;

        emit ApprovalForAll(sender, operator, approved);
    }

    /**
     * @notice Check if the sender approved the operator
     * @param owner The address of the owner
     * @param operator The address of the operator
     * @return The status of the approval
     */
    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool isOperator)
    {
        return _operatorsForAll[owner][operator] || _superOperators[operator];
    }

    function _burn(address from, uint256 id) public {
        require(from == _ownerOf(id), "not owner");
        _owners[id] = 2**160; // cannot mint it again
        _numNFTPerAddress[from]--;
        emit Transfer(from, address(0), id);
    }

    /// @notice Burns token `id`.
    /// @param id token which will be burnt.
    function burn(uint256 id) external {
        _burn(msg.sender, id);
    }

    /// @notice Burn token`id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id token which will be burnt.
    function burnFrom(address from, uint256 id) external {
        require(from != address(0), "from is zero address");
        require(
            msg.sender == from ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender] ||
            _operatorsForAll[from][msg.sender],
            "not authorized to burn"
        );
        _burn(from, id);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory _data)
        internal returns (bool)
    {
        if (!to.isContract()) {
            return true;
        }

        bytes4 retval = ERC721TokenReceiver(to).onERC721Received(msg.sender, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }
}
