import * as G from "geotiff";
console.log(Object.keys(G));
console.log('fromArrayBuffer:', typeof G.fromArrayBuffer);
console.log('default.fromArrayBuffer:', G.default ? typeof G.default.fromArrayBuffer : 'n/a');
console.log('GeoTIFF.fromArrayBuffer:', G.GeoTIFF ? typeof G.GeoTIFF.fromArrayBuffer : 'n/a');
console.log('parse:', typeof G.parse);