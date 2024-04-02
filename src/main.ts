import { execSync } from 'child_process'
import { join } from 'path'
import { getInput, debug, setFailed, setOutput } from '@actions/core'
import { getPackagesSync, Package } from '@manypkg/get-packages'

interface TurboOutput {
  packages: string[]
}

interface GetChangedPackagesOptions {
  pipeline: string
  workspace: string
  workingDirectory: string
}

type ActionOutput = {
  name: string
  path: string
}[]

function getPackageMap(workingDirectory = './') {
  const { packages } = getPackagesSync(workingDirectory)

  const packageMap: Record<string, Package> = {}
  for (const pkg of packages) {
    packageMap[pkg.packageJson.name] = pkg
  }
  return packageMap
}

function getChangedPackages(
  from = 'HEAD^1',
  to = '',
  options: Partial<GetChangedPackagesOptions> = {}
) {
  const {
    pipeline = 'build',
    workspace = '',
    workingDirectory = './',
  } = options

  const fromTo = to ? `${from}...${to}` : from

  const json = execSync(
    `npx turbo run ${pipeline} --filter="${workspace}...[${fromTo}]" --dry-run=json`,
    {
      cwd: join(process.cwd(), workingDirectory),
      encoding: 'utf-8',
    }
  )
  const parsedOutput: Partial<TurboOutput> = JSON.parse(json)

  const packageNames = parsedOutput.packages ?? []

  return packageNames.filter((name) => name !== '//')
}

function run() {
  try {
    const from = getInput('from')
    const to = getInput('to')
    const pipeline = getInput('pipeline')
    const workspace = getInput('workspace')
    const workingDirectory = getInput('working-directory')
    const excludePrivatePackages = !!getInput('exclude-private-packages')

    const packageMap = getPackageMap(workingDirectory)
    debug(`Total packages in monorepo ${JSON.stringify(packageMap)}`)

    debug(
      `Finding changed packages using inputs: ${JSON.stringify({
        from,
        to,
        pipeline,
        workspace,
        workingDirectory,
        excludePrivatePackages,
      })}`
    )
    const changedPackagesNames = getChangedPackages(from, to, {
      pipeline,
      workspace,
      workingDirectory,
    })

    const changedPackages: ActionOutput = []
    for (const packageName of changedPackagesNames) {
      if (excludePrivatePackages && packageMap[packageName].packageJson.private)
        continue

      changedPackages.push({
        name: packageName,
        path: packageMap[packageName].relativeDir,
      })
    }

    debug(`Changed packages: ${changedPackagesNames}`)

    setOutput('package_names', changedPackagesNames)
    setOutput('packages', changedPackages)
  } catch (error) {
    if (error instanceof Error) {
      setFailed({name: error.name, message: error.message, stack: error.stack})
    } else if (typeof error === 'string') {
      setFailed(error)
    } else {
      setFailed('Unknown error occured.')
    }
  }
}

run()
