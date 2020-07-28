
class Fmp4
{
  constructor(maxCache = 10 * 1024 * 1024)
  {
    this._isInit = 0;
    this._spsData = null;
    this._ppsData = null;
    this._width = -1;
    this._height = -1;
    this._samples = [];
    this._samplesLen =0;
    this._sequenceNumber = 0;
    this._currentDts = 0;
    this._lastIFrameTime = 0;
    this._maxCache = maxCache;
    this._spsBegin = 0;
    this._spsEnd = 1;
    this._ppsBegin = 0;
    this._ppsEnd = 1;
    this._saveDts = 0;
    this._head = null;
  }

  makeVideoFrame(result, delay)
  {
    if(result.type === Result.Type.H264_I_FRAME || result.type === Result.Type.H264_P_FRAME)
    {
      ++this._sequenceNumber;
      let saveResult = this.saveVideoFrame(result, delay);
      if(saveResult !== Result.ErrorCode.SUCCESS)
      {
        return Result.makeErrorResult(saveResult);
      }
      let bodyResult = this._getFmp4Body();
      this._currentDts += this._saveDts;
      this._saveDts = 0;
      return bodyResult;
    }
    return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR);
  }

  saveVideoFrame(result, delay)
  {
    if(this._head == null && result.type !== Result.Type.H264_I_FRAME)
    {
      return Result.ErrorCode.NO_INIT_ERROR;
    }
    if(delay < 0 || (result.type !== Result.Type.H264_I_FRAME && result.type !== Result.Type.H264_P_FRAME))
    {
      return Result.ErrorCode.PARAM_ERROR;
    }
    if(result.type === Result.Type.H264_I_FRAME)
    {
      if(this._head == null)
      {
        let headResult = this._fmp4Init(result);
        if(headResult.errorCode !== Result.ErrorCode.SUCCESS)
        {
          return headResult.errorCode;
        }
        this._head = headResult.data;
      }
      else
      {
        let checkResult = this._checkParamChange(result.data);
        if(checkResult !== Result.ErrorCode.SUCCESS)
        {
          return checkResult;
        }
        this._lastIFrameTime = this._currentDts + this._saveDts;
      }
      let iBegin = Std.memmem(result.data, this._spsEnd > this._ppsEnd ? this._spsEnd : this._ppsEnd, new Uint8Array([0x00, 0x00, 0x00, 0x01]));
      while(iBegin !== -1 && (result.data[iBegin + 4] & 0x1F) !== 0x05)
      {
        iBegin = Std.memmem(result.data, iBegin + 4, new Uint8Array([0x00, 0x00, 0x00, 0x01]));
      }
      result.data = result.data.slice(iBegin, result.data.byteLength);
    }
    if(this._samplesLen + result.data.byteLength > this._maxCache)
    {
      this._clearSamples();
      return Result.ErrorCode.CACHE_MAX_ERROR;
    }
    result.duration = delay;
    let length = result.data.byteLength - 4;
    result.data[0] = (length >>> 24) & 0xFF;
    result.data[1] = (length >>> 16) & 0xFF;
    result.data[2] = (length >>> 8) & 0xFF;
    result.data[3] = length & 0xFF;
    this._samples.push(result);
    this._saveDts += delay;
    this._samplesLen += result.data.byteLength;
    return Result.ErrorCode.SUCCESS;
  }

  getCurrentDts()
  {
    return this._currentDts;
  }

  getLastIFrameTime()
  {
    return this._lastIFrameTime;
  }

  getWidth()
  {
    return this._width;
  }

  getHeight()
  {
    return this._height;
  }

  getIsInit()
  {
    return this._head == null ? 0 : 1;
  }

  getMaxcache()
  {
    return this._maxCache;
  }

  setMaxcache(maxCache)
  {
    this._maxCache = maxCache;
  }

  _checkParamChange(data)
  {
    if(data.byteLength < this._spsEnd || data.byteLength < this._ppsEnd)
    {
      return Result.ErrorCode.PARAM_ERROR_LENGTH;
    }
    let spsData = data.subarray(this._spsBegin + 4, this._spsEnd);
    let ppsData = data.subarray(this._ppsBegin + 4, this._ppsEnd);
    if(Std.memcmp(this._spsData, 0, spsData) !== 0 || Std.memcmp(this._ppsData, 0, ppsData) !== 0)
    {
      //return Result.ErrorCode.PARAM_CHANGE;
      console.error("SPS data not match.");
      return Result.ErrorCode.SUCCESS;
    }
    return Result.ErrorCode.SUCCESS;
  }

  _clearSamples()
  {
    this._samples = [];
    this._samplesLen = 0;
  }

  _getErrorResult(errorCode)
  {
    return new Result(null, -1, -1, errorCode);
  }

  _fmp4Init(result)
  {
    let spsBegin = Std.memmem(result.data, 0, new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x67]));
    if(spsBegin === -1)
    {
      return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR_SPS_BEGIN);
    }
    let spsEnd = Std.memmem(result.data, spsBegin + 4, new Uint8Array([0x00, 0x00, 0x00, 0x01]));
    if(spsEnd === -1)
    {
      return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR_SPS_END);
    }
    let ppsBegin = Std.memmem(result.data, 0, new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x68]));
    if(ppsBegin === -1)
    {
      return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR_PPS_BEGIN);
    }
    let ppsEnd = Std.memmem(result.data, ppsBegin + 4, new Uint8Array([0x00, 0x00, 0x00, 0x01]));
    if(ppsEnd === -1)
    {
      return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR_PPS_END);
    }
    let spsData = result.data.slice(spsBegin + 4, spsEnd);
    let ppsData = result.data.slice(ppsBegin + 4, ppsEnd);
    let spsParse = new Fmp4._ParseSps(spsData);
    if(spsData.byteLength < 4 || spsData.byteLength > 100 || ppsData.byteLength < 4 || ppsData.byteLength > 100 || spsParse.parse() !== Result.ErrorCode.SUCCESS)
    {
      return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR_SPS_PARSE);
    }
    if(spsParse.width > 10000 || spsParse.width <= 16 || spsParse.height > 10000 || spsParse.height <= 16)
    {
      return Result.makeErrorResult(Result.ErrorCode.PARAM_ERROR_SIZE);
    }
    this._width = spsParse.width;
    this._height = spsParse.height;
    this._spsData = spsData;
    this._ppsData = ppsData;
    this._spsBegin = spsBegin;
    this._spsEnd = spsEnd;
    this._ppsBegin = ppsBegin;
    this._ppsEnd = ppsEnd;
    return this._getFmp4Head();
  }

  _getFmp4Head()
  {
    let ftyp = new Fmp4._Box("ftyp",  new Uint8Array([
      0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x00, 0x01,
      0x69, 0x73, 0x6F, 0x6D,
      0x61, 0x76, 0x63, 0x31
    ]));

    let moov = new Fmp4._Box("moov");

    let timescale = 1000;

    let mvhd = new Fmp4._FullBox(0, 0, "mvhd", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      (timescale >>> 24) & 0xFF,
      (timescale >>> 16) & 0xFF,
      (timescale >>> 8) & 0xFF,
      timescale & 0xFF,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00,
      0x01, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x40, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0xFF
    ]));
    moov.addSub(mvhd);
    let trak = new Fmp4._Box("trak");
    moov.addSub(trak);
    let tkhd = new Fmp4._FullBox(0, 0x07, "tkhd", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x40, 0x00, 0x00, 0x00,
      (this._width >>> 8) & 0xFF,
      this._width & 0xFF,
      0x00, 0x00,
      (this._height >>> 8) & 0xFF,
      this._height & 0xFF,
      0x00, 0x00,
    ]));
    trak.addSub(tkhd);
    let mdia = new Fmp4._Box("mdia");
    trak.addSub(mdia);
    let mdhd = new Fmp4._FullBox(0, 0, "mdhd", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      (timescale >>> 24) & 0xFF,
      (timescale >>> 16) & 0xFF,
      (timescale >>> 8) & 0xFF,
      timescale & 0xFF,
      0x00, 0x00, 0x00, 0x00,
      0x55, 0xC4, 0x00, 0x00
    ]));
    mdia.addSub(mdhd);
    let hdlr = new Fmp4._FullBox(0, 0, "hdlr", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x76, 0x69, 0x64, 0x65,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x56, 0x69, 0x64, 0x65,
      0x6F, 0x48, 0x61, 0x6E,
      0x64, 0x6C, 0x65, 0x72, 0x00
    ]));
    mdia.addSub(hdlr);
    let minf = new Fmp4._Box("minf");
    mdia.addSub(minf);
    let vmhd = new Fmp4._FullBox(0, 0x01, "vmhd", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]));
    minf.addSub(vmhd);
    let dinf = new Fmp4._Box("dinf");
    minf.addSub(dinf);
    let dref = new Fmp4._FullBox(0, 0, "dref", new Uint8Array([
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x0C,
      0x75, 0x72, 0x6C, 0x20,
      0x00, 0x00, 0x00, 0x01
    ]));
    dinf.addSub(dref);
    let stbl = new Fmp4._Box("stbl");
    minf.addSub(stbl);
    let stsd = new Fmp4._FullBox(0, 0, "stsd", new Uint8Array([
      0x00, 0x00, 0x00, 0x01
    ]));
    stbl.addSub(stsd);
    let avc1 = new Fmp4._Box("avc1", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      (this._width >>> 8) & 0xFF,
      this._width & 0xFF,
      (this._height >>> 8) & 0xFF,
      this._height & 0xFF,
      0x00, 0x48, 0x00, 0x00,
      0x00, 0x48, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x04, 0x67,
      0x31, 0x31, 0x31, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x18,
      0xFF, 0xFF
    ]));
    stsd.addSub(avc1);
    let avcCData = new Uint8Array(11 + this._spsData.byteLength + this._ppsData.byteLength);
    avcCData.set(new Uint8Array([
      0x01, this._spsData[1], this._spsData[2], this._spsData[3],
      0xFF, 0xE1, 0x00, this._spsData.length
    ]));
    avcCData.set(this._spsData, 8);
    avcCData[8 + this._spsData.byteLength] = 0x01;
    avcCData[8 + this._spsData.byteLength + 1] = 0x00;
    avcCData[8 + this._spsData.byteLength + 2] = this._ppsData.length;
    avcCData.set(this._ppsData, 11 + this._spsData.byteLength);
    let avcC = new Fmp4._Box("avcC", avcCData);
    avc1.addSub(avcC);
    let stts = new Fmp4._FullBox(0, 0, "stts", new Uint8Array([
      0x00, 0x00, 0x00, 0x00
    ]));
    let stsc = new Fmp4._FullBox(0, 0, "stsc", new Uint8Array([
      0x00, 0x00, 0x00, 0x00
    ]));
    let stsz = new Fmp4._FullBox(0, 0, "stsz", new Uint8Array([
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]));
    let stco = new Fmp4._FullBox(0, 0, "stco", new Uint8Array([
      0x00, 0x00, 0x00, 0x00
    ]));
    stbl.addSub(stts);
    stbl.addSub(stsc);
    stbl.addSub(stsz);
    stbl.addSub(stco);
    let mvex = new Fmp4._Box("mvex");
    moov.addSub(mvex);
    let trex = new Fmp4._FullBox(0, 0, "trex", new Uint8Array([
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01
    ]));
    mvex.addSub(trex);
    let headData = new Uint8Array(ftyp.len + moov.len);
    ftyp.getData(headData);
    moov.getData(headData.subarray(ftyp.len, headData.byteLength));
    return new Result(headData, Result.Type.FMP4_HEAD, 0, Result.ErrorCode.SUCCESS);
  }

  _getFmp4Body()
  {
    let moof = new Fmp4._Box("moof");

    let mfhd = new Fmp4._FullBox(0, 0, "mfhd", new Uint8Array([
      (this._sequenceNumber >>> 24) & 0xFF,
      (this._sequenceNumber >>> 16) & 0xFF,
      (this._sequenceNumber >>> 8) & 0xFF,
      this._sequenceNumber & 0xFF,
    ]));

    moof.addSub(mfhd);

    let traf = new Fmp4._Box("traf");

    moof.addSub(traf);

    let tfhd = new Fmp4._FullBox(0, 0, "tfhd", new Uint8Array([
      0x00, 0x00, 0x00, 0x01
    ]));

    traf.addSub(tfhd);

    let tfdt = new Fmp4._FullBox(0, 0, "tfdt", new Uint8Array([
      (this._currentDts >>> 24) & 0xFF,
      (this._currentDts >>> 16) & 0xFF,
      (this._currentDts >>> 8) & 0xFF,
      this._currentDts & 0xFF,
    ]));

    traf.addSub(tfdt);

    let sampleCount = this._samples.length;
    let sdtpData = new Uint8Array(sampleCount);
    for(let i = 0; i < sampleCount; ++i)
    {
      let dependsOn = this._samples[i].type === Result.Type.H264_I_FRAME ? 2 : 1;
      let isDependedOn = this._samples[i].type === Result.Type.H264_I_FRAME ? 1 : 0;
      sdtpData[i] = (0 << 6)| (dependsOn << 4) | (isDependedOn << 2) | 0;
    }
    let sdtp = new Fmp4._FullBox(0, 0, "sdtp", sdtpData);

    let dataSize = 16 * this._samples.length + 8;
    let offset = sdtp.len + 16 + 16 + 8 + 16 + 8 + 8 + 12 + dataSize;
    let trunData = new Uint8Array(dataSize);
    trunData.set([
      (sampleCount >>> 24) & 0xFF,
      (sampleCount >>> 16) & 0xFF,
      (sampleCount >>>  8) & 0xFF,
      (sampleCount) & 0xFF,
      (offset >>> 24) & 0xFF,
      (offset >>> 16) & 0xFF,
      (offset >>>  8) & 0xFF,
      (offset) & 0xFF
    ], 0);

    for (let i = 0; i < sampleCount; ++i)
    {
      let dependsOn = this._samples[i].type === Result.Type.H264_I_FRAME ? 2 : 1;
      let isDependedOn = this._samples[i].type === Result.Type.H264_I_FRAME ? 1 : 0;
      let isNonSync = this._samples[i].type === Result.Type.H264_I_FRAME ? 0 : 1;
      let duration = this._samples[i].duration;
      let size = this._samples[i].data.byteLength;
      trunData.set([
        (duration >>> 24) & 0xFF,
        (duration >>> 16) & 0xFF,
        (duration >>>  8) & 0xFF,
        (duration) & 0xFF,
        (size >>> 24) & 0xFF,
        (size >>> 16) & 0xFF,
        (size >>>  8) & 0xFF,
        (size) & 0xFF,
        (0 << 2) | dependsOn, (isDependedOn << 6) | (0 << 4) | isNonSync,
        0x00, 0x00,
        0x00, 0x00, 0x00, 0x00
      ], 8 + 16 * i);
    }

    let trun = new Fmp4._FullBox(0, 0x0F01, "trun", trunData);
    traf.addSub(trun);
    traf.addSub(sdtp);

    let headOffset = 0;
    if(this._isInit === 0)
    {
      headOffset = this._head.byteLength;
      this._isInit = 1;
    }
    let bodyData = new Uint8Array(headOffset + moof.len + this._samplesLen + 8);
    if(headOffset > 0)
    {
      bodyData.set(this._head, 0);
    }

    moof.getData(bodyData.subarray(headOffset, bodyData.byteLength));

    let mdat = new Fmp4._Box("mdat");
    let mdatData = bodyData.subarray(headOffset + moof.len, bodyData.byteLength);
    mdat.getData(mdatData);
    mdatData[0] = (mdatData.byteLength >>> 24) & 0xFF;
    mdatData[1] = (mdatData.byteLength >>> 16) & 0xFF;
    mdatData[2] = (mdatData.byteLength >>> 8) & 0xFF;
    mdatData[3] = mdatData.byteLength & 0xFF;
    let currentLen = 0;
    for(let i = 0; i !== this._samples.length; ++i)
    {
      bodyData.set(this._samples[i].data, headOffset + moof.len + 8 + currentLen);
      currentLen += this._samples[i].data.byteLength;
    }
    this._clearSamples();
    return new Result(bodyData, headOffset > 0 ? Result.Type.FMP4_HEAD : Result.Type.FMP4_BODY, this._currentDts, Result.ErrorCode.SUCCESS);
  }
}

Fmp4._ParseSps = class
{
  constructor(data)
  {
    //复制数据，避免修改原数据。因为后续收到的SPS数据不会进行解析，解析过的数据会把0x00 0x00 0x03修正为0x00 0x00(防止竞争机制)。
    this.data = data.slice();
    this.len = data.byteLength;
    this.maxCurrent = this.len > 160 ? 160 * 8 : this.len * 8;
    this.resultValue = 0;
    this.zeroCount = 0;
    this.current = 0;
    this.width = -1;
    this.height = -1;
  }

  getBits(bitSize)
  {
    if(this.current + bitSize > this.maxCurrent)
    {
      throw "current + bitSize > maxCurrent";
    }
    this.resultValue = 0;
    for(let i = 0; i !== bitSize; ++i, ++this.current)
    {
      this.resultValue <<= 1;
      if (this.data[this.current >>> 3] & (0x80 >>> (this.current & 0x07)))
      {
        ++this.resultValue;
      }
    }
  }

  getUnsignedGolomb()
  {
    this.zeroCount = 0;
    this.getBits(1);
    while(this.resultValue === 0)
    {
      ++this.zeroCount;
      this.getBits(1);
    }
    this.getBits(this.zeroCount);
    this.resultValue = (1 << this.zeroCount) + this.resultValue - 1;
  }

  getSignedGolomb()
  {
    this.getUnsignedGolomb();
    this.resultValue = (this.resultValue & 0x01) === 0 ? (this.resultValue + 1) >>> 1 : -((this.resultValue + 1) >>> 1);
  }

  emulationPrevention()
  {
    let tmpBufferSize = this.len;
    for (let i = 0; i< tmpBufferSize - 2; ++i)
    {
      if (!((this.data[i] ^ 0x00) + (this.data[i + 1] ^ 0x00) + (this.data[i + 2] ^ 0x03)))
      {
        for (let j = i + 2; j < tmpBufferSize - 1; ++j)
        {
          this.data[j] = this.data[j + 1];
        }
        --this.len;
      }
    }
  }

  parse()
  {
    try
    {
      this.emulationPrevention();
      this.getBits(3);
      this.getBits(5);
      if(this.resultValue === 7)
      {
        this.getBits(8);
        let profileIdc = this.resultValue;
        this.getBits(16);
        this.getUnsignedGolomb();
        if(profileIdc === 100 || profileIdc === 110 || profileIdc === 122 || profileIdc === 144 )
        {
          this.getUnsignedGolomb();
          if(this.resultValue === 3)
          {
            this.getBits(1);
          }
          this.getUnsignedGolomb();
          this.getUnsignedGolomb();
          this.getBits(1);
          this.getBits(1);
          if(this.resultValue !== 0)
          {
            this.getBits(8);
          }
        }
        this.getUnsignedGolomb();
        this.getUnsignedGolomb();
        let picType = this.resultValue;
        if(picType === 0)
        {
          this.getUnsignedGolomb();
        }
        else if(picType === 1)
        {
          this.getBits(1);
          this.getSignedGolomb();
          this.getSignedGolomb();
          this.getUnsignedGolomb();
          for(let i = 0; i !== this.resultValue; ++i)
          {
            this.getSignedGolomb();
          }
        }
        this.getUnsignedGolomb();
        this.getBits(1);
        this.getUnsignedGolomb();
        this.width = (this.resultValue + 1) * 16;
        this.getUnsignedGolomb();
        this.height = (this.resultValue + 1) * 16;
        return Result.ErrorCode.SUCCESS;
      }
    }
    catch(error)
    {
      console.log("Error: " + error);
    }
    return Result.ErrorCode.PARAM_ERROR;
  }
};

Fmp4._Box = class
{
  constructor(name, data = null)
  {
    this.type = new Uint8Array(4);
    for(let i = 0; i !== 4; ++i)
    {
      this.type [i] = name.charCodeAt(i);
    }
    this.data = data;
    this.len = (data == null ? 4 : data.byteLength + 4) + 4;
    this.sub = [];
    this.father = null;
    this.index = -1;
    this.name = name;

  }

  addSub(box)
  {
    box.father = this;
    this.len += box.len;
    let temp = this.father;
    while(temp != null)
    {
      temp.len += box.len;
      temp = temp.father;
    }
    this.sub.push(box);
    box.index = this.sub.length - 1;
  }

  getData(data)
  {
    if(data.byteLength < this.len)
    {
      return Result.ErrorCode.FAIL;
    }
    let currentIndex = 0;
    let root = this;
    let i = 0;
    while(root != null)
    {
      if(i === 0)
      {
        currentIndex = root.setData(data, currentIndex);
      }
      if(i !== root.sub.length)
      {
        root = root.sub[i];
        i = 0;
      }
      else
      {
        i = root.index + 1;
        root = root.father;
      }
    }
    return Result.ErrorCode.SUCCESS;
  }

  setData(data, index)
  {
    data[index] = (this.len >>> 24) & 0xFF;
    data[index + 1] = (this.len >>> 16) & 0xFF;
    data[index + 2] = (this.len >>> 8) & 0xFF;
    data[index + 3] = this.len & 0xFF;
    index += 4;
    data.set(this.type, index);
    index += 4;
    if(this.data != null)
    {
      data.set(this.data, index);
      index += this.data.byteLength;
    }
    return index;
  }
};

Fmp4._FullBox = class extends Fmp4._Box
{
  constructor(version, flags, name, data = null)
  {
    super(name, data);
    this.len += 4;
    this.version = version;
    this.flags = flags;
  }

  setData(data, index)
  {
    data[index] = (this.len >>> 24) & 0xFF;
    data[index + 1] = (this.len >>> 16) & 0xFF;
    data[index + 2] = (this.len >>> 8) & 0xFF;
    data[index + 3] = this.len & 0xFF;
    index += 4;
    data.set(this.type, index);
    index += 4;
    data[index] = this.version & 0xFF;
    data[index + 1] = (this.flags >>> 16) & 0xFF;
    data[index + 2] = (this.flags >>> 8) & 0xFF;
    data[index + 3] = this.flags & 0xFF;
    index += 4;
    if(this.data != null)
    {
      data.set(this.data, index);
      index += this.data.byteLength;
    }
    return index;
  }
};
