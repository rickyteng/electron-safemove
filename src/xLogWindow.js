import { LogLine } from "./xLogLine"
export class LogWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lines: props.lines
        }
        this.append = this.append.bind(this)
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    append(text) {
        //var timestamp = + new Date()
        var d = new Date();
        var n = d.getTime();
        if (this.state.lines.length>2000){
            this.state.lines = this.state.lines.slice(100)
        }
        this.setState({ lines: this.state.lines.concat([<LogLine level="INFO" timestamp={d.toJSON()} key={n} text={text} />]) })
    }

    render() {
        return (
            <div style={{ "maxHeight": "260px", overflow: "auto" }}>{this.state.lines}</div>
        );
    }
}