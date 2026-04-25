// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/WritersRoomContribution.sol";
import "../src/AgentReputation.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        WritersRoomContribution contribution = new WritersRoomContribution();
        AgentReputation reputation = new AgentReputation();

        vm.stopBroadcast();

        console.log("WritersRoomContribution:", address(contribution));
        console.log("AgentReputation:", address(reputation));
    }
}
