import Application from './Application'
import Launcher from './Launcher'

function main(): void {
  const application = new Application()
  const launcher = new Launcher(application)
  globalThis.launcher = launcher
}

main()
