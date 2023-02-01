

type person = {
    name : string;
    age : number;
};

type lazyBool = number | boolean;

let x : lazyBool;

x = 1;
x = false;

let boss : person;

boss = {
    name: 'fred',
    age: 42
};

boss.name = 'barry';
boss.age = 99;

console.log(boss);

