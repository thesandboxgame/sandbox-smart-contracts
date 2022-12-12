pragma solidity ^0.5.2;


library LibLand {
    // Our grid is 408 x 408 lands
    function GRID_SIZE() internal pure returns(uint256){
        return 408;
    }

    function LAYER() internal pure returns(uint256){
        return 0xFF00000000000000000000000000000000000000000000000000000000000000;
    }

    function LAYER_1x1() internal pure returns(uint256){
        return 0x0000000000000000000000000000000000000000000000000000000000000000;
    }

    function LAYER_3x3() internal pure returns(uint256){
        return 0x0100000000000000000000000000000000000000000000000000000000000000;
    }

    function LAYER_6x6() internal pure returns(uint256){
        return 0x0200000000000000000000000000000000000000000000000000000000000000;
    }

    function LAYER_12x12() internal pure returns(uint256){
        return 0x0300000000000000000000000000000000000000000000000000000000000000;
    }

    function LAYER_24x24() internal pure returns(uint256){
        return 0x0400000000000000000000000000000000000000000000000000000000000000;
    }

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    function _getQuadLayer(uint256 size) internal  pure returns (uint256 layer, uint256 parentSize, uint256 childLayer)
    {
        if (size == 1) {
            layer = LAYER_1x1();
            parentSize = 3;
        } else if (size == 3) {
            layer = LAYER_3x3();
            parentSize = 6;
        } else if (size == 6) {
            layer = LAYER_6x6();
            parentSize = 12;
            childLayer = LAYER_3x3();
        } else if (size == 12) {
            layer = LAYER_12x12();
            parentSize = 24;
            childLayer = LAYER_6x6();
        } else if (size == 24) {
            layer = LAYER_24x24();
            childLayer = LAYER_12x12();
        } else {
            require(false, "Invalid size");
        }
    }

    function _getQuadId(uint256 layer, uint256 x, uint256 y) internal pure returns (uint256 quadId){
        quadId = layer + x + y * GRID_SIZE();
    }

}