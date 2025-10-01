/**
 * Browser-compatible utilities for file processing
 */

/**
 * Convert ArrayBuffer to Uint8Array (browser-compatible Buffer alternative)
 */
export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * Convert Uint8Array to string
 */
export function uint8ArrayToString(uint8Array: Uint8Array, encoding: string = 'utf-8'): string {
  if (encoding === 'utf-8' || encoding === 'utf8') {
    return new TextDecoder('utf-8').decode(uint8Array);
  } else if (encoding === 'ascii') {
    let result = '';
    for (let i = 0; i < uint8Array.length; i++) {
      result += String.fromCharCode(uint8Array[i]);
    }
    return result;
  } else {
    // Fallback to UTF-8
    return new TextDecoder('utf-8').decode(uint8Array);
  }
}

/**
 * Convert string to Uint8Array
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Browser-compatible Buffer-like interface
 */
export class BrowserBuffer {
  private data: Uint8Array;

  constructor(input: ArrayBuffer | Uint8Array | string) {
    if (input instanceof ArrayBuffer) {
      this.data = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      this.data = input;
    } else if (typeof input === 'string') {
      this.data = stringToUint8Array(input);
    } else {
      throw new Error('Invalid input type for BrowserBuffer');
    }
  }

  static from(input: ArrayBuffer | Uint8Array | string): BrowserBuffer {
    return new BrowserBuffer(input);
  }

  get length(): number {
    return this.data.length;
  }

  toString(encoding: string = 'utf-8'): string {
    return uint8ArrayToString(this.data, encoding);
  }

  subarray(start?: number, end?: number): Uint8Array {
    return this.data.subarray(start, end);
  }

  slice(start?: number, end?: number): BrowserBuffer {
    return new BrowserBuffer(this.data.slice(start, end));
  }

  get [Symbol.toStringTag]() {
    return 'BrowserBuffer';
  }

  // Array-like access
  [index: number]: number;
}

// Add array-like behavior
Object.defineProperty(BrowserBuffer.prototype, Symbol.iterator, {
  value: function* () {
    for (let i = 0; i < this.data.length; i++) {
      yield this.data[i];
    }
  }
});

// Add indexed access
new Proxy(BrowserBuffer.prototype, {
  get(target, prop) {
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      const index = parseInt(prop, 10);
      return (target as any).data[index];
    }
    return (target as any)[prop];
  }
});