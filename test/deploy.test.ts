import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat"
import { deploy } from '../scripts/deploy'

const { formatEther, parseEther, parseUnits } = ethers.utils

describe('Test deploy', function () {
  it('Test Deploy', async function () {
    await deploy()
  })
})
