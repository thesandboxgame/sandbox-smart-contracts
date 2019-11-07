pragma solidity 0.5.9;

import "./ERC721BaseToken.sol";
import "./LandBaseToken.sol";

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

    uint256 internal constant GRID_SIZE = 408; // TODO share Land map size

    LandBaseToken _land;
    constructor(
        address metaTransactionContract,
        address admin,
        LandBaseToken land
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _land = land;
    }

    function createFromBlock(address sender, address to, uint16 size, uint16 x, uint16 y) external {
        require(sender != address(0), "sender is zero address");
        _land.transferBlock(sender, address(this), size, x, y, ""); // this require approval
        uint256 id = size * 2**32 + x + y * GRID_SIZE;
        _owners[id] = uint256(to);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, id);
    }

    function destroy(address sender, address to, uint256 id) external {
        require(sender != address(0), "sender is zero address");
        require(msg.sender == sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender],
            "not authorized");
        require(sender == _ownerOf(id), "only owner can destroy estate");
        uint16 size = uint16(id / 2**32);
        uint32 coords = uint32(id % 2**32);
        uint16 x = uint16(coords % GRID_SIZE);
        uint16 y = uint16(coords / GRID_SIZE);

        _land.transferBlock(address(this), to, size, x, y, "");
        _owners[id] = 0;
        _numNFTPerAddress[sender]--;
        emit Transfer(sender, address(0), id);
    }

    // function create(address from, uint256[] calldata ids) external {
    //     require(ids.length > 0, "no ids provided");
    // }

    // function addLands(address from, uint256 estateId, uint256 joinId, uint256[] calldata ids) external {
    //     address owner = _ownerOf(estateId);
    //     require(owner != address(0), "estate does not exist");
    //     require(ids.length > 0, "no ids provided");
    // }

    // function destroy() {
    //     // token destroyed but Land up for grabs
    // }

}
