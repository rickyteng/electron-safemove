export class LogLine extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: props.text,
            timestamp: props.text,
            level: props.level
        }
        
    }

    componentDidMount() {
        
    }

    componentWillUnmount() {

    }

    render() {
        return (
            <div className="logline">{this.props.timestamp} [{this.props.level}] {this.props.text}</div>
        );
    }
}