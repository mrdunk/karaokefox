class Container<Tkey, Tvalue> {
  private _container;
  private _getProperties: ((node) => number)[];

  constructor(...getProperties: ((node) => number)[]) {
    this._container = [];
    this._getProperties = getProperties;
  }

  get(key: Tkey): Tvalue {
    let subContainer = this._container;
    this._getProperties.forEach((getProperty) => {
      if(subContainer !== undefined) {
        let subKey: number = getProperty(key);
        subContainer = subContainer[subKey];
      }
    });
    return subContainer;
  }

  pop() : Tvalue {
    let address: number[] = this._popRecurse(this._container);

    let returnVal: Tvalue;
    let subContainer = this._container;
    address.forEach((subKey, index, array) => {
      if(index < array.length -1) {
        subContainer = subContainer[subKey];
      } else {
        returnVal = subContainer.pop();
        while(subContainer.length > 0 &&
              subContainer[subContainer.length -1] === undefined) {
          subContainer.pop();
        }
      }
    });

    return returnVal;
  }

  private _popRecurse(recurseContainer?: []): number[] {
    let returnVal: number[] = [];
    recurseContainer.forEach((node, index, array) => {
      if(returnVal.length === 0) {
        if(Array.isArray(array[index])) {
          if((<[]>(array[index])).length > 0) {
            returnVal = [index].concat(this._popRecurse(array[index]));
          }
        } else {
          returnVal = [index];
        }
      }
    });
    return returnVal;
  }

  put(key: Tkey, value: Tvalue): void {
    let subContainer = this._container;
    this._getProperties.forEach((getProperty, index, array) => {
      let subKey: number = getProperty(key);
      console.assert(subKey !== undefined, 
                     ("Problem running " + getProperty.name + " on " + key));
      if(index < array.length -1) {
        while(subContainer.length -1 < subKey) {
          subContainer.push([]);
        }
        subContainer = subContainer[subKey];
      } else {
        subContainer[subKey] = value;
      }
    });
  }

  del(key: Tkey): Tvalue {
    let returnVal: Tvalue;
    
    let subContainer = this._container;
    this._getProperties.forEach((getProperty, index, array) => {
      let subKey: number = getProperty(key);
      console.assert(subKey !== undefined);
      if(index < array.length -1) {
        let subKey: number = getProperty(key);
        subContainer = subContainer[subKey];
      } else {
        returnVal = subContainer[subKey];
        delete subContainer[subKey];
        while(subContainer.length > 0 &&
              subContainer[subContainer.length -1] === undefined) {
          subContainer.pop();
        }
      }
    });

    return returnVal;
  }

  length(recurseContainer?: []): number {
    let total = 0;
    if(recurseContainer === undefined) {
      recurseContainer = this._container;
    }

    recurseContainer.forEach((node) => {
      if(Array.isArray(node)) {
        total += this.length(node);
      } else {
        total++;
      }
    });

    return total;
  }
}

class PriorityQueue<T> {
  private _container: Container<T, T>[];
  private _hashTable: Container<T, number>;
  private _getProperties: ((node) => number)[];

  constructor(...getProperties: ((node) => number)[]) {
    this._getProperties = getProperties;
    this._container = [];
    this._hashTable = new Container<T, number>(...this._getProperties);;
  }

  /* Pop item from highest priority sub-queue. */
  pop(): T {
    let item: T;

    this._container.forEach((n, index, array) => {
      let reverseIndex = this._container.length - index -1;
      
      if(item === undefined && array[reverseIndex].length()) {
        item = array[reverseIndex].pop()
        console.assert(item !== undefined);
      }
    });
    if(item !== undefined) {
      console.assert(this._hashTable.get(item) !== undefined);
      this._hashTable.del(item);
    }
    return item;
  }

  /* Pop item from lowest priority sub-queue. */
  popLow(): T {
    let item: T;

    this._container.forEach((n, index, array) => {
      if(item === undefined && array[index].length()) {
        item = array[index].pop()
        console.assert(item !== undefined);
      }
    });
    if(item !== undefined) {
      console.assert(this._hashTable.get(item) !== undefined);
      this._hashTable.del(item);
    }
    return item;
  }

  /* Add item at specified priority. */
  push(item: T, priority: number): void {
    console.assert(item !== undefined);
    console.assert(priority === Math.round(priority),
                   "Priority must be an intiger.");

    while(this._container.length < priority + 1) {
      // Add new priority sub-container.
      let container = new Container<T, T>(...this._getProperties);
      this._container.push(container);
    }
    let existing = this._hashTable.get(item);
    if(existing !== undefined && existing !== priority) {
      // Remove existing element.
      this._container[existing].del(item);
    }
    this._container[priority].put(item, item);
    this._hashTable.put(item, priority);
  }

  /* Number of elements in all sub-queues. */
  length(): number {
    let l = 0;
    this._container.forEach((n) => {
      l += n.length();
    });
    console.assert(l === this._hashTable.length());
    return l;
  }
}

class TestContainer {
  private _container: Container<{}, number>;

  constructor() {
    let tests = [this.test_put, this.test_get, this.test_del, this.test_pop];
    tests.forEach((test) => {
      this._init();
      test.bind(this)();
    }, this);
  }

  private _init(): void {
    function getX(node: {"x", "y"}): number {
      return node.x;
    }
    function getY(node: {"x", "y"}): number {
      return node.y;
    }
    this._container = new Container(getX, getY);
  }

  test_put() {
    console.log("test_put");

    console.assert(this._container.length() === 0);
    this._container.put({"x": 1, "y": 2}, 3);
    console.assert(this._container.length() === 1);
    this._container.put({"x": 1, "y": 2}, 3);
    this._container.put({"x": 1, "y": 2}, 4);
    console.assert(this._container.length() === 1);
    this._container.put({"x": 1, "y": 1}, 5);
    console.assert(this._container.length() === 2);
    this._container.put({"x": 1, "y": 3}, 6);
    console.assert(this._container.length() === 3);
    this._container.put({"x": 0, "y": 3}, 7);
    console.assert(this._container.length() === 4);
    this._container.put({"x": 2, "y": 3}, 8);
    console.assert(this._container.length() === 5);
    this._container.put({"x": 0, "y": 0}, 9);
    console.assert(this._container.length() === 6);
  }

  test_get() {
    console.log("test_get");

    console.assert(this._container.length() === 0);
    this._container.put({"x": 0, "y": 2}, 1);
    this._container.put({"x": 1, "y": 2}, 2);
    this._container.put({"x": 2, "y": 2}, 3);
    this._container.put({"x": 3, "y": 0}, 4);
    this._container.put({"x": 3, "y": 1}, 5);
    this._container.put({"x": 3, "y": 2}, 6);
    console.assert(this._container.length() === 6);

    console.assert(this._container.get({"x": 0, "y": 2}) === 1);
    console.assert(this._container.get({"x": 1, "y": 2}) === 2);
    console.assert(this._container.get({"x": 2, "y": 2}) === 3);
    console.assert(this._container.get({"x": 3, "y": 0}) === 4);
    console.assert(this._container.get({"x": 3, "y": 1}) === 5);
    console.assert(this._container.get({"x": 3, "y": 2}) === 6);
    console.assert(this._container.get({"x": 3, "y": 3}) === undefined);
  }

  test_del() {
    console.log("test_del");

    console.assert(this._container.length() === 0);
    this._container.put({"x": 0, "y": 2}, 1);
    this._container.put({"x": 1, "y": 2}, 2);
    this._container.put({"x": 2, "y": 2}, 3);
    this._container.put({"x": 3, "y": 0}, 4);
    this._container.put({"x": 3, "y": 1}, 5);
    this._container.put({"x": 3, "y": 2}, 6);
    console.assert(this._container.length() === 6);

    console.assert(this._container.del({"x": 0, "y": 2}) === 1);
    console.assert(this._container.length() === 5);
    console.assert(this._container.del({"x": 0, "y": 2}) === undefined);
    console.assert(this._container.length() === 5);
    console.assert(this._container.del({"x": 1, "y": 2}) === 2);
    console.assert(this._container.del({"x": 1, "y": 2}) === undefined);
    console.assert(this._container.del({"x": 2, "y": 2}) === 3);
    console.assert(this._container.del({"x": 3, "y": 0}) === 4);
    console.assert(this._container.del({"x": 3, "y": 1}) === 5);
    console.assert(this._container.del({"x": 3, "y": 2}) === 6);
    console.assert(this._container.del({"x": 3, "y": 3}) === undefined);
    console.assert(this._container.length() === 0);
  }

  test_pop() {
    console.log("test_pop");

    console.assert(this._container.length() === 0);
    this._container.put({"x": 0, "y": 2}, 1);
    this._container.put({"x": 1, "y": 2}, 2);
    this._container.put({"x": 2, "y": 2}, 3);
    this._container.put({"x": 3, "y": 0}, 4);
    this._container.put({"x": 3, "y": 1}, 5);
    this._container.put({"x": 3, "y": 2}, 6);
    console.assert(this._container.length() === 6);

    let val: number = this._container.pop();
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
  }
}

class TestPriorityQueue {
  private _pq: PriorityQueue<{}>;

  constructor() {
    let tests = [this.test_push, this.test_pop, this.test_popLow];
    tests.forEach((test) => {
      this._init();
      test.bind(this)();
    }, this);
  }

  private _init(): void {
    function getX(node: {"x", "y"}): number {
      return node.x;
    }
    function getY(node: {"x", "y"}): number {
      return node.y;
    }
    this._pq = new PriorityQueue(getX, getY);
  }

  test_push() {
    console.log("test_push");

    // Create same entry repeatedly.
    this._pq.push({"x": 1, "y": 1}, 1);
    this._pq.push({"x": 1, "y": 1}, 1);
    this._pq.push({"x": 1, "y": 1}, 1);
    console.assert(this._pq.length() === 1);

    // Move entry to different priority.
    this._pq.push({"x": 1, "y": 1}, 2);
    console.assert(this._pq.length() === 1);

    // Create some different entries.
    this._pq.push({"x": 0, "y": 1}, 1);
    this._pq.push({"x": 2, "y": 1}, 1);
    this._pq.push({"x": 1, "y": 0}, 1);
    console.assert(this._pq.length() === 4);

    // Recreate entries at different priority.
    this._pq.push({"x": 0, "y": 1}, 2);
    this._pq.push({"x": 2, "y": 1}, 2);
    this._pq.push({"x": 1, "y": 0}, 2);
    console.assert(this._pq.length() === 4);
  }

  test_pop() {
    console.log("test_pop");
    this._pq.push({"x": 1, "y": 0}, 1);
    this._pq.push({"x": 1, "y": 1}, 1);
    this._pq.push({"x": 3, "y": 0}, 2);
    this._pq.push({"x": 3, "y": 1}, 2);
    this._pq.push({"x": 0, "y": 0}, 1);
    this._pq.push({"x": 0, "y": 2}, 1);

    // Pop higher priority first.
    let item0 = this._pq.pop();
    let item1 = this._pq.pop();
    console.assert(item0["x"] === 3 && item1["x"] === 3);
    console.assert(item0["y"] === 0 || item1["y"] === 0);
    console.assert(item0["y"] === 1 || item1["y"] === 1);
    console.assert(this._pq.length() === 4);

    // Pop lower priority next.
    let item2 = this._pq.pop();
    let item3 = this._pq.pop();
    let item4 = this._pq.pop();
    let item5 = this._pq.pop();
    console.assert(item2["x"] < 3);
    console.assert(item3["x"] < 3);
    console.assert(item4["x"] < 3);
    console.assert(item5["x"] < 3);
    console.assert(this._pq.length() === 0);

    // None left to pop.
    let item6 = this._pq.pop();
    console.assert(item6 === undefined);
  }

  test_popLow() {
    console.log("test_popLow");
    this._pq.push({"x": 2, "y": 0}, 2);
    this._pq.push({"x": 2, "y": 1}, 2);
    this._pq.push({"x": 1, "y": 0}, 1);
    this._pq.push({"x": 1, "y": 1}, 1);
    this._pq.push({"x": 3, "y": 0}, 2);
    this._pq.push({"x": 3, "y": 2}, 2);

    let item0 = this._pq.popLow();
    let item1 = this._pq.popLow();
    console.assert(item0["x"] === 1 && item1["x"] === 1);
    console.assert(item0["y"] === 0 || item1["y"] === 0);
    console.assert(item0["y"] === 1 || item1["y"] === 1);
    console.assert(this._pq.length() === 4);

    let item2 = this._pq.popLow();
    let item3 = this._pq.popLow();
    let item4 = this._pq.popLow();
    let item5 = this._pq.popLow();
    console.assert(item2["x"] > 1);
    console.assert(item3["x"] > 1);
    console.assert(item4["x"] > 1);
    console.assert(item5["x"] > 1);
    console.assert(this._pq.length() === 0);

    // None left to pop.
    let item6 = this._pq.pop();
    console.assert(item6 === undefined);
  }
}
