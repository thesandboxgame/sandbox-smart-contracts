/* solhint-disable func-order, code-complexity */
pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/AddressUtils.sol";
import "../../../contracts_common/src/Interfaces/ERC721TokenReceiver.sol";
import "../../../contracts_common/src/Interfaces/ERC721Events.sol";
import "../../../contracts_common/src/BaseWithStorage/SuperOperators.sol";
import "../../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";


/**
 * @title LandBaseToken
 * @notice This contract is the base of our lands
 */
contract LandBaseToken is ERC721Events, SuperOperators, MetaTransactionReceiver {
    using AddressUtils for address;

    // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IERC721Receiver(0).onERC721Received.selector`
    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;

    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER =          0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 =      0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 =      0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 =      0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 =    0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 =    0x0400000000000000000000000000000000000000000000000000000000000000;

    mapping (address => uint256) public _numNFTPerAddress;
    mapping (uint256 => uint256) public _owners;
    mapping (address => mapping(address => bool)) public _operatorsForAll;
    mapping (uint256 => address) public _operators;

    mapping(address => bool) internal _minters;
    event Minter(address superOperator, bool enabled);

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external {
        require(
            msg.sender == _admin,
            "only admin is allowed to add minters"
        );
        _minters[minter] = enabled;
        emit Minter(minter, enabled);
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
    }

    constructor(
        address metaTransactionContract,
        address admin
    ) public {
        _admin = admin;
        _setMetaTransactionProcessor(metaTransactionContract, true);
    }

    /**
     * @notice Transfer a token between 2 addresses
     * @param from The send of the token
     * @param to The recipient of the token
     * @param id The id of the token
     */
    function _transferFrom(address from, address to, uint256 id) internal {
        require(id & LAYER == 0, "Invalid token id");
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
     * @notice Return the balance of an address
     * @param owner The address to look for
     * @return The balance of the address
     */
    function balanceOf(address owner) external view returns (
        uint256 _balance
    ) {
        require(owner != address(0), "owner is zero address");
        return _numNFTPerAddress[owner];
    }

    /**
     * @notice Mint a new block
     * @param to The recipient of the new block
     * @param size The size of the new block
     * @param x The x coordinate of the new block
     * @param y The y coordinate of the new block
     */
    function mintBlock(address to, uint16 size, uint16 x, uint16 y) external {
        require(
            isMinter(msg.sender),
            "Only a minter can mint"
        );
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x < GRID_SIZE - size && y < GRID_SIZE - size, "Out of bounds");

        uint256 blockId;
        uint256 id = x + y * GRID_SIZE;

        if (size == 1) {
            blockId = id;
        } else if (size == 3) {
            blockId = LAYER_3x3 + id;
        } else if (size == 6) {
            blockId = LAYER_6x6 + id;
        } else if (size == 12) {
            blockId = LAYER_12x12 + id;
        } else if (size == 24) {
            blockId = LAYER_24x24 + id;
        } else {
            require(false, "Invalid size");
        }

        require(_owners[LAYER_24x24 + (x/24) * 24 + ((y/24) * 24) * GRID_SIZE] == 0, "Already minted as 24x24");

        uint256 toX = x+size;
        uint256 toY = y+size;
        if (size <= 12) {
            require(
                _owners[LAYER_12x12 + (x/12) * 12 + ((y/12) * 12) * GRID_SIZE] == 0,
                "Already minted as 12x12"
            );
        } else {
            for (uint16 x12i = x; x12i < toX; x12i += 12) {
                for (uint16 y12i = y; y12i < toY; y12i += 12) {
                    uint256 id12x12 = LAYER_12x12 + x12i + y12i * GRID_SIZE;
                    require(_owners[id12x12] == 0, "Already minted as 12x12");
                }
            }
        }

        if (size <= 6) {
            require(_owners[LAYER_6x6 + (x/6) * 6 + ((y/6) * 6) * GRID_SIZE] == 0, "Already minted as 6x6");
        } else {
            for (uint16 x6i = x; x6i < toX; x6i += 6) {
                for (uint16 y6i = y; y6i < toY; y6i += 6) {
                    uint256 id6x6 = LAYER_6x6 + x6i + y6i * GRID_SIZE;
                    require(_owners[id6x6] == 0, "Already minted as 6x6");
                }
            }
        }

        if (size <= 3) {
            require(_owners[LAYER_3x3 + (x/3) * 3 + ((y/3) * 3) * GRID_SIZE] == 0, "Already minted as 3x3");
        } else {
            for (uint16 x3i = x; x3i < toX; x3i += 3) {
                for (uint16 y3i = y; y3i < toY; y3i += 3) {
                    uint256 id3x3 = LAYER_3x3 + x3i + y3i * GRID_SIZE;
                    require(_owners[id3x3] == 0, "Already minted as 3x3");
                }
            }
        }

        for (uint16 xi = x; xi < x+size; xi++) {
            for (uint16 yi = y; yi < y+size; yi++) {
                uint256 id1x1 = xi + yi * GRID_SIZE;
                require(_owners[id1x1] == 0, "Already minted");
                emit Transfer(address(0), to, id1x1);
            }
        }

        _owners[blockId] = uint256(to);
        _numNFTPerAddress[to] += size * size;
    }

    /**
     * @notice Return the owner of a token
     * @param id The id of the token
     * @return The address of the owner
     */
    function _ownerOf(uint256 id) internal view returns (address) {
        uint256 x = id % GRID_SIZE;
        uint256 y = id / GRID_SIZE;
        uint256 owner1x1 = _owners[id];

        if (owner1x1 != 0) {
            return address(owner1x1); // cast to zero
        } else {
            address owner3x3 = address(_owners[LAYER_3x3 + (x/3) * 3 + ((y/3) * 3) * GRID_SIZE]);
            if (owner3x3 != address(0)) {
                return owner3x3;
            } else {
                address owner6x6 = address(_owners[LAYER_6x6 + (x/6) * 6 + ((y/6) * 6) * GRID_SIZE]);
                if (owner6x6 != address(0)) {
                    return owner6x6;
                } else {
                    address owner12x12 = address(_owners[LAYER_12x12 + (x/12) * 12 + ((y/12) * 12) * GRID_SIZE]);
                    if (owner12x12 != address(0)) {
                        return owner12x12;
                    } else {
                        return address(_owners[LAYER_24x24 + (x/24) * 24 + ((y/24) * 24) * GRID_SIZE]);
                    }
                }
            }
        }
        return address(0); // explicit return
    }

    /**
     * @notice Return the owner of a token
     * @param id The id of the token
     * @return The address of the owner
     */
    function ownerOf(uint256 id) external view returns (address owner) {
        require(id & LAYER == 0, "Invalid token id");
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
        require(id & LAYER == 0, "invalid token id");
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
        require(id & LAYER == 0, "Invalid token id");
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
        require(id & LAYER == 0, "Invalid token id");
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
            require(id & LAYER == 0, "Invalid token id");
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

    /**
     * @notice Set the approval for an operator to manage all the tokens of the sender
     * @param sender The address giving the approval
     * @param operator The address receiving the approval
     * @param approved The determination of the approval
     */
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
        _owners[id] = 2**160;
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

    /**
     * @notice Internal function to invoke `onERC721Received` on a target address.
     * The call is not executed if the target address is not a contract.
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
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
