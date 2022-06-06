import { ContractFactory } from 'ethers'
import type * as HardhatDeployTypes from 'hardhat-deploy/types'

declare module 'hardhat/types/runtime' {
  export interface DeployOptions<T = any[]> extends Omit<HardhatDeployTypes.DeployOptions, 'args'> {
    args?: T
  }
  export interface DeploymentsExtension extends HardhatDeployTypes.DeploymentsExtension {
    deploy<T extends any[]>(name: string, options: DeployOptions<T>): Promise<HardhatDeployTypes.DeployResult>
  }
  interface HardhatRuntimeEnvironment {
    deployments: DeploymentsExtension
  }
}

export type ExceptLastArrayItem<T extends any[]> = T extends [...infer A, any?] ? A : never

/**
 * Deploy arguments to use in deploy script for hardhat-deploy plugin
 */
export type DeployArgs<T extends ContractFactory> = ExceptLastArrayItem<Parameters<T['deploy']>>
