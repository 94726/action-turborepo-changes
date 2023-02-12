# turborepo-changes Github Action

Action to get a list of changed workspaces in a [Turborepo](https://turbo.build/).

## Prerequisites

This action uses the Turborepo cli to determine the changed workspaces.
It'll need to be installed before running this action.
The executed command is `turbo run ${pipeline} --dry-run`.
`pipeline` defaults to `build`.

## How to use

```yml
name: 'ci'
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Necessary for comparing changes to past commits

      - name: Collect Turborepo Changes
        id: turborepoChanges
        uses: 94726/action-turborepo-changed@v1
        with:
          from: HEAD^1 # Changes since previous commit (this is the default)

      - name: Validate Action Output
        if: contains(fromJson(steps.turborepoChanges.outputs.package_names), 'components') # Check if components package has changed
        run: echo 'package "components" has changed'
```
