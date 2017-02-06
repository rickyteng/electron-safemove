export class Button extends React.Component {
    constructor(props) {
        super(props);
        // this.state = {
        //     text: props.text
        // }
        this.handleClick = this.handleClick.bind(this);  // if no this line, "this" in handleClick is null;
    }

    handleClick(e) {
        e.preventDefault();
        // console.log('Button: The link was clicked.');
        this.props.eventFire("Click", { srcObject: this })
    }

    render() {
        // console.log("render start " + this.props.id)
        return (
            <button onClick={this.handleClick}>{this.props.text}</button>
        );
    }
}