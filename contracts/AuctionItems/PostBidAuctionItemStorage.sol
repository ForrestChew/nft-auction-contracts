// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PostBidAuctionItemStorage {
    mapping(bytes32 => uint256) _itemKeyIdxs;
    bytes32[] _itemKeys;

    function _addPostBidItemKey(bytes32 itemKey) internal {
        _itemKeyIdxs[itemKey] = _itemKeys.length;
        _itemKeys.push(itemKey);
    }

    function _removePostBidItemKeys(bytes32 itemKey) internal {
        uint256 lastIdx = _itemKeys.length - 1;
        uint256 itemKeyIdx = _itemKeyIdxs[itemKey];
        _itemKeys[itemKeyIdx] = _itemKeys[lastIdx];
        _itemKeys.pop();
        delete _itemKeyIdxs[itemKey];
    }

    function getPostBidItemKeys() external view returns (bytes32[] memory) {
        return _itemKeys;
    }
}
