import { execSync } from 'child_process'
import { join } from 'path'
import { getInput, debug, setFailed, setOutput } from '@actions/core'
import { getPackagesSync } from '@manypkg/get-packages'

interface TurboOutput {
  packages: string[]
}

interface GetChangedPackagesOptions {
  pipeline: string
  workspace: string
  workingDirectory: string
}

function getPackageMap(workingDirectory = './') {
  const { packages } = getPackagesSync(workingDirectory)

  const packageMap: Record<string, string> = {}
  for (const pkg of packages.values()) {
    packageMap[pkg.packageJson.name] = pkg.relativeDir
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

  const json = execSync(
    `npx turbo run ${pipeline} --filter="${workspace}...[${from}...${to}]" --dry-run=json`,
    {
      cwd: join(process.cwd(), workingDirectory),
      encoding: 'utf-8',
    }
  )
  const parsedOutput: Partial<TurboOutput> = JSON.parse(json)

  return parsedOutput.packages ?? []
}

function run() {
  try {
    const from = getInput('from')
    const to = getInput('to')
    const pipeline = getInput('pipeline')
    const workspace = getInput('workspace')
    const workingDirectory = getInput('working-directory')

    const packageMap = getPackageMap(workingDirectory)
    debug(`Total packages in monorepo ${JSON.stringify(packageMap)}`)

    debug(
      `Finding changed packages using inputs: ${JSON.stringify({
        from,
        to,
        pipeline,
        workspace,
        workingDirectory,
      })}`
    )
    const changedPackagesNames = getChangedPackages(from, to, {
      pipeline,
      workspace,
      workingDirectory,
    })

    const changedPackages = changedPackagesNames.map((packageName) => {
      return {
        name: packageName,
        path: packageMap[packageName],
      }
    })

    debug(`Changed packages: ${changedPackagesNames}`)

    setOutput('package_names', changedPackagesNames)
    setOutput('packages', changedPackages)
  } catch (error) {
    if (error instanceof Error || typeof error === 'string') {
      setFailed(error)
    } else {
      setFailed('Unknown error occured.')
    }
  }
}

run()
