
class Rtp
{
  constructor()
  {
    this._currentType = -1;
    this._currentTime = -1;
    this._duration = -1;
    this._simNumber = null;
    this._channel = null;
    this._number = 0;
    this._t = Std.milliSecondTime();
    this.isCompleted = 0;
    this.payloadType = 0;
    this.flow = 0;
  }

  getFlow()
  {
    return this.flow;
  }

  getPayloadType() {
    return this.payloadType;
  }

  parse(frameData)
  {
    let data = new Uint8Array(frameData);
    this._currentType = (data[15] & 0xf0) >>> 4;
    if(this._currentType > 4 || data.byteLength < 12 || data.byteLength > 5000000)
    {
      return Result.makeErrorResult(Result.ErrorCode.FAIL);
    }

    if(this._simNumber == null)
    {
      this._simNumber = new Uint8Array(6);
      this._simNumber.set(data.slice(8, 8 + 6));
      this._channel = data[14];
    }

    this.isCompleted = data[5] >>> 7;
    this.payloadType = data[5] & 0x7f;

    let frameHeadLen = 30 - (this._currentType === Result.Type.AUDIO ? 4 : (this._currentType === Result.Type.TRANS_DATA ? 12 : 0));
    this._currentTime = (data[frameHeadLen - 9] << 16) + (data[frameHeadLen - 8] << 8) + data[frameHeadLen - 7] +
        data[frameHeadLen - 10] * 16777216 + data[frameHeadLen - 11] * 4294967296 + data[frameHeadLen - 12] * 1099511627776;
    this._duration = this._currentType < 3 ? (data[frameHeadLen - 4] << 8) + data[frameHeadLen - 3] : 0;
    let dataLen = data.byteLength;
    let offset = 0;
    let trueLen = 0;
    let rtpLen = 0;
    while(rtpLen <= 950 && offset < dataLen)
    {
      rtpLen = (data[offset + frameHeadLen - 2] << 8) + data[offset + frameHeadLen - 1];
      Std.memcpy(data, trueLen, data, offset + frameHeadLen, offset + frameHeadLen + rtpLen);
      trueLen += rtpLen;
      offset += rtpLen + frameHeadLen;
    }
    this.flow += frameData.byteLength;
    return new Result(data.subarray(0, trueLen), this._currentType, this._currentTime, Result.ErrorCode.SUCCESS, this._duration);
  }

  makeAudio(data, payloadType = -1, simNumber = null, time = -1)
  {
    if(payloadType === -1)
    {
      payloadType = this.payloadType;
    }
    if(this._simNumber == null && simNumber == null)
    {
      return Result.makeErrorResult(Result.ErrorCode.NO_INIT_ERROR);
    }
    let simNumberData = this._simNumber;
    if(simNumber != null && simNumber.byteLength === 12)
    {
      simNumberData = new Uint8Array(6);
      for(let i = 0; i !== 12; ++i)
      {
        simNumberData[i / 2] = ((simNumber[i] << 4) & 0xF0) + (simNumberData[i + 1] & 0x0F)
      }
    }
    let packetLen = Math.ceil(data.byteLength / 950.0);
    let rtpData = new Uint8Array(data.byteLength + packetLen * 26);
    let currentOffset = 0;
    for(let i = 0; i !== packetLen; ++i)
    {
      let partType = packetLen === 1 ? 0x00 : (i === 0 ? 0x01 : (i === packetLen - 1 ? 0x02 : 0x03));
      rtpData.set(this._makeHead(0x03, data.byteLength, partType, Std.milliSecondTime(), payloadType, simNumberData));
      this._number = (this._number + 1) & 0xFFFF;
      currentOffset += 26;
      let partLen = i === packetLen - 1 ? data.byteLength % 950 : 950;
      rtpData.set(data.slice(i * 950, i * 950 + partLen), currentOffset);
      currentOffset += partLen;
    }
    return new Result(rtpData, Result.Type.AUDIO, 0, Result.ErrorCode.SUCCESS, 0);
  }

  _makeHead(type, partLen, partType, time, payloadType, simNumber)
  {
    this._t += 40;
    time = this._t;
    return new Uint8Array([
      0x30, 0x31, 0x63, 0x64,
      0x81, (this.isCompleted << 7) | payloadType,
      (this._number >>> 8) & 0xFF,
      this._number & 0xFF,
      simNumber[0], simNumber[1],
      simNumber[2], simNumber[3],
      simNumber[4], simNumber[5], this._channel,
      (type << 4) + (partType & 0x0F),
      0x00, 0x00, 0x01, 0x63,
      (time >>> 24) & 0xFF, (time >>> 16) & 0xFF,
      (time >>> 8) & 0xFF, time & 0xFF,
      (partLen >>> 8) & 0xFF, partLen & 0xFF
    ]);
  }
}
