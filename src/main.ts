import { execSync } from 'child_process'
import { join } from 'path'
import { getInput, debug, setFailed, setOutput } from '@actions/core'

interface TurboOutput {
  packages: string[]
}

interface GetChangedPackagesOptions {
  pipeline: string
  workingDirectory: string
}

function getChangedPackages(
  from = 'HEAD^1',
  to = '',
  options: Partial<GetChangedPackagesOptions> = {}
) {
  const { pipeline = 'build', workingDirectory = './' } = options

  const json = execSync(
    `pnpm turbo run ${pipeline} --filter="...[${from}...${to}]" --dry-run=json`,
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
    const workingDirectory = getInput('working-directory')

    debug(
      `Finding changes with inputs: ${JSON.stringify({
        from,
        to,
        pipeline,
        workingDirectory,
      })}`
    )
    const changedWorkspaces = getChangedPackages(from, to, {
      pipeline,
      workingDirectory,
    })

    debug(`Changed packages: ${changedWorkspaces}`)

    setOutput('changed', changedWorkspaces)
  } catch (error) {
    if (error instanceof Error || typeof error === 'string') {
      setFailed(error)
    } else {
      setFailed('Unknown error occured.')
    }
  }
}

run()
