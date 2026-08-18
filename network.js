let mutationsRate = 1;
const mutationValue = document.getElementById("mutation-value");
const mutationMap = ["Lowest", "Moderate", "High", "Highest"];
const mutationValueMap = [0.842, 1, 2, 5];
document.getElementById("mutation").addEventListener("input", (event) => {
  mutationsRate = event.target.value;
  mutationValue.textContent = mutationMap[mutationsRate];
});

export class Network {
  #layer;
  #output;

  /** @param {Network} parent*/
  constructor(parent = null) {
    if (parent === null) {
      this.#layer = Array.from({ length: 6 }, () =>
        Array.from({ length: 8 }, () => 2 * Math.random() - 1),
      );

      this.#output = Array.from({ length: 7 }, () => 2 * Math.random() - 1);
      return;
    }

    const { layer, output } = parent.getStructure();
    this.#layer = structuredClone(layer);
    this.#output = structuredClone(output);
    this.#mutate();
  }

  decide(info) {
    const layerValue = [];
    this.#layer.forEach((vector) => {
      layerValue.push(
        this.#sigmoid(vector.reduce((sum, x, idx) => sum + x * info[idx])),
      );
    });

    layerValue.push(1);

    const outputValue = this.#sigmoid(
      this.#output.reduce((sum, x, idx) => sum + x * layerValue[idx]),
    );

    return outputValue >= 0.5;
  }

  /** @returns {{layer: [[Number]], output: [Number]}} */
  getStructure() {
    return { layer: this.#layer, output: this.#output };
  }

  #mutate() {
    this.#layer = this.#layer = this.#layer.map((row) =>
      row.map((param) => this.#mutateParameter(param)),
    );
    this.#output = this.#output.map((x) => this.#mutateParameter(x));
  }

  #mutateParameter(x) {
    if (Math.random() < 0.8 / mutationValueMap[mutationsRate]) return x;
    if (Math.random() < 0.05 * mutationValueMap[mutationsRate])
      return Math.random() * 2 - 1;
    return x + (Math.random() - 0.5) * 0.25 * mutationValueMap[mutationsRate];
  }

  #sigmoid = (x) => 1 / (1 + Math.exp(-x));
}
