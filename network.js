export class Network {
  #layer;
  #output;

  /** @param {Network} parent*/
  constructor(parent = null) {
    if (parent === null) {
      this.#layer = new Array(7).fill(new Array(7).fill(0));
      this.#layer.forEach((vector) =>
        vector.forEach(() => Math.random() * 150),
      );

      this.#output = new Array(6).fill(0);
      this.#output.forEach(() => Math.random() * 150);
      return;
    }

    const { layer, output } = parent.getStructure();
    this.#layer = structuredClone(layer);
    this.#output = structuredClone(layer);
    this.#mutate();
  }

  decide(info) {
    const layerValue = [];
    this.#layer.forEach((vector) => {
      layerValue.push(
        this.#sigmoid(vector.reduce((sum, x, idx) => sum + x * info[idx])),
      );
    });

    const outputValue =
      this.#sigmoid(
        this.#output.reduce((sum, x, idx) => sum + x * layerValue[idx]),
      ) >= 0.5;
    console.log(outputValue);
    return outputValue;
  }

  /** @returns {{layer: [[Number]], output: [Number]}} */
  getStructure() {
    return { layer: this.#layer, output: this.#output };
  }

  #mutate() {
    this.#layer.forEach(this.#mutateParameter);
    this.#output.forEach(this.#mutateParameter);
  }

  #mutateParameter(x) {
    if (Math.random() < 0.1) return Math.random() * 150;
    return x + Math.random() * 10;
  }

  #sigmoid = (x) => 1 / (1 + Math.exp(-x));
}
