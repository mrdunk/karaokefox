class BigArray extends Array {
    constructor() {
        super(...arguments);
        this.lengthPopulated = 0;
    }
}
class TrivialStack {
    constructor() {
        this.length = 0;
        this._container = [];
    }
    pop() {
        let value = this._container.pop();
        this.length = this._container.length;
        return value;
    }
    push(newValue) {
        this._container.push(newValue);
        this.length = this._container.length;
    }
}
class TrivialQueue {
    constructor() {
        this.length = 0;
        this._container = [];
    }
    pop() {
        let value = this._container.pop();
        this.length = this._container.length;
        return value;
    }
    push(newValue) {
        this._container.unshift(newValue);
        this.length = this._container.length;
    }
}
class MyStack {
    constructor(size) {
        size = size || 10;
        this.length = 0;
        this._container = new BigArray(size);
        this._size = size;
    }
    pop() {
        if (this._container.lengthPopulated === 0) {
            return;
        }
        this._container.lengthPopulated--;
        this.length = this._container.lengthPopulated;
        let value = this._container[this._container.lengthPopulated];
        //delete this._container[this._container.lengthPopulated];
        this._container[this._container.lengthPopulated] = null;
        return value;
    }
    push(newValue) {
        if (this._container.lengthPopulated === this._container.length) {
            this._container.length += this._size;
        }
        this._container[this._container.lengthPopulated] = newValue;
        this._container.lengthPopulated++;
        this.length = this._container.lengthPopulated;
    }
}
class MyQueueNode {
    constructor(value) {
        this.value = value;
    }
}
class MyQueue {
    constructor(size) {
        size = size || 10;
        this.length = 0;
        //this._container = new BigArray(size);
        //this._size = size;
    }
    pop() {
        if (this._head === undefined) {
            return undefined;
        }
        let returnNode = this._head;
        this._head = this._head.next;
        this.length--;
        return returnNode.value;
    }
    push(newValue) {
        let node = new MyQueueNode(newValue);
        if (this._head === undefined) {
            this._head = this._tail = node;
            this.length = 1;
            return;
        }
        this._tail.next = node;
        this._tail = node;
        this.length++;
    }
}
class MyMap {
    constructor(...getProperties) {
        this.length = 0;
        this._container = new BigArray(10);
        this._getProperties = getProperties;
    }
    get(key) {
        let subContainer = this._container;
        this._getProperties.forEach((getProperty) => {
            if (subContainer !== undefined) {
                let subKey = getProperty(key);
                subContainer = subContainer[subKey];
            }
        });
        return subContainer;
    }
    pop() {
        let address = this._popRecurse(this._container);
        let returnVal;
        let subContainer = this._container;
        address.forEach((subKey, index, array) => {
            if (index < array.length - 1) {
                subContainer = subContainer[subKey];
            }
            else {
                returnVal = subContainer[subContainer.lengthPopulated - 1];
                //delete subContainer[subContainer.lengthPopulated - 1];
                subContainer[subContainer.lengthPopulated - 1] = null;
                if (returnVal !== undefined) {
                    subContainer.lengthPopulated--;
                    this.length--;
                }
                while (subContainer.lengthPopulated > 0 &&
                    subContainer[subContainer.lengthPopulated - 1] === undefined) {
                    // While this is expensive, it will only happen for cases when
                    // there are empty spaces to the "left" of the pop-ed value.
                    subContainer.lengthPopulated--;
                }
            }
        });
        return returnVal;
    }
    _popRecurse(rContainer) {
        let returnVal = [];
        rContainer.forEach((node, index, array) => {
            if (returnVal.length === 0) {
                if (Array.isArray(array[index])) {
                    if ((array[index]).lengthPopulated > 0) {
                        returnVal = [index].concat(this._popRecurse(array[index]));
                    }
                }
                else {
                    returnVal = [index];
                }
            }
        });
        return returnVal;
    }
    put(key, value) {
        let subContainer = this._container;
        this._getProperties.forEach((getProperty, index, array) => {
            let subKey = getProperty(key);
            console.assert(subKey !== undefined, ("Problem running " + getProperty.name + " on " + key));
            if (index < array.length - 1) {
                while (subContainer.lengthPopulated - 1 < subKey) {
                    //subContainer.push(new BigArray(10));
                    subContainer[subContainer.lengthPopulated] = new BigArray(10);
                    subContainer.lengthPopulated++;
                }
                subContainer = subContainer[subKey];
            }
            else {
                if (subContainer[subKey] === undefined) {
                    subContainer[subKey] = value;
                    subContainer.lengthPopulated = Math.max(subKey + 1, subContainer.lengthPopulated);
                    this.length++;
                }
            }
        });
    }
    del(key) {
        let returnVal;
        let subContainer = this._container;
        this._getProperties.forEach((getProperty, index, array) => {
            let subKey = getProperty(key);
            console.assert(subKey !== undefined);
            if (index < array.length - 1) {
                let subKey = getProperty(key);
                subContainer = subContainer[subKey];
            }
            else {
                returnVal = subContainer[subKey];
                //delete subContainer[subKey];
                subContainer[subKey] = null;
                if (returnVal !== undefined) {
                    subContainer.lengthPopulated--;
                    this.length--;
                }
            }
        });
        return returnVal;
    }
}
class PriorityQueue {
    constructor(...getProperties) {
        this._getProperties = getProperties;
        this._container = [];
        this.length = 0;
    }
    /* Pop item from highest priority sub-queue. */
    pop() {
        let item;
        this._container.forEach((n, index, array) => {
            let reverseIndex = this._container.length - index - 1;
            if (item === undefined && array[reverseIndex].length) {
                item = array[reverseIndex].pop();
                console.assert(item !== undefined);
                this.length--;
            }
        });
        return item;
    }
    /* Pop item from lowest priority sub-queue. */
    popLow() {
        let item;
        this._container.forEach((n, index, array) => {
            if (item === undefined && array[index].length) {
                item = array[index].pop();
                console.assert(item !== undefined);
                this.length--;
            }
        });
        return item;
    }
    /* Add item at specified priority. */
    push(item, priority) {
        console.assert(item !== undefined);
        console.assert(priority === Math.round(priority), "Priority must be an intiger.");
        while (this._container.length < priority + 1) {
            // Add new priority sub-container.
            let container = new MyStack();
            this._container.push(container);
        }
        this._container[priority].push(item);
        this.length++;
    }
}
class TestMyStack {
    constructor() {
        let tests = [this.test_push, this.test_pop];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        this._container = new MyStack();
    }
    test_push() {
        console.log("test_push");
        console.assert(this._container.length === 0);
        this._container.push(1);
        console.assert(this._container.length === 1);
        this._container.push(2);
        console.assert(this._container.length === 2);
        this._container.push(3);
        console.assert(this._container.length === 3);
    }
    test_pop() {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.push(1);
        this._container.push(2);
        this._container.push(3);
        this._container.push(4);
        console.assert(this._container.length === 4);
        let val = this._container.pop();
        console.assert(val === 4);
        console.assert(this._container.length === 3);
        val = this._container.pop();
        val = this._container.pop();
        val = this._container.pop();
        console.assert(val === 1);
        console.assert(this._container.length === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length === 0);
    }
}
class TestMyQueue {
    constructor() {
        let tests = [this.test_push, this.test_pop];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        this._container = new MyQueue();
    }
    test_push() {
        console.log("test_push");
        console.assert(this._container.length === 0);
        this._container.push(1);
        console.assert(this._container.length === 1);
        this._container.push(2);
        console.assert(this._container.length === 2);
        this._container.push(3);
        console.assert(this._container.length === 3);
    }
    test_pop() {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.push(1);
        this._container.push(2);
        this._container.push(3);
        this._container.push(4);
        console.assert(this._container.length === 4);
        let val = this._container.pop();
        console.assert(val === 1);
        console.assert(this._container.length === 3);
        val = this._container.pop();
        val = this._container.pop();
        val = this._container.pop();
        console.assert(val === 4);
        console.assert(this._container.length === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length === 0);
    }
}
class TestMyMap {
    constructor() {
        let tests = [this.test_put, this.test_get, this.test_del, this.test_pop];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._container = new MyMap(getX, getY);
    }
    test_put() {
        console.log("test_put");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 1, "y": 2 }, 3);
        console.assert(this._container.length === 1);
        this._container.put({ "x": 1, "y": 2 }, 3);
        this._container.put({ "x": 1, "y": 2 }, 4);
        console.assert(this._container.length === 1);
        this._container.put({ "x": 1, "y": 1 }, 5);
        console.assert(this._container.length === 2);
        this._container.put({ "x": 1, "y": 3 }, 6);
        console.assert(this._container.length === 3);
        this._container.put({ "x": 0, "y": 3 }, 7);
        console.assert(this._container.length === 4);
        this._container.put({ "x": 2, "y": 3 }, 8);
        console.assert(this._container.length === 5);
        this._container.put({ "x": 0, "y": 0 }, 9);
        console.assert(this._container.length === 6);
    }
    test_get() {
        console.log("test_get");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        console.assert(this._container.get({ "x": 0, "y": 2 }) === 1);
        console.assert(this._container.get({ "x": 1, "y": 2 }) === 2);
        console.assert(this._container.get({ "x": 2, "y": 2 }) === 3);
        console.assert(this._container.get({ "x": 3, "y": 0 }) === 4);
        console.assert(this._container.get({ "x": 3, "y": 1 }) === 5);
        console.assert(this._container.get({ "x": 3, "y": 2 }) === 6);
        console.assert(this._container.get({ "x": 3, "y": 3 }) === undefined);
    }
    test_del() {
        console.log("test_del");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        console.assert(this._container.del({ "x": 0, "y": 2 }) === 1);
        console.assert(this._container.length === 5);
        console.assert(this._container.del({ "x": 0, "y": 2 }) === undefined);
        console.assert(this._container.length === 5);
        console.assert(this._container.del({ "x": 1, "y": 2 }) === 2);
        console.assert(this._container.del({ "x": 1, "y": 2 }) === undefined);
        console.assert(this._container.del({ "x": 2, "y": 2 }) === 3);
        console.assert(this._container.del({ "x": 3, "y": 0 }) === 4);
        console.assert(this._container.del({ "x": 3, "y": 1 }) === 5);
        console.assert(this._container.del({ "x": 3, "y": 2 }) === 6);
        console.assert(this._container.del({ "x": 3, "y": 3 }) === undefined);
        console.assert(this._container.length === 0);
    }
    test_pop() {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 4, "y": 1 }, 5);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 4, "y": 0 }, 4);
        this._container.put({ "x": 4, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        let val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 5);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 4);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 3);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 2);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 1);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length === 0);
    }
}
class TestPriorityQueue {
    constructor() {
        let tests = [this.test_push, this.test_pop, this.test_popLow];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._pq = new PriorityQueue(getX, getY);
    }
    test_push() {
        console.log("test_push");
        console.assert(this._pq.length === 0);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        console.assert(this._pq.length === 1);
        this._pq.push({ "x": 0, "y": 1 }, 1);
        this._pq.push({ "x": 2, "y": 1 }, 1);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        console.assert(this._pq.length === 4);
    }
    test_pop() {
        console.log("test_pop");
        this._pq.push({ "x": 1, "y": 0 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 3, "y": 0 }, 2);
        this._pq.push({ "x": 3, "y": 1 }, 2);
        this._pq.push({ "x": 0, "y": 0 }, 1);
        this._pq.push({ "x": 0, "y": 2 }, 1);
        // Pop higher priority first.
        let item0 = this._pq.pop();
        let item1 = this._pq.pop();
        console.assert(item0["x"] === 3 && item1["x"] === 3);
        console.assert(item0["y"] === 0 || item1["y"] === 0);
        console.assert(item0["y"] === 1 || item1["y"] === 1);
        console.assert(this._pq.length === 4);
        // Pop lower priority next.
        let item2 = this._pq.pop();
        let item3 = this._pq.pop();
        let item4 = this._pq.pop();
        let item5 = this._pq.pop();
        console.assert(item2["x"] < 3);
        console.assert(item3["x"] < 3);
        console.assert(item4["x"] < 3);
        console.assert(item5["x"] < 3);
        console.assert(this._pq.length === 0);
        // None left to pop.
        let item6 = this._pq.pop();
        console.assert(item6 === undefined);
    }
    test_popLow() {
        console.log("test_popLow");
        this._pq.push({ "x": 2, "y": 0 }, 2);
        this._pq.push({ "x": 2, "y": 1 }, 2);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 3, "y": 0 }, 2);
        this._pq.push({ "x": 3, "y": 2 }, 2);
        let item0 = this._pq.popLow();
        let item1 = this._pq.popLow();
        console.assert(item0["x"] === 1 && item1["x"] === 1);
        console.assert(item0["y"] === 0 || item1["y"] === 0);
        console.assert(item0["y"] === 1 || item1["y"] === 1);
        console.assert(this._pq.length === 4);
        let item2 = this._pq.popLow();
        let item3 = this._pq.popLow();
        let item4 = this._pq.popLow();
        let item5 = this._pq.popLow();
        console.assert(item2["x"] > 1);
        console.assert(item3["x"] > 1);
        console.assert(item4["x"] > 1);
        console.assert(item5["x"] > 1);
        console.assert(this._pq.length === 0);
        // None left to pop.
        let item6 = this._pq.pop();
        console.assert(item6 === undefined);
    }
}
class ProfileContainers {
    constructor() {
        let tests = [this.testTrivialStack, this.testTrivialQueue, this.testStack, this.testQueue];
        tests.forEach((test) => {
            this._init();
            test.bind(this)();
        }, this);
    }
    _init() {
    }
    manyPush(container) {
        console.assert(container.length === 0);
        for (let i = 0; i < 100000; i++) {
            container.push(i);
        }
        console.assert(container.length === 100000);
    }
    manyPushPop(container) {
        console.assert(container.length === 0);
        for (let i = 0; i < 100000; i++) {
            container.push(i);
        }
        console.assert(container.length === 100000);
        for (let i = 0; i < 100000 - 1; i++) {
            container.pop();
        }
        console.assert(container.length === 1);
        let val = container.pop();
        console.assert(container.length === 0);
        console.assert(val === 0 || val === 100000 - 1);
    }
    testTrivialStack() {
        console.log("testTrivialStack");
        let container = new TrivialStack();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new TrivialStack();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
    testTrivialQueue() {
        console.log("testTrivialQueue");
        let container = new TrivialQueue();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new TrivialQueue();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
    testStack() {
        console.log("testStack");
        let container = new MyStack(1000000);
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new MyStack(1000000);
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
    testQueue() {
        console.log("testQueue");
        let container = new MyQueue();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new MyQueue();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    }
}

//# sourceMappingURL=priorityQueue.js.map
