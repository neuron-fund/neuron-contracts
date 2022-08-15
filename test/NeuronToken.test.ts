import { ethers, deployments } from 'hardhat'
import { Signer } from 'ethers'
import { NeuronToken, NeuronToken__factory } from '../typechain-types'
import { expectRevert } from '@openzeppelin/test-helpers'

describe('NeuronToken', () => {
  let neuronToken: NeuronToken
  let transferAllower: Signer
  let newTransferAllower: Signer
  let deployer: Signer
  let user1: Signer
  let user2: Signer
  let initSnapshot: string

  before(async () => {
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
    transferAllower = accounts[10]
    newTransferAllower = accounts[11]
    await deployments.fixture(['NeuronToken'])
    const NeuronTokenDeployment = await deployments.get('NeuronToken')
    neuronToken = NeuronToken__factory.connect(NeuronTokenDeployment.address, deployer)
    initSnapshot = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [initSnapshot])
    initSnapshot = await ethers.provider.send('evm_snapshot', [])
  })

  it('Non-transferable', async () => {
    const userBalance = await neuronToken.balanceOf(await user1.getAddress())
    await expectRevert(
      neuronToken.connect(user1).transfer(await user2.getAddress(), userBalance),
      'The Token is currently non-transferrable'
    )
  })

  it('Transfer allowed', async () => {
    await neuronToken.connect(transferAllower).allowTranfers()
    const userBalance = await neuronToken.balanceOf(await user1.getAddress())
    await neuronToken.connect(user1).transfer(await user2.getAddress(), userBalance)
  })

  it('Double call transfer allowed', async () => {
    await neuronToken.connect(transferAllower).allowTranfers()
   
    await expectRevert(
      neuronToken.connect(transferAllower).allowTranfers(),
      'Transfers already allowed'
    )
  })

  it('Transfer allower role', async () => {
    const transferAllowerRole = await neuronToken.TRANSFERS_ALLOWER_ROLE()
    await neuronToken
      .connect(transferAllower)
      .grantRole(transferAllowerRole, await newTransferAllower.getAddress())
      
    await neuronToken.connect(newTransferAllower).allowTranfers()
  })
})
