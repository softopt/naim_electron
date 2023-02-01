type state_handler = null | ((event : any) => State);

type State = null | {
    name : string;
    handler : state_handler;
};

function idle(event : number) : State {
    console.log('Idle:' + event);
    return { name : '', handler : null };
};

const StateIdle : State = {
    name : "Idle",
    handler : idle
}

let currentState : State;



