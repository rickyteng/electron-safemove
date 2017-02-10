const fs = require('fs-extra')
const path = require('path')
const drivelist = require('drivelist');

import { FileItem } from "./xFileItem"

export class FileList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            itemSelected: props.itemSelected,
            drives: null
        }
        this.handleClick = this.handleClick.bind(this)
    }

    componentDidMount() {
        // // http://stackoverflow.com/questions/27192621/reactjs-async-rendering-of-components
        // if (this.props.root == '*') {
        //     drivelist.list((error, drives) => {
        //         if (error) {
        //             throw error;
        //         }
        //         var tree = []
        //         drives.forEach((drive) => {
        //             var isDir = true
        //             var file = drive.mountpoints[0].path
        //             tree.push(<FileItem side={this.props.side} root={this.props.root} text={file} key={file} isDir={isDir} eventFire={this.handleClick} />)
        //         });
        //         this.setState({drives: tree})
        //     }).bind(this);
        // }
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
            case "getDrive":
                drivelist.list((error, drives) => {
                    if (error) {
                        throw error;
                    }
                    var tree = []
                    drives.forEach((drive) => {
                        drive.mountpoints.forEach(mp => {
                            var isDir = true
                            var file = mp.path
                            tree.push(file)
                        })
                    });
                    this.setState({ drives: tree })
                }) //.bind(this);
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
        if (this.props.root == '') {
            if (this.state.drives) {
                this.state.drives.forEach((drive) => {
                    var isDir = true
                    var file = drive
                    if (s === file) {
                        tree.push(<FileItem selected={true} side={this.props.side} root={this.props.root} text={file} key={file} isDir={isDir} eventFire={this.handleClick} />)
                    } else {
                        tree.push(<FileItem side={this.props.side} root={this.props.root} text={file} key={file} isDir={isDir} eventFire={this.handleClick} />)
                    }
                });

            } else {
                this.handleClick("getDrive")
            }

        } else {
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
        }

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