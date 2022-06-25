import path from 'path'
import fs from 'fs'

const deploymentsDestination = path.resolve(__dirname, '../deployments/localhost')

export function copyJsonFromDirToDeployments(sourceDir: string) {
  const isDestinationExists = fs.existsSync(deploymentsDestination)

  if (!isDestinationExists) {
    fs.mkdirSync(deploymentsDestination, { recursive: true })
  }

  const dirContent = fs.readdirSync(sourceDir)
  const deploymentsFilesNames = dirContent.filter(file => file.endsWith('.json'))

  deploymentsFilesNames.forEach(deploymentFileName => {
    const deploymentFilePath = path.resolve(sourceDir, deploymentFileName)
    fs.copyFileSync(deploymentFilePath, `${deploymentsDestination}/${deploymentFileName}`)
  })
}

function getExternalDivPathFromEnv(varName: string) {
  const envPath = process.env[varName]
  if (!envPath) {
    throw new Error(`Enviroment variable ${varName} is not set`)
  }

  const isAbsolute = path.isAbsolute(envPath)

  let pathResolved: string
  if (isAbsolute) {
    pathResolved = envPath
  } else {
    pathResolved = path.resolve(__dirname, '../', envPath)
  }

  const isPathExists = fs.existsSync(pathResolved)

  if (!isPathExists) {
    throw new Error(`NEURON_OPTIONS_PATH ${pathResolved} does not exist`)
  }

  return pathResolved
}

export function getDeploymentsDirFromEnv(varName: string) {
  const externalDirResolvedPath = getExternalDivPathFromEnv(varName)

  const deploymentsDirPath = path.resolve(externalDirResolvedPath, './deployments/localhost')

  const isDeploymentsDirExists = fs.existsSync(deploymentsDirPath)

  if (!isDeploymentsDirExists) {
    throw new Error(`Neuron options not deployed, ${deploymentsDirPath} does not exist`)
  }

  return deploymentsDirPath
}

export function getArtifactsDirFromEnv(varName: string) {
  const externalDirResolvedPath = getExternalDivPathFromEnv(varName)

  const artifactsDirPath = path.resolve(externalDirResolvedPath, './artifacts')

  const isArtifactsDirExists = fs.existsSync(artifactsDirPath)

  if (!isArtifactsDirExists) {
    throw new Error(`Neuron options not deployed, ${artifactsDirPath} does not exist`)
  }

  return `${artifactsDirPath}/!(build-info)/**/!(*.dbg*)*.json`
}

export async function importLocalNeuronDeployments() {
  copyJsonFromDirToDeployments(getDeploymentsDirFromEnv('NEURON_OPTIONS_PATH'))
  copyJsonFromDirToDeployments(getDeploymentsDirFromEnv('NEURON_CONTRACTS_PATH'))
}
