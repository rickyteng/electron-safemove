// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const remote = require('electron').remote
const fs = require('fs-extra')


var cwd = remote.getGlobal('sharedObj').cwd
var leftFolder = "c:/test/src"
var rightFolder = "c:/test/dest"

import {MainFrame} from "./xMainFrame"

ReactDOM.render(
    <MainFrame leftFolder={leftFolder} rightFolder={rightFolder} />,
    document.getElementById('app')
)