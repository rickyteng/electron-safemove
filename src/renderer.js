// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const remote = require('electron').remote
const fs = require('fs-extra')
const path = require('path')

var cwd = remote.getGlobal('sharedObj').cwd
var leftFolder = cwd
var rightFolder = cwd

var left_tree = []
var right_tree = []

var files = fs.readdirSync(leftFolder)
files.forEach(file => {
    var path_string = path.join(leftFolder, file)
    var isDir = fs.lstatSync(path_string).isDirectory()
    left_tree.push({ text: file, id: Date.now(), isDir: isDir })
})

files = fs.readdirSync(rightFolder)
files.forEach(file => {
    var path_string = path.join(rightFolder, file)
    var isDir = fs.lstatSync(path_string).isDirectory()
    right_tree.push({ text: file, id: Date.now(), isDir: isDir })
})

class MainFrame extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cols: props.cols,
            cwd: props.cwd
        }
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }

    render() {

        return (
            <table style={{ width: "100%" }}>
                <tbody>
                    <tr>
                        <td>
                            <TextView text={cwd} />
                            <FileList items={left_tree} root={leftFolder} />
                            <Button text="up" />
                            <Button text="copy" />
                            <Button text="move" />
                        </td>
                        <td>
                            <TextView text={cwd} />
                            <FileList items={right_tree} root={rightFolder} />
                            <Button text="up" />
                            <Button text="copy" />
                            <Button text="move" />
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }
}

class TextView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: props.text
        }
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }

    render() {
        return (
            <div>{this.state.text}</div>
        );
    }
}

class FileList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            items: props.items,
            root: props.root
        }
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }

    render() {
        if (this.state.items) {
            return (
                <div>
                    <ul>
                        {
                            this.state.items.map((item, index) => {
                                if (item.isDir) {
                                    return <li key={index}><b>{item.text}</b></li>
                                } else {
                                    return <li key={index}>{item.text}</li>
                                }

                            })
                        }
                    </ul>
                </div>
            );
        } else {
            return (<div></div>)
        }
    }
}

class Button extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: props.text
        }
    }

    handleClick(e) {
        e.preventDefault();
        console.log('The link was clicked.');
    }

    render() {
        return (
            <button onClick={this.handleClick}>{this.state.text}</button>
        );
    }
}

ReactDOM.render(
    <MainFrame />,
    document.getElementById('app')
)