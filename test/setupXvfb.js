const { spawn, execSync } = require('child_process')

const cleanExit = function() {
  process.exit()
}
process.on('SIGINT', cleanExit) // catch ctrl-c
process.on('SIGTERM', cleanExit) // catch kill

async function setupXvfb(display, xAuthority) {
  execSync(`xauth add ${display} . $(mcookie)`)
  const xProc = spawn('Xvfb', ['-auth', xAuthority, display])
  // make sure we kill xvfb if node is killed
  process.on('exit', () => {
    xProc.kill('SIGINT')
  })
  return new Promise(resolve => setTimeout(() => resolve(xProc), 50))
}

module.exports = setupXvfb
