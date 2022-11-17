// Based on: https://www.npmjs.com/package/js-QuadTreeWithCounter, isDivided smells a little bit.

type PointsComparator = <T extends Point>(point1: T, point2: T) => boolean;

interface QuadTreeWithCounterConfig {
  capacity?: number;
  removeEmptyNodes?: boolean;
  maximumDepth?: number | -1;
  arePointsEqual?: PointsComparator;
}

interface Shape {
  contains(point: Point): boolean;

  intersects(range: Box): boolean;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type DeepRequired<T> = T extends Function
  ? T
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
  ? {[P in keyof Required<T>]: DeepRequired<T[P]>}
  : NonNullable<Required<T>>;

type QuadTreeWithCounterConfigComplete = DeepRequired<
  QuadTreeWithCounterConfig
>;

type Tree =
  | number
  | {
      ne: number | Tree;
      nw: number | Tree;
      se: number | Tree;
      sw: number | Tree;
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserCustomData = any;

/**
 * Box class.
 * @class Box
 */

export class Box implements Shape {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly data: UserCustomData;

  /**
   * Box constructor;
   * @constructs Box
   * @param {number} x - X coordinate of the box.
   * @param {number} y - Y coordinate of the box.
   * @param {number} w - Width of the box.
   * @param {number} h - Height of the box.
   * @param {*} [data] - Data to store along the box.
   */
  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    data?: UserCustomData
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.data = data;
  }

  /**
   * Check if a point is contained in the box.
   * @param {Point|Object} point - The point to test if it is contained in the box.
   * @returns {boolean} - True if the point is contained in the box, otherwise false.
   */
  contains(point: Point): boolean {
    return (
      point.x >= this.x &&
      point.x < this.x + this.w &&
      point.y >= this.y &&
      point.y < this.y + this.h
    );
  }

  /**
   * Check if a box intersects with this box.
   * @param {Box|Object} range - The box to test the intersection with.
   * @returns {boolean} - True if it intersects, otherwise false.
   */
  intersects(range: Box): boolean {
    return !(
      range.x > this.x + this.w ||
      range.x + range.w < this.x ||
      range.y > this.y + this.h ||
      range.y + range.h < this.y
    );
  }
}

export class Point {
  readonly x: number;
  readonly y: number;
  readonly data: UserCustomData;

  /**
   * Point constructor.
   * @constructs Point
   * @param {number} x - X coordinate of the point.
   * @param {number} y - Y coordinate of the point.
   * @param {*} [data] - Data to store along the point.
   */
  constructor(x: number, y: number, data?: UserCustomData) {
    this.x = x;
    this.y = y;
    this.data = data;
  }
}

const defaultConfig: QuadTreeWithCounterConfigComplete = {
  capacity: 4,
  removeEmptyNodes: false,
  maximumDepth: -1,
  arePointsEqual: (point1: Point, point2: Point) =>
    point1.x === point2.x && point1.y === point2.y,
};

/**
 * QuadTreeWithCounter class.
 * @class QuadTreeWithCounter
 */
export class QuadTreeWithCounter {
  private readonly container: Box;
  private isDivided: boolean;
  private points: Point[];
  private readonly config: QuadTreeWithCounterConfigComplete;
  private ne!: QuadTreeWithCounter;
  private nw!: QuadTreeWithCounter;
  private se!: QuadTreeWithCounter;
  private sw!: QuadTreeWithCounter;
  private counter!: number;

  /**
   * Create a new QuadTreeWithCounter
   * @constructor
   * @param {Box} container - The box on which the QuadTreeWithCounter will operate.
   * @param {Object} [config] - The configuration of the QuadTreeWithCounter.
   * @param {number} [config.capacity] - The maximum amount of points per node.
   * @param {boolean} [config.removeEmptyNodes] - Specify if the QuadTreeWithCounter has to remove subnodes if they are empty.
   * @param {number} [config.maximumDepth] - Specify the maximum depth of the tree.
   * @param {function} [config.arePointsEqual] - Specify a custom method to compare point for removal.
   * @param {(Object[]|Point[])} [points] - An array of initial points to insert in the QuadTreeWithCounter.
   * @param {number} points[].x - X coordinate of the point.
   * @param {number} points[].y - Y coordinate of the point.
   */
  constructor(
    container: Box,
    config?: QuadTreeWithCounterConfig,
    points: Point[] = []
  ) {
    this.container = container;
    this.config = Object.assign({}, defaultConfig, config);

    this.isDivided = false;
    this.points = [];
    this.counter = 0;
    for (const point of points) {
      this.insertRecursive(point);
    }
  }

  /**
   * Return a tree representation of the QuadTreeWithCounter
   * @returns {{se: *, sw: *, ne: *, nw: *}|Number} - A tree representation of the QuadTreeWithCounter
   */
  getTree(): Tree {
    let tree;

    if (this.isDivided) {
      tree = {
        ne: this.ne.getTree(),
        nw: this.nw.getTree(),
        se: this.se.getTree(),
        sw: this.sw.getTree(),
      };
    } else {
      tree = this.getNodePointAmount();
    }

    return tree;
  }

  /**
   * Get all the points in the QuadTreeWithCounter
   * @returns {(Object[]|Point[])} - An array containing all the points.
   */
  getAllPoints(): Point[] {
    const pointsList: Point[] = [];
    this.getAllPointsRecursive(pointsList);
    return pointsList;
  }

  /**
   * Get all the points in the QuadTreeWithCounter
   * @param {(Object[]|Point[])} pointsList
   * @private
   */
  private getAllPointsRecursive(pointsList: Point[]): void {
    if (!this.isDivided) {
      Array.prototype.push.apply(pointsList, this.points.slice());
      return;
    }

    this.ne.getAllPointsRecursive(pointsList);
    this.nw.getAllPointsRecursive(pointsList);
    this.se.getAllPointsRecursive(pointsList);
    this.sw.getAllPointsRecursive(pointsList);
  }

  /**
   * Return the amount of points in this node.
   * @returns {number} - The amount of points in this node.
   * @private
   */
  private getNodePointAmount(): number {
    return this.points.length;
  }

  /**
   * Divide this node into 4 sub-nodes
   * @private
   */
  private divide(): void {
    const childMaximumDepth =
      this.config.maximumDepth === -1 ? -1 : this.config.maximumDepth - 1;
    const childConfig: QuadTreeWithCounterConfig = Object.assign(
      {},
      this.config,
      {
        maximumDepth: childMaximumDepth,
      }
    );

    this.isDivided = true;

    const x = this.container.x;
    const y = this.container.y;
    const w = this.container.w / 2;
    const h = this.container.h / 2;

    // Creation of the sub-nodes, and insertion of the current point
    this.ne = new QuadTreeWithCounter(new Box(x + w, y, w, h), childConfig);
    this.nw = new QuadTreeWithCounter(new Box(x, y, w, h), childConfig);
    this.se = new QuadTreeWithCounter(new Box(x + w, y + h, w, h), childConfig);
    this.sw = new QuadTreeWithCounter(new Box(x, y + h, w, h), childConfig);

    this.insert(this.points.slice());

    // We empty this node points
    this.points.length = 0;
    this.points = [];
  }

  /**
   * Insert a point in the QuadTreeWithCounter
   * @param {(Point|Object|Point[]|Object[])} pointOrArray - A point or an array of points to insert
   * @param {number} pointOrArray.x - X coordinate of the point
   * @param {number} pointOrArray.y - Y coordinate of the point
   * @returns {boolean} true if the point or all the point has been inserted, false otherwise
   */
  insert(pointOrArray: Point | Point[]): boolean {
    if (Array.isArray(pointOrArray)) {
      let returnValue = true;
      for (const point of pointOrArray) {
        returnValue = returnValue && this.insertRecursive(point);
      }
      return returnValue;
    } else {
      return this.insertRecursive(pointOrArray);
    }
  }

  /**
   * Insert a point in the QuadTreeWithCounter
   * @param {(Point|Object)} point - A point to insert
   * @param {number} point.x - X coordinate of the point
   * @param {number} point.y - Y coordinate of the point
   * @returns {boolean}
   * @private
   */
  private insertRecursive(point: Point): boolean {
    if (!this.container.contains(point)) {
      return false;
    }
    if (!this.isDivided) {
      if (
        this.getNodePointAmount() < this.config.capacity ||
        this.config.maximumDepth === 0
      ) {
        this.counter++;
        this.points.push(point);
        return true;
      } else if (
        this.config.maximumDepth === -1 ||
        this.config.maximumDepth > 0
      ) {
        this.counter -= this.config.capacity;
        this.divide();
      }
    }

    if (this.isDivided) {
      const ret =
        this.ne.insertRecursive(point) ||
        this.nw.insertRecursive(point) ||
        this.se.insertRecursive(point) ||
        this.sw.insertRecursive(point);
      if (ret) this.counter++;
      return ret;
    }
    return false;
  }

  /**
   * Query all the point within a range
   * @param {Shape} range - The range to test
   * @returns {(Point[]|Object[])} - The points within the range
   */
  query(range: Shape): Point[] {
    const pointsFound: Point[] = [];
    this.queryRecursive(range, pointsFound);
    return pointsFound;
  }

  /**
   * @param {Shape} range
   * @param {(Point[]|Object[])} pointsFound
   * @returns {(Point[]|Object[])}
   * @private
   */
  private queryRecursive(range: Shape, pointsFound: Point[]): void {
    if (range.intersects(this.container)) {
      if (this.isDivided) {
        this.ne.queryRecursive(range, pointsFound);
        this.nw.queryRecursive(range, pointsFound);
        this.se.queryRecursive(range, pointsFound);
        this.sw.queryRecursive(range, pointsFound);
      } else {
        const p = this.points.filter((point) => range.contains(point));

        Array.prototype.push.apply(pointsFound, p);
      }
    }
  }

  async recurseAsync(
    func: (q: QuadTreeWithCounter) => Promise<unknown>
  ): Promise<unknown> {
    if (this.isDivided) {
      await this.ne.recurseAsync(func);
      await this.nw.recurseAsync(func);
      await this.se.recurseAsync(func);
      await this.sw.recurseAsync(func);
    }
    return func(this);
  }

  recurse(func: (q: QuadTreeWithCounter) => unknown): unknown {
    if (this.isDivided) {
      this.ne.recurse(func);
      this.nw.recurse(func);
      this.se.recurse(func);
      this.sw.recurse(func);
    }
    return func(this);
  }

  print(): void {
    this.recurse((q) => console.log(q.counter, q.container, q.points));
  }

  findFullQuads(withPixels = true): Box[] {
    const found: Box[] = [];
    this.findFullQuadsRecursive(found, withPixels);
    return found;
  }

  private findFullQuadsRecursive(found: Box[], withPixels: boolean): void {
    const pixels = this.container.w * this.container.h;
    if (this.counter == pixels) {
      // the node is full
      found.push(this.container);
      return;
    }
    if (this.isDivided) {
      this.ne.findFullQuadsRecursive(found, withPixels);
      this.nw.findFullQuadsRecursive(found, withPixels);
      this.se.findFullQuadsRecursive(found, withPixels);
      this.sw.findFullQuadsRecursive(found, withPixels);
    } else {
      if (withPixels) {
        found.push(...this.points.map((p) => new Box(p.x, p.y, 1, 1)));
      }
    }
  }
}
