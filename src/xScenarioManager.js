export class xTag {
    constructor(ScenarioName, Step, others) {
        if (others) {
            Object.assign(this, others)
        }
        this.scenarioStack = []
        this.scenarioStack.push({ ScenarioName: ScenarioName, Step: Step })

    }
    get ScenarioName() { return this.getLastScenario().ScenarioName }
    set ScenarioName(name) { this.getLastScenario().ScenarioName = name }

    get Step() { return this.getLastScenario().Step }
    set Step(step) { this.getLastScenario().Step = step }

    get params() { return this.getLastScenario().params }

    getLastScenario() {
        if (this.scenarioStack.length > 0) {
            var a = this.scenarioStack[this.scenarioStack.length - 1]
            return a
        } else {
            return ""
        }
    }
    pushScenario(NewScenarioName, NewStep, params) {
        this.scenarioStack.push({ ScenarioName: NewScenarioName, Step: NewStep, params })
    }
    popScenario() {
        return this.scenarioStack.pop()
    }
}

export function CallScenario(NewScenarioName, NewStep, xtag, params) {
    console.debug("CallScenario " + xtag.ScenarioName + " step " + xtag.Step)
    xtag.pushScenario(NewScenarioName, NewStep, params)
    ScenarioNext(xtag)
}

export function ScenarioNext(xtag) {
    setTimeout(function () {
        console.debug("ScenarioNext " + xtag.ScenarioName + " step " + xtag.Step)
        // ScenarioHandler(xtag)
        if (handlers[xtag.ScenarioName]) {
            handlers[xtag.ScenarioName](xtag)
        } else {
            console.log("ScenarioNext cannot find " + xtag.ScenarioName + " step " + xtag.Step)
        }

    }, 1);
}

export var handlers = {}