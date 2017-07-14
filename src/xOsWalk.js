const fs = require('fs-extra')
const path = require('path')

function oswalkSync(folderpath) {
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

function* osWalkYield(folderpath) {
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
    var x = { root: root, dirs: dirs, files: files }
    yield x
    for (var i = 0; i < dirs.length; i++) {
        for (var y of osWalkYield(path.join(root, dirs[i]))) {
            yield y
        }
    }
}

module.exports.oswalkSync = oswalkSync
module.exports.osWalkYield = osWalkYield