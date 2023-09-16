type StateEnter = (lastState: number, arg: any) => void;
type StateUpdate = () => void;
type StateExit = (newState: number) => void;
type StateTransition = (arg: any) => boolean;

export class Fsm {
  private mNestedLock: boolean;
  private mNestedTransitionQueue: TransitionOperate[];
  private mTransitionQuest: TransitionOperate | null;
  private mStates: StateInfo[];
  private mCurrentState: StateInfo | null;

  constructor() {
    this.mStates = [];
    this.mNestedTransitionQueue = [];
    this.mNestedLock = false;
    this.mTransitionQuest = null;
    this.mCurrentState = null;
  }

  get CurrentStateIdentifier(): number {
    return this.mCurrentState ? this.mCurrentState.identifier : -1;
  }

  public tryGetStateInfo(stateIdentifier:number): StateInfo {
    if (!this.hasState(stateIdentifier)) {
      this.addState(stateIdentifier);
    }
    return this.mStates.find((s) => s.identifier === stateIdentifier)!;
  }

  public tryGetTransitionInfo(stateIdentifier:number, dstStateIdentifier:number): TransitionInfo {
    if (!this.hasState(stateIdentifier)) {
      this.addState(stateIdentifier);
    }
    if (!this.hasState(dstStateIdentifier)) {
      this.addState(dstStateIdentifier);
    }
    if (!this.hasTransition(stateIdentifier, dstStateIdentifier)) {
      this.addTransition(stateIdentifier, dstStateIdentifier);
    }
    return this.getTransition(stateIdentifier, dstStateIdentifier)!;
  }

  public start(identifier: number): boolean {
    const state = this.mStates.find((s) => s.identifier === identifier);
    if (!state) return false;

    this.mCurrentState = state;

    state.onEnter.forEach((item) => {
        item(-1, null);
    });

    return true;
  }

  public transition(dstStateIdentifier: number, arg: any = null, immediateUpdate = true): void {
    const dstTransition = this.mCurrentState?.transitions.find(t => t.dstState.identifier === dstStateIdentifier);

    this.transitionInternal({
        transition: dstTransition,
        transitionArg: arg,
      },
      immediateUpdate
    );
  }

  public tick(isFrameStep: boolean): void {
    if (this.mNestedLock) {
      throw new Error("Does not support nested update fsm!");
    }

    this.mNestedLock = true;

    if (this.mTransitionQuest) {
      const { transition, transitionArg } = this.mTransitionQuest;

      if (transition!.condition!(transitionArg)) {

        transition!.selfState.onExit.forEach((item) => {
            item(transition!.dstState.identifier);
        });

        transition!.dstState.onEnter.forEach(item=>{
            item(transition!.selfState.identifier, transitionArg);
        });

        this.mCurrentState = transition!.dstState;
      }

      this.mTransitionQuest = null;
    } else {
      const state = this.mCurrentState;
      const transitionList = state?.transitions || [];

      for (const transition of transitionList) {
        if (transition.isAutoDetect) {
          this.transitionInternal({ transition, transitionArg: null }, false);
        }
      }
    }

    if (isFrameStep) {
      this.mCurrentState.onUpdate.forEach(item=>{
            item();
        });
    }

    this.mNestedLock = false;

    while (this.mNestedTransitionQueue.length > 0) {
      const operate = this.mNestedTransitionQueue.shift()!;
      this.mTransitionQuest = operate;
      this.tick(false);
    }
  }

  private hasState(identifier: number): boolean {
    return !!this.mStates.find((s) => s.identifier === identifier);
  }

  private hasTransition(identifier: number, dstIdentifier: number): boolean {
    const state = this.mStates.find((s) => s.identifier === identifier);
    if (state) {
      return !!state.transitions.find((t) => t.dstState.identifier === dstIdentifier);
    }
    return false;
  }

  private addState(identifier: number, onEnter?: StateEnter[], onUpdate?: StateUpdate[], onExit?: StateExit[]): void {
    let newStateInfo = new StateInfo();
    newStateInfo.identifier = identifier;
    if(onEnter)
      newStateInfo.onEnter = onEnter;
    if(onUpdate)
      newStateInfo.onUpdate = onUpdate;
    if(onExit)
      newStateInfo.onExit = onExit;

    this.mStates.push(newStateInfo);
  }

  private addTransition(stateIdentifier: number, dstStateIdentifier: number): void {
    const selfState = this.mStates.find((s) => s.identifier === stateIdentifier)!;
    const dstState = this.mStates.find((s) => s.identifier === dstStateIdentifier)!;

    let transitionInfo = new TransitionInfo();
    transitionInfo.selfState = selfState;
    transitionInfo.dstState = dstState;
    transitionInfo.condition = null;
    transitionInfo.isAutoDetect = false;

    selfState.transitions.push(transitionInfo);
  }

  private getTransition(stateIdentifier: number, dstStateIdentifier: number): TransitionInfo | null {
    const stateInfo = this.mStates.find((s) => s.identifier === stateIdentifier);
    if (!stateInfo) return null;
    return stateInfo.transitions.find((t) => t.dstState.identifier === dstStateIdentifier) || null;
  }

  private transitionInternal(operate: TransitionOperate, immediateUpdate: boolean): void {
    if (this.mNestedLock) {
      this.mNestedTransitionQueue.push(operate);
    } else {
      this.mTransitionQuest = operate;
    }

    if (immediateUpdate) {
      this.tick(false);
    }
  }
}

class StateInfo {
  identifier: number;
  transitions: TransitionInfo[];
  onEnter?: StateEnter[];
  onUpdate?: StateUpdate[];
  onExit?: StateExit[];

  public constructor() {
    this.identifier = 0;
    this.transitions = [];
    this.onEnter = [];
    this.onUpdate = [];
    this.onExit = [];
  }

  public SetOnEnter(onEnter: StateEnter): StateInfo {
    this.onEnter = [onEnter];
    return this;
  }

  public AddOnEnter(onEnter: StateEnter): StateInfo {
    if (!this.onEnter) {
      this.onEnter = [];
    }
    this.onEnter.push(onEnter);
    return this;
  }

  public SetOnUpdate(onUpdate: StateUpdate): StateInfo {
    this.onUpdate = [onUpdate];
    return this;
  }

  public AddOnUpdate(onUpdate: StateUpdate): StateInfo {
    if (!this.onUpdate) {
      this.onUpdate = [];
    }
    this.onUpdate.push(onUpdate);
    return this;
  }

  public SetOnExit(onExit: StateExit): StateInfo {
    this.onExit = [onExit];
    return this;
  }

  public AddOnExit(onExit: StateExit): StateInfo {
    if (!this.onExit) {
      this.onExit = [];
    }
    this.onExit.push(onExit);
    return this;
  }
}

class TransitionInfo {
    selfState: StateInfo;
    dstState: StateInfo;
    condition?: StateTransition | null;
    isAutoDetect: boolean;


    public constructor() {
      this.selfState = null;
      this.dstState = null;
      this.condition = null;
      this.isAutoDetect = false;
    }

    public SetTransition(condition: StateTransition, autoDetect: boolean = false): TransitionInfo {
        this.condition = condition;
        this.isAutoDetect = autoDetect;

        return this;
    }
}

class TransitionOperate {
  transition: TransitionInfo | null;
  transitionArg: any;
}