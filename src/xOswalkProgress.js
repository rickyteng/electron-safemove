const fs = require('fs-extra')
const path = require('path')

export class oswalkProgress {
    constructor() {
        this.result = []
        this.task = []
        this.dirInfoCallback = this.dirInfoCallback.bind(this)
    }
    dirInfo(_path, finalCallback, progressCallback) {
        this._dirInfo(_path, this.dirInfoCallback, finalCallback, progressCallback)
    }

    _dirInfo(_path, callback, finalCallback, progressCallback) {
        var root = _path
        var dirs = []
        var files = []
        fs.readdir(root, (err, _files) => {
            if (err) {
                throw err
            }
            for (var i in _files) {
                var path_string = path.join(root, _files[i])
                if (path_string.endsWith(':\\System Volume Information')) {
                    console.log(path_string)
                    continue
                }
                var isDir = fs.lstatSync(path_string).isDirectory()
                // fix .asar as folder
                var isAsar = path_string.toLowerCase().endsWith('.asar') ? true : false
                if (isAsar) {
                    files.push(_files[i])
                } else {
                    if (isDir) {
                        dirs.push(_files[i])
                    } else {
                        files.push(_files[i])
                    }
                }
            }
            callback({ root, dirs, files }, finalCallback, progressCallback)
        })
    }

    dirInfoCallback(info, finalCallback, progressCallback) {
        for (var j in info.files) {
            var xpath = path.join(info.root, info.files[j])
            this.result.push(xpath)
        }

        if (progressCallback !== undefined) {
            progressCallback(this.result.length, info.root)
        }

        for (var j in info.dirs) {
            var xpath = path.join(info.root, info.dirs[j])
            this.task.push(xpath)
        }

        if (this.task.length > 0) {
            var child = this.task.shift()
            console.log('folder info  get:' + child)
            this._dirInfo(child, this.dirInfoCallback, finalCallback, progressCallback)
        } else {
            console.log('finalCallback:' + this.result.length)
            finalCallback(this.result)
        }
    }
}