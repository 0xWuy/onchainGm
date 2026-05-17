// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract GM {
    struct GmPost {
        address sender;
        string message;
        uint256 createdAt;
    }

    uint256 public totalGms;

    mapping(address sender => uint256 count) public gmCountByAddress;

    GmPost[] private gms;

    event GmSent(
        address indexed sender,
        string message,
        uint256 indexed countForSender,
        uint256 totalGms,
        uint256 createdAt
    );

    function sayGM(string calldata message) external {
        string memory finalMessage = bytes(message).length == 0 ? "GM Arc" : message;

        require(bytes(finalMessage).length <= 120, "GM message too long");

        totalGms += 1;
        gmCountByAddress[msg.sender] += 1;

        gms.push(
            GmPost({
                sender: msg.sender,
                message: finalMessage,
                createdAt: block.timestamp
            })
        );

        emit GmSent(
            msg.sender,
            finalMessage,
            gmCountByAddress[msg.sender],
            totalGms,
            block.timestamp
        );
    }

    function getRecentGms(uint256 limit) external view returns (GmPost[] memory) {
        uint256 available = gms.length;
        uint256 resultLength = limit;

        if (resultLength > available) {
            resultLength = available;
        }

        if (resultLength > 25) {
            resultLength = 25;
        }

        GmPost[] memory recent = new GmPost[](resultLength);

        for (uint256 index = 0; index < resultLength; index++) {
            recent[index] = gms[available - 1 - index];
        }

        return recent;
    }
}
