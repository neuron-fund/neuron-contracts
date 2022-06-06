import { Signer } from 'ethers'
import { ethers } from 'hardhat'
import { IERC20 } from '../../typechain-types'

export default class TokenHelper {
  public static async getToken(address: string, signer?: Signer): Promise<IERC20> {
    return (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      address,
      signer
    )) as IERC20
  }
}
