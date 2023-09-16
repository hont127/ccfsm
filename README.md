# ccfsm
从unity移植到cocos creator的fsm状态机

# demo:
```typescript
export class FsmDemo extends Component {

    private static readonly kState0: number = 0;
    private static readonly kState1: number = 1;
    private static readonly kState2: number = 2;

    private fsm:Fsm;

    start() {
        this.fsm = new Fsm();

        this.fsm.tryGetStateInfo(FsmDemo.kState0);

        this.fsm.tryGetStateInfo(FsmDemo.kState1)
            .AddOnEnter((lastState, arg)=>{
                console.log("state1 enter");
            })
            .AddOnUpdate(()=>{
                console.log("state1 update");
            })
            .AddOnExit((newState)=>{
                console.log("state1 exit");
            });
        
        this.fsm.tryGetStateInfo(FsmDemo.kState2)
            .AddOnEnter((lastState, arg)=>{
                console.log("state2 enter");
            })
            .AddOnExit((newState)=>{
                console.log("state2 exit");
            });
        
        this.fsm.tryGetTransitionInfo(FsmDemo.kState0, FsmDemo.kState1)
            .SetTransition((arg)=> true);

        this.fsm.tryGetTransitionInfo(FsmDemo.kState1, FsmDemo.kState2)
            .SetTransition((arg)=> true);

        this.fsm.start(FsmDemo.kState0);

        this.scheduleOnce(()=>{
            this.fsm.transition(FsmDemo.kState1);
        }, 0.5); 

        this.scheduleOnce(()=>{
            this.fsm.transition(FsmDemo.kState2);
        }, 1); 
    }

    update(deltaTime: number) {
        this.fsm.tick(true);
    }
}


# old versions:
c# fsm: https://github.com/hont127/FSM
c# fast fsm: https://github.com/hont127/FastFSM
```
