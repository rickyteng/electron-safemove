const fs = require('fs-extra')
const path = require('path')

import { FileItem } from "./xFileItem"

export class FileList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            itemSelected: props.itemSelected
        }
        this.handleClick = this.handleClick.bind(this)
    }

    componentDidMount() {
    }

    componentWillUnmount() {

    }
    handleClick(eventName, tag) {
        // e.preventDefault();
        // console.log('FileList: The item was clicked.');
        // 
        switch (eventName) {
            case "Click":
                if (this.state.itemSelected) {
                    if (this.state.itemSelected.text == tag.srcObject.props.text) {
                        this.setState({ "itemSelected": null })
                        this.props.eventFire("Click", { srcObject: this, itemSelected: null })
                    } else {
                        this.setState({ "itemSelected": { root: tag.srcObject.props.root, text: tag.srcObject.props.text } })
                        this.props.eventFire("Click", { srcObject: this, itemSelected: tag.srcObject })
                    }
                } else {
                    this.setState({ "itemSelected": { root: tag.srcObject.props.root, text: tag.srcObject.props.text } })
                    this.props.eventFire("Click", { srcObject: this, itemSelected: tag.srcObject })
                }


                break
            case "DoubleClick":
                this.setState({ "itemSelected": null })
                this.props.eventFire("DoubleClick", { srcObject: this, itemSelected: tag.srcObject })
                break
        }

    }
    render() {
        // console.log("render start " + this.props.id)
        // console.log(this.props.leftSelected)

        var s = ""
        if (this.state.itemSelected) {
            s = this.state.itemSelected.text
        }

        var tree = []
        var files = fs.readdirSync(this.props.root)
        files.forEach(file => {
            try {
                var path_string = path.join(this.props.root, file)
                var isDir = fs.lstatSync(path_string).isDirectory()
                // tree.push({ text: file, id: Date.now(), isDir: isDir })
                try {
                    if (s === file) {
                        tree.push(<FileItem selected={true} side={this.props.side} root={this.props.root} text={file} key={file} isDir={isDir} eventFire={this.handleClick} />)
                    } else {
                        tree.push(<FileItem side={this.props.side} root={this.props.root} text={file} key={file} isDir={isDir} eventFire={this.handleClick} />)
                    }
                } catch (error) {
                    tree.push(<FileItem side={this.props.side} root={this.props.root} text={file} key={file} isDir={isDir} eventFire={this.handleClick} />)
                }


            } catch (error) {

            }

        })

        if (tree.length > 0) {
            return (
                <div style={{ "maxHeight": "460px", overflow: "auto" }}>
                    <ul>
                        {tree}
                    </ul>
                </div>
            );
        } else {
            return (<div></div>)
        }
    }
}