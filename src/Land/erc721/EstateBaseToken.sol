pragma solidity 0.5.9;

import "./ERC721BaseToken.sol";
import "./LandBaseToken.sol";
import "../../../contracts_common/src/Interfaces/ERC721MandatoryTokenReceiver.sol";

// contract EstateOwner {
//     address _owner;
//     address _controller;
//     constructor(
//         address owner,
//         address controller
//     ) {
//         _owner = owner;
//         _controller = controller
//     }
// }
// contract EstateBaseToken is ERC721BaseToken {

//     constructor(
//         address metaTransactionContract,
//         address admin
//     ) public ERC721BaseToken(metaTransactionContract, admin) {
//     }

//     function createEstate(address from) external returns(uint256 id) {
//         EstateOwner estateOwner = new EstateOwner(from, address(this)));
//         uint256 estateId = uint256(address(estateOwner));
//         emit Transfer(address(0), from, estateId);
//     }
// ...
/////////////////////////////////////////////////////////

contract EstateBaseToken is ERC721BaseToken {

    uint256 internal constant GRID_SIZE = 408;

    uint256 _nextId = 1;
    mapping(uint256 => uint24[]) _quadsInEstate;
    LandBaseToken _land;

    event QuadsAddedInEstate(uint256 indexed id, uint24[] list);

    constructor(
        address metaTransactionContract,
        address admin,
        LandBaseToken land
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _land = land;
    }

    // function createFromQuad(address sender, address to, uint256 size, uint256 x, uint256 y) external returns (uint256) {
    //     require(sender != address(this), "from itself");
    //     require(sender != address(0), "sender is zero address");
    //     uint256 estateId = _nextId++;
    //     _owners[estateId] = uint256(to);
    //     _numNFTPerAddress[to]++;
    //     emit Transfer(address(0), to, estateId);
    //     _land.transferQuad(sender, address(this), size, x, y, ""); // this require approval // TODO add Estate to Land's super operators
    //     uint24[] memory list = new uint24[](1);
    //     list[0] = size * 2**18 + x + y * GRID_SIZE;
    //     _quadsInEstate[estateId] = list;
    //     emit QuadsAddedInEstate(estateId, list);
    //     return estateId;
    // }

    // function createFromMultipleQuads(
    //     address sender,
    //     address to,
    //     uint256[] calldata size,
    //     uint256[] calldata x,
    //     uint256[] calldata y
    // ) external returns (uint256) {
    //     require(sender != address(this), "from itself");
    //     require(sender != address(0), "sender is zero address");
    //     uint256 estateId = _nextId++;
    //     _owners[estateId] = uint256(to);
    //     _numNFTPerAddress[to]++;
    //     emit Transfer(address(0), to, estateId);
    //     _land.transferQuad(sender, address(this), size, x, y, ""); // this require approval // TODO add Estate to Land's super operators
    //     uint24[] memory list = new uint24[](1);
    //     list[0] = size * 2**18 + x + y * GRID_SIZE;
    //     _quadsInEstate[estateId] = list;
    //     emit QuadsAddedInEstate(estateId, list);
    //     return estateId;
    // }

    // function addQuad(address sender, uint256 estateId, uint256 size, uint256 x, uint256 y) external {
    //     require(sender != address(this), "from itself");
    //     require(sender != address(0), "sender is zero address");
    //     require(msg.sender == sender ||
    //         _metaTransactionContracts[msg.sender] ||
    //         _superOperators[msg.sender],
    //         "not authorized");
    //     require(sender == _ownerOf(id), "only owner or approved can add land to its own estate");
    //     _land.transferQuad(sender, address(this), size, x, y, ""); // this require approval // TODO add Estate to Land's super operators
    //     uint24[] memory list = new uint24[](1);
    //     list[0] = size * 2**18 + x + y * GRID_SIZE;
    //     _quadsInEstate[estateId].push(list[0]);
    //     emit QuadsAddedInEstate(estateId, list);
    // }

    // function destroy(address sender, uint256 estateId) external {
    //     require(sender != address(this), "from itself");
    //     require(sender != address(0), "sender is zero address");
    //     require(msg.sender == sender ||
    //         _metaTransactionContracts[msg.sender] ||
    //         _superOperators[msg.sender],
    //         "not authorized");
    //     require(sender == _ownerOf(estateId), "only owner can destroy estate");
    //     _owners[id] = 0; // TODO keep track of it so it can transfer Land back
    //     _numNFTPerAddress[sender]--;
    //     emit Transfer(sender, address(0), estateId);
    // }

    // function transferFromDestroyedEstate(address sender, address to, uint256 num) external {
    //     require(sender != address(this), "from itself");
    //     require(sender != address(0), "sender is zero address");
    //     require(msg.sender == sender ||
    //         _metaTransactionContracts[msg.sender] ||
    //         _superOperators[msg.sender],
    //         "not authorized");
    //     require(sender == _pastOwnerOf(estateId), "only owner can transfer land from destroyed estate");
    //     // TODO
    // }


    function onERC721BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        bytes calldata data
    ) external returns (bytes4) {
        revert("please call add* or createFrom* functions");
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        revert("please call add* or createFrom* functions");
    }
}
