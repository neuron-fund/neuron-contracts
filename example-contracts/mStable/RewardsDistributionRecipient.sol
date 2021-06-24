pragma solidity ^0.7.3;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IRewardsDistributionRecipient
} from "./interfaces/IRewardsDistributionRecipient.sol";

/**
 * @title  RewardsDistributionRecipient
 * @author Originally: Synthetix (forked from /Synthetixio/synthetix/contracts/RewardsDistributionRecipient.sol)
 *         Changes by: Stability Labs Pty. Ltd.
 * @notice RewardsDistributionRecipient gets notified of additional rewards by the rewardsDistributor
 * @dev    Changes: Addition of Module and abstract `getRewardToken` func + cosmetic
 */
abstract contract RewardsDistributionRecipient is
    IRewardsDistributionRecipient
{
    function notifyRewardAmount(uint256 reward) external virtual override;

    function getRewardToken() external view virtual override returns (IERC20);

    // This address has the ability to distribute the rewards
    address public rewardsDistributor;

    /** @dev Recipient is a module, governed by mStable governance */
    constructor(address _rewardsDistributor) {
        rewardsDistributor = _rewardsDistributor;
    }

    /**
     * @dev Only the rewards distributor can notify about rewards
     */
    modifier onlyRewardsDistributor() {
        require(
            msg.sender == rewardsDistributor,
            "Caller is not reward distributor"
        );
        _;
    }

    /**
     * @dev Change the rewardsDistributor - only called by mStable governor
     * @param _rewardsDistributor   Address of the new distributor
     */
    function setRewardsDistribution(address _rewardsDistributor)
        external
        // TODO add 'only owner' or 'only governer' modifier
    {
        rewardsDistributor = _rewardsDistributor;
    }
}