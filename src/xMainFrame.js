const fs = require('fs-extra')
const path = require('path')
const crypto = require("crypto")
const drivelist = require('drivelist') // import drivelist from 'drivelist'
const remote = require('electron').remote

import { TextView } from "./xTextView"
import { Button } from "./xButton"
import { FileList } from "./xFileList"
import { LogWindow } from "./xLogWindow"
import { LogLine } from "./xLogLine"
import { xTag, CallScenario, ScenarioNext, handlers } from "./xScenarioManager"
import { osWalkYield } from "./xOsWalk"
import { Dialog } from "./xDialog"
import { DialogSeq } from "./xDialogSeq"

function updateLastFolder(left, right) {
    var lastFolderPath = path.join(remote.getGlobal('sharedObj').cwd, "lastFolder.json")
    var lastFolder = JSON.parse(fs.readFileSync(lastFolderPath, 'utf8'));
    if (left) { lastFolder.left = left }
    if (right) { lastFolder.right = right }
    fs.writeFileSync(lastFolderPath, JSON.stringify(lastFolder), 'utf8')
}

// http://exploringjs.com/es6/ch_modules.html
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator

function MakeSHA(filepath, callback) {
    // http://stackoverflow.com/questions/18658612/obtaining-the-hash-of-a-file-using-the-stream-capabilities-of-crypto-module-ie
    var fd = fs.createReadStream(filepath)
    var hash = crypto.createHash("sha1")
    hash.setEncoding("hex")
    fd.on('end', () => {
        hash.end()
        if (callback) {
            callback(filepath, hash.read())
        }
    })
    fd.pipe(hash)
}

function MakeSHA_Promise(filepath) {
    return new Promise(function (resolve, reject) {
        var fd = fs.createReadStream(filepath)
        var hash = crypto.createHash("sha1")
        hash.setEncoding("hex")
        fd.on('end', () => {
            hash.end()
            resolve({ src: filepath, hash: hash.read() })
        })
        fd.pipe(hash)
    });
}

function oswalk(folderpath) {
    var root = folderpath
    var names = fs.readdirSync(root)
    var dirs = []
    var files = []
    var entry = []
    names.forEach(name => {
        var path_string = path.join(root, name)
        var isDir = fs.lstatSync(path_string).isDirectory()
        if (isDir) {
            dirs.push(name)
        } else {
            files.push(name)
        }
    })

    entry.push({ root: root, dirs: dirs, files: files })

    function _walk(_folderpath, _entry) {
        var _root = _folderpath
        var _names = fs.readdirSync(_root)
        var _dirs = []
        var _files = []
        _names.forEach(name => {
            var path_string = path.join(_root, name)
            var isDir = fs.lstatSync(path_string).isDirectory()
            if (isDir) {
                _dirs.push(name)
            } else {
                _files.push(name)
            }
        })
        _entry.push({ root: _root, dirs: _dirs, files: _files })
        _dirs.forEach(dir => {
            _walk(path.join(_root, dir), _entry)
        })
        // return _entry
    }

    dirs.forEach(dir => {
        _walk(path.join(root, dir), entry)
    })

    return entry
}

function rmdirsSync(folderpath) {
    var filelist = oswalk(folderpath)
    filelist.reverse().forEach(x => {
        x.dirs.forEach(y => {
            fs.rmdirSync(path.join(x.root, y))
        })
    })
    fs.rmdirSync(folderpath)
}

// var handlers = {
//     "CheckHash": ScenarioCheckHash,
//     "LeftCopy": ScenarioLeftCopy,
//     "MakeSHA": ScenarioMakeHash,
//     "LeftMove": ScenarioLeftMove,
// }

Object.assign(handlers, {
    "CheckHash": ScenarioCheckHash,
    //"LeftCopy": ScenarioLeftCopy,
    "MakeSHA": ScenarioMakeHash,
    "LeftMove": ScenarioLeftMove,
})

function ScenarioMakeHash(xtag) {
    console.log("ScenarioMakeHash " + xtag.ScenarioName + " step " + xtag.Step)
    switch (xtag.Step) {
        case "1":
            delete xtag.result
            xtag.result = []
            xtag._tasklist = []
            xtag.params.forEach(x => {
                xtag._tasklist.push({ path: x, hash: "" })
            })
            xtag.Step = "MakeSHA"
            ScenarioNext(xtag)
            break
        case "MakeSHA":
            if (xtag._tasklist.length > 0) {
                var task = xtag._tasklist.shift()
                MakeSHA_Promise(task.path).then(x => {
                    xtag.srcObject.writeLog("MakeSHA " + task.path + " " + task.hash)
                    task.hash = x.hash
                    xtag.result.push(task)
                    xtag.Step = "MakeSHA"
                    ScenarioNext(xtag)
                })
            } else {
                xtag.Step = "final"
                ScenarioNext(xtag)
            }
            break
        case "final":
            console.debug("done; return origin")
            xtag.popScenario()
            ScenarioNext(xtag)
            break
    }
}

function ScenarioCheckHash(xtag) {
    console.log("ScenarioCheckHash " + xtag.ScenarioName + " step " + xtag.Step)
    switch (xtag.Step) {
        case "1":
            var params = []

            xtag.filehash.forEach(x => {
                params.push(x.dest)
            })

            xtag.Step = "gotHash"
            CallScenario("MakeSHA", "1", xtag, params)
            break
        case "gotHash":
            console.log("gotHash")

            var d = {}
            xtag.filehash.forEach(x => {
                d[x.dest] = x
            })

            xtag.result.forEach(x => {
                d[x.path].desthash = x.hash
                d[x.path].hashcomp = (d[x.path].hash == d[x.path].desthash)
            })

            var r = []
            xtag.filehash.forEach(x => {
                r.push(d[x.dest])
            })
            xtag.result = r

            xtag.Step = "final"
            ScenarioNext(xtag)
            break
        case "final":
            console.log("done; return origin")
            xtag.popScenario()
            ScenarioNext(xtag)
            break
    }
}

function ScenarioLeftCopy(xtag) {
    console.log("ScenarioLeftCopy step " + xtag.Step)
    switch (xtag.Step) {
        case "1":
            // make file list
            var filelist = []
            var pathFrom = path.join(xtag.from, xtag.select)
            if (fs.lstatSync(pathFrom).isDirectory()) {
                filelist = oswalk(pathFrom)
                xtag.Step = "filelistGot"
                xtag.filelist = filelist
                ScenarioNext(xtag)
            } else {
                var root = path.dirname(pathFrom)
                var name = path.basename(pathFrom)
                filelist.push({ root: root, dirs: [], files: [name] })
                xtag.Step = "filelistGot"
                xtag.filelist = filelist
                ScenarioNext(xtag)
            }
            break
        case "filelistGot":
            xtag.cmdlist = []
            xtag.filelist.forEach(x => {
                x.files.forEach(y => {
                    var relpath = x.root.substring(xtag.from.length)
                    // console.log(["copy", x.root, y, "to", tag.to, relpath])
                    xtag.cmdlist.push({ "cmd": "copy", "src": path.join(x.root, y), "dest": path.join(xtag.to, relpath, y) })
                })
            })
            delete xtag.filelist
            xtag.Step = "makeSHA"
            ScenarioNext(xtag)
            break
        case "makeSHA":
            if (xtag.cmdlist.length > 0) {
                var cmd = xtag.cmdlist.shift()
                MakeSHA_Promise(cmd.src).then(x => {
                    cmd.hash = x.hash
                    if (xtag.filehash) {
                        xtag.filehash.push(cmd)
                    } else {
                        xtag.filehash = []
                        xtag.filehash.push(cmd)
                    }
                    xtag.Step = "makeSHA"
                    ScenarioNext(xtag)
                })
            } else {
                console.log("makeSHA end")
                xtag.Step = "executeCopy"
                ScenarioNext(xtag)
            }
            break
        case "executeCopy":
            xtag.filehash.forEach(x => {
                try {
                    console.debug("copy " + x.src + " " + x.dest)
                    xtag.srcObject.writeLog("copy " + x.src + " " + x.dest)
                    fs.copySync(x.src, x.dest)
                } catch (err) {
                    console.log(err)
                    console.log(x)
                    throw err
                }

            })
            console.log("executeCopy end")
            // xtag.Step = "checkHash"
            // ScenarioNext(xtag)
             xtag.srcObject.eventFire("LeftCopyResult", xtag)
            break
        case "checkHash":
            console.log("checkHash start")
            xtag.Step = "HashResult"
            CallScenario("CheckHash", "1", xtag)
            break
        case "HashResult":
            console.log("HaskResult")
            xtag.srcObject.eventFire("LeftCopyResult", xtag)
            break
    }
}

function ScenarioLeftMove(xtag) {
    console.log("ScenarioLeftCopy step " + xtag.Step)
    switch (xtag.Step) {
        case "1":
            // make file list
            var filelist = []
            var pathFrom = path.join(xtag.from, xtag.select)
            if (fs.lstatSync(pathFrom).isDirectory()) {
                filelist = oswalk(pathFrom)
                xtag.Step = "filelistGot"
                xtag.filelist = filelist
                ScenarioNext(xtag)
            } else {
                var root = path.dirname(pathFrom)
                var name = path.basename(pathFrom)
                filelist.push({ root: root, dirs: [], files: [name] })
                xtag.Step = "filelistGot"
                xtag.filelist = filelist
                ScenarioNext(xtag)
            }
            break
        case "filelistGot":
            xtag.filehash = []
            xtag.filelist.forEach(x => {
                x.files.forEach(y => {
                    var relpath = x.root.substring(xtag.from.length)
                    // console.log(["copy", x.root, y, "to", tag.to, relpath])
                    xtag.filehash.push({ "cmd": "move", "src": path.join(x.root, y), "dest": path.join(xtag.to, relpath, y) })
                })
            })
            delete xtag.filelist

            var params = []
            xtag.filehash.forEach(x => {
                params.push(x.src)
            })
            xtag.Step = "gotSHA"
            CallScenario("MakeSHA", "1", xtag, params)
            break
        case "gotSHA":
            var d = {}
            xtag.filehash.forEach(x => {
                d[x.src] = x
            })

            xtag.result.forEach(x => {
                d[x.path].hash = x.hash
            })
            xtag.Step = "executeMove"
            ScenarioNext(xtag)
            break
        case "executeMove":
            xtag.filehash.forEach(x => {
                try {
                    console.debug("copy " + x.src + " " + x.dest)
                    fs.copySync(x.src, x.dest)
                } catch (err) {
                    console.log(err)
                    console.log(x)
                    throw err
                }

            })
            console.log("executeMove end")
            xtag.Step = "checkHash"
            ScenarioNext(xtag)
            break
        case "checkHash":
            console.log("checkHash start")
            xtag.Step = "HashResult"
            CallScenario("CheckHash", "1", xtag)
            break
        case "HashResult":
            console.log("HashResult")
            var copyresult = true
            xtag.result.forEach(x => {
                copyresult = copyresult && x.hashcomp
            })
            if (copyresult) {
                xtag.filehash.forEach(x => {
                    try {
                        console.debug("move " + x.src + " " + x.dest)
                        xtag.srcObject.writeLog("move " + x.src + " " + x.dest)
                        fs.unlinkSync(x.src)
                    } catch (err) {
                        console.log(err)
                        console.log(x)
                        throw err
                    }
                })
                var p = path.join(xtag.from, xtag.select)
                try {
                    if (fs.existsSync(p)) {
                        if (fs.lstatSync(p).isDirectory()) {
                            rmdirsSync(p)
                        }
                    }
                    xtag.result = "move ok"
                } catch (error) {
                    xtag.result = error
                }
            } else {
                xtag.result = "move ng"
            }
            xtag.srcObject.eventFire("LeftMoveResult", xtag)
            break
    }
}


export class MainFrame extends React.Component {
    constructor(props) {
        super(props);
        var leftTree = []
        var rightTree = []
        var files = fs.readdirSync(props.leftFolder)
        files.forEach(file => {
            var path_string = path.join(props.leftFolder, file)
            if (path_string.endsWith(':\\System Volume Information')) {
                console.log(path_string)
                return
            }
            var isDir = fs.lstatSync(path_string).isDirectory()
            leftTree.push({ text: file, id: Date.now(), isDir: isDir })
        })

        files = fs.readdirSync(props.rightFolder)
        files.forEach(file => {
            var path_string = path.join(props.rightFolder, file)
            if (path_string.endsWith(':\\System Volume Information')) {
                console.log(path_string)
                return
            }
            var isDir = fs.lstatSync(path_string).isDirectory()
            rightTree.push({ text: file, id: Date.now(), isDir: isDir })
        })

        this.state = {
            cols: props.cols,
            cwd: props.cwd,
            leftFolder: props.leftFolder,
            rightFolder: props.rightFolder,
            // leftTree: leftTree,
            // rightTree: rightTree
            leftStatus: [],
            rightStatus: [],
        }
        this.leftSelected = null
        this.rightSelected = null
        this.eventFire = this.eventFire.bind(this)
        this.writeLog = this.writeLog.bind(this)
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }

    writeLog(text) {
        this.refs.leftLogWindow.append(text)
    }

    eventFire(eventName, tag) {
        // console.log("ename:" + eventName + " , srcObject:" + tag.srcObject)
        switch (eventName) {
            case "Click":
                // if (this.state.leftStatus.length > 0) {
                //     this.setState({ "leftStatus": "" })
                // }

                switch (tag.srcObject.constructor.name) {
                    case "Button":
                        switch (tag.srcObject.props.id) {
                            case "leftUp":
                                var p = path.dirname(this.state.leftFolder)
                                if ((this.state.leftFolder == "") || (p.length == 3 && p.endsWith(":\\") && p == this.state.leftFolder)) {
                                    this.setState({ "leftFolder": "" })
                                } else {
                                    this.setState({ "leftFolder": p })
                                    updateLastFolder(p, null)
                                }
                                break
                            case "rightUp":
                                var p = path.dirname(this.state.rightFolder)
                                if ((this.state.rightFolder == "") || (p.length == 3 && p.endsWith(":\\") && p == this.state.rightFolder)) {
                                    this.setState({ "rightFolder": "" })
                                } else {
                                    this.setState({ "rightFolder": p })
                                    updateLastFolder(null, p)
                                }
                                break
                            case "leftCopy":
                                if (this.leftSelected) {
                                    // ScenarioNext(new xTag("LeftCopy", "1", {
                                    //     "starter": this,
                                    //     "from": this.state.leftFolder,
                                    //     "to": this.state.rightFolder,
                                    //     "select": this.leftSelected.text,
                                    //     srcObject: this
                                    // }))
                                    // this.refs.leftLogWindow.append("finding files")
                                    var p = path.join(this.state.leftFolder, this.leftSelected.text)
                                    this.refs.copyDialogSeq.setPath(p, this.leftSelected.text, this.state.rightFolder)
                                    this.refs.copyDialogSeq.show()
                                    this.refs.copyDialogSeq.start()
                                } else {
                                    // ScenarioNext(new xTag("LeftCopy", "1", {
                                    //     "starter": this,
                                    //     "from": this.state.leftFolder,
                                    //     "to": this.state.rightFolder,
                                    //     "select": "",
                                    //     srcObject: this
                                    // }))
                                    // this.refs.leftLogWindow.append("finding files")
                                    this.refs.copyDialogSeq.show()
                                    this.refs.copyDialogSeq.setPath(this.state.leftFolder, '', this.state.rightFolder)
                                    this.refs.copyDialogSeq.start()
                                }
                                break
                            case "leftSurfaceCopy":
                                if (this.leftSelected) {
                                    var p = path.join(this.state.leftFolder, this.leftSelected.text)
                                    this.refs.copyDialog.setPath(p, this.leftSelected.text, this.state.rightFolder)
                                    this.refs.copyDialog.show()
                                    this.refs.copyDialog.start(true)
                                } else {
                                    this.refs.copyDialog.setPath(this.state.leftFolder, '', this.state.rightFolder)
                                    this.refs.copyDialog.show()
                                    this.refs.copyDialog.start(true)
                                }
                                break
                            case "rightCopy":
                                console.log(tag.srcObject.props.id)
                                break
                            case "leftMove":
                                if (this.leftSelected) {
                                    // ScenarioNext(new xTag("LeftMove", "1", {
                                    //     "starter": this,
                                    //     "from": this.state.leftFolder,
                                    //     "to": this.state.rightFolder,
                                    //     "select": this.leftSelected.text,
                                    //     srcObject: this
                                    // }))
                                } else {
                                    // ScenarioNext(new xTag("LeftMove", "1", {
                                    //     "starter": this,
                                    //     "from": this.state.leftFolder,
                                    //     "to": this.state.rightFolder,
                                    //     "select": "",
                                    //     srcObject: this
                                    // }))
                                }
                                break
                            case "rightMove":
                                console.log(tag.srcObject.props.id)
                                break
                            case "refresh":
                                this.setState({ "leftFolder": this.state.leftFolder })
                                this.setState({ "rightFolder": this.state.rightFolder })
                                break
                        }
                        break
                    case "FileList":
                        // console.log(tag.srcObject.props.text)
                        // this.state.leftSelected = tag.srcObject
                        // this.setState({ leftSelected: { root: tag.srcObject.props.root, text: tag.srcObject.props.text } })
                        //this.setState({ "leftFolder": this.state.leftFolder })
                        //tag.srcObject.setState({ selected: !tag.srcObject.state.selected })
                        switch (tag.srcObject.props.id) {
                            case "leftFileList":
                                if (tag.itemSelected) {
                                    this.leftSelected = { text: tag.itemSelected.props.text, root: tag.itemSelected.props.root, isDir: tag.itemSelected.props.isdir }
                                } else {
                                    this.leftSelected = null
                                }
                                break
                            case "rightFileList":
                                if (tag.itemSelected) {
                                    this.rightSelected = { text: tag.itemSelected.props.text, root: tag.itemSelected.props.root, isDir: tag.itemSelected.props.isdir }
                                } else {
                                    this.rightSelected = null
                                }
                                break
                        }
                        break
                }

                break
            case "DoubleClick":
                switch (tag.srcObject.constructor.name) {
                    case "FileList":
                        if (tag.srcObject.props.id === "leftFileList") {
                            if (tag.itemSelected.props.isDir) {
                                if (this.state.leftFolder.length == 0) {
                                    var p = path.join(tag.itemSelected.props.text, ".")
                                    this.setState({ "leftFolder": p })
                                    updateLastFolder(p, null)
                                } else {
                                    var p = path.join(this.state.leftFolder, tag.itemSelected.props.text)
                                    this.setState({ "leftFolder": p })
                                    updateLastFolder(p, null)
                                }

                            } else {

                            }
                        } else if (tag.srcObject.props.id === "rightFileList") {
                            if (tag.itemSelected.props.isDir) {
                                var p = path.join(this.state.rightFolder, tag.itemSelected.props.text)
                                if (this.state.rightFolder.length == 0) {
                                    p = path.join(tag.itemSelected.props.text, ".")
                                }
                                this.setState({ "rightFolder": p })
                                updateLastFolder(null, p)
                            } else {

                            }
                        }
                        break
                }
                break
            case "LeftCopyResult":
                var copyresult = true
                tag.result.forEach(x => {
                    copyresult = copyresult && x.hashcomp
                })
                this.refs.leftLogWindow.append("LeftCopyResult:" + copyresult)
                //this.setState({ "leftStatus": this.state.leftStatus.concat([<LogLine text={"LeftCopyResult:" + copyresult} />]) })
                break
            case "LeftMoveResult":
                if (fs.existsSync(path.join(this.state.leftFolder, tag.select)) == false) {
                    var p = path.dirname(path.join(this.state.leftFolder, tag.select))
                    this.leftSelected = null
                    this.setState({ "leftFolder": p })
                    updateLastFolder(p, null)
                }
                this.refs.leftLogWindow.append("LeftCopyResult:" + tag.result)
                // this.setState({ "leftStatus": "LeftMoveResult:" + tag.result })
                break
            default:

        }
    }
    render() {
        return (
            <table style={{ width: "100%" }}>
                <tbody>
                    <tr>
                        <td style={{ width: "50%" }}><TextView text={this.state.leftFolder} /></td>
                        <td><TextView text={this.state.rightFolder} /></td>
                    </tr>
                    <tr>
                        <td style={{ width: "50%" }}>
                            <FileList ref="leftFileList" id="leftFileList" itemSelected={this.leftSelected} root={this.state.leftFolder} eventFire={this.eventFire} />
                        </td>
                        <td>
                            <FileList id="rightFileList" itemSelected={this.rightSelected} root={this.state.rightFolder} eventFire={this.eventFire} />
                        </td>
                    </tr>
                    <tr>
                        <td style={{ width: "50%" }}>
                            <Button text="up" id="leftUp" eventFire={this.eventFire} />
                            <Button text="copy" id="leftCopy" eventFire={this.eventFire} />
                            <Button text="move" id="leftMove" eventFire={this.eventFire} />
                            <Button text="surfaceCopy" id="leftSurfaceCopy" eventFire={this.eventFire} />
                        </td>
                        <td>
                            <Button text="up" id="rightUp" eventFire={this.eventFire} />
                            <Button text="refresh" id="refresh" eventFire={this.eventFire} />
                            {/*<Button text="copy" id="rightCopy" eventFire={this.eventFire} />
                            <Button text="move" id="rightMove" eventFire={this.eventFire} />*/}
                        </td>
                    </tr>
                    <tr>
                        <td colSpan="2"><LogWindow lines={this.state.leftStatus} ref="leftLogWindow" />
                            <Dialog ref="copyDialog" />
                            <DialogSeq ref="copyDialogSeq" />
                        </td>
                        <td></td>
                    </tr>
                    {/*
                    <tr>
                        <td rowSpan="2"><LogWindow lines={this.state.rightStatus} /></td>
                        <td></td>
                    </tr>
                    */}
                </tbody>
            </table>
        );
    }
}