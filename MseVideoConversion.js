/**
 * MSE操作视频播放和websocket连接
 * @param opt
 * @constructor
 */
class MseVideoConversion {
  /**
   * defaults为整个插件的默认参数
   * 'video/webm; codecs=“vorbis,vp8”’ webm类型
   * 'video/mp4; codecs=“avc1.42E01E,mp4a.40.2”’ MP4类型
   * 'video/mp2t; codecs=“avc1.42E01E,mp4a.40.2”’ ts类型
   * 'video/mp4; codecs="avc1.420028"'
   * @type {{}}
   */
  constructor(opt) {

    this.defaults = {
      mimeCodec: 'video/mp4; codecs="avc1.420028"',
      url: '',
      domId: '',
      // 播放
      onPlaying: null,
      // 暂停
      onPause: null,
      // 结束
      onEnded: null,
      // 错误
      onError: null,
      // 连接超时
      timeoutFun: null,
      // socket关闭
      socketCloseFun: null,
      /**
       * 音频编码类型
       * 8 g726
       * 26 adpcm
       * 1 g721
       */
      codingType: null,
      // 外部提供的数据
      data: null,
      // 视频播放类型
      // 实时 REAL_TIME
      // 回放 TRACK_BACK
      playType: 'REAL_TIME',
    };

    this.addAssign();

    this.options = Object.assign({}, this.defaults, opt);

    /**
     *  pendingRemoveRanges为source缓存数据清空定时器
     */
    this.pendingRemoveRanges = null;
    /**
     * this.mediaElement为video标签
     */
    this.mediaElement = null;
    /**
     * this.mediaSource为MSE sourceBuffer
     */
    this.mediaSource = null;
    this.websocket = null;
    this.sourceBuffer = null;

    /**
     * 初始化h264转fmp4方法类
     */
    this.fmp4 = null;

    /**
     * socket连接成功后，是否有消息接收
     */
    this.messageState = false;

    /**
     * 监听超时定时器
     */
    this.timeOutMonitoring = null;

    /**
     * 当前页面是否聚焦
     */
    this.pageFocus = true;

    /**
     * 视频是否已经播放
     */
    this.isVideoPlay = false;

    /**
     * socket是否被关闭
     */
    this.socketState = true;

    /**
     * create url
     */
    this.mediaSourceObjectURL = null;

    /**
     * 是否静音
     */
    // this.isMute = false;

    /**
     * 心跳代码
     */
    this.heartbeat = null;

    this.startTime = 0;

    /**
     * 视频声音开启状态
     */
    this.videoVoiceState = false

    /**
     * 音频所需数据
     */
    // this.pcmPlayer = new PCMPlayer(1, 8000);
    this.pcmPlayer = null;
    this.memory = this.getMemory();
    this.importObj = this.createWebAssemblyObj();
    this.rtp = new Rtp();
    this.g726Coder = null;
    this.audioWasm = null;
    this.adpcmCoder = null;
    this.g711Coder = null;

    /**
     * 缓存清理参数
     */
    this.clearFlag = 0;
    this.clearTime = 0;

    /**
     * 空闲超时
     */
    this.freeTimeout = null;

    /**
     * 超时重连计数
     */
    this.timeoutNumber = 0;

    this.isPFrame = 0;

    this.videoCurrentTime = 0;

    this.socketConnection();
  }

  /**
   * 获取memory
   */
  getMemory() {
    var memory = null;
    if (typeof WebAssembly !== 'undefined') {
      var storageMemory = window.videoMemoryObject;
      memory = storageMemory == undefined ? new WebAssembly.Memory({initial: 256, maximum: 256}) : storageMemory;
      window.videoMemoryObject = memory;
    }
    return memory;
  }

  /**
   * 判断浏览器是否支持Object.assign方法
   * 不支持就进行手动添加
   */
  addAssign () {
    if (typeof Object.assign != 'function') {
      Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) {
          'use strict';
          if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
          }

          var to = Object(target);

          for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];

            if (nextSource != null) {
              for (var nextKey in nextSource) {
                if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                  to[nextKey] = nextSource[nextKey];
                }
              }
            }
          }
          return to;
        },
        writable: true,
        configurable: true
      });
    }
  }

  /**
   * 创建音频对象
   */
  createWebAssemblyObj () {
    var webAssemblyObj = null;
    if (typeof WebAssembly !== 'undefined') {
      var wObj = window.webAssemblyObject;
      webAssemblyObj = wObj === undefined ?
      {
        env: {
          abortStackOverflow: () => { throw new Error('overflow'); },
          table: new WebAssembly.Table({ initial: 0, maximum: 0, element: 'anyfunc' }),
          __table_base: 0,
          memory: this.memory,
          __memory_base: 102400,
          STACKTOP: 0,
          STACK_MAX: this.memory.buffer.byteLength,
        }
      } : wObj;
      window.webAssemblyObject = webAssemblyObj;
    } else {
      layer.msg('浏览器版本太低，无法打开音频功能');
    }
    return webAssemblyObj;
  }

  /**
   * 判断浏览器是否支持MediaSource和指定要解码播放的视频文件编码和类型
   * @returns {boolean|*}
   */
  isMseSupport () {
    return 'MediaSource' in window && MediaSource.isTypeSupported(this.options.mimeCodec);
  }

  /**
   * 开始进行socket连接
   */
  socketConnection () {
    if (this.isMseSupport()) {
      if (typeof WebAssembly !== 'undefined') {
        var audioWasm = window.audioWasmObject;
        if (audioWasm === undefined) {
          fetch('./g726/audio.wasm').then((response) => response.arrayBuffer())
            .then((bytes) => WebAssembly.instantiate(bytes, this.importObj))
            .then((wasm) => {
              this.audioWasm = wasm;
              window.audioWasmObject = wasm;
              this.createMediaSource();
            }
          );
        } else {
          this.audioWasm = audioWasm;
          this.createMediaSource();
        }
      } else {
        this.createMediaSource();
      }
    } else {
      throw new Error('浏览器不支持MediaSource或指定的编码类型');
    }
  }

  /**
   * 初始化MediaSource
   */
  createMediaSource () {
    /**
     * 先判断this.options.domId不能为空
     * @type {Element}
     */
    if (this.options.domId !== '') {
      this.mediaSource = new window.MediaSource();
      /**
       * 如果获取的video状态为未播放状态就替换节点
       */

      let newVideo = document.createElement('video');
      newVideo.id = this.options.domId;
      newVideo.style.width = '100%';
      newVideo.style.height = '100%';
      newVideo.autoplay = 'autoplay';
      var nowVideo = document.getElementById(this.options.domId);
      if (nowVideo.muted === true) {
          newVideo.muted = true;
      }
      nowVideo.parentNode.replaceChild(newVideo, nowVideo);
      this.mediaElement = document.getElementById(this.options.domId);
      this.mediaElement.setAttribute('data-channel-up', 'true');

      this.mediaSourceObjectURL = window.URL.createObjectURL(this.mediaSource);
      this.mediaElement.src = this.mediaSourceObjectURL;

      /**
       * 给video标签绑定一系列监听事件
       * playing 在媒体开始播放时触发
       * pause 播放暂停时触发
       * ended 播放结束时触发
       * error 发生错误时触发
       */
      this.mediaElement.onplaying = this.onPlaying.bind(this);
      this.mediaElement.onpause = this.onPause.bind(this);
      this.mediaElement.onended= this.onEnded.bind(this);
      this.mediaElement.onerror = this.onError.bind(this);

      /**
       * mediaSource的一系列监听事件
       */
      this.mediaSource.onsourceopen = this.onMediaSourceOpen.bind(this);
      // this.mediaSource.addEventListener('sourceopen', this.onMediaSourceOpen.bind(this));
      this.mediaSource.onsourceended = this.onMediaSourceEnded.bind(this);
      this.mediaSource.onerror = this.onUpdateError.bind(this);

      /**
       * 判断浏览器类型，调用视频play方法
       */
      this.mediaElementPlay();

    } else {
      throw new Error('domId不能为空');
    }
  }

  /**
   * 目前是获取是火狐浏览器就进行播放
   */
  mediaElementPlay() {
    if (navigator.userAgent.indexOf("Firefox") > 0) {
      this.mediaElement.play();
    }
  }

  /**
   * 视频开始播放时
   */
  onPlaying () {
    if (this.pageFocus) {
      if (this.options.onPlaying && !this.isVideoPlay) {
        this.isVideoPlay = true;
        this.options.onPlaying(this.options.data, this);
      }
    } else {
      this.pageFocus = true;
    }
  }

  /**
   * 视频播放暂停时
   */
  onPause () {
    if (this.pageFocus) {
      if (this.options.onPause) {
        this.options.onPause();
      }
      this.websocket.close();
    }
  }

  /**
   * 视频播放结束时
   */
  onEnded () {
    if (this.options.onEnded) {
      console.log('视频播放结束');
      this.options.onEnded();
    }
    this.websocket.close();
  }

  /**
   * 视频播放发生错误时
   */
  onError (err) {
    console.log(err);
    if (this.options.onError) {
      this.options.onError();
    }
    this.websocket.close();
  }

  /**
   * mediaSource监听打开事件
   */
  onMediaSourceOpen () {
    this.sourceBuffer = this.mediaSource.addSourceBuffer(this.options.mimeCodec);

    this.sourceBuffer.onerror = this.onSourceBufferError.bind(this);
    /**
     * sourceBuffer创建成功后，进行websocket连接
     */
    this.websocketInit();
  }

  /**
   * source监听一段chunk播放完毕事件
   */

  /**
   * 组装buffered并内存释放
   * 1分钟清一次视频缓存
   */
  doCleanupSourceBuffer () {
    const that = this;
    this.pendingRemoveRanges = setInterval(function () {
      if (that.sourceBuffer) {
        if(!this.sourceBuffer.updating) {
          let buffered = that.sourceBuffer.buffered;
          if (buffered.length > 0) {
            let start = buffered.start(0);
            let end = buffered.end(0);
            try {
              that.sourceBuffer.remove(start, end - 10);
            } catch (err) {
              console.log(err.message);
            }
          }
        }
      }
    }, 40000);
  }

  /**
   * source监听错误事件
   */
  onSourceBufferError (error) {
    console.log(error);
  }

  /**
   * mediaSource监听结束事件
   */
  onMediaSourceEnded () {
    console.log('MediaSource onSourceEnded');
  }

  /**
   * mediaSource监听错误事件
   */
  onUpdateError (error) {
    console.log(error);
  }

  /**
   * 监听页面是否失去焦点
   * 失去焦点后，页面播放视频暂停
   * 获取焦点后，视频跳转到最新
   */
  visibilitychangeFun () {
    const isHidden = document.hidden;
    if (!isHidden) {
      // this.videoUpdateTime();
      if (this.mediaElement) {
        if (!this.sourceBuffer.updating) {
          if (this.mediaSource.readyState === 'open') {
            const time = this.sourceBuffer.buffered.end(0);
            this.mediaElement.currentTime = time;
          }
        }
      }
    } else {
      this.pageFocus = false;
    }
  }

  /**
   * 测试
   * 直接添加视频片段segment
   */
  doAppendSegments (segment) {
    if (!this.sourceBuffer.updating && this.socketState && this.messageState) {
      this.sourceBuffer.appendBuffer(segment);
    }
  }

  /**
   * websocket 链接
   */
  websocketInit() {
    /**
     * 判断是否支持websocket且url地址不为空
     */
    if ('WebSocket' in window && this.options.url !== '') {
      this.websocket = new WebSocket(this.options.url);
      /**
       * 设置接收的二进制数据格式
       * @type {string}
       */
      this.websocket.binaryType = 'arraybuffer';

      this.websocket.onopen = this.socketOpen.bind(this);
      this.websocket.onmessage = this.socketMessage.bind(this);
      this.websocket.onerror = this.socketError.bind(this);
      this.websocket.onclose = this.socketClose.bind(this);
    } else {
      throw new Error('浏览器不支持websocket或url为空');
    }
  }

  visibilityEvent () {
    MseVideoConversion.arr.forEach(function(ele){
      ele.call();
    });
  }
  /**
   * websocket成功建立的回调函数
   */
  socketOpen () {
    // this.doCleanupSourceBuffer();
    this.monitoringMessage();
    document.onvisibilitychange = this.visibilityEvent;
    MseVideoConversion.arr.push(this.visibilitychangeFun.bind(this))
    this.fmp4 = new Fmp4(10 * 1024 * 1024);
    /**
     * 发送心跳
     * @type {number}
     */
    var that = this;
    this.heartbeat = setInterval(function () {
      that.websocket.send("0");
    }, 5000);
  }

  /**
   * websocket接收消息的回调函数
   */
  socketMessage (event) {
    if (!this.messageState) {
      this.messageState = true;
    }
    console.log(event.data)
    /**
     * 对socket发送过来的数据进行处理转换成fmp4
     * 然后调用MSE方法塞进video，进行视频播放
     */
    /**
     * 解析rtp数据，获得H264数据
     */
    let rtpFrame = this.rtp.parse(event.data);
    let payloadType = this.rtp.getPayloadType();
    if(rtpFrame.errorCode == Result.ErrorCode.SUCCESS) {
      /**
       * 判断是否是视频数据
       */
      // rtpFrame.duration = rtpFrame.duration == 0 ? 40 : rtpFrame.duration;
      if(rtpFrame.type == Result.Type.H264_I_FRAME ||
          rtpFrame.type == Result.Type.H264_P_FRAME ||
          rtpFrame.type == Result.Type.H264_B_FRAME
      ) {
        /**
         * 清除视频缓存
         * @type {number}
         */
        if (rtpFrame.type == Result.Type.H264_I_FRAME) {
          ++this.clearFlag;
        }

        // if(rtpFrame.type == Result.Type.H264_P_FRAME)
        // {
        if (this.options.remoteMode == 2 || this.options.remoteMode == 3) {
          this.isPFrame = 0;
        } else {
          this.isPFrame = 1;
        }
        // }
        rtpFrame.duration = this.startTime == 0 ? 0 : (rtpFrame.duration > 0 ?
            rtpFrame.duration : rtpFrame.time - this.startTime);
        if(this.isPFrame == 1)
        {
          rtpFrame.duration = (rtpFrame.duration > 0 && rtpFrame.duration < 2000) ?
              rtpFrame.duration : ((this.startTime == 0 && rtpFrame.duration == 0) ? 0 : 500);
        }

        if(!this.sourceBuffer.updating) {
          /**
           * 清除视频缓存
           * @type {number}
           */
          if (this.options.playType == 'REAL_TIME') {
            if (this.clearFlag > 10) {
              if(this.clearTime != 0) {
                // this.sourceBuffer.remove(0, this.clearTime);
              }
              this.clearTime = this.fmp4.getLastIFrameTime() / 1000;
              this.clearFlag = 0;
            }
          }
        }

        if(!this.sourceBuffer.updating) {
          /**
           * 将H264数据，封装为Fmp4数据，frameDuration为延迟，可通过rtpFrame.time计算
           */
          let fmp4Frame = this.fmp4.makeVideoFrame(rtpFrame, rtpFrame.duration);
          if(fmp4Frame.errorCode == Result.ErrorCode.SUCCESS) {
            if(fmp4Frame.type == Result.Type.FMP4_HEAD) {
              /**
               * 初始化完成，打印视频宽高
               */
              const width = this.fmp4.getWidth();
              const height = this.fmp4.getHeight();
            }
            /**
             * 将Fmp4数据，传入MSE对象
             */
            this.doAppendSegments(fmp4Frame.data);
          }
          else {
            /**
             * 封装Fmp4出错，进行错误处理
             */
          }
        }
        else {
          /**
           * MSE对象繁忙，进行缓存
           */
          let result = this.fmp4.saveVideoFrame(rtpFrame, rtpFrame.duration);
          if(result != Result.ErrorCode.SUCCESS) {
            /**
             * 缓存出错，进行错误处理
             */
          }
        }
        this.startTime = rtpFrame.time;
      }
      else if(
          rtpFrame.type == Result.Type.AUDIO &&
          payloadType !== 'OFF' &&
          payloadType !== null &&
          this.audioWasm !== null
      ) {
        /**
         * 处理音频数据
         */
        if (this.videoVoiceState && this.pcmPlayer !== null && this.memory !== null) {
          if (payloadType === 8) {
            this.g726AudioDecoding(rtpFrame);
          } else if (payloadType === 26) {
            this.adpcmAudioDecoding(rtpFrame);
          } else if (payloadType === 7) {
            this.g711uAudioDecoding(rtpFrame);
          } else if (payloadType === 6) {
            this.g711aAudioDecoding(rtpFrame);
          }
        }
      }
      else {
        /**
         * 处理其他数据
         */
      }
    }
    else {
      /**
       * 解析rtp数据出错，进行错误处理
       */
    }
    // }
  }

  /**
   * g711u处理
   */
  g711uAudioDecoding(rtpFrame) {
    if (this.g711Coder == null && this.audioWasm != null) {
      this.g711Coder = new G711(this.audioWasm, this.memory);
    }

    if (this.g711Coder != null) {
      let pcm16BitData = this.g711Coder.decodeG711u(rtpFrame.data);
      let pcmFloat32Data = Std.shortToFloatData(pcm16BitData);
      // 音频播放
      this.pcmPlayer.feed(pcmFloat32Data);
    }
  }

  /**
   * g711a处理
   */
  g711aAudioDecoding(rtpFrame) {
    if (this.g711Coder == null && this.audioWasm != null) {
      this.g711Coder = new G711(this.audioWasm, this.memory);
    }

    if (this.g711Coder != null) {
      let pcm16BitData = this.g711Coder.decodeG711a(rtpFrame.data);
      let pcmFloat32Data = Std.shortToFloatData(pcm16BitData);
      // 音频播放
      this.pcmPlayer.feed(pcmFloat32Data);
    }
  }

  /**
   * g726处理
   */
  g726AudioDecoding(rtpFrame) {
    if (this.g726Coder == null && this.audioWasm != null) {
      this.g726Coder = new G726(this.audioWasm, this.memory, 4);
    }

    if (this.g726Coder != null) {
      // Std.changeByteEndian(rtpFrame.data);
      let pcm16BitData = this.g726Coder.decode(rtpFrame.data, 1);
      let pcmFloat32Data = Std.shortToFloatData(pcm16BitData);
      // 音频播放
      this.pcmPlayer.feed(pcmFloat32Data);
    }
  }

  /**
   * adpcm
   */
  adpcmAudioDecoding(rtpFrame) {
    if(this.adpcmCoder == null && this.audioWasm != null) {
      this.adpcmCoder = new Adpcm(this.audioWasm, this.memory);
    }
    if(this.adpcmCoder != null) {
      let adpcmData = rtpFrame.data.slice(8, rtpFrame.data.byteLength);
      this.adpcmCoder.resetDecodeState(new Adpcm.State(rtpFrame.data[4] + (rtpFrame.data[5] << 8), rtpFrame.data[6]));
      let pcm16BitData = this.adpcmCoder.decode(adpcmData);
      let pcmFloat32Data = Std.shortToFloatData(pcm16BitData);
      this.pcmPlayer.feed(pcmFloat32Data);
    }
  }


  /**
   * websocket发生错误的回调函数
   */
  socketError (error) {
    console.log(error);
  }

  /**
   * websocket关闭的回调函数
   */
  socketClose () {
    if (this.websocket) {
      this.socketState = false;
      clearTimeout(this.timeOutMonitoring);
      if (this.options.socketCloseFun) {
        this.options.socketCloseFun(this.options.data);
      }
      clearInterval(this.pendingRemoveRanges);
      this.pendingRemoveRanges = null;
      this.destroy();
    }
  }

  // 关闭socket
  closeSocket () {
    console.log('video socket colose');
    if (this.websocket) {
      this.websocket.close();
      this.socketState = false;
      clearTimeout(this.timeOutMonitoring);
      // if (this.options.socketCloseFun) {
      //   this.options.socketCloseFun(this.options.data);
      // }
      clearInterval(this.pendingRemoveRanges);
      this.pendingRemoveRanges = null;
      this.destroy();
    }
  }

  /**
   * 抓图
   * 使用canvas
   */
  videoScreenshots (canvasId, width, height) {
    /**
     * 创建canvasu节点
     * @type {Element}
     */
    if (this.mediaElement) {
      /**
       * 进行抓图
       * @type {Element}
       */
      const canvasElement = document.getElementById(canvasId);
      var canvasCtx = canvasElement.getContext('2d');
      canvasCtx.drawImage(this.mediaElement, 0, 0, width, height);
      /**
       * 转换成图像
       */
      var formData = new FormData();
      canvasElement.toBlob(function(blob){
        formData.append('file', blob);
      });

      return formData;
    }
  }

  /**
   * 销毁事件
   * 关闭视频
   */
  destroy () {
    if (this.mediaSource) {
      if (this.mediaSource.readyState === 'open') {
        try {
          this.sourceBuffer.abort();
        } catch (err) {
          console.log(err.message);
        }
      }

      if (this.mediaSource.readyState !== 'closed') {
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
      }

      if (this.mediaSource.readyState === 'open') {
        this.mediaSource.endOfStream();
      }

      document.removeEventListener('visibilitychange', this.visibilitychangeFun.bind(this));

      /**
       * 注销sourceBuffer
       */
      if (this.sourceBuffer) {
        if (this.sourceBuffer.readyState !== undefined) {
          this.mediaSource.removeSourceBuffer(this.sourceBuffer);
        }

        this.sourceBuffer = null;
      }

      /**
       * 注销mediasource
       */
      this.mediaSource = null;

      /**
       * 清空其它数据
       */
      clearInterval(this.pendingRemoveRanges);
      this.pendingRemoveRanges = null;
    }

    /**
     * video标签清空src属性
     */
    if (this.mediaElement) {
      this.videoCurrentTime = this.mediaElement.currentTime;
      this.mediaElement.setAttribute('data-currenttime', this.videoCurrentTime);
      if (!this.mediaElement.getAttribute('data-video-stop')) {
        this.mediaElement.src = '';
        this.mediaElement.load();
        this.mediaElement.removeAttribute('src');
        this.mediaElement.removeAttribute('data-channel-up');
      }
      this.mediaElement = null;
    }

    this.messageState = false;
    this.isVideoPlay = false;
    this.pageFocus = true;
    this.timeOutMonitoring = null;

    if (this.mediaSourceObjectURL) {
      window.URL.revokeObjectURL(this.mediaSourceObjectURL);
      this.mediaSourceObjectURL = null;
    }
    /**
     * 清空音频数据
     * @type {Rtp}
     */
    this.rtp = new Rtp();
    this.g726Coder = null;
    this.audioWasm = null;
    this.adpcmCoder = null;
    this.g711Coder = null;

    // this.isMute = false;

    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }

    this.startTime = 0;

    if (this.freeTimeout) {
      clearTimeout(this.freeTimeout);
      this.freeTimeout = null;
    }

    // 销毁音频
    this.closeVideoVoice();

    this.isPFrame = 0;
    this.videoCurrentTime = 0;
  }

  /**
   * 监听messages是否发送数据
   * 8秒无数据推送重新连接
   */
  monitoringMessage () {
    var that = this;
    this.timeOutMonitoring = setTimeout(function () {
      if (!that.messageState) {
        that.websocket.close();
        this.timeoutNumber++;
        if (this.timeoutNumber < 4) {
          if (that.options.timeoutFun) {
            that.options.timeoutFun(that.options.data, this.timeoutNumber);
          }
        } else {
          this.timeoutNumber = 0;
        }
      };
    }, 8000);
  }

  /**
   * 获取视频流量值
   */
  getVideoTraffic () {
    return this.rtp.getFlow();
  }

  /**
   * 静音
   */
  // muteFun() {
  //   this.isMute = true;
  // }

  /**
   * 开启声音
   */
  openVideoVoice() {
    if (this.pcmPlayer === null) {
      this.pcmPlayer = new PCMPlayer(1, 8000);
      this.videoVoiceState = true;
    }
  }

  /**
   * 关闭声音
   */
  closeVideoVoice() {
    if (this.pcmPlayer !== null) {
      this.pcmPlayer.close();
      this.pcmPlayer = null;
      this.videoVoiceState = false;
    }
  }

  /**
   * 设置音频的播放声音
   */
  setAudioVoice(index) {
    if (this.pcmPlayer !== null) {
      this.pcmPlayer.setVolume(index);
    }
  }

  /**
   * 视频跳转到最新缓存时间点
   */
  videoUpdateTime() {
    if (this.mediaElement) {
      if (!this.sourceBuffer.updating) {
        if (this.mediaSource.readyState === 'open') {
          const time = this.sourceBuffer.buffered.end(0);
          this.mediaElement.currentTime = time;
        }
      }
    }

    if (this.sourceBuffer) {
      let buffered = this.sourceBuffer.buffered;
      if (buffered.length > 0) {
        let start = buffered.start(0);
        let end = buffered.end(0);
        try {
          this.sourceBuffer.remove(start, end - 10);
        } catch (err) {
          // console.log(err.message);
        }
      }
    }
  }

  /**
   * 空闲超时断开
   */
  freeTimeoutClose(time, callBack) {
    this.closeFreeTimeout();
    var that = this;
    if (that.websocket) {
      that.freeTimeout = setTimeout(() => {
        if (callBack && typeof callBack === 'function') {
          var id = that.mediaElement.getAttribute('vehicle-id');
          var channelType = that.mediaElement.getAttribute('channel-type');
          var channelNum = that.mediaElement.getAttribute('channel-num');
          callBack(id, channelNum, channelType);
        }
        that.closeSocket();
      }, time);
    }
  }

  /**
   * 关闭空闲超时
   */
  closeFreeTimeout() {
    if (this.isOpenFreeTime()) {
      clearTimeout(this.freeTimeout);
      this.freeTimeout = null;
    }
  }

  /**
   * 判断是否触发了空闲超时
   */
  isOpenFreeTime() {
    if (this.freeTimeout === null) {
      return false;
    } else {
      return true;
    }
  }
}

MseVideoConversion.arr = [];
