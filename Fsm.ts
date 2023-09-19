import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

type StateEnter = (lastState: number, arg: any) => void;
type StateUpdate = () => void;
type StateExit = (newState: number) => void;
type StateTransition = (arg: any) => boolean;

@ccclass
export class Fsm {

    nestedLock: boolean;
    nestedTransitionQueue: { transition: TransitionInfo, transitionArg: any }[];
    transitionQuest: { transition: TransitionInfo, transitionArg: any } | null;
    stateList: StateInfo[];
    currentState: StateInfo;


    constructor() {
        this.stateList = [];
        this.nestedTransitionQueue = [];
        this.nestedLock = false;
    }

    public getCurrentStateIdentifier(): number {
        return this.currentState.identifier;
    }

    public start(identifier: number): boolean {
        const state = this.stateList.find(s => s.identifier === identifier);
        if (!state) return false;

        this.currentState = state;
        state.onEnter?.(-1, null);
        return true;
    }

	public hasState(identifier: number): boolean {
        return this.stateList.some(s => s.identifier === identifier);
    }
	
	public configStateInfo(stateIdentifier:number): StateInfo|null {
		if (!this.hasState(stateIdentifier))
			this.addState(stateIdentifier);

		return this.stateList.find(s => s.identifier == stateIdentifier);
    }
	
	// public TransitionInfo configTransitionInfo(stateIdentifier:number, dstStateIdentifier:number) {
		// if (!this.hasState(stateIdentifier))
			// this.addState(stateIdentifier);

		// if (!this.hasState(dstStateIdentifier))
			// this.addState(dstStateIdentifier);

		// if (!this.hasTransition(stateIdentifier, dstStateIdentifier))
			// this.addTransition(stateIdentifier, dstStateIdentifier, null);

		// return this.getTransition(stateIdentifier, dstStateIdentifier);
    // }

    public transition(dstStateIdentifier: number, arg: any = null, immediateUpdate: boolean = true): void {
        const dstTransition = this.currentState.transitionList.find(t => t.dstState.identifier === dstStateIdentifier);

        this.transitionInternal({
            transition: dstTransition,
            transitionArg: arg
        }, immediateUpdate);
    }

    public tick(isFrameStep: boolean): void {
        if (this.nestedLock)
            throw new Error("Does not support nested update fsm!");

        this.nestedLock = true;

        if (this.transitionQuest) {
            const { transition, transitionArg } = this.transitionQuest;

            if (transition.condition(transitionArg)) {
                transition.selfState.onExit?.(transition.dstState.identifier);
                transition.dstState.onEnter?.(transition.selfState.identifier, transitionArg);

                this.currentState = transition.dstState;
            }

            this.transitionQuest = null;
        }
        else {
            const state = this.currentState;

            for (let i = 0; i < state.transitionList.length; i++) {
                const transition = state.transitionList[i];

                if (transition.isAutoDetect) {
                    this.transitionInternal({
                        transition: transition,
                        transitionArg: null
                    }, false);
                }
            }
        }

        if (isFrameStep) {
            this.currentState.onUpdate?.();
        }

        this.nestedLock = false;

        while (this.nestedTransitionQueue.length > 0) {
            const operate = this.nestedTransitionQueue.shift();
            if (operate) {
                this.transitionQuest = operate;
                this.tick(false);
            }
        }
    }

    public hasTransition(identifier: number, dstIdentifier: number): boolean {
        const state = this.stateList.find(s => s.identifier === identifier);
        if (state) {
            return state.transitionList.some(t => t.dstState.identifier === dstIdentifier);
        }

        return false;
    }

    private addState(identifier: number, onEnter?: StateEnter, onUpdate?: StateUpdate, onExit?: StateExit): void {
        this.stateList.push({
            identifier: identifier,
            transitionList: [],
            onEnter: onEnter,
            onUpdate: onUpdate,
            onExit: onExit
        });
    }

    private addTransition(stateIdentifier: number, dstStateIdentifier: number, condition: StateTransition): void {
        const state = this.stateList.find(s => s.identifier === stateIdentifier);
        const dstState = this.stateList.find(s => s.identifier === dstStateIdentifier);

        if (state && dstState) {
            state.transitionList.push({
                condition: condition,
                selfState: state,
                dstState: dstState,
                isAutoDetect: false
            });
        }
    }

    private getTransition(stateIdentifier: number, dstStateIdentifier: number): TransitionInfo | null {
        const state = this.stateList.find(s => s.identifier === stateIdentifier);
        if (!state) return null;
        return state.transitionList.find(t => t.dstState.identifier === dstStateIdentifier) || null;
    }

    private transitionInternal(operate: { transition: TransitionInfo, transitionArg: any }, immediateUpdate: boolean): void {
        if (this.nestedLock) {
            this.nestedTransitionQueue.push(operate);
        } else {
            this.transitionQuest = operate;
        }

        if (immediateUpdate) {
            this.tick(false);
        }
    }
}

export class StateInfo {
    identifier: number;
    transitionList: TransitionInfo[];
    onEnter?: StateEnter;
    onUpdate?: StateUpdate;
    onExit?: StateExit;
}

export class TransitionInfo {
    selfState: StateInfo;
    dstState: StateInfo;
    condition: StateTransition;
    isAutoDetect: boolean;
}
