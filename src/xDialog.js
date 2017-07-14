import { TextView } from "./xTextView"
import { osWalkYield } from "./xOsWalk"
import { oswalkProgress } from "./xOswalkProgress"
import { mapProgress } from "./xMapProgress"

const fs = require('fs-extra')
const path = require('path')
const crypto = require("crypto")

function MakeSHA(filepath, callback) {
    // http://stackoverflow.com/questions/18658612/obtaining-the-hash-of-a-file-using-the-stream-capabilities-of-crypto-module-ie

    process.noAsar = true // fix read .asar as file //https://github.com/electron/electron/blob/master/docs/tutorial/application-packaging.md
    // https://www.bountysource.com/issues/39961418-rm-rf-doesn-t-work-if-the-directory-contains-an-asar-archive-in-electron

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

function Copy(args, callback) {
    if (args[0].indexOf('electron\.asar') > -1) {
        console.log('break')
    }
    process.noAsar = true
    fs.copy(args[0], args[1], (err) => {
        if (callback) {
            if (err) {
                throw err
            } else {
                callback(err)
            }
        } else {
            if (err) {
                throw err
            }
        }
    })
}

export class Dialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hide: true,
            srcPath: '',
            tarPath: '',
            selected: '',
            srcFiles: [],
            tmpFiles: [],
            tarFiles: [],
            shaDict: {},
            failFiles: [],
            filelistCaption: 'File List'
        }
        this.handleDoubleClick = this.handleDoubleClick.bind(this)
        this.handleClick = this.handleClick.bind(this)
        this.handleClose = this.handleClose.bind(this)

        this.start = this.start.bind(this)
        this.shaSrc = this.shaSrc.bind(this)
        this.makeDestPath = this.makeDestPath.bind(this)
        this.copy = this.copy.bind(this)
        this.shaTar = this.shaTar.bind(this)
        this.check = this.check.bind(this)
    }

    handleDoubleClick(e) {
        e.preventDefault();
        // console.log('Button: The link was clicked.');
        this.props.eventFire("DoubleClick", { srcObject: this })
    }

    handleClick(e) {
        e.preventDefault();
        // console.log('Button: The link was clicked.');
        this.props.eventFire("Click", { srcObject: this })
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }

    show() {
        this.setState({ "hide": false })
    }

    hide() {
        this.setState({ "hide": true })
    }

    setPath(srcPath, selected, tarPath) {
        this.setState({ "srcPath": srcPath, 'selected': selected, "tarPath": tarPath })
        this.state.srcPath = srcPath
        this.state.tarPath = tarPath
        this.state.selected = selected
    }

    start(surface) {
        // console.log("start")
        this.setState({ 'filelistCaption': 'File List Search...' })
        if (surface) {
            var root = this.state.srcPath
            var files = []
            fs.readdir(root, (err, _files) => {
                if (err) {
                    throw err
                }
                for (var i in _files) {
                    var path_string = path.join(root, _files[i])
                    var isDir = fs.lstatSync(path_string).isDirectory()
                    // fix .asar as folder
                    var isAsar = path_string.toLowerCase().endsWith('.asar') ? true : false
                    if (isAsar) {
                        files.push(path_string)
                    } else {
                        if (isDir) {
                            // pass
                        } else {
                            files.push(path_string)
                        }
                    }
                }

                this.setState({ 'filelistCaption': 'File List search complete' })
                this.state.srcFiles = files.slice()

                console.log('setState srcFiles complete')
                this.setState({ 'filelistCaption': 'File List Completed. Total:' + this.state.srcFiles.length })

                this.shaSrc()
            })
        } else {
            var xx = new oswalkProgress()

            xx.dirInfo(this.state.srcPath,
                (x) => {
                    this.setState({ 'filelistCaption': 'File List search complete' })
                    this.state.srcFiles = x.slice()

                    console.log('setState srcFiles complete')
                    this.setState({ 'filelistCaption': 'File List Completed. Total:' + this.state.srcFiles.length })

                    this.shaSrc()
                },
                (...y) => {
                    this.setState({ 'filelistCaption': 'File List Searching... Count:' + y[0] + '  looking ' + y[1] })
                })
        }


    }

    shaSrc() {
        this.setState({ 'filelistCaption': 'File List source SHA... ' })
        this.state.shaDict = {}
        var xx = new mapProgress(this.state.srcFiles,
            MakeSHA,
            (result) => {
                result.map((x) => {
                    this.state.shaDict[x[0].slice(this.state.srcPath.length)] = { 'src': x[1], 'tar': '', "result": false }
                    // console.log(x)
                })
                this.setState({ 'filelistCaption': 'File List source SHA. Total:' + result.length })

                this.copy()
            },
            (count) => {
                this.setState({ 'filelistCaption': 'File List source SHA. count:' + count + '/' + this.state.srcFiles.length })
                // console.log('File List source SHA. count:' + count)
            })
        xx.go()
    }

    copy() {
        this.setState({ 'filelistCaption': 'File List Copy... ' })
        this.state.tmpFiles = this.state.srcFiles.map((x) => {
            return [x, this.makeDestPath(x)]
        })
        this.state.srcFiles = []
        var xx = new mapProgress(this.state.tmpFiles,
            Copy,
            (result) => {
                this.setState({ 'filelistCaption': 'File List Copy Completed ' })

                this.shaTar()
            },
            (count) => {
                this.setState({ 'filelistCaption': 'File List Copy Count: ' + count + '/' + this.state.tmpFiles.length })
            }
        )
        xx.go()
    }

    shaTar() {
        this.setState({ 'filelistCaption': 'File List target SHA start ' })
        this.state.tarFiles = this.state.tmpFiles.map((x) => {
            return x[1]
        })
        this.state.tmpFiles = []
        var xx = new mapProgress(this.state.tarFiles,
            MakeSHA,
            (result) => {
                this.setState({ 'filelistCaption': 'File List target SHA Completed ' })

                result.map((x) => {
                    // console.log(x)
                    var k = x[0].slice(path.join(this.state.selected, this.state.tarPath).length)
                    if (k in this.state.shaDict) {
                        this.state.shaDict[k]['tar'] = x[1]
                    } else {
                        this.state.shaDict[k] = { 'src': '', 'tar': x[1], 'result': false }
                    }
                })

                this.check()

            },
            (count) => {
                this.setState({ 'filelistCaption': 'File List target SHA. count:' + count + '/' + this.state.tarFiles.length })
            })

        xx.go()
    }

    check() {
        var result = true
        var failList = []
        for (var x in this.state.shaDict) {
            if (this.state.shaDict[x]['tar'] == this.state.shaDict[x]['src']) {
                if (this.state.shaDict[x]['tar'].length > 0) {
                    this.state.shaDict[x]['result'] = true
                } else {
                    result = false
                    failList.push({ 'src': path.join(this.state.srcPath, this.state.selected, x), 'reason': 'copy failed' })
                }
            } else {
                result = false
                failList.push({ 'src': path.join(this.state.srcPath, this.state.selected, x), 'reason': 'sha diff' })
            }
        }
        this.state.failFiles = failList.slice()
        this.setState({ 'filelistCaption': 'File List result:' + result })
    }

    /**
     * 
     * @param {string} src 
     * @param {string} tar 
     * @param {string} srcFullPath 
     */
    makeDestPath(srcFullPath) {
        var src = this.state.srcPath
        var tar = this.state.tarPath
        var selected = this.state.selected
        var relSrcPath = srcFullPath.slice(src.length)
        var tarFullPath = path.join(tar, selected, relSrcPath)
        return tarFullPath
    }

    handleClose(e) {
        e.preventDefault();
        // console.log('Button: The link was clicked.');
        this.setState({ 'filelistCaption': 'File List' })
        this.hide()
    }

    render() {
        var tree = []
        if (this.state.srcFiles.length < 10) {
            for (var index = 0; index < this.state.srcFiles.length; index++) {
                var element = this.state.srcFiles[index];
                tree.push(<TextView key={index} text={element} />)
            }
        }

        var tree2 = []
        for (var index = 0; index < this.state.failFiles.length; index++) {
            var element = this.state.failFiles[index];
            tree2.push(<TextView key={index} text={element} />)
        }

        if (this.state.hide || this.state.hide == undefined) {
            return <div className="dialog hideme">
            </div >
        } else {
            return <div className="dialog">
                <div>from: {this.state.srcPath}</div>
                <hr />
                <div >-to-: {this.state.tarPath}</div>
                <hr />
                <div><TextView text={this.state.filelistCaption} /></div>
                <hr />
                <div className="filelist">{tree}</div>
                <div className="filelist">{tree2}</div>
                <button onClick={this.handleClose}>Close</button>
            </div>
        }

    }
}