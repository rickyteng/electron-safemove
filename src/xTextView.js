export class TextView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: props.text
        }
    }

    componentDidMount() {
        // console.log("mount:" + this.props.text)
    }

    componentWillUnmount() {

    }

    render() {
        return (
            <div>{this.props.text}</div>
        );
    }
}