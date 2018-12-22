var Container = /** @class */ (function () {
    function Container() {
        var getProperties = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            getProperties[_i] = arguments[_i];
        }
        this._container = [];
        this._getProperties = getProperties;
    }
    Container.prototype.get = function (key) {
        var subContainer = this._container;
        this._getProperties.forEach(function (getProperty) {
            if (subContainer !== undefined) {
                var subKey = getProperty(key);
                subContainer = subContainer[subKey];
            }
        });
        return subContainer;
    };
    Container.prototype.pop = function () {
        var address = this._popRecurse(this._container);
        var returnVal;
        var subContainer = this._container;
        address.forEach(function (subKey, index, array) {
            if (index < array.length - 1) {
                subContainer = subContainer[subKey];
            }
            else {
                returnVal = subContainer.pop();
                while (subContainer.length > 0 &&
                    subContainer[subContainer.length - 1] === undefined) {
                    subContainer.pop();
                }
            }
        });
        return returnVal;
    };
    Container.prototype._popRecurse = function (recurseContainer) {
        var _this = this;
        var returnVal = [];
        recurseContainer.forEach(function (node, index, array) {
            if (returnVal.length === 0) {
                if (Array.isArray(array[index])) {
                    if ((array[index]).length > 0) {
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
    Container.prototype.put = function (key, value) {
        var subContainer = this._container;
        this._getProperties.forEach(function (getProperty, index, array) {
            var subKey = getProperty(key);
            console.assert(subKey !== undefined, ("Problem running " + getProperty.name + " on " + key));
            if (index < array.length - 1) {
                while (subContainer.length - 1 < subKey) {
                    subContainer.push([]);
                }
                subContainer = subContainer[subKey];
            }
            else {
                subContainer[subKey] = value;
            }
        });
    };
    Container.prototype.del = function (key) {
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
                delete subContainer[subKey];
                while (subContainer.length > 0 &&
                    subContainer[subContainer.length - 1] === undefined) {
                    subContainer.pop();
                }
            }
        });
        return returnVal;
    };
    Container.prototype.length = function (recurseContainer) {
        var _this = this;
        var total = 0;
        if (recurseContainer === undefined) {
            recurseContainer = this._container;
        }
        recurseContainer.forEach(function (node) {
            if (Array.isArray(node)) {
                total += _this.length(node);
            }
            else {
                total++;
            }
        });
        return total;
    };
    return Container;
}());
var PriorityQueue = /** @class */ (function () {
    function PriorityQueue() {
        var getProperties = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            getProperties[_i] = arguments[_i];
        }
        this._getProperties = getProperties;
        this._container = [];
        this._hashTable = new (Container.bind.apply(Container, [void 0].concat(this._getProperties)))();
        ;
    }
    /* Pop item from highest priority sub-queue. */
    PriorityQueue.prototype.pop = function () {
        var _this = this;
        var item;
        this._container.forEach(function (n, index, array) {
            var reverseIndex = _this._container.length - index - 1;
            if (item === undefined && array[reverseIndex].length()) {
                item = array[reverseIndex].pop();
                console.assert(item !== undefined);
            }
        });
        if (item !== undefined) {
            console.assert(this._hashTable.get(item) !== undefined);
            this._hashTable.del(item);
        }
        return item;
    };
    /* Pop item from lowest priority sub-queue. */
    PriorityQueue.prototype.popLow = function () {
        var item;
        this._container.forEach(function (n, index, array) {
            if (item === undefined && array[index].length()) {
                item = array[index].pop();
                console.assert(item !== undefined);
            }
        });
        if (item !== undefined) {
            console.assert(this._hashTable.get(item) !== undefined);
            this._hashTable.del(item);
        }
        return item;
    };
    /* Add item at specified priority. */
    PriorityQueue.prototype.push = function (item, priority) {
        console.assert(item !== undefined);
        console.assert(priority === Math.round(priority), "Priority must be an intiger.");
        while (this._container.length < priority + 1) {
            // Add new priority sub-container.
            var container = new (Container.bind.apply(Container, [void 0].concat(this._getProperties)))();
            this._container.push(container);
        }
        var existing = this._hashTable.get(item);
        if (existing !== undefined && existing !== priority) {
            // Remove existing element.
            this._container[existing].del(item);
        }
        this._container[priority].put(item, item);
        this._hashTable.put(item, priority);
    };
    /* Number of elements in all sub-queues. */
    PriorityQueue.prototype.length = function () {
        var l = 0;
        this._container.forEach(function (n) {
            l += n.length();
        });
        console.assert(l === this._hashTable.length());
        return l;
    };
    return PriorityQueue;
}());
var TestContainer = /** @class */ (function () {
    function TestContainer() {
        var _this = this;
        var tests = [this.test_put, this.test_get, this.test_del, this.test_pop];
        tests.forEach(function (test) {
            _this._init();
            test.bind(_this)();
        }, this);
    }
    TestContainer.prototype._init = function () {
        function getX(node) {
            return node.x;
        }
        function getY(node) {
            return node.y;
        }
        this._container = new Container(getX, getY);
    };
    TestContainer.prototype.test_put = function () {
        console.log("test_put");
        console.assert(this._container.length() === 0);
        this._container.put({ "x": 1, "y": 2 }, 3);
        console.assert(this._container.length() === 1);
        this._container.put({ "x": 1, "y": 2 }, 3);
        this._container.put({ "x": 1, "y": 2 }, 4);
        console.assert(this._container.length() === 1);
        this._container.put({ "x": 1, "y": 1 }, 5);
        console.assert(this._container.length() === 2);
        this._container.put({ "x": 1, "y": 3 }, 6);
        console.assert(this._container.length() === 3);
        this._container.put({ "x": 0, "y": 3 }, 7);
        console.assert(this._container.length() === 4);
        this._container.put({ "x": 2, "y": 3 }, 8);
        console.assert(this._container.length() === 5);
        this._container.put({ "x": 0, "y": 0 }, 9);
        console.assert(this._container.length() === 6);
    };
    TestContainer.prototype.test_get = function () {
        console.log("test_get");
        console.assert(this._container.length() === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length() === 6);
        console.assert(this._container.get({ "x": 0, "y": 2 }) === 1);
        console.assert(this._container.get({ "x": 1, "y": 2 }) === 2);
        console.assert(this._container.get({ "x": 2, "y": 2 }) === 3);
        console.assert(this._container.get({ "x": 3, "y": 0 }) === 4);
        console.assert(this._container.get({ "x": 3, "y": 1 }) === 5);
        console.assert(this._container.get({ "x": 3, "y": 2 }) === 6);
        console.assert(this._container.get({ "x": 3, "y": 3 }) === undefined);
    };
    TestContainer.prototype.test_del = function () {
        console.log("test_del");
        console.assert(this._container.length() === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length() === 6);
        console.assert(this._container.del({ "x": 0, "y": 2 }) === 1);
        console.assert(this._container.length() === 5);
        console.assert(this._container.del({ "x": 0, "y": 2 }) === undefined);
        console.assert(this._container.length() === 5);
        console.assert(this._container.del({ "x": 1, "y": 2 }) === 2);
        console.assert(this._container.del({ "x": 1, "y": 2 }) === undefined);
        console.assert(this._container.del({ "x": 2, "y": 2 }) === 3);
        console.assert(this._container.del({ "x": 3, "y": 0 }) === 4);
        console.assert(this._container.del({ "x": 3, "y": 1 }) === 5);
        console.assert(this._container.del({ "x": 3, "y": 2 }) === 6);
        console.assert(this._container.del({ "x": 3, "y": 3 }) === undefined);
        console.assert(this._container.length() === 0);
    };
    TestContainer.prototype.test_pop = function () {
        console.log("test_pop");
        console.assert(this._container.length() === 0);
        this._container.put({ "x": 0, "y": 2 }, 1);
        this._container.put({ "x": 1, "y": 2 }, 2);
        this._container.put({ "x": 2, "y": 2 }, 3);
        this._container.put({ "x": 3, "y": 0 }, 4);
        this._container.put({ "x": 3, "y": 1 }, 5);
        this._container.put({ "x": 3, "y": 2 }, 6);
        console.assert(this._container.length() === 6);
        var val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length() === 5);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length() === 4);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length() === 3);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length() === 2);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length() === 1);
        val = this._container.pop();
        console.assert(val >= 1 && val <= 6);
        console.assert(this._container.length() === 0);
        val = this._container.pop();
        console.assert(val === undefined);
        console.assert(this._container.length() === 0);
    };
    return TestContainer;
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
        // Create same entry repeatedly.
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        this._pq.push({ "x": 1, "y": 1 }, 1);
        console.assert(this._pq.length() === 1);
        // Move entry to different priority.
        this._pq.push({ "x": 1, "y": 1 }, 2);
        console.assert(this._pq.length() === 1);
        // Create some different entries.
        this._pq.push({ "x": 0, "y": 1 }, 1);
        this._pq.push({ "x": 2, "y": 1 }, 1);
        this._pq.push({ "x": 1, "y": 0 }, 1);
        console.assert(this._pq.length() === 4);
        // Recreate entries at different priority.
        this._pq.push({ "x": 0, "y": 1 }, 2);
        this._pq.push({ "x": 2, "y": 1 }, 2);
        this._pq.push({ "x": 1, "y": 0 }, 2);
        console.assert(this._pq.length() === 4);
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
        console.assert(this._pq.length() === 4);
        // Pop lower priority next.
        var item2 = this._pq.pop();
        var item3 = this._pq.pop();
        var item4 = this._pq.pop();
        var item5 = this._pq.pop();
        console.assert(item2["x"] < 3);
        console.assert(item3["x"] < 3);
        console.assert(item4["x"] < 3);
        console.assert(item5["x"] < 3);
        console.assert(this._pq.length() === 0);
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
        console.assert(this._pq.length() === 4);
        var item2 = this._pq.popLow();
        var item3 = this._pq.popLow();
        var item4 = this._pq.popLow();
        var item5 = this._pq.popLow();
        console.assert(item2["x"] > 1);
        console.assert(item3["x"] > 1);
        console.assert(item4["x"] > 1);
        console.assert(item5["x"] > 1);
        console.assert(this._pq.length() === 0);
        // None left to pop.
        var item6 = this._pq.pop();
        console.assert(item6 === undefined);
    };
    return TestPriorityQueue;
}());
//# sourceMappingURL=priorityQueue.js.map