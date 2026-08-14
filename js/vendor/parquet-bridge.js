import { readParquet, writeParquet, default as initWasm } from 'parquet-wasm';
import { tableFromIPC, tableToIPC, tableFromJSON } from 'apache-arrow';

// Initialize the WebAssembly module
export async function init(wasmUrl = "https://unpkg.com/parquet-wasm@0.6.1/esm/parquet_wasm_bg.wasm") {
    await initWasm(wasmUrl);
}

// Convert Parquet Uint8Array -> JSON Array
export function parseParquetToJSON(buffer) {
    const ipc = readParquet(new Uint8Array(buffer));
    const table = tableFromIPC(ipc);
    return table.toArray().map(row => row.toJSON());
}

// Convert JSON Array -> Parquet Uint8Array
export function writeJSONToParquet(rows) {
    const table = tableFromJSON(rows);
    const ipc = tableToIPC(table, "file");
    return writeParquet(ipc);
}
