// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const remote = require('electron').remote
const fs = require('fs-extra')
const path = require('path')

var cwd = remote.getGlobal('sharedObj').cwd
var leftFolder = cwd //"c:/test/src"
var rightFolder = cwd //"c:/test/dest"

var lastFolderPath = path.join(cwd, "lastFolder.json")
if (fs.existsSync(lastFolderPath)) {
    var lastFolder = JSON.parse(fs.readFileSync(lastFolderPath, 'utf8'))
    if (!fs.existsSync(lastFolder.left)) {
        lastFolder.left = leftFolder
        fs.writeFileSync(lastFolderPath, JSON.stringify(lastFolder), 'utf8')
    }
    if (!fs.existsSync(lastFolder.right)) {
        lastFolder.right = rightFolder
        fs.writeFileSync(lastFolderPath, JSON.stringify(lastFolder), 'utf8')
    }
    leftFolder = lastFolder.left
    rightFolder = lastFolder.right
} else {
    var lastFolder = {}
    lastFolder.left = leftFolder
    lastFolder.right = rightFolder
    fs.writeFileSync(lastFolderPath, JSON.stringify(lastFolder), 'utf8')
}

import { MainFrame } from "./xMainFrame"

ReactDOM.render(
    <MainFrame leftFolder={leftFolder} rightFolder={rightFolder} />,
    document.getElementById('app')
)