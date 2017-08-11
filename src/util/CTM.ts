import * as THREE from 'three';

import {LZMA} from './LZMA';

const CompressionMethod = {
    RAW: 0x00574152,
    MG1: 0x0031474d,
    MG2: 0x0032474d
};

const Flags = {
    NORMALS: 0x00000001
};

export class CTMFile {
    header;
    body;

    constructor(stream) {
        this.load(stream);
    }

    load(stream) {
        this.header = new CTMFileHeader(stream);

        this.body = new CTMFileBody(this.header);

        this.getReader().read(stream, this.body);
    }

    getReader(): any {
        var reader;

        switch (this.header.compressionMethod) {
            case CompressionMethod.RAW:
                reader = new CTMReaderRAW();
                break;
            case CompressionMethod.MG1:
                reader = new CTMReaderMG1();
                break;
            case CompressionMethod.MG2:
                reader = new CTMReaderMG2();
                break;
        }

        return reader;
    }
}

class CTMFileHeader {
    fileFormat;
    compressionMethod;
    vertexCount;
    triangleCount;
    uvMapCount;
    attrMapCount;
    flags;
    comment;

    constructor(stream) {
        stream.readInt32(); //magic "OCTM"
        this.fileFormat = stream.readInt32();
        this.compressionMethod = stream.readInt32();
        this.vertexCount = stream.readInt32();
        this.triangleCount = stream.readInt32();
        this.uvMapCount = stream.readInt32();
        this.attrMapCount = stream.readInt32();
        this.flags = stream.readInt32();
        this.comment = stream.readString();
    }

    hasNormals(): any {
        return this.flags & Flags.NORMALS;
    }
}

class CTMFileBody {
    indices;
    vertices;
    normals;
    uvMaps;
    attrMaps;

    constructor(header) {
        var i = header.triangleCount * 3,
            v = header.vertexCount * 3,
            n = header.hasNormals() ? header.vertexCount * 3 : 0,
            u = header.vertexCount * 2,
            a = header.vertexCount * 4,
            j = 0;

        var data = new ArrayBuffer(
            (i + v + n + (u * header.uvMapCount) + (a * header.attrMapCount)) * 4);

        this.indices = new Uint32Array(data, 0, i);

        this.vertices = new Float32Array(data, i * 4, v);

        if (header.hasNormals()) {
            this.normals = new Float32Array(data, (i + v) * 4, n);
        }

        if (header.uvMapCount) {
            this.uvMaps = [];
            for (j = 0; j < header.uvMapCount; ++j) {
                this.uvMaps[j] = {
                    uv: new Float32Array(data,
                        (i + v + n + (j * u)) * 4, u)
                };
            }
        }

        if (header.attrMapCount) {
            this.attrMaps = [];
            for (j = 0; j < header.attrMapCount; ++j) {
                this.attrMaps[j] = {
                    attr: new Float32Array(data,
                        (i + v + n + (u * header.uvMapCount) + (j * a)) * 4, a)
                };
            }
        }
    }
}

class CTMFileMG2Header {
vertexPrecision;
normalPrecision;
lowerBoundx;lowerBoundy;lowerBoundz;
higherBoundx;higherBoundy;higherBoundz;
divx;divy;divz;
sizex;sizey;sizez;

    constructor(stream) {
        stream.readInt32(); //magic "MG2H"
        this.vertexPrecision = stream.readFloat32();
        this.normalPrecision = stream.readFloat32();
        this.lowerBoundx = stream.readFloat32();
        this.lowerBoundy = stream.readFloat32();
        this.lowerBoundz = stream.readFloat32();
        this.higherBoundx = stream.readFloat32();
        this.higherBoundy = stream.readFloat32();
        this.higherBoundz = stream.readFloat32();
        this.divx = stream.readInt32();
        this.divy = stream.readInt32();
        this.divz = stream.readInt32();

        this.sizex = (this.higherBoundx - this.lowerBoundx) / this.divx;
        this.sizey = (this.higherBoundy - this.lowerBoundy) / this.divy;
        this.sizez = (this.higherBoundz - this.lowerBoundz) / this.divz;
    }
}

class CTMReaderRAW {
    read(stream, body) {
        this.readIndices(stream, body.indices);
        this.readVertices(stream, body.vertices);

        if (body.normals) {
            this.readNormals(stream, body.normals);
        }
        if (body.uvMaps) {
            this.readUVMaps(stream, body.uvMaps);
        }
        if (body.attrMaps) {
            this.readAttrMaps(stream, body.attrMaps);
        }
    }

    readIndices(stream, indices) {
        stream.readInt32(); //magic "INDX"
        stream.readArrayInt32(indices);
    }

    readVertices(stream, vertices) {
        stream.readInt32(); //magic "VERT"
        stream.readArrayFloat32(vertices);
    }

    readNormals(stream, normals) {
        stream.readInt32(); //magic "NORM"
        stream.readArrayFloat32(normals);
    }

    readUVMaps(stream, uvMaps) {
        var i = 0;
        for (; i < uvMaps.length; ++i) {
            stream.readInt32(); //magic "TEXC"

            uvMaps[i].name = stream.readString();
            uvMaps[i].filename = stream.readString();
            stream.readArrayFloat32(uvMaps[i].uv);
        }
    }

    readAttrMaps(stream, attrMaps) {
        var i = 0;
        for (; i < attrMaps.length; ++i) {
            stream.readInt32(); //magic "ATTR"

            attrMaps[i].name = stream.readString();
            stream.readArrayFloat32(attrMaps[i].attr);
        }
    }

}

class CTMReaderMG1 {
    read(stream, body) {
        this.readIndices(stream, body.indices);
        this.readVertices(stream, body.vertices);

        if (body.normals) {
            this.readNormals(stream, body.normals);
        }
        if (body.uvMaps) {
            this.readUVMaps(stream, body.uvMaps);
        }
        if (body.attrMaps) {
            this.readAttrMaps(stream, body.attrMaps);
        }
    }

    readIndices(stream, indices) {
        stream.readInt32(); //magic "INDX"
        stream.readInt32(); //packed size

        var interleaved = new CTMInterleavedStream(indices, 3);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

        CTM.restoreIndices(indices, indices.length);
    }

    readVertices(stream, vertices) {
        stream.readInt32(); //magic "VERT"
        stream.readInt32(); //packed size

        var interleaved = new CTMInterleavedStream(vertices, 1);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
    }

    readNormals(stream, normals) {
        stream.readInt32(); //magic "NORM"
        stream.readInt32(); //packed size

        var interleaved = new CTMInterleavedStream(normals, 3);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
    }

    readUVMaps(stream, uvMaps) {
        var i = 0;
        for (; i < uvMaps.length; ++i) {
            stream.readInt32(); //magic "TEXC"

            uvMaps[i].name = stream.readString();
            uvMaps[i].filename = stream.readString();

            stream.readInt32(); //packed size

            var interleaved = new CTMInterleavedStream(uvMaps[i].uv, 2);
            LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
        }
    }

    readAttrMaps(stream, attrMaps) {
        var i = 0;
        for (; i < attrMaps.length; ++i) {
            stream.readInt32(); //magic "ATTR"

            attrMaps[i].name = stream.readString();

            stream.readInt32(); //packed size

            var interleaved = new CTMInterleavedStream(attrMaps[i].attr, 4);
            LZMA.decompress(stream, stream, interleaved, interleaved.data.length);
        }
    }
}

class CTMReaderMG2 {
    MG2Header;

    read(stream, body) {
        this.MG2Header = new CTMFileMG2Header(stream);

        this.readVertices(stream, body.vertices);
        this.readIndices(stream, body.indices);

        if (body.normals) {
            this.readNormals(stream, body);
        }
        if (body.uvMaps) {
            this.readUVMaps(stream, body.uvMaps);
        }
        if (body.attrMaps) {
            this.readAttrMaps(stream, body.attrMaps);
        }
    }

    readVertices(stream, vertices) {
        stream.readInt32(); //magic "VERT"
        stream.readInt32(); //packed size

        var interleaved = new CTMInterleavedStream(vertices, 3);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

        var gridIndices = this.readGridIndices(stream, vertices);

        CTM.restoreVertices(vertices, this.MG2Header, gridIndices, this.MG2Header.vertexPrecision);
    }

    readGridIndices(stream, indices) {
        stream.readInt32(); //magic "GIDX"
        stream.readInt32(); //packed size

        var gridIndices = new Uint32Array(indices.length / 3);

        var interleaved = new CTMInterleavedStream(gridIndices, 1);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

        CTM.restoreGridIndices(gridIndices, gridIndices.length);

        return gridIndices;
    }

    readIndices(stream, indices) {
        stream.readInt32(); //magic "INDX"
        stream.readInt32(); //packed size

        var interleaved = new CTMInterleavedStream(indices, 3);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

        CTM.restoreIndices(indices, indices.length);
    }

    readNormals(stream, body) {
        stream.readInt32(); //magic "NORM"
        stream.readInt32(); //packed size

        var interleaved = new CTMInterleavedStream(body.normals, 3);
        LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

        var smooth = CTM.calcSmoothNormals(body.indices, body.vertices);

        CTM.restoreNormals(body.normals, smooth, this.MG2Header.normalPrecision);
    }

    readUVMaps(stream, uvMaps) {
        var i = 0;
        for (; i < uvMaps.length; ++i) {
            stream.readInt32(); //magic "TEXC"

            uvMaps[i].name = stream.readString();
            uvMaps[i].filename = stream.readString();

            var precision = stream.readFloat32();

            stream.readInt32(); //packed size

            var interleaved = new CTMInterleavedStream(uvMaps[i].uv, 2);
            LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

            CTM.restoreMap(uvMaps[i].uv, 2, precision);
        }
    }

    readAttrMaps(stream, attrMaps) {
        var i = 0;
        for (; i < attrMaps.length; ++i) {
            stream.readInt32(); //magic "ATTR"

            attrMaps[i].name = stream.readString();

            var precision = stream.readFloat32();

            stream.readInt32(); //packed size

            var interleaved = new CTMInterleavedStream(attrMaps[i].attr, 4);
            LZMA.decompress(stream, stream, interleaved, interleaved.data.length);

            CTM.restoreMap(attrMaps[i].attr, 4, precision);
        }
    }
}

export class CTM {
    static restoreIndices(indices, len) {
        var i = 3;
        if (len > 0) {
            indices[2] += indices[0];
            indices[1] += indices[0];
        }
        for (; i < len; i += 3) {
            indices[i] += indices[i - 3];

            if (indices[i] === indices[i - 3]) {
                indices[i + 1] += indices[i - 2];
            } else {
                indices[i + 1] += indices[i];
            }

            indices[i + 2] += indices[i];
        }
    }

    static restoreGridIndices(gridIndices, len) {
        var i = 1;
        for (; i < len; ++i) {
            gridIndices[i] += gridIndices[i - 1];
        }
    }

    static restoreVertices(vertices, grid, gridIndices, precision) {
        var gridIdx, delta, x, y, z,
            intVertices = new Uint32Array(vertices.buffer, vertices.byteOffset, vertices.length),
            ydiv = grid.divx, zdiv = ydiv * grid.divy,
            prevGridIdx = 0x7fffffff, prevDelta = 0,
            i = 0, j = 0, len = gridIndices.length;

        for (; i < len; j += 3) {
            x = gridIdx = gridIndices[i++];

            z = ~~(x / zdiv);
            x -= ~~(z * zdiv);
            y = ~~(x / ydiv);
            x -= ~~(y * ydiv);

            delta = intVertices[j];
            if (gridIdx === prevGridIdx) {
                delta += prevDelta;
            }

            vertices[j] = grid.lowerBoundx +
                x * grid.sizex + precision * delta;
            vertices[j + 1] = grid.lowerBoundy +
                y * grid.sizey + precision * intVertices[j + 1];
            vertices[j + 2] = grid.lowerBoundz +
                z * grid.sizez + precision * intVertices[j + 2];

            prevGridIdx = gridIdx;
            prevDelta = delta;
        }
    }

    static restoreNormals(normals, smooth, precision) {
        var ro, phi, theta, sinPhi,
            nx, ny, nz, by, bz, len,
            intNormals = new Uint32Array(normals.buffer, normals.byteOffset, normals.length),
            i = 0, k = normals.length,
            PI_DIV_2 = 3.141592653589793238462643 * 0.5;

        for (; i < k; i += 3) {
            ro = intNormals[i] * precision;
            phi = intNormals[i + 1];

            if (phi === 0) {
                normals[i] = smooth[i] * ro;
                normals[i + 1] = smooth[i + 1] * ro;
                normals[i + 2] = smooth[i + 2] * ro;
            } else {

                if (phi <= 4) {
                    theta = (intNormals[i + 2] - 2) * PI_DIV_2;
                } else {
                    theta = ((intNormals[i + 2] * 4 / phi) - 2) * PI_DIV_2;
                }

                phi *= precision * PI_DIV_2;
                sinPhi = ro * Math.sin(phi);

                nx = sinPhi * Math.cos(theta);
                ny = sinPhi * Math.sin(theta);
                nz = ro * Math.cos(phi);

                bz = smooth[i + 1];
                by = smooth[i] - smooth[i + 2];

                len = Math.sqrt(2 * bz * bz + by * by);
                if (len > 1e-20) {
                    by /= len;
                    bz /= len;
                }

                normals[i] = smooth[i] * nz +
                    (smooth[i + 1] * bz - smooth[i + 2] * by) * ny - bz * nx;
                normals[i + 1] = smooth[i + 1] * nz -
                    (smooth[i + 2] + smooth[i]) * bz * ny + by * nx;
                normals[i + 2] = smooth[i + 2] * nz +
                    (smooth[i] * by + smooth[i + 1] * bz) * ny + bz * nx;
            }
        }
    }

    static restoreMap(map, count, precision) {
        var delta, value,
            intMap = new Uint32Array(map.buffer, map.byteOffset, map.length),
            i = 0, j, len = map.length;

        for (; i < count; ++i) {
            delta = 0;

            for (j = i; j < len; j += count) {
                value = intMap[j];

                delta += value & 1 ? -((value + 1) >> 1) : value >> 1;

                map[j] = delta * precision;
            }
        }
    }

    static calcSmoothNormals(indices, vertices): any {
        var smooth = new Float32Array(vertices.length),
            indx, indy, indz, nx, ny, nz,
            v1x, v1y, v1z, v2x, v2y, v2z, len,
            i, k;

        for (i = 0, k = indices.length; i < k;) {
            indx = indices[i++] * 3;
            indy = indices[i++] * 3;
            indz = indices[i++] * 3;

            v1x = vertices[indy] - vertices[indx];
            v2x = vertices[indz] - vertices[indx];
            v1y = vertices[indy + 1] - vertices[indx + 1];
            v2y = vertices[indz + 1] - vertices[indx + 1];
            v1z = vertices[indy + 2] - vertices[indx + 2];
            v2z = vertices[indz + 2] - vertices[indx + 2];

            nx = v1y * v2z - v1z * v2y;
            ny = v1z * v2x - v1x * v2z;
            nz = v1x * v2y - v1y * v2x;

            len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (len > 1e-10) {
                nx /= len;
                ny /= len;
                nz /= len;
            }

            smooth[indx] += nx;
            smooth[indx + 1] += ny;
            smooth[indx + 2] += nz;
            smooth[indy] += nx;
            smooth[indy + 1] += ny;
            smooth[indy + 2] += nz;
            smooth[indz] += nx;
            smooth[indz + 1] += ny;
            smooth[indz + 2] += nz;
        }

        for (i = 0, k = smooth.length; i < k; i += 3) {
            len = Math.sqrt(smooth[i] * smooth[i] +
                smooth[i + 1] * smooth[i + 1] +
                smooth[i + 2] * smooth[i + 2]);

            if (len > 1e-10) {
                smooth[i] /= len;
                smooth[i + 1] /= len;
                smooth[i + 2] /= len;
            }
        }

        return smooth;
    }

    static isLittleEndian(): any {
        var buffer = new ArrayBuffer(2),
            bytes = new Uint8Array(buffer),
            ints = new Uint16Array(buffer);

        bytes[0] = 1;

        return ints[0] === 1;
    }
}

class CTMInterleavedStream {
    data;
    offset;
    count;
    len;

    constructor(data, count) {
        this.data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        this.offset = CTM.isLittleEndian ? 3 : 0;
        this.count = count * 4;
        this.len = this.data.length;
    }

    writeByte(value) {
        this.data[this.offset] = value;

        this.offset += this.count;
        if (this.offset >= this.len) {

            this.offset -= this.len - 4;
            if (this.offset >= this.count) {

                this.offset -= this.count + (CTM.isLittleEndian ? 1 : -1);
            }
        }
    }
}

export class CTMStream {
    offset;
    TWO_POW_MINUS23 = Math.pow(2, -23);
    TWO_POW_MINUS126 = Math.pow(2, -126);


    constructor(private data) {
        this.data = data;
        this.offset = 0;
    }

    readByte(): any {
        return this.data[this.offset++] & 0xff;
    }

    readInt32(): any {
        var i = this.readByte();
        i |= this.readByte() << 8;
        i |= this.readByte() << 16;
        return i | (this.readByte() << 24);
    }

    readFloat32(): any {
        var m = this.readByte();
        m += this.readByte() << 8;

        var b1 = this.readByte();
        var b2 = this.readByte();

        m += (b1 & 0x7f) << 16;
        var e = ((b2 & 0x7f) << 1) | ((b1 & 0x80) >>> 7);
        var s = b2 & 0x80 ? -1 : 1;

        if (e === 255) {
            return m !== 0 ? NaN : s * Infinity;
        }
        if (e > 0) {
            return s * (1 + (m * this.TWO_POW_MINUS23)) * Math.pow(2, e - 127);
        }
        if (m !== 0) {
            return s * m * this.TWO_POW_MINUS126;
        }
        return s * 0;
    }

    readString(): any {
        var len = this.readInt32();

        this.offset += len;

        return String.fromCharCode.apply(null, this.data.subarray(this.offset - len, this.offset));
    }

    readArrayInt32(array): any {
        var i = 0, len = array.length;

        while (i < len) {
            array[i++] = this.readInt32();
        }

        return array;
    }

    readArrayFloat32(array): any {
        var i = 0, len = array.length;

        while (i < len) {
            array[i++] = this.readFloat32();
        }

        return array;
    }

}