var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BigArray = /** @class */ (function (_super) {
    __extends(BigArray, _super);
    function BigArray() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.lengthPopulated = 0;
        return _this;
    }
    return BigArray;
}(Array));
var TrivialStack = /** @class */ (function () {
    function TrivialStack() {
        this.length = 0;
        this._container = [];
    }
    TrivialStack.prototype.pop = function () {
        var value = this._container.pop();
        this.length = this._container.length;
        return value;
    };
    TrivialStack.prototype.push = function (newValue) {
        this._container.push(newValue);
        this.length = this._container.length;
    };
    return TrivialStack;
}());
var TrivialQueue = /** @class */ (function () {
    function TrivialQueue() {
        this.length = 0;
        this._container = [];
    }
    TrivialQueue.prototype.pop = function () {
        var value = this._container.pop();
        this.length = this._container.length;
        return value;
    };
    TrivialQueue.prototype.push = function (newValue) {
        this._container.unshift(newValue);
        this.length = this._container.length;
    };
    return TrivialQueue;
}());
var MyStack = /** @class */ (function () {
    function MyStack(size) {
        size = size || 10;
        this.length = 0;
        this._container = new BigArray(size);
        this._size = size;
    }
    MyStack.prototype.pop = function () {
        if (this._container.lengthPopulated === 0) {
            return;
        }
        this._container.lengthPopulated--;
        this.length = this._container.lengthPopulated;
        var value = this._container[this._container.lengthPopulated];
        //delete this._container[this._container.lengthPopulated];
        this._container[this._container.lengthPopulated] = null;
        return value;
    };
    MyStack.prototype.push = function (newValue) {
        if (this._container.lengthPopulated === this._container.length) {
            this._container.length += this._size;
        }
        this._container[this._container.lengthPopulated] = newValue;
        this._container.lengthPopulated++;
        this.length = this._container.lengthPopulated;
    };
    return MyStack;
}());
var MyQueueNode = /** @class */ (function () {
    function MyQueueNode(value) {
        this.value = value;
    }
    return MyQueueNode;
}());
var MyQueue = /** @class */ (function () {
    function MyQueue(size) {
        size = size || 10;
        this.length = 0;
        //this._container = new BigArray(size);
        //this._size = size;
    }
    MyQueue.prototype.pop = function () {
        if (this._head === undefined) {
            return undefined;
        }
        var returnNode = this._head;
        this._head = this._head.next;
        this.length--;
        return returnNode.value;
    };
    MyQueue.prototype.push = function (newValue) {
        var node = new MyQueueNode(newValue);
        if (this._head === undefined) {
            this._head = this._tail = node;
            this.length = 1;
            return;
        }
        this._tail.next = node;
        this._tail = node;
        this.length++;
    };
    return MyQueue;
}());
var MyMap = /** @class */ (function () {
    function MyMap() {
        var getProperties = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            getProperties[_i] = arguments[_i];
        }
        this.length = 0;
        this._container = new BigArray(10);
        this._getProperties = getProperties;
    }
    MyMap.prototype.get = function (key) {
        var subContainer = this._container;
        this._getProperties.forEach(function (getProperty) {
            if (subContainer !== undefined) {
                var subKey = getProperty(key);
                subContainer = subContainer[subKey];
            }
        });
        return subContainer;
    };
    MyMap.prototype.pop = function () {
        var _this = this;
        var address = this._popRecurse(this._container);
        var returnVal;
        var subContainer = this._container;
        address.forEach(function (subKey, index, array) {
            if (index < array.length - 1) {
                subContainer = subContainer[subKey];
            }
            else {
                returnVal = subContainer[subContainer.lengthPopulated - 1];
                //delete subContainer[subContainer.lengthPopulated -1];
                subContainer[subContainer.lengthPopulated - 1] = null;
                if (returnVal !== undefined) {
                    subContainer.lengthPopulated--;
                    _this.length--;
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
    };
    MyMap.prototype._popRecurse = function (rContainer) {
        var _this = this;
        var returnVal = [];
        rContainer.forEach(function (node, index, array) {
            if (returnVal.length === 0) {
                if (Array.isArray(array[index])) {
                    if ((array[index]).lengthPopulated > 0) {
                        returnVal = [index].concat(_this._popRecurse(array[index]));
                    }
                }
                else {
                    returnVal = [index];
                }
            }
        });
        return returnVal;
    };
    MyMap.prototype.put = function (key, value) {
        var _this = this;
        var subContainer = this._container;
        this._getProperties.forEach(function (getProperty, index, array) {
            var subKey = getProperty(key);
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
                    _this.length++;
                }
            }
        });
    };
    MyMap.prototype.del = function (key) {
        var _this = this;
        var returnVal;
        var subContainer = this._container;
        this._getProperties.forEach(function (getProperty, index, array) {
            var subKey = getProperty(key);
            console.assert(subKey !== undefined);
            if (index < array.length - 1) {
                var subKey_1 = getProperty(key);
                subContainer = subContainer[subKey_1];
            }
            else {
                returnVal = subContainer[subKey];
                //delete subContainer[subKey];
                subContainer[subKey] = null;
                if (returnVal !== undefined) {
                    subContainer.lengthPopulated--;
                    _this.length--;
                }
            }
        });
        return returnVal;
    };
    return MyMap;
}());
var PriorityQueue = /** @class */ (function () {
    function PriorityQueue() {
        var getProperties = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            getProperties[_i] = arguments[_i];
        }
        this._getProperties = getProperties;
        this._container = [];
        this.length = 0;
    }
    /* Pop item from highest priority sub-queue. */
    PriorityQueue.prototype.pop = function () {
        var _this = this;
        var item;
        this._container.forEach(function (n, index, array) {
            var reverseIndex = _this._container.length - index - 1;
            if (item === undefined && array[reverseIndex].length) {
                item = array[reverseIndex].pop();
                console.assert(item !== undefined);
                _this.length--;
            }
        });
        return item;
    };
    /* Pop item from lowest priority sub-queue. */
    PriorityQueue.prototype.popLow = function () {
        var _this = this;
        var item;
        this._container.forEach(function (n, index, array) {
            if (item === undefined && array[index].length) {
                item = array[index].pop();
                console.assert(item !== undefined);
                _this.length--;
            }
        });
        return item;
    };
    /* Add item at specified priority. */
    PriorityQueue.prototype.push = function (item, priority) {
        console.assert(item !== undefined);
        console.assert(priority === Math.round(priority), "Priority must be an intiger.");
        while (this._container.length < priority + 1) {
            // Add new priority sub-container.
            var container = new MyStack();
            this._container.push(container);
        }
        this._container[priority].push(item);
        this.length++;
    };
    return PriorityQueue;
}());
var TestMyStack = /** @class */ (function () {
    function TestMyStack() {
        var _this = this;
        var tests = [this.test_push, this.test_pop];
        tests.forEach(function (test) {
            _this._init();
            test.bind(_this)();
        }, this);
    }
    TestMyStack.prototype._init = function () {
        this._container = new MyStack();
    };
    TestMyStack.prototype.test_push = function () {
        console.log("test_push");
        console.assert(this._container.length === 0);
        this._container.push(1);
        console.assert(this._container.length === 1);
        this._container.push(2);
        console.assert(this._container.length === 2);
        this._container.push(3);
        console.assert(this._container.length === 3);
    };
    TestMyStack.prototype.test_pop = function () {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.push(1);
        this._container.push(2);
        this._container.push(3);
        this._container.push(4);
        console.assert(this._container.length === 4);
        var val = this._container.pop();
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
    };
    return TestMyStack;
}());
var TestMyQueue = /** @class */ (function () {
    function TestMyQueue() {
        var _this = this;
        var tests = [this.test_push, this.test_pop];
        tests.forEach(function (test) {
            _this._init();
            test.bind(_this)();
        }, this);
    }
    TestMyQueue.prototype._init = function () {
        this._container = new MyQueue();
    };
    TestMyQueue.prototype.test_push = function () {
        console.log("test_push");
        console.assert(this._container.length === 0);
        this._container.push(1);
        console.assert(this._container.length === 1);
        this._container.push(2);
        console.assert(this._container.length === 2);
        this._container.push(3);
        console.assert(this._container.length === 3);
    };
    TestMyQueue.prototype.test_pop = function () {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.push(1);
        this._container.push(2);
        this._container.push(3);
        this._container.push(4);
        console.assert(this._container.length === 4);
        var val = this._container.pop();
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
    };
    return TestMyQueue;
}());
var TestMyMap = /** @class */ (function () {
    function TestMyMap() {
        var _this = this;
        var tests = [this.test_put, this.test_get, this.test_del, this.test_pop];
        tests.forEach(function (test) {
            _this._init();
            test.bind(_this)();
        }, this);
    }
    TestMyMap.prototype._init = function () {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._container = new MyMap(getX, getY);
    };
    TestMyMap.prototype.test_put = function () {
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
    };
    TestMyMap.prototype.test_get = function () {
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
    };
    TestMyMap.prototype.test_del = function () {
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
    };
    TestMyMap.prototype.test_pop = function () {
        console.log("test_pop");
        console.assert(this._container.length === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 4, "y": 1 }, 5);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 4, "y": 0 }, 4);
        this._container.put({ "x": 4, "y": 2 }, 6);
        console.assert(this._container.length === 6);
        var val = this._container.pop();
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
    };
    return TestMyMap;
}());
var TestPriorityQueue = /** @class */ (function () {
    function TestPriorityQueue() {
        var _this = this;
        var tests = [this.test_push, this.test_pop, this.test_popLow];
        tests.forEach(function (test) {
            _this._init();
            test.bind(_this)();
        }, this);
    }
    TestPriorityQueue.prototype._init = function () {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._pq = new PriorityQueue(getX, getY);
    };
    TestPriorityQueue.prototype.test_push = function () {
        console.log("test_push");
        console.assert(this._pq.length === 0);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        console.assert(this._pq.length === 1);
        this._pq.push({ "x": 0, "y": 1 }, 1);
        this._pq.push({ "x": 2, "y": 1 }, 1);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        console.assert(this._pq.length === 4);
    };
    TestPriorityQueue.prototype.test_pop = function () {
        console.log("test_pop");
        this._pq.push({ "x": 1, "y": 0 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 3, "y": 0 }, 2);
        this._pq.push({ "x": 3, "y": 1 }, 2);
        this._pq.push({ "x": 0, "y": 0 }, 1);
        this._pq.push({ "x": 0, "y": 2 }, 1);
        // Pop higher priority first.
        var item0 = this._pq.pop();
        var item1 = this._pq.pop();
        console.assert(item0["x"] === 3 && item1["x"] === 3);
        console.assert(item0["y"] === 0 || item1["y"] === 0);
        console.assert(item0["y"] === 1 || item1["y"] === 1);
        console.assert(this._pq.length === 4);
        // Pop lower priority next.
        var item2 = this._pq.pop();
        var item3 = this._pq.pop();
        var item4 = this._pq.pop();
        var item5 = this._pq.pop();
        console.assert(item2["x"] < 3);
        console.assert(item3["x"] < 3);
        console.assert(item4["x"] < 3);
        console.assert(item5["x"] < 3);
        console.assert(this._pq.length === 0);
        // None left to pop.
        var item6 = this._pq.pop();
        console.assert(item6 === undefined);
    };
    TestPriorityQueue.prototype.test_popLow = function () {
        console.log("test_popLow");
        this._pq.push({ "x": 2, "y": 0 }, 2);
        this._pq.push({ "x": 2, "y": 1 }, 2);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 3, "y": 0 }, 2);
        this._pq.push({ "x": 3, "y": 2 }, 2);
        var item0 = this._pq.popLow();
        var item1 = this._pq.popLow();
        console.assert(item0["x"] === 1 && item1["x"] === 1);
        console.assert(item0["y"] === 0 || item1["y"] === 0);
        console.assert(item0["y"] === 1 || item1["y"] === 1);
        console.assert(this._pq.length === 4);
        var item2 = this._pq.popLow();
        var item3 = this._pq.popLow();
        var item4 = this._pq.popLow();
        var item5 = this._pq.popLow();
        console.assert(item2["x"] > 1);
        console.assert(item3["x"] > 1);
        console.assert(item4["x"] > 1);
        console.assert(item5["x"] > 1);
        console.assert(this._pq.length === 0);
        // None left to pop.
        var item6 = this._pq.pop();
        console.assert(item6 === undefined);
    };
    return TestPriorityQueue;
}());
var ProfileContainers = /** @class */ (function () {
    function ProfileContainers() {
        var _this = this;
        var tests = [this.testTrivialStack, this.testTrivialQueue, this.testStack, this.testQueue];
        tests.forEach(function (test) {
            _this._init();
            test.bind(_this)();
        }, this);
    }
    ProfileContainers.prototype._init = function () {
    };
    ProfileContainers.prototype.manyPush = function (container) {
        console.assert(container.length === 0);
        for (var i = 0; i < 100000; i++) {
            container.push(i);
        }
        console.assert(container.length === 100000);
    };
    ProfileContainers.prototype.manyPushPop = function (container) {
        console.assert(container.length === 0);
        for (var i = 0; i < 100000; i++) {
            container.push(i);
        }
        console.assert(container.length === 100000);
        for (var i = 0; i < 100000 - 1; i++) {
            container.pop();
        }
        console.assert(container.length === 1);
        var val = container.pop();
        console.assert(container.length === 0);
        console.assert(val === 0 || val === 100000 - 1);
    };
    ProfileContainers.prototype.testTrivialStack = function () {
        console.log("testTrivialStack");
        var container = new TrivialStack();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new TrivialStack();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    };
    ProfileContainers.prototype.testTrivialQueue = function () {
        console.log("testTrivialQueue");
        var container = new TrivialQueue();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new TrivialQueue();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    };
    ProfileContainers.prototype.testStack = function () {
        console.log("testStack");
        var container = new MyStack(1000000);
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new MyStack(1000000);
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    };
    ProfileContainers.prototype.testQueue = function () {
        console.log("testQueue");
        var container = new MyQueue();
        console.time("manyPush");
        this.manyPush(container);
        console.timeEnd("manyPush");
        container = new MyQueue();
        console.time("manyPushPop");
        this.manyPushPop(container);
        console.timeEnd("manyPushPop");
    };
    return ProfileContainers;
}());
//# sourceMappingURL=priorityQueue.js.map