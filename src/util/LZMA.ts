
export class LZMA {
    static initBitModels(probs, len) {
        while (len--) {
            probs[len] = 1024;
        }
    }

    static reverseDecode2(models, startIndex, rangeDecoder, numBitLevels): any {
        var m = 1, symbol = 0, i = 0, bit;

        for (; i < numBitLevels; ++i) {
            bit = rangeDecoder.decodeBit(models, startIndex + m);
            m = (m << 1) | bit;
            symbol |= bit << i;
        }
        return symbol;
    }

    static decompress(properties, inStream, outStream, outSize): any {
        var decoder = new LZMADecoder();

        if (!decoder.setDecoderProperties(properties)) {
            throw "Incorrect stream properties";
        }

        if (!decoder.decode(inStream, outStream, outSize)) {
            throw "Error in data stream";
        }

        return true;
    }
}

class LZMAOutWindow {
    _windowSize = 0;
    _buffer;
    _pos;
    _streamPos;
    _stream;

    create(windowSize) {
        if ((!this._buffer) || (this._windowSize !== windowSize)) {
            this._buffer = [];
        }
        this._windowSize = windowSize;
        this._pos = 0;
        this._streamPos = 0;
    }

    flush() {
        var size = this._pos - this._streamPos;
        if (size !== 0) {
            while (size--) {
                this._stream.writeByte(this._buffer[this._streamPos++]);
            }
            if (this._pos >= this._windowSize) {
                this._pos = 0;
            }
            this._streamPos = this._pos;
        }
    }

    releaseStream() {
        this.flush();
        this._stream = null;
    }

    setStream(stream) {
        this.releaseStream();
        this._stream = stream;
    }

    init(solid) {
        if (!solid) {
            this._streamPos = 0;
            this._pos = 0;
        }
    }

    copyBlock(distance, len) {
        var pos = this._pos - distance - 1;
        if (pos < 0) {
            pos += this._windowSize;
        }
        while (len--) {
            if (pos >= this._windowSize) {
                pos = 0;
            }
            this._buffer[this._pos++] = this._buffer[pos++];
            if (this._pos >= this._windowSize) {
                this.flush();
            }
        }
    }

    putByte(b) {
        this._buffer[this._pos++] = b;
        if (this._pos >= this._windowSize) {
            this.flush();
        }
    }

    getByte(distance): any {
        var pos = this._pos - distance - 1;
        if (pos < 0) {
            pos += this._windowSize;
        }
        return this._buffer[pos];
    }


}

class LZMARangeDecoder {
    _stream;
    _code;
    _range;

    setStream(stream) {
        this._stream = stream;
    }

    releaseStream() {
        this._stream = null;
    }

    init() {
        var i = 5;

        this._code = 0;
        this._range = -1;

        while (i--) {
            this._code = (this._code << 8) | this._stream.readByte();
        }
    }

    decodeDirectBits(numTotalBits): any {
        var result = 0, i = numTotalBits, t;

        while (i--) {
            this._range >>>= 1;
            t = (this._code - this._range) >>> 31;
            this._code -= this._range & (t - 1);
            result = (result << 1) | (1 - t);

            if ((this._range & 0xff000000) === 0) {
                this._code = (this._code << 8) | this._stream.readByte();
                this._range <<= 8;
            }
        }

        return result;
    }

    decodeBit(probs, index): any {
        var prob = probs[index],
            newBound = (this._range >>> 11) * prob;

        if ((this._code ^ 0x80000000) < (newBound ^ 0x80000000)) {
            this._range = newBound;
            probs[index] += (2048 - prob) >>> 5;
            if ((this._range & 0xff000000) === 0) {
                this._code = (this._code << 8) | this._stream.readByte();
                this._range <<= 8;
            }
            return 0;
        }

        this._range -= newBound;
        this._code -= newBound;
        probs[index] -= prob >>> 5;
        if ((this._range & 0xff000000) === 0) {
            this._code = (this._code << 8) | this._stream.readByte();
            this._range <<= 8;
        }
        return 1;
    }
}

class LZMABitTreeDecoder {
    _models;
    _numBitLevels;

    constructor(numBitLevels) {
        this._models = [];
        this._numBitLevels = numBitLevels;
    }

    init() {
        LZMA.initBitModels(this._models, 1 << this._numBitLevels);
    }

    decode(rangeDecoder): any {
        var m = 1, i = this._numBitLevels;

        while (i--) {
            m = (m << 1) | rangeDecoder.decodeBit(this._models, m);
        }
        return m - (1 << this._numBitLevels);
    }

    reverseDecode(rangeDecoder): any {
        var m = 1, symbol = 0, i = 0, bit;

        for (; i < this._numBitLevels; ++i) {
            bit = rangeDecoder.decodeBit(this._models, m);
            m = (m << 1) | bit;
            symbol |= bit << i;
        }
        return symbol;
    }
}

class LZMALenDecoder {

    _choice = [];
    _lowCoder = [];
    _midCoder = [];
    _highCoder = new LZMABitTreeDecoder(8);
    _numPosStates = 0;

    create(numPosStates) {
        for (; this._numPosStates < numPosStates; ++this._numPosStates) {
            this._lowCoder[this._numPosStates] = new LZMABitTreeDecoder(3);
            this._midCoder[this._numPosStates] = new LZMABitTreeDecoder(3);
        }
    }

    init() {
        var i = this._numPosStates;
        LZMA.initBitModels(this._choice, 2);
        while (i--) {
            this._lowCoder[i].init();
            this._midCoder[i].init();
        }
        this._highCoder.init();
    }

    decode(rangeDecoder, posState): any {
        if (rangeDecoder.decodeBit(this._choice, 0) === 0) {
            return this._lowCoder[posState].decode(rangeDecoder);
        }
        if (rangeDecoder.decodeBit(this._choice, 1) === 0) {
            return 8 + this._midCoder[posState].decode(rangeDecoder);
        }
        return 16 + this._highCoder.decode(rangeDecoder);
    }

}

class LZMADecoder2 {
    _decoders = [];

    init() {
        LZMA.initBitModels(this._decoders, 0x300);
    }

    decodeNormal(rangeDecoder) {
        var symbol = 1;

        do {
            symbol = (symbol << 1) | rangeDecoder.decodeBit(this._decoders, symbol);
        } while (symbol < 0x100);

        return symbol & 0xff;
    }

    decodeWithMatchByte(rangeDecoder, matchByte) {
        var symbol = 1, matchBit, bit;

        do {
            matchBit = (matchByte >> 7) & 1;
            matchByte <<= 1;
            bit = rangeDecoder.decodeBit(this._decoders, ((1 + matchBit) << 8) + symbol);
            symbol = (symbol << 1) | bit;
            if (matchBit !== bit) {
                while (symbol < 0x100) {
                    symbol = (symbol << 1) | rangeDecoder.decodeBit(this._decoders, symbol);
                }
                break;
            }
        } while (symbol < 0x100);

        return symbol & 0xff;
    }
}

class LZMALiteralDecoder {
    _coders;
    _numPrevBits;
    _numPosBits;
    _posMask;

    create(numPosBits, numPrevBits) {
        var i;

        if (this._coders
            && (this._numPrevBits === numPrevBits)
            && (this._numPosBits === numPosBits)) {
            return;
        }
        this._numPosBits = numPosBits;
        this._posMask = (1 << numPosBits) - 1;
        this._numPrevBits = numPrevBits;

        this._coders = [];

        i = 1 << (this._numPrevBits + this._numPosBits);
        while (i--) {
            this._coders[i] = new LZMADecoder2();
        }
    }

    init() {
        var i = 1 << (this._numPrevBits + this._numPosBits);
        while (i--) {
            this._coders[i].init();
        }
    }

    getDecoder(pos, prevByte): any {
        return this._coders[((pos & this._posMask) << this._numPrevBits)
            + ((prevByte & 0xff) >>> (8 - this._numPrevBits))];
    }
}

class LZMADecoder {
    _outWindow = new LZMAOutWindow();
    _rangeDecoder = new LZMARangeDecoder();
    _isMatchDecoders = [];
    _isRepDecoders = [];
    _isRepG0Decoders = [];
    _isRepG1Decoders = [];
    _isRepG2Decoders = [];
    _isRep0LongDecoders = [];
    _posSlotDecoder = [];
    _posDecoders = [];
    _posAlignDecoder = new LZMABitTreeDecoder(4);
    _lenDecoder = new LZMALenDecoder();
    _repLenDecoder = new LZMALenDecoder();
    _literalDecoder = new LZMALiteralDecoder();
    _dictionarySize = -1;
    _dictionarySizeCheck = -1;
    _posStateMask;

    constructor() {
        this._posSlotDecoder[0] = new LZMABitTreeDecoder(6);
        this._posSlotDecoder[1] = new LZMABitTreeDecoder(6);
        this._posSlotDecoder[2] = new LZMABitTreeDecoder(6);
        this._posSlotDecoder[3] = new LZMABitTreeDecoder(6);
    }

    setDictionarySize(dictionarySize): any {
        if (dictionarySize < 0) {
            return false;
        }
        if (this._dictionarySize !== dictionarySize) {
            this._dictionarySize = dictionarySize;
            this._dictionarySizeCheck = Math.max(this._dictionarySize, 1);
            this._outWindow.create(Math.max(this._dictionarySizeCheck, 4096));
        }
        return true;
    }

    setLcLpPb(lc, lp, pb): any {
        var numPosStates = 1 << pb;

        if (lc > 8 || lp > 4 || pb > 4) {
            return false;
        }

        this._literalDecoder.create(lp, lc);

        this._lenDecoder.create(numPosStates);
        this._repLenDecoder.create(numPosStates);
        this._posStateMask = numPosStates - 1;

        return true;
    }

    init() {
        var i = 4;

        this._outWindow.init(false);

        LZMA.initBitModels(this._isMatchDecoders, 192);
        LZMA.initBitModels(this._isRep0LongDecoders, 192);
        LZMA.initBitModels(this._isRepDecoders, 12);
        LZMA.initBitModels(this._isRepG0Decoders, 12);
        LZMA.initBitModels(this._isRepG1Decoders, 12);
        LZMA.initBitModels(this._isRepG2Decoders, 12);
        LZMA.initBitModels(this._posDecoders, 114);

        this._literalDecoder.init();

        while (i--) {
            this._posSlotDecoder[i].init();
        }

        this._lenDecoder.init();
        this._repLenDecoder.init();
        this._posAlignDecoder.init();
        this._rangeDecoder.init();
    }

    decode(inStream, outStream, outSize): any {
        var state = 0, rep0 = 0, rep1 = 0, rep2 = 0, rep3 = 0, nowPos64 = 0, prevByte = 0,
            posState, decoder2, len, distance, posSlot, numDirectBits;

        this._rangeDecoder.setStream(inStream);
        this._outWindow.setStream(outStream);

        this.init();

        while (outSize < 0 || nowPos64 < outSize) {
            posState = nowPos64 & this._posStateMask;

            if (this._rangeDecoder.decodeBit(this._isMatchDecoders, (state << 4) + posState) === 0) {
                decoder2 = this._literalDecoder.getDecoder(nowPos64++, prevByte);

                if (state >= 7) {
                    prevByte = decoder2.decodeWithMatchByte(this._rangeDecoder, this._outWindow.getByte(rep0));
                } else {
                    prevByte = decoder2.decodeNormal(this._rangeDecoder);
                }
                this._outWindow.putByte(prevByte);

                state = state < 4 ? 0 : state - (state < 10 ? 3 : 6);

            } else {

                if (this._rangeDecoder.decodeBit(this._isRepDecoders, state) === 1) {
                    len = 0;
                    if (this._rangeDecoder.decodeBit(this._isRepG0Decoders, state) === 0) {
                        if (this._rangeDecoder.decodeBit(this._isRep0LongDecoders, (state << 4) + posState) === 0) {
                            state = state < 7 ? 9 : 11;
                            len = 1;
                        }
                    } else {
                        if (this._rangeDecoder.decodeBit(this._isRepG1Decoders, state) === 0) {
                            distance = rep1;
                        } else {
                            if (this._rangeDecoder.decodeBit(this._isRepG2Decoders, state) === 0) {
                                distance = rep2;
                            } else {
                                distance = rep3;
                                rep3 = rep2;
                            }
                            rep2 = rep1;
                        }
                        rep1 = rep0;
                        rep0 = distance;
                    }
                    if (len === 0) {
                        len = 2 + this._repLenDecoder.decode(this._rangeDecoder, posState);
                        state = state < 7 ? 8 : 11;
                    }
                } else {
                    rep3 = rep2;
                    rep2 = rep1;
                    rep1 = rep0;

                    len = 2 + this._lenDecoder.decode(this._rangeDecoder, posState);
                    state = state < 7 ? 7 : 10;

                    posSlot = this._posSlotDecoder[len <= 5 ? len - 2 : 3].decode(this._rangeDecoder);
                    if (posSlot >= 4) {

                        numDirectBits = (posSlot >> 1) - 1;
                        rep0 = (2 | (posSlot & 1)) << numDirectBits;

                        if (posSlot < 14) {
                            rep0 += LZMA.reverseDecode2(this._posDecoders,
                                rep0 - posSlot - 1, this._rangeDecoder, numDirectBits);
                        } else {
                            rep0 += this._rangeDecoder.decodeDirectBits(numDirectBits - 4) << 4;
                            rep0 += this._posAlignDecoder.reverseDecode(this._rangeDecoder);
                            if (rep0 < 0) {
                                if (rep0 === -1) {
                                    break;
                                }
                                return false;
                            }
                        }
                    } else {
                        rep0 = posSlot;
                    }
                }

                if (rep0 >= nowPos64 || rep0 >= this._dictionarySizeCheck) {
                    return false;
                }

                this._outWindow.copyBlock(rep0, len);
                nowPos64 += len;
                prevByte = this._outWindow.getByte(0);
            }
        }

        this._outWindow.flush();
        this._outWindow.releaseStream();
        this._rangeDecoder.releaseStream();

        return true;
    }

    setDecoderProperties(properties): any {
        var value, lc, lp, pb, dictionarySize;

        if (properties.size < 5) {
            return false;
        }

        value = properties.readByte();
        lc = value % 9;
        value = ~~(value / 9);
        lp = value % 5;
        pb = ~~(value / 5);

        if (!this.setLcLpPb(lc, lp, pb)) {
            return false;
        }

        dictionarySize = properties.readByte();
        dictionarySize |= properties.readByte() << 8;
        dictionarySize |= properties.readByte() << 16;
        dictionarySize += properties.readByte() * 16777216;

        return this.setDictionarySize(dictionarySize);
    }
}