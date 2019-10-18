/* solhint-disable func-order, code-complexity, reason-string */
// TODO rename underscore param in non underscore + rename state variable into underscore
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
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    // Our grid is 408 x 408 lands
    uint256 private constant GRID_SIZE = 408;

    uint256 private constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;

    mapping (address => uint256) public numNFTPerAddress;
    mapping (uint256 => address) public owners;
    mapping (address => mapping(address => bool)) public operatorsForAll;
    mapping (uint256 => address) public operators;

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
        _metaTransactionContracts[metaTransactionContract] = true;
        emit MetaTransactionProcessor(metaTransactionContract, true);
    }

    /**
     * @dev Transfer a token between 2 addresses
     * @param _from The send of the token
     * @param _to The recipient of the token
     * @param _id The id of the token
     */
    function _transferFrom(address _from, address _to, uint256 _id) internal {
        require(_id & LAYER == 0, "Invalid token id");
        address owner = _ownerOf(_id);
        require(owner != address(0), "Id does not exist");
        require(owner == _from, "Specified owner is not the real owner");
        require(_to != address(0), "can't send to zero address");
        if (msg.sender != _from && !_metaTransactionContracts[msg.sender]) {
            require(
                _superOperators[msg.sender] ||
                operatorsForAll[_from][msg.sender] ||
                operators[_id] == msg.sender,
                "Operator not approved"
            );
        }
        numNFTPerAddress[_from]--;
        numNFTPerAddress[_to]++;
        owners[_id] = _to;
        operators[_id] = address(0);
        emit Transfer(_from, _to, _id);
    }

    /**
     * @dev Return the balance of an address
     * @param _owner The address to look for
     * @return The balance of the address
     */
    function balanceOf(address _owner) external view returns (
        uint256 _balance
    ) {
        require(_owner != address(0), "Owner address is invalid");
        return numNFTPerAddress[_owner];
    }

    /**
     * @dev Mint a new block
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

        require(owners[LAYER_24x24 + (x/24) * 24 + ((y/24) * 24) * GRID_SIZE] == address(0), "Already minted as 24x24");

        uint256 toX = x+size;
        uint256 toY = y+size;
        if (size <= 12) {
            require(
                owners[LAYER_12x12 + (x/12) * 12 + ((y/12) * 12) * GRID_SIZE] == address(0),
                "Already minted as 12x12"
            );
        } else {
            for (uint16 x12i = x; x12i < toX; x12i += 12) {
                for (uint16 y12i = y; y12i < toY; y12i += 12) {
                    uint256 id12x12 = LAYER_12x12 + x12i + y12i * GRID_SIZE;
                    require(owners[id12x12] == address(0), "Already minted as 12x12");
                }
            }
        }

        if (size <= 6) {
            require(owners[LAYER_6x6 + (x/6) * 6 + ((y/6) * 6) * GRID_SIZE] == address(0), "Already minted as 6x6");
        } else {
            for (uint16 x6i = x; x6i < toX; x6i += 6) {
                for (uint16 y6i = y; y6i < toY; y6i += 6) {
                    uint256 id6x6 = LAYER_6x6 + x6i + y6i * GRID_SIZE;
                    require(owners[id6x6] == address(0), "Already minted as 6x6");
                }
            }
        }

        if (size <= 3) {
            require(owners[LAYER_3x3 + (x/3) * 3 + ((y/3) * 3) * GRID_SIZE] == address(0), "Already minted as 3x3");
        } else {
            for (uint16 x3i = x; x3i < toX; x3i += 3) {
                for (uint16 y3i = y; y3i < toY; y3i += 3) {
                    uint256 id3x3 = LAYER_3x3 + x3i + y3i * GRID_SIZE;
                    require(owners[id3x3] == address(0), "Already minted as 3x3");
                }
            }
        }

        for (uint16 xi = x; xi < x+size; xi++) {
            for (uint16 yi = y; yi < y+size; yi++) {
                uint256 id1x1 = xi + yi * GRID_SIZE;
                require(owners[id1x1] == address(0), "Already exists");
                emit Transfer(address(0), to, id1x1);
            }
        }

        owners[blockId] = to;
        numNFTPerAddress[to] += size * size;
    }

    /**
     * @dev Return the owner of a token
     * @param _id The id of the token
     * @return The address of the owner
     */
    function _ownerOf(uint256 _id) internal view returns (address) {
        uint256 x = _id % GRID_SIZE;
        uint256 y = _id / GRID_SIZE;
        address owner1x1 = owners[_id];

        if (owner1x1 != address(0)) {
            return owner1x1;
        } else {
            address owner3x3 = owners[LAYER_3x3 + x + y * GRID_SIZE];
            if (owner3x3 != address(0)) {
                return owner3x3;
            } else {
                address owner6x6 = owners[LAYER_6x6 + x + y * GRID_SIZE];
                if (owner6x6 != address(0)) {
                    return owner6x6;
                } else {
                    address owner12x12 = owners[LAYER_12x12 + x + y * GRID_SIZE];
                    if (owner12x12 != address(0)) {
                        return owner12x12;
                    } else {
                        return owners[LAYER_24x24 + x + y * GRID_SIZE];
                    }
                }
            }
        }
    }

    /**
     * @dev Return the owner of a token
     * @param _id The id of the token
     * @return The address of the owner
     */
    function ownerOf(uint256 _id) external view returns (address _owner) {
        require(_id & LAYER == 0, "Invalid token id");
        _owner = _ownerOf(_id);
        require(_owner != address(0), "Id does not exist");
    }

    /**
     * @dev Approve an operator to spend tokens on the sender behalf
     * @param _sender The address giving the approval
     * @param _operator The address receiving the approval
     * @param _id The id of the token
     */
    function approveFor(
        address _sender,
        address _operator,
        uint256 _id
    ) external {
        require(_id & LAYER == 0, "invalid token id");
        address owner = _ownerOf(_id);
        require(_sender != address(0), "Invalid sender address");
        require(
            msg.sender == _sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender] ||
            operatorsForAll[_sender][msg.sender],
            "require operators"
        ); // solium-disable-line max-len
        require(owner == _sender); // solium-disable-line error-reason

        operators[_id] = _operator;
        emit Approval(_sender, _operator, _id);
    }

    /**
     * @dev Approve an operator to spend tokens on the sender behalf
     * @param _operator The address receiving the approval
     * @param _id The id of the token
     */
    function approve(address _operator, uint256 _id) external {
        require(_id & LAYER == 0, "Invalid token id");
        address owner = _ownerOf(_id);
        require(owner != address(0), "token does not exist");
        require( // solium-disable-line error-reason
            owner == msg.sender ||
            _superOperators[msg.sender] ||
            operatorsForAll[owner][msg.sender]
        );
        operators[_id] = _operator;
        emit Approval(msg.sender, _operator, _id);
    }

    /**
     * @dev Get the approved operator for a specific token
     * @param _id The id of the token
     * @return The address of the operator
     */
    function getApproved(uint256 _id) external view returns (address _operator) {
        require(_id & LAYER == 0, "Invalid token id");
        require(_ownerOf(_id) != address(0), "Id does not exist");
        return operators[_id];
    }

    /**
     * @dev Transfer a token between 2 addresses
     * @param _from The send of the token
     * @param _to The recipient of the token
     * @param _id The id of the token
    */
    function transferFrom(address _from, address _to, uint256 _id) external {
        _transferFrom(_from, _to, _id);
    }

    /**
     * @dev Transfer a token between 2 addresses
     * @param _from The send of the token
     * @param _to The recipient of the token
     * @param _id The id of the token
     * @param _data Additional data
     */
    function safeTransferFrom(address _from, address _to, uint256 _id, bytes memory _data) public {
        _transferFrom(_from, _to, _id);
        require(
            _checkOnERC721Received(_from, _to, _id, _data),
            "ERC721: transfer rejected" // TODO test order as the check need to happen after transfer
        );
    }

    /**
     * @dev Transfer a token between 2 addresses
     * @param _from The send of the token
     * @param _to The recipient of the token
     * @param _id The id of the token
     */
    function safeTransferFrom(address _from, address _to, uint256 _id) external {
        safeTransferFrom(_from, _to, _id, "");
    }

    /**
     * @dev Return the name of the token contract
     * @return The name of the token contract
     */
    function name() external pure returns (string memory _name) {
        return "Sandbox's LANDs";
    }

    /**
     * @dev Return the symbol of the token contract
     * @return The symbol of the token contract
     */
    function symbol() external pure returns (string memory _symbol) {
        return "LAND";
    }

    // solium-disable-next-line security/no-assign-params
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (_i != 0) {
            bstr[k--] = byte(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }

    /**
     * @dev Return the URI of a specific token
     * @param _id The id of the token
     * @return The URI of the token
     */
    function tokenURI(uint256 _id) public view returns (string memory) {
        require(_id & LAYER == 0, "Invalid token id");
        require(_ownerOf(_id) != address(0), "Id does not exist");
        return
            string(
                abi.encodePacked(
                    "https://sandbox.game/land/",
                    uint2str(_id),
                    ".json"
                )
            );
    }

    /**
     * @dev Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * 0x5b5e139f is ERC-721 metadata
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }

    /**
     * @dev Set the approval for an operator to manage all the tokens of the sender
     * @param _sender The address giving the approval
     * @param _operator The address receiving the approval
     * @param _approved The determination of the approval
     */
    function setApprovalForAllFor(
        address _sender,
        address _operator,
        bool _approved
    ) external {
        require(_sender != address(0), "Invalid sender address");
        require(
            msg.sender == _sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender],
            "require meta approval" // TODO tests
        );

        _setApprovalForAll(_sender, _operator, _approved);
    }

    /**
     * @dev Set the approval for an operator to manage all the tokens of the sender
     * @param _operator The address receiving the approval
     * @param _approved The determination of the approval
     */
    function setApprovalForAll(address _operator, bool _approved) external {
        _setApprovalForAll(msg.sender, _operator, _approved);
    }

    /**
     * @dev Set the approval for an operator to manage all the tokens of the sender
     * @param _sender The address giving the approval
     * @param _operator The address receiving the approval
     * @param _approved The determination of the approval
     */
    function _setApprovalForAll(
        address _sender,
        address _operator,
        bool _approved
    ) internal {
        require(
            !_superOperators[_operator],
            "super operator can't have their approvalForAll changed" // TODO test
        );
        operatorsForAll[_sender][_operator] = _approved;

        emit ApprovalForAll(_sender, _operator, _approved);
    }

    /**
     * @dev Check if the sender approved the operator
     * @param _owner The address of the owner
     * @param _operator The address of the operator
     * @return The status of the approval
     */
    function isApprovedForAll(address _owner, address _operator)
        external
        view
        returns (bool isOperator)
    {
        return operatorsForAll[_owner][_operator] || _superOperators[_operator]; // TODO add test for superOperators
    }

    /**
     * @dev Internal function to invoke `onERC721Received` on a target address.
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
