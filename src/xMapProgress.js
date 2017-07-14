export class mapProgress {
    constructor(list, func, finalCallback, progressCallback = undefined, funcCallback = undefined) {
        this.list = list.slice()
        this.total = this.list.length
        this.result = []
        this.func = func
        this.funcCallback = funcCallback
        this.finalCallback = finalCallback
        this.progressCallback = progressCallback

        this.go = this.go.bind(this)
        this._go = this._go.bind(this)
        this._goCallback = this._goCallback.bind(this)
    }

    go() {
        this._go(this.funcCallback, this._goCallback, this.finalCallback, this.progressCallback)
    }

    _go(funcCallback, callback, finalCallback, progressCallback) {
        if (this.list.length > 0) {
            var x = this.list.shift()
            this.func(x, (...args) => {
                // var args = Array.prototype.slice.call(arguments) //arg = [function, function, function, function]
                // var args = Array.from(arguments) //arg = [function, function, function, function]
                //var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
                // var args = []
                // for (var i = 1; i < arguments.length; i++) {
                //     args.push(arguments[i])
                // }
                if (funcCallback !== undefined) {
                    var rs = funcCallback(...args)
                    callback(rs)
                } else {
                    callback(args)
                }
            })
        } else {
            this.finalCallback(this.result)
        }

    }

    _goCallback(r) {
        this.result.push(r)

        if (this.progressCallback !== undefined) {
            this.progressCallback(this.result.length)
        }

        this._go(this.funcCallback, this._goCallback, this.finalCallback, this.progressCallback)
    }
}