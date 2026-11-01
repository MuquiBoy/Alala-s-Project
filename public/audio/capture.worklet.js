// Project-owned capture stage. 64 ms packets at 16 kHz; no playback or persistence.
class AlalasCapture extends AudioWorkletProcessor {
  constructor() { super(); this.packet = new Float32Array(1024); this.cursor = 0; }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input) for (let i = 0; i < input.length; i++) {
      this.packet[this.cursor++] = input[i];
      if (this.cursor === this.packet.length) {
        let energy = 0;
        for (const sample of this.packet) energy += sample * sample;
        this.port.postMessage({ pcm: this.packet, rms: Math.sqrt(energy / this.packet.length) }, [this.packet.buffer]);
        this.packet = new Float32Array(1024); this.cursor = 0;
      }
    }
    for (const output of outputs) for (const channel of output) channel.fill(0);
    return true;
  }
}
registerProcessor('alalas-capture', AlalasCapture);
