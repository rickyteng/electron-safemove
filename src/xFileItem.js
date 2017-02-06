export class FileItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: false
        }
        this.handleDoubleClick = this.handleDoubleClick.bind(this)
        this.handleClick = this.handleClick.bind(this)
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
    render() {
        // console.log("render start " + this.props.id)
        if (this.props.isDir) {
            if (this.props.selected) {
                return (<li className="selected" onClick={this.handleClick} onDoubleClick={this.handleDoubleClick}><b>{this.props.text}</b></li>)
            } else {
                return (<li onClick={this.handleClick} onDoubleClick={this.handleDoubleClick}><b>{this.props.text}</b></li>)
            }

        } else {
            if (this.props.selected) {
                return (<li className="selected" onClick={this.handleClick} onDoubleClick={this.handleDoubleClick}>{this.props.text}</li>)
            } else {
                return (<li onClick={this.handleClick} onDoubleClick={this.handleDoubleClick}>{this.props.text}</li>)
            }
        }

    }
}