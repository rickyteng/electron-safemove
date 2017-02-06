const fs = require('fs-extra')
const path = require('path')
const crypto = require("crypto")

import { TextView } from "./xTextView"
import { Button } from "./xButton"
import { FileList } from "./xFileList"

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

function ScenarioNext(ScenarioName, tag) {
    setTimeout(function () {
        console.log("ScenarioNext " + ScenarioName + " step " + tag.step)
        ScenarioHandler(ScenarioName, tag)
    }, 1);
}

class xTag {
    constructor(ScenarioName, Step, others) {
        this.scenarioStack = []
        this.scenarioStack.push({ ScenarioName: ScenarioName, Step: Step })
    }
    getLastScenario() {
        if (this.scenarioStack.length > 0) {
            var a = this.scenarioStack[this.scenarioStack.length - 1]
            return a
        } else {
            return ""
        }
    }
}

function ScenarioHandler(ScenarioName, tag) {
    console.log("ScenarioHandler " + ScenarioName + " step " + tag.step)
    switch (ScenarioName) {
        case "LeftCopy":
            switch (tag.step) {
                case "1":
                    // make file list
                    var filelist = []
                    var pathFrom = path.join(tag.from, tag.select)
                    if (fs.lstatSync(pathFrom).isDirectory()) {
                        filelist = oswalk(pathFrom)
                        tag.step = "filelistGot"
                        tag.filelist = filelist
                        ScenarioNext("LeftCopy", tag)
                    } else {
                        var root = path.dirname(pathFrom)
                        var name = path.basename(pathFrom)
                        filelist.push({ root: root, dirs: [], files: [name] })
                        tag.step = "filelistGot"
                        tag.filelist = filelist
                        ScenarioNext("LeftCopy", tag)
                    }
                    break
                case "filelistGot":
                    tag.cmdlist = []
                    tag.filelist.forEach(x => {
                        x.files.forEach(y => {
                            var relpath = x.root.substring(tag.from.length)
                            // console.log(["copy", x.root, y, "to", tag.to, relpath])
                            tag.cmdlist.push({ "cmd": "copy", "src": path.join(x.root, y), "dest": path.join(tag.to, relpath, y) })
                        })
                    })
                    delete tag.filelist
                    tag.step = "makeSHA"
                    ScenarioNext("LeftCopy", tag)
                    break
                case "makeSHA":
                    if (tag.cmdlist.length > 0) {
                        var cmd = tag.cmdlist.pop()
                        MakeSHA_Promise(cmd.src).then(x => {
                            cmd.hash = x.hash
                            if (tag.filehash) {
                                tag.filehash.push(cmd)
                            } else {
                                tag.filehash = []
                                tag.filehash.push(cmd)
                            }
                            tag.step = "makeSHA"
                            ScenarioNext("LeftCopy", tag)
                        })
                    } else {
                        console.log("makeSHA end")
                        tag.step = "executeCmd"
                        ScenarioNext("LeftCopy", tag)
                    }
                    break
                case "executeCmd":
                    tag.filehash.forEach(x => {
                        // console.log(x)
                        try {
                            console.log(x)
                            fs.copySync(x.src, x.dest)
                        } catch (err) {
                            console.log(err)
                            console.log(x)
                            throw err
                        }

                    })
                    console.log("executeCmd end")
                    tag.step = "checkHash"
                    ScenarioNext("LeftCopy", tag)
                    break
                case "checkHash":
                    console.log("checkHash start")
                    break
            }
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
            var isDir = fs.lstatSync(path_string).isDirectory()
            leftTree.push({ text: file, id: Date.now(), isDir: isDir })
        })

        files = fs.readdirSync(props.rightFolder)
        files.forEach(file => {
            var path_string = path.join(props.rightFolder, file)
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
        }
        this.leftSelected = null
        this.rightSelected = null
        this.eventFire = this.eventFire.bind(this)
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }

    eventFire(eventName, tag) {
        // console.log("ename:" + eventName + " , srcObject:" + tag.srcObject)
        switch (eventName) {
            case "Click":
                switch (tag.srcObject.constructor.name) {
                    case "Button":
                        switch (tag.srcObject.props.id) {
                            case "leftUp":
                                var p = path.dirname(this.state.leftFolder)
                                this.setState({ "leftFolder": p })
                                break
                            case "rightUp":
                                var p = path.dirname(this.state.rightFolder)
                                this.setState({ "rightFolder": p })
                                break
                            case "leftCopy":
                                if (this.leftSelected) {
                                    var p = path.join(this.leftSelected.root, this.leftSelected.text)
                                    // console.log(tag.srcObject.props.id + " from " + p + " to " + this.state.rightFolder)
                                    ScenarioHandler("LeftCopy", {
                                        "step": "1",
                                        "starter": this,
                                        "from": this.state.leftFolder,
                                        "to": this.state.rightFolder,
                                        select: this.leftSelected.text
                                    })
                                } else {
                                    // console.log(tag.srcObject.props.id + " from " + this.state.leftFolder + " to " + this.state.rightFolder)
                                    ScenarioHandler("LeftCopy", {
                                        "step": "1",
                                        "starter": this,
                                        "from": this.state.leftFolder,
                                        "to": this.state.rightFolder,
                                        select: ""
                                    })
                                }
                                break
                            case "rightCopy":
                                console.log(tag.srcObject.props.id)
                                break
                            case "leftMove":
                                if (this.leftSelected) {
                                    var p = path.join(this.leftSelected.root, this.leftSelected.text)
                                    console.log(tag.srcObject.props.id + " from " + p + " to " + this.state.rightFolder)
                                } else {
                                    console.log(tag.srcObject.props.id + " from " + this.state.leftFolder + " to " + this.state.rightFolder)
                                }
                                break
                            case "rightMove":
                                console.log(tag.srcObject.props.id)
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
                                var p = path.join(this.state.leftFolder, tag.itemSelected.props.text)
                                this.setState({ "leftFolder": p })
                            } else {

                            }
                        } else if (tag.srcObject.props.id === "rightFileList") {
                            if (tag.itemSelected.props.isDir) {
                                var p = path.join(this.state.rightFolder, tag.itemSelected.props.text)
                                this.setState({ "rightFolder": p })
                            } else {

                            }
                        }
                        break
                }
                break

            default:

        }
    }
    render() {
        return (
            <table style={{ width: "100%" }}>
                <tbody>
                    <tr>
                        <td>
                            <TextView text={this.state.leftFolder} />
                            <FileList id="leftFileList" itemSelected={this.leftSelected} root={this.state.leftFolder} eventFire={this.eventFire} />
                            <Button text="up" id="leftUp" eventFire={this.eventFire} />
                            <Button text="copy" id="leftCopy" eventFire={this.eventFire} />
                            <Button text="move" id="leftMove" eventFire={this.eventFire} />
                        </td>
                        <td>
                            <TextView text={this.state.rightFolder} />
                            <FileList id="rightFileList" itemSelected={this.rightSelected} root={this.state.rightFolder} eventFire={this.eventFire} />
                            <Button text="up" id="rightUp" eventFire={this.eventFire} />
                            <Button text="copy" id="rightCopy" eventFire={this.eventFire} />
                            <Button text="move" id="rightMove" eventFire={this.eventFire} />
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }
}