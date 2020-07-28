/*(function(window,$){*/
var videoMap
    , asyncFlag = true // ztree是否进行异步加载
    , misstype = false // 判断是否为离线树
    , zTreeIdJson = {} // // 保存ztree节点ID集合
    , ztreeOffLine = [] // 离线
    , ztreeOnLine = [] // 在线
    , ztreeHeartBeat = [] // 心跳
    , alarmName = [] // 报警车辆ids
    , searchTimeout // 模糊查询定时器
    , allObjNum // 监控对象总的数量
    , isTreeState = true // 监控对象查询类型
    , monitoringObjMap // 订阅监控对象集合
    , monitoringObjNameMap // 车牌号图标集合
    , monitoringObjLngLatMap // 订阅监控对象经纬度集合
    , monitoringObjFocusId // 监控对象聚焦跟踪id
    , mapBounds // 地图可视区域范围
    , diyueall //用户权限下的车id集合
    , logTime //日志时间（用户第一次进入界面时的时间）
    , operationLogLength //日志数据长度
    , subscribeVideoNum = 0 // 订阅视频数量
    , subscribeVideoMap // 订阅监控对象通道号集合
    , waitTimeTimeout // 9101或9102操作计时器
    , speedZoomParameter // 云台速度快慢值
    , haeundaeVehicleId // 云台功能使用车ID信息
    , haeundaeChannelNum // 云台功能使用车辆通道号
    , haeundaeZtreeIsCheck = false // 云台功能 车辆树订阅
    , subscribeObjInfoMap // 订阅监控对象信息集合
    , closeVideoMap // 关闭视频集合
    , alarmGoState = false // 报警联动跳转状态
    , currentRightClickVehicleId // 当前右键点击的车辆ID
    , objImformationMap // 监控对象信息窗口集合
    , winHeight = $(window).height() //window高度
    , headerHeight = $("#header").height() //header高度
    ,
    videoName = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"]//视频分隔类样式
    , monitorTimeIndex //车辆树右键菜单 监听时间初始
    , monitorTime //监听时间方法
    , alarmFanceId = null //报警围栏id
    , alarmFanceType = null //报警围栏类型
    , alarmIndex = 1
    ,
    alarmTypeList = ['1', '2', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '29', '30', '18', '19', '23', '24', '25', '26']
    , clickLogCount = 0
    , infoWindow // 地图信息窗口
    , urlRewriteVideoId
    , urlRewriteVideoName
    , gotoRealTimeVideo = false // 从实时监控跳转过来是否已经订阅了视频
    , createVideoMap // 创建video视频对象集合
    , audioListenSocket = null // 监听socket对象
    , subtitleParentDom // 右键点击视频的dom对象
    , createChannelVoice = null //  创建的通道号声音对象id
    , photoImageFormData = null // 抓拍图片对象
    , listenUnique = null // 监听标识
    , deviceTypeTxt = '';// 协议类型
// 持续性报警pos
var continueAlarmsPosList = ["67", "6511", "6512", "6511", "6521", "6522", "6523", "6531", "6532", "6533", "6541", "6542", "6543", "6551", "6552", "6553", "6611", "6612", "6613", "6621", "6622", "6623", "6631", "6632", "6633", "6642", "6642", "6643", "6651", "6652", "6654", "6811", "6812", "6813", "6821", "6822", "6823", "6831", "6832", "6834", "6841", "6842", "6843", "18177", "18178", "18180", "18433", "18434", "18435", "18689", "18691", "18691", "18945", "18946", "18947", "19201", "19202", "19203", "19457", "19458", "19459", "19713", "19714", "19715", "19969", "19970", "19971", "12411", "124", "7012", "7021", "14000", "14001", "14002", "14003", "14004", "14100", "14101", "14102", "14103", "14104", "14105", "14106", "14107", "14108", "14109", "14110", "14112", "14112", "14113", "14114", "14115", "14116", "14117", "14118", "14119", "14120", "14122", "14122", "14123", "14124", "14125", "14126", "14127", "14128", "14129", "14130", "14131", "141000", "14200", "14201", "14202", "14203", "14204", "14205", "14206", "14207", "14208", "14209", "14210", "14211", "14212", "14213", "14214", "14215", "14217", "14217", "14218", "14219", "14220", "14221", "14222", "14223", "14224", "14225", "14226", "14227", "14228", "14229", "14230", "14231", "142000", "14311", "14511", "14521", "14411", "13211", "13212", "13213", "13214"];
var alarmRole = false; //判断是否有处理报警的权限
var aliasesClass = 'aliasesStyle';// 监控对象别名样式

// 去掉小数点后多余的0
var noZero = function(data) {
    var regexp=/(?:\.0*|(\.\d+?)0+)$/;
    return data.replace(regexp,'$1');
};

realTimeVideLoad = {

    init: function () {



        // 视频socket接口订阅
        realTimeVideLoad.subscribeVideoDataAssemble();

    },
    //获取地址栏参数
    GetAddressUrl: function (name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) {
            gotoRealTimeVideo = true;
            return unescape(r[2]);
        }
        return null;
    },

    // 视频socket订阅
    videoSocketSubscribe: function () {
        setTimeout(function () {
            if (webSocket.conFlag) {
                // 初始化树
                json_ajax("POST", "/clbs/m/functionconfig/fence/bindfence/getStatistical", "json", true, {webType: 2}, realTimeVideLoad.getMonitoringNumber);
                webSocket.subscribe(headers, '/user/' + $("#userName").text() + '/alarm', realTimeVideLoad.updataRealAlarmMessage, "/app/vehicle/subscribeStatus", null);
            } else {
                realTimeVideLoad.videoSocketSubscribe();
            }
        }, 500);
    },

    // 数组原型链拓展方法
    arrayExpand: function () {
        // 删除数组指定对象
        Array.prototype.remove = function (obj) {
            for (var i = 0; i < this.length; i++) {
                var num = this.indexOf(obj);
                if (num !== -1) {
                    this.splice(num, 1);
                }
            }
        };
    },

    //页面左侧模块隐藏显示
    vehicleTreeModuleFn: function () {
        if ($(this).hasClass("fa fa-chevron-left")) {
            $(".video-main-right").addClass("video-main-right-zero");
            $(".video-main-left").addClass("video-main-left-none");
        } else {
            $(".video-main-right").removeAttr("style");
        }
    },

    //页面左侧模块隐藏显示
    vehicleTreeModuleFn: function () {
        if ($(this).hasClass("fa fa-chevron-left")) {
            $(".video-main-right").addClass("video-main-right-zero");
            $(".video-main-left").addClass("video-main-left-none");
        } else {
            $(".video-main-right").removeAttr("style");
        }
    },

    //页面右侧地图模块大小显示
    mapAllShowFn: function () {
        if ($(this).children().hasClass("fa fa-chevron-left")) {
            $(this).children().removeClass("fa fa-chevron-left");
            $(this).children().addClass("fa fa-chevron-right");
            $("#video-module").css({
                'position': 'absolute',
                'left': '-75%'
            });
            $("#map-module").css("float", "right");
            $("#map-module").removeClass("col-md-3");
            $("#map-module").addClass("col-md-12");
        } else {
            $(this).children().removeClass("fa fa-chevron-right");
            $(this).children().addClass("fa fa-chevron-left");
            $("#map-module").removeClass("col-md-12");
            $("#map-module").addClass("col-md-3");
            $("#video-module").css({
                'position': 'absolute',
                'left': 0
            });
        }
    },

    // 获取监控对象数量
    getMonitoringNumber: function (data) {
        var num = data.obj.allV // 监控对象数量
            , url
            , otherParam = null;
        allObjNum = num;
        diyueall = data.obj.vehicleIdArray;
        if (num <= 5000) {
            url = '/clbs/m/functionconfig/fence/bindfence/monitorTree';
            otherParam = {'webType': 2};
        }else if(urlRewriteVideoId && gotoRealTimeVideo){
            $('#search_condition').val(urlRewriteVideoName);
            var queryType = $("#searchType").val();
            url = '/clbs/m/functionconfig/fence/bindfence/monitorTreeFuzzy';
            otherParam = {'queryParam': urlRewriteVideoName, 'queryType': queryType, 'webType': 2, 'type': 1};
        }
        else {
            url = '/clbs/m/functionconfig/fence/bindfence/bigDataMonitorTree';
        }
        realTimeVideLoad.initZtree(url, otherParam);
    },

    // ztree 初始化构建
    initZtree: function (url, otherParam) {
        asyncFlag = true;
        var setting = {
            async: {
                url: url,
                type: "post",
                enable: true,
                autoParam: ["id"],
                otherParam: otherParam,
                dataType: "json",
                dataFilter: realTimeVideLoad.ajaxDataFilter
            },
            view: {
                dblClickExpand: false,
                nameIsHTML: true,
                fontCss: setFontCss_ztree,
                aliasesClass: aliasesClass,
                addHoverDom: realTimeVideLoad.addHoverDom,
                removeHoverDom: realTimeVideLoad.removeHoverDom
            },
            check: {
                enable: false
            },
            data: {
                simpleData: {
                    enable: true
                },
                key: {
                    title: "name"
                }
            },
            callback: {
                beforeAsync: realTimeVideLoad.zTreeBeforeAsync,
                onClick: realTimeVideLoad.onClickV,
                beforeDblClick: realTimeVideLoad.zTreeBeforeDblClick,
                onDblClick: realTimeVideLoad.onDbClickV,
                onAsyncSuccess: realTimeVideLoad.zTreeOnAsyncSuccess,
                onExpand: realTimeVideLoad.zTreeOnExpand,
                onRightClick: realTimeVideLoad.zTreeShowRightMenu,
                onNodeCreated: realTimeVideLoad.zTreeOnNodeCreated
            }
        };
        $.fn.zTree.init($("#vTreeList"), setting);
    },

    // 处理报警
    updataRealAlarmMessage: function (data) {
        var jsonStr = data.body;
        var obj = JSON.parse(jsonStr);
        var type = obj.desc.type;
        var protocolType = obj.data.msgBody.protocolType; //协议类型
        // 判断用户是否有监控对象的权限
        if ($.inArray(obj.desc.monitorId, diyueall) != -1
            && protocolType !== undefined && protocolType !== null
            && (protocolType.toString() == "1" || protocolType.toString() == "11" || protocolType.toString() == "12" || protocolType.toString() == "13"
                || protocolType.toString() == "14"|| protocolType.toString() == "15"|| protocolType.toString() == "16"|| protocolType.toString() == "17"|| protocolType.toString() == "18")) {
            // 报警更新方法
            realTimeVideLoad.updateAlarmInfoTable(obj);
        }
    },
    //解析报警位置信息
    getAlarmAddress: function (vId, latitude, longitude) {
        var vid = vId;
        var url = '/clbs/v/monitoring/address';
        var param = {addressReverse: [latitude, longitude, '', "", 'vehicle']};

        $.ajax({
            type: "POST",//通常会用到两种：GET,POST。默认是：GET
            url: url,//(默认: 当前页地址) 发送请求的地址
            dataType: "json", //预期服务器返回的数据类型。"json"
            async: true, // 异步同步，true  false
            data: param,
            traditional: true,
            timeout: 8000, //超时时间设置，单位毫秒
            success: function (data) {//请求成功
                $('#alarmRecordDataTable td[data-id="' + vid + '"]').closest('tr').find('td:last-child').html($.isPlainObject(data) ? '未定位' : data);
            },
        });
    },
    // 报警记录数据更新
    updateAlarmInfoTable: function (position) {
        // console.log(position, '???报警记录-实时视频')
        var msgBody = position.data.msgBody;
        var msgDesc = position.desc;
        var monitorInfo = position.data.msgBody.monitorInfo;
        var alarmSource = msgBody.alarmSource;
        //判断集合是否为空 (此方法用于地图显示监控对象信息框)
        var monitorId = monitorInfo.monitorId;//监控对象id
        var alarmName = msgBody.alarmName;//报警名称
        if (alarmInfoList.isEmpty()) {
            alarmInfoList.put(monitorId, alarmName);
        } else {
            if (alarmInfoList.containsKey(monitorId)) {
                alarmInfoList.remove(monitorId);
                alarmInfoList.put(monitorId, alarmName);
            } else {
                alarmInfoList.put(monitorId, alarmName);
            }
        }
        //车报警
        var monitorName = monitorInfo.monitorName;//监控对象
        var groupName = monitorInfo.assignmentName;//分组名称
        //var addresss = msgBody.formattedAddress;//位置信息
        var addresss = '<a onclick="realTimeVideLoad.getAlarmAddress(\'' + monitorId + '\',' + msgBody.latitude + ',' + msgBody.longitude + ')">点击获取位置信息</a>';//位置信息
        var deviceNumber = monitorInfo.deviceNumber;//终端编号
        var simcardNumber = monitorInfo.simcardNumber;//SIM卡号
        var alarmNumber = msgBody.globalAlarmSet;//报警编号
        var msgSN = msgBody.swiftNumber;//流水号
        /*var plateColor = monitorInfo.plateColorName;//车牌颜色
        if (plateColor == "null" || plateColor == null) {
            plateColor = '';
        }*/

        var plateColor = getPlateColor(monitorInfo.plateColor);//车牌颜色

        var monitorType = monitorInfo.monitorType;//监控对象类型
        switch (monitorType) {
            case 0:
                monitorType = '车';
                break;
            case 1:
                monitorType = '人';
                break;
            case 2:
                monitorType = '物';
                break;
            default:
                monitorType = '';
                break;
        }
        var fenceType = msgBody.fenceType;//围栏类型
        /*if (fenceType == "zw_m_polygon") {
        fenceType = "多边形";
    } else if (fenceType == "zw_m_rectangle") {
        fenceType = "矩形";
    } else if (fenceType == "zw_m_line") {
        fenceType = "路线";
    } else if (fenceType == "zw_m_circle") {
        fenceType = "圆形";
    } else if (fenceType == "zw_m_administration") {
        fenceType = "行政区划";
    } else {
        fenceType = "";
    }*/
        var fenceName = msgBody.fenceName;//围栏名称
        //报警时间
        var alarmTime;
        var time = msgBody.gpsTime;
        var earlyAlarmStartTime = msgBody.earlyAlarmStartTimeStr;
        if (time.length == 12) {
            alarmTime = 20 + time.substring(0, 2) + "-" + time.substring(2, 4) + "-" + time.substring(4, 6) + " " +
                time.substring(6, 8) + ":" + time.substring(8, 10) + ":" + time.substring(10, 12);
        } else {
            alarmTime = "时间异常";
        }
        if (addresss == "" || addresss == null || addresss == 'null' || addresss == "[]") {
            addresss = "位置描述获取失败";
        }
        //获取从业人员名称
        var pName = msgBody.monitorInfo.professionalsName;
        var speed = msgBody.speed ? noZero(msgBody.speed.toString()) : "-"; //报警开始速度
        var recorderSpeed = msgBody.recorderSpeed ? noZero(msgBody.recorderSpeed.toString()) : "-"; //行车记录仪速度
        var alarm = [
            0,
            monitorName == "" ? "-" : monitorName,
            alarmTime,
            (groupName == "" || groupName == undefined) ? '未绑定分组' : groupName,
            monitorType,
            plateColor,
            alarmName,
            (pName == "null" || pName == null || pName == undefined) ? "-" : pName,
            (fenceType == "null" || fenceType == null || fenceType == undefined) ? "-" : fenceType,
            (fenceName == "null" || fenceName == null || fenceName == undefined) ? "-" : fenceName,
            addresss,
            '',
            simcardNumber,
            deviceNumber,
            msgSN,
            alarmNumber,
            alarmSource,
            speed,
            recorderSpeed,
            monitorId
        ];

        // 报警类型添加到信息窗口信息
        if (objImformationMap.containsKey(monitorId)) {
            var value = objImformationMap.get(monitorId);
            value[29] = alarmName;
            // value.push(alarmStr);
            objImformationMap.remove(monitorId);
            objImformationMap.put(monitorId, value);
        }

        realTimeVideLoad.dataTableList(alarmName, alarm, "alarmRecordDataTable", earlyAlarmStartTime);
    },
    //表格插入数据
    dataTableList: function (array, data, id, earlyAlarmStartTime) {

        var dataMsg = data;
        var html = '';
        var dataString;
        // 列表不存在记录  添加
        if (alarmName.indexOf(dataMsg[dataMsg.length - 1]) == -1) {
            dataString = '"' + dataMsg[1] + "|" + dataMsg[2] + "|" + dataMsg[3] + "|" + dataMsg[4] + "|" + dataMsg[5] + "|" + dataMsg[6] + "|" + dataMsg[7] + "|" + dataMsg[11] + "|" + dataMsg[12] + "|" + dataMsg[13] + "|" + dataMsg[14] + "|" + dataMsg[15] + "|" + dataMsg[16] + "|" + dataMsg[17] + '"';
            alarmString = '' + dataMsg[1] + "|" + dataMsg[2] + "|" + dataMsg[3] + "|" + dataMsg[4] + "|" + dataMsg[5] + "|" + dataMsg[6] + "|" + dataMsg[7] + "|" + dataMsg[11] + "|" + dataMsg[12] + "|" + dataMsg[13] + "|" + dataMsg[14] + "|" + dataMsg[15] + "|" + dataMsg[16] + "|" + dataMsg[17] + '';
            dataMsg[0] = alarmIndex;
            html = realTimeVideLoad.tableListHtml(dataMsg, dataString, earlyAlarmStartTime);
        }
        if (alarmName.length == 0) {
            var htmlString = '<tr>' + html + '</tr>';
            $("#" + id).children("tbody").append(htmlString);
            realTimeVideLoad.layoutChange();
            alarmName.push(dataMsg[dataMsg.length - 1]);
            alarmIndex++;
        } else {
            // 列表存在记录  更新
            if (alarmName.indexOf(dataMsg[dataMsg.length - 1]) != -1) {
                $("#" + id).children("tbody").children("tr").each(function () {
                    if ($(this).children("td:nth-child(2)").attr('data-id') == dataMsg[dataMsg.length - 1]) {
                        var index = $(this).children("td:nth-child(1)").text();
                        dataMsg[0] = index;
                        var alarmTime = $(this).children("td:nth-child(3)").text();
                        if (alarmTime == dataMsg[2]) {
                            var alarmTypeStrs = $(this).children("td:nth-child(8)").attr('data-alarmType');
                            var alarmTypeName = $(this).children("td:nth-child(8)").text();
                            if (alarmTypeStrs != dataMsg[15] && alarmTypeName != dataMsg[6]) {
                                dataMsg[6] = alarmTypeName + "," + dataMsg[6];
                                if (realTimeVideLoad.endsWith(alarmTypeStrs, ",")) {
                                    dataMsg[15] = alarmTypeStrs + dataMsg[15];
                                } else {
                                    dataMsg[15] = alarmTypeStrs + "," + dataMsg[15];
                                }
                                // 报警类型添加到信息窗口信息
                                if (objImformationMap.containsKey(dataMsg[17])) {
                                    var value = objImformationMap.get(dataMsg[17]);
                                    value[29] = dataMsg[6];
                                    objImformationMap.remove(dataMsg[17]);
                                    objImformationMap.put(dataMsg[17], value);
                                }

                            }
                        }
                        dataString = '"' + dataMsg[1] + "|" + dataMsg[2] + "|" + dataMsg[3] + "|" + dataMsg[4] + "|" + dataMsg[5] + "|" + dataMsg[6] + "|" + dataMsg[7] + "|" + dataMsg[11] + "|" + dataMsg[12] + "|" + dataMsg[13] + "|" + dataMsg[14] + "|" + dataMsg[15] + "|" + dataMsg[16] + "|" + dataMsg[17] + '"';
                        alarmString = '' + dataMsg[1] + "|" + dataMsg[2] + "|" + dataMsg[3] + "|" + dataMsg[4] + "|" + dataMsg[5] + "|" + dataMsg[6] + "|" + dataMsg[7] + "|" + dataMsg[11] + "|" + dataMsg[12] + "|" + dataMsg[13] + "|" + dataMsg[14] + "|" + dataMsg[15] + "|" + dataMsg[16] + "|" + dataMsg[17] + '';
                        html = realTimeVideLoad.tableListHtml(dataMsg, dataString, earlyAlarmStartTime);
                        $(this).html(html);
                    }
                    ;
                });
            } else {
                //表格数据判断报警数据最新推送排第一  更新数据除外
                var htmlString = '<tr>' + html + '</tr>';
                $("#" + id).children("tbody").prepend(htmlString);
                realTimeVideLoad.layoutChange();
                realTimeVideLoad.tableRank(id);
                alarmName.push(dataMsg[dataMsg.length - 1]);
                alarmIndex++;
            }
        }
        realTimeVideLoad.alarmInfoDataDbclick();
    },

    // 报警记录单双击
    alarmInfoDataDbclick: function () {
        var thisID = "alarmRecordDataTable";
        $("#" + thisID).children("tbody").children("tr").unbind("dblclick").bind("dblclick", function () {
            var alarmVid;
            var timeFormat;
            var alarmStr;
            //获取当前点击行相对应的值
            alarmVid = $(this).children("td:nth-child(2)").attr("data-id");
            timeFormat = $(this).children("td:nth-child(3)").text();
            alarmStr = $(this).children("td:nth-child(8)").text();
            var earlyAlarmStartTime = $(this).children("td:nth-child(3)").attr("data-type");
            var alarmTypeArr = $(this).children("td:nth-child(8)").attr("data-alarmtype");
            // 判断是否有报警查询的菜单权限
            var alarmFlag = false;
            var permissionUrls = $("#permissionUrls").val();
            if (permissionUrls != null && permissionUrls != undefined) {
                var urllist = permissionUrls.split(",");
                if (urllist.indexOf("/a/search/list") > -1) {
                    alarmFlag = true;
                    //跳转
                    if (earlyAlarmStartTime == null || typeof(earlyAlarmStartTime) == "undefined" || earlyAlarmStartTime == 0) {
                        earlyAlarmStartTime = timeFormat;
                    }
                    location.href = "/clbs/a/search/list?avid=" + alarmVid + "&atype=0" + "&atime=" + earlyAlarmStartTime + "&alarmTypeArr=" + alarmTypeArr;
                }
            }
            if (!alarmFlag) {
                layer.msg("无操作权限，请联系管理员");
            }
        });
    },

    //所有table重新排序
    tableRank: function (id) {
        var index = 1;
        $("#" + id).children("tbody").children("tr").each(function () {
            $(this).children("td:nth-child(1)").text(index);
            index++;
        });
    },
    endsWith: function (val, str) {
        var reg = new RegExp(str + "$");
        return reg.test(val);
    },
    //数据表格html组装
    tableListHtml: function (dataMsg, dataString, earlyAlarmStartTime) {
        var html = '';
        var this_id = dataMsg[dataMsg.length - 1];
        // if (dataMsg[4] == '人') {
        // html += "<td>" + dataMsg[0] + "</td><td data-id='" + this_id + "'>" + dataMsg[1] + "</td><td>" + dataMsg[7] + "</td><td onClick='realTimeVideLoad.warningManage(" + dataString + ")' style='color:#2ca2d1;'>未处理</td><td>" + dataMsg[2] + "</td><td>" + dataMsg[3] + "</td><td>" + dataMsg[4] + "</td><td>" + dataMsg[5] + "</td><td>" + dataMsg[6] + "</td><td>" + dataMsg[8] + "</td><td>" + dataMsg[9] + "</td><td>" + dataMsg[10] + "</td>";
        // } else {
        if (alarmRole) {
            html += "<td>" + dataMsg[0] + "</td><td data-id='" + this_id + "'>" + dataMsg[1] + "</td><td data-type='" + earlyAlarmStartTime + "'>" + dataMsg[2] + "</td><td onClick='realTimeVideLoad.warningManage(" + dataString + ")' style='color:#2ca2d1;'>未处理</td><td>" + dataMsg[3] + "</td><td>" + dataMsg[4] + "</td><td>" + dataMsg[5] + "</td><td data-alarmType='" + (realTimeVideLoad.endsWith(dataMsg[15], ",") ? dataMsg[15] : dataMsg[15] + ",") + "'>" + dataMsg[6] + "</td><td>"+ dataMsg[17]+"</td><td>"+ dataMsg[18]+"</td><td>" + dataMsg[7] + "</td><td>" + dataMsg[8] + "</td><td>" + dataMsg[9] + "</td><td>" + dataMsg[10] + "</td>";
        } else {
            html += "<td>" + dataMsg[0] + "</td><td data-id='" + this_id + "'>" + dataMsg[1] + "</td><td data-type='" + earlyAlarmStartTime + "'>" + dataMsg[2] + "</td><td>未处理</td><td>" + dataMsg[3] + "</td><td>" + dataMsg[4] + "</td><td>" + dataMsg[5] + "</td><td data-alarmType='" + (realTimeVideLoad.endsWith(dataMsg[15], ",") ? dataMsg[15] : dataMsg[15] + ",") + "'>" + dataMsg[6] + "</td><td>"+ dataMsg[17]+"</td><td>"+ dataMsg[18]+"</td><td>" + dataMsg[7] + "</td><td>" + dataMsg[8] + "</td><td>" + dataMsg[9] + "</td><td>" + dataMsg[10] + "</td>";
        }
        // }
        setTimeout(function () {
            $(".demoUp").mouseover(function () {
                var _this = $(this);
                if (_this.attr("alt")) {
                    _this.justToolsTip({
                        animation: "moveInTop",
                        width: "auto",
                        contents: _this.attr("alt"),
                        gravity: 'top'
                    });
                }
            })
        }, 1000)
        return html;
    },

    //报警处理
    warningManage: function (data) {
        $('.sendTextFooter').hide();
        $('.takePicturesFooter').hide();
        $("#alarm-remark").show();
        $("#smsTxt").val("");
        $("#time").val("");
        $("#alarmRemark").val("");
        ;
        layer.closeAll();
        $('#warningManage').modal('show');
        var dataArray = data.split('|');
        var url = "/clbs/v/monitoring/getDeviceTypeByVid";
        var data = {"vehicleId": dataArray[13]};
        var warningType = "";
        json_ajax("POST", url, "json", false, data, function (result) {
            warningType = result.obj.warningType;
            deviceTypeTxt = result.obj.deviceType;
        });
        var alarmType = dataArray[11].split(',');
        if (deviceTypeTxt == '11') {
            $('.newDeviceInfo').show();
            $('.oldDeviceInfo').hide();
            $('#minResolution, #maxResolution').show();
            $('#defaultValue').attr('selected', false);
        } else {
            $('.newDeviceInfo').hide();
            $('.oldDeviceInfo').show();
            $('#minResolution, #maxResolution').hide();
            $('#defaultValue').attr('selected', true);
        }

        for (var i = 0; i < alarmType.length; i++) {
            var flag = $.inArray(alarmType[i], alarmTypeList);
            if (flag != -1) {
                $("#warningManageListening").attr("disabled", "disabled");
                $("#warningManagePhoto").attr("disabled", "disabled");
                $("#warningManageSend").attr("disabled", "disabled");
                $("#warningManageAffirm").attr("disabled", "disabled");
                $("#warningManageFuture").attr("disabled", "disabled");
                $("#warningManageCancel").attr("disabled", "disabled");
                $("#color").show();
                $("#color").text(alarmDisabled);
                break;
            }
        }
        var url1 = "/clbs/a/search/findEndTime";
        var data1 = {"vehicleId": dataArray[13], "type": dataArray[11], "startTime": dataArray[1]};
        layer.load(2);
        json_ajax("POST", url1, "json", true, data1, function (result) {
            if (result.success == true) {
                if (result.msg == "0") {
                    $("#color").show();
                    $("#color").text(alarmError);
                    $("#warningManageListening").attr("disabled", "disabled");
                    $("#warningManagePhoto").attr("disabled", "disabled");
                    $("#warningManageSend").attr("disabled", "disabled");
                    $("#warningManageAffirm").attr("disabled", "disabled");
                    $("#warningManageFuture").attr("disabled", "disabled");
                    $("#warningManageCancel").attr("disabled", "disabled");
                } else {
                    $("#color").show();
                    $("#color").text(alarmDisabled);
                }
            } else {
                $("#warningManageListening").removeAttr("disabled");
                $("#warningManagePhoto").removeAttr("disabled");
                $("#warningManageSend").removeAttr("disabled");
                $("#warningManageAffirm").removeAttr("disabled");
                $("#warningManageFuture").removeAttr("disabled");
                $("#warningManageCancel").removeAttr("disabled");
                $("#color").hide();
                $("#colorMore").hide();
                layer.closeAll();
            }
        });
        $("#listeningContent,#takePicturesContent,#sendTextMessages").hide();
        if (warningType == true || dataArray[3] == "人" || dataArray[12] == "1") {
            $("#warningHiden").removeAttr("style");
            $("#warningManageListening").hide();
            $("#warningManagePhoto").hide();
            $("#warningManageSend").hide();
            $("#sno").val("0");
        } else {
            $("#warningHiden").attr("style", "text-align:center");
            $("#warningManageListening").show();
            $("#warningManagePhoto").show();
            $("#warningManageSend").show();
            $("#sno").val(dataArray[10]);
        }
        $("#warningCarName").text(dataArray[0]);
        $("#warningTime").text(dataArray[1]);
        $("#warningGroup").text(dataArray[2]);
        $("#warningDescription").text(dataArray[5]);
        $("#warningPeo").text(dataArray[6]);
        $("#simcard").val(dataArray[8]);
        $("#device").val(dataArray[9]);
        $("#warningType").val(dataArray[11]);
        $("#vUuid").val(dataArray[13]);
        var url = "/clbs/v/monitoring/getAlarmParam";
        var parameter = {"vehicleId": dataArray[13], "alarm": dataArray[5]};
        json_ajax("POST", url, "json", true, parameter, realTimeVideLoad.getAlarmParam);
    },

    // 获取报警信息
    getAlarmParam: function (data) {
        $(".warningDeal").hide();
        var len = data.obj.length;
        var valueList = data.obj;
        if (len != 0) {
            for (var i = 0; i < len; i++) {
                var name = valueList[i].name;
                var value = valueList[i].parameterValue;
                var paramCode = valueList[i].paramCode;
                if (name == "超速预警") {
                    $("#overSpeedGap").show();
                    $("#overSpeedGapValue").text(value);
                }
                ;
                if (name == "疲劳驾驶预警") {
                    $("#tiredDriveGap").show();
                    $("#tiredDriveGapValue").text(value);
                }
                ;
                if (name == "碰撞预警") {
                    $("#crashWarning").show();
                    if (paramCode == "param1") {
                        $("#crashTime").text(value);
                    } else if (paramCode == "param2") {
                        $("#crashSpeed").text(value);
                    }
                }
                ;
                if (name == "侧翻预警") {
                    $("#turnOnWarning").show();
                    $("#turnOnValue").text(value);
                }
                ;
                if (name == "超速报警") {
                    $("#overSpeeds").show();
                    if (paramCode == "param1") {
                        $("#warningSpeed").text(value);
                    } else if (paramCode == "param2") {
                        $("#warningAllTime").text(value);
                    }
                }
                ;
                if (name == "疲劳驾驶") {
                    $("#tiredDrive").show();
                    if (paramCode == "param1") {
                        $("#continuousDriveTime").text((value && value !== "null") ? value : "");
                    } else if (paramCode == "param2") {
                        $("#breakTime").text(value);
                    }
                }
                ;
                if (name == "当天累积驾驶超时") {
                    $("#addUpDrive").show();
                    $("#addUpDriveTime").text(value);
                }
                ;
                if (name == "超时停车") {
                    $("#overTimeStop").show();
                    $("#overTimeStopTime").text(value);
                }
                ;
                if (name == "凌晨2-5点行驶报警") {
                    $("#earlyRun").show();
                    $("#earlyRunValue").text(value);
                }
                ;
                if (name == "车辆非法位移") {
                    $("#displacementCar").show();
                    $("#displacementCarDistance").text(value);
                }
                ;
                if (name == "车机疑似屏蔽报警") {
                    $("#shieldWarning").show();
                    if (paramCode == "param1") {
                        $("#offLineTime").text(value);
                    } else if (paramCode == "param2") {
                        $("#offLineStartTime").text(value);
                    } else if (paramCode == "param3") {
                        $("#offLineEndTime").text(value);
                    }
                }
                ;
            }
            ;
        }
        ;
    },

    distinguishPushAlarmSet: function (alarmSetType, msgBody) {
        //报警数据 围栏名称及类型
        var gpsAttachInfoList = msgBody.gpsAttachInfos;
        if (gpsAttachInfoList != undefined) {
            for (var i = 0; i < gpsAttachInfoList.length; i++) {
                var gpsAttachInfoID = gpsAttachInfoList[i].gpsAttachInfoID;
                // 17 围栏内超速
                if (gpsAttachInfoID == 17) {
                    if (gpsAttachInfoList[i].speedAlarm != undefined) {
                        var stype = gpsAttachInfoList[i].speedAlarm.type;
                        alarmFanceType = realTimeVideLoad.getAlarmFanceIdAndType(stype);
                        var alarmFanceIds = gpsAttachInfoList[i].speedAlarm.lineID;
                        if (alarmFanceIds != null && alarmFanceIds != undefined && alarmFanceIds != "") {
                            alarmFanceId = realTimeVideLoad.getFanceNameByFanceIdAndVid(msgBody.vehicleInfo.id, alarmFanceIds);
                        }
                    }
                }
                // 18 进出围栏
                else if (gpsAttachInfoID == 18) {
                    if (gpsAttachInfoList[i].lineOutAlarm != undefined) {
                        var ltype = gpsAttachInfoList[i].lineOutAlarm.type;
                        alarmFanceType = realTimeVideLoad.getAlarmFanceIdAndType(ltype);
                        var alarmFanceIds = gpsAttachInfoList[i].lineOutAlarm.lineID;
                        if (alarmFanceIds != null && alarmFanceIds != undefined && alarmFanceIds != "") {
                            alarmFanceId = realTimeVideLoad.getFanceNameByFanceIdAndVid(msgBody.vehicleInfo.id, alarmFanceIds);
                        }
                    }
                }
                // 19 过长 不足
                else if (gpsAttachInfoID == 19) {
                    if (gpsAttachInfoList[i].timeOutAlarm != undefined) {
                        var ttype = gpsAttachInfoList[i].timeOutAlarm.type;
                        alarmFanceType = realTimeVideLoad.getAlarmFanceIdAndType(ttype);
                        var alarmFanceIds = gpsAttachInfoList[i].timeOutAlarm.lineID;
                        if (alarmFanceIds != null && alarmFanceIds != undefined && alarmFanceIds != "") {
                            alarmFanceId = realTimeVideLoad.getFanceNameByFanceIdAndVid(msgBody.vehicleInfo.id, alarmFanceIds);
                        }
                    }
                }
            }

        }
    },

    // 围栏类型判断
    getAlarmFanceIdAndType: function (types) {
        if (types != undefined) {
            if (types == 1) {
                alarmFanceType = "圆形";
            } else if (types == 2) {
                alarmFanceType = "矩形";
            } else if (types == 3) {
                alarmFanceType = "多边形";
            } else if (types == 4) {
                alarmFanceType = "路线";
            }
            return alarmFanceType;
        }
    },

    //根据围栏Id及车Id查询围栏名称
    getFanceNameByFanceIdAndVid: function (vid, fcid) {

    },

    // ztree 预处理函数
    ajaxDataFilter: function (treeId, parentNode, responseData) {
        if (isTreeState) {
            responseData = JSON.parse(ungzip(responseData));
        }
        if ($('#search_condition').val() != '') {
            responseData = filterQueryResult(responseData, null);
        }
        return responseData;
    },

    // ztree 鼠标移上显示
    addHoverDom: function (treeId, treeNode) {
        if (treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') {
            var online_state = $('#' + treeNode.tId + '_span').hasClass('obj_select_online');
            var heartBeat_state = $('#' + treeNode.tId + '_span').hasClass('obj_select_heartbeat');
            if (online_state || heartBeat_state) {
                var aObj = $("#" + treeNode.tId + "_span");
                if ($("#deleteBtn_" + treeNode.id).length > 0) return;
                var editStr = "<span class='button video_close_ico' id='deleteBtn_" + treeNode.id + "' title='关闭'></span>";
                aObj.after(editStr);
                var btn = $("#deleteBtn_" + treeNode.id);
                if (btn) {
                    btn.bind("click", function () {
                        realTimeVideLoad.videoCloseFun(treeNode)
                    });
                }
            }
        }
    },

    // ztree 鼠标 移出
    removeHoverDom: function (treeId, treeNode) {
        if (treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') {
            $("#deleteBtn_" + treeNode.id).unbind().remove();
            infoWindow.close();
        }
    },

    // 异步加载之前的事件回调函数
    zTreeBeforeAsync: function () {
        return asyncFlag;
    },

    // ztree 单击事件
    onClickV: function (event, treeId, treeNode) {
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        treeObj.cancelSelectedNode(treeNode);
        if (treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') {
            $('.node_name').removeClass('obj_select');
            $('#' + treeNode.tId + '_span').addClass('obj_select');
        }

        var onlineState = $('#' + treeNode.tId + '_span').hasClass('obj_select_online');
        var heartbeatSate = $('#' + treeNode.tId + '_span').hasClass('obj_select_heartbeat');
        if (onlineState || heartbeatSate) {
            if (monitoringObjFocusId !== treeNode.id) {
                // 清除上一个聚焦跟踪对象
                if (monitoringObjFocusId !== undefined) {
                    realTimeVideLoad.objInfoUpdate(treeNode.id);
                    // 隐藏之前的marker信息
                    if (monitoringObjMap.containsKey(monitoringObjFocusId)) {
                        var marker = monitoringObjMap.get(monitoringObjFocusId);
                        if (marker !== null) {
                            marker.stopMove();
                            marker.hide();
                        }
                    }

                    if (monitoringObjNameMap.containsKey(monitoringObjFocusId)) {
                        var nameMarker = monitoringObjNameMap.get(monitoringObjFocusId);
                        nameMarker.hide();
                    }

                    monitoringObjFocusId = treeNode.id;

                    // 显示当前点击的marker信息
                    if (monitoringObjMap.containsKey(treeNode.id)) {
                        var newMarker = monitoringObjMap.get(treeNode.id);
                        if (newMarker !== null) {
                            newMarker.show();
                            videoMap.setCenter(newMarker.getPosition());
                        }
                    }
                    if (monitoringObjNameMap.containsKey(treeNode.id)) {
                        var newNameMarker = monitoringObjNameMap.get(treeNode.id);
                        newNameMarker.show();
                    }
                } else {
                    monitoringObjFocusId = treeNode.id;
                    realTimeVideLoad.objInfoUpdate(treeNode.id);
                    // 显示当前点击的marker信息
                    if (monitoringObjMap.containsKey(treeNode.id)) {
                        var newMarker = monitoringObjMap.get(treeNode.id);
                        if (newMarker !== null) {
                            newMarker.show();
                            videoMap.setCenter(newMarker.getPosition());
                        }
                    }

                    if (monitoringObjNameMap.contains(treeNode.id)) {
                        var newNameMarker = monitoringObjNameMap.get(treeNode.id);
                        newNameMarker.show();
                    }
                }
            }
        }
    },

    // ztree 双击前回掉函数
    zTreeBeforeDblClick: function (event, treeNode) {
        if (treeNode !== null) {
            var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
            treeObj.cancelSelectedNode(treeNode);
            var state = false;
            if (treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people' || treeNode.type === 'channel') {
                var id = (treeNode.type == 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') ? treeNode.tId : treeNode.parentTId;
                // var index = $('#' + id + '_ico').attr('class').indexOf('vehicleSkin');
                if ($('#' + id + '_ico').attr('class').indexOf('vehicleSkin') == -1 &&
                    $('#' + id + '_ico').attr('class').indexOf('peopleSkin') == -1 &&
                    $('#' + id + '_ico').attr('class').indexOf('icon-offline') == -1) {
                    state = true;
                }
            }
            return state;
        }
    },

    // ztree 双击事件
    onDbClickV: function (event, treeId, treeNode) {
        var tid = (treeNode.type == 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') ? treeNode.tId : treeNode.parentTId;
        var id = (treeNode.type == 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') ? treeNode.id : treeNode.vehicleId;
        var onlineState = $('#' + tid + '_span').hasClass('obj_select_online');
        var heartbeatState = $('#' + tid + '_span').hasClass('obj_select_heartbeat');
        $('.node_name').removeClass('obj_select');
        $('#' + tid + '_span').addClass('obj_select');
        if (!(onlineState || heartbeatState)) {
            var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
            var nodes = treeObj.getNodesByParam('id', id, null);
            console.log('实时视频监控对象id', tid + '_ico');
            var index = $('#' + tid + '_ico').attr('class').indexOf('icon-online');
            // 改变监控对象颜色
            for (var i = 0, len = nodes.length; i < len; i++) {
                if (index !== -1) {
                    $('#' + nodes[i].tId + '_span').addClass('obj_select_online');
                } else {
                    $('#' + nodes[i].tId + '_span').addClass('obj_select_heartbeat');
                }
            }
        }
        if (monitoringObjFocusId !== id) {
            // 清除上一个聚焦跟踪对象
            if (monitoringObjFocusId !== undefined) {
                if (monitoringObjMap.containsKey(monitoringObjFocusId)) {
                    var marker = monitoringObjMap.get(monitoringObjFocusId);
                    if (marker !== null) {
                        marker.stopMove();
                        marker.hide();
                    }
                }

                if (monitoringObjNameMap.containsKey(monitoringObjFocusId)) {
                    var nameMarker = monitoringObjNameMap.get(monitoringObjFocusId);
                    nameMarker.hide();
                }
            }

            monitoringObjFocusId = id;

            // 订阅
            realTimeVideLoad.vehicleLoctionFun(treeNode);
        }

        // 获取监控对象的逻辑通道号
        if ((treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') && treeNode.children === undefined) {
            var url = '/clbs/realTimeVideo/video/getChannels';
            var data = {'vehicleId': treeNode.id, 'isChecked': false};
            json_ajax("POST", url, "json", false, data, function (info) {
                realTimeVideLoad.getGroupList(info, treeNode, true)
            });
        }

        // 视频订阅逻辑
        realTimeVideLoad.subscribeVideoFun(treeNode);

        //传递车ID及通道号参数到云台功能函数
        haeundaeVehicleId = id;//云台功能使用车ID信息
        haeundaeChannelNum = "";//云台功能视频通道号
        haeundaeZtreeIsCheck = true;//车辆树双击订阅flag
        $("#haeundaeBrand").text(treeNode.name);//云台 车牌号显示
    },

    // 视频订阅逻辑
    subscribeVideoFun: function (treeNode) {
        // 视频订阅
        var userName = $("#userName").text();
        var vehicleId; // 车id
        var simcardNumber;
        var brand;
        var vehicleColor;
        if (treeNode.type == 'channel') {
            var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
            var node = treeObj.getNodeByParam('id', treeNode.pId, null);
            simcardNumber = node.simcardNumber; // 电话号码
            brand = node.name; // 车牌号
            vehicleColor = node.plateColor; // 车牌颜色
            vehicleId = treeNode.vehicleId
        } else {
            simcardNumber = treeNode.simcardNumber; // 电话号码
            brand = treeNode.name; // 车牌号
            vehicleColor = treeNode.plateColor; // 车牌颜色
            vehicleId = treeNode.id
        }

        // 视频逻辑通道号
        var channelNumber = (treeNode.type == 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') ? treeNode.children : [treeNode];

        var dblclickType = (treeNode.type == 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') ? 'VEHICLE' : 'CHANNEL';

        // 打开视频布局样式
        realTimeVideLoad.openVideoArea(channelNumber, treeNode.type);

        // 逻辑通道号数组
        realTimeVideLoad.videoDelayGet(userName, vehicleId, simcardNumber, brand, vehicleColor, channelNumber, dblclickType);
    },

    // 视频请求订阅逻辑
    videoDelayGet: function (userName, vehicleId, simcardNumber, brand, vehicleColor, channelNumber, dblclickType) {
        if (channelNumber.length > 0) {
            var subscribeList = [];
            var channelArray = [];
            var isChannelPlay = false;
            for (var i = 0; i < channelNumber.length; i++) {
                if (channelNumber[i].channelType != 1) { // 不等于音频
                    var id = vehicleId + '-' + channelNumber[i].logicChannel;
                    if (!subscribeVideoMap.containsKey(id)) {
                        var list = {};
                        list.vehicleId = vehicleId;
                        list.requestType = 0;
                        list.channelNum = channelNumber[i].logicChannel;
                        list.mobile = simcardNumber;
                        list.orderType = 11;
                        list.streamType = channelNumber[i].streamType;
                        list.channelType = channelNumber[i].channelType;
                        subscribeList.push(list);
                        channelArray.push(channelNumber[i].logicChannel);
                    } else {
                        isChannelPlay = true;
                    }
                }
            }

            // 改变ztree树节点的颜色状态
            realTimeVideLoad.setChannelState(vehicleId, channelArray);
            // 如果监控对象没有音视频和视频类型通道号
            if (subscribeList.length > 0) {
                realTimeVideLoad.cancelVideo(vehicleId, dblclickType);
                var subscribeListStr = JSON.stringify(subscribeList);
                var url = '/clbs/realTimeVideo/video/sendParamByBatch';
                var data = {videoInfoListStr: subscribeListStr};
                json_ajax("POST", url, "json", true, data, function (info) {
                    realTimeVideLoad.subscribeVideoDataAssemble(info, subscribeList);
                });
            } else if (!isChannelPlay) {
                // layer.msg(brand + '未设置音视频或视频类型通道号');
                layer.msg('请设置或双击音视频/视频类型通道号');
            }
        } else {
            layer.msg(brand + ' 未设置通道号');
        }
    },

    // 取消之前订阅的监控对象视频
    cancelVideo: function (vehicleId, dblclickType) {
        if (dblclickType === 'VEHICLE') {
            var cancelIds = [];
            var keys = subscribeVideoMap.keys();
            var closeVideoId = [];
            for (var i = 0; i < keys.length; i++) {
                var subValue = subscribeVideoMap.get(keys[i]);
                if (subValue[0] !== vehicleId) {
                    if (closeVideoId.indexOf(subValue[0]) === -1) {
                        closeVideoId.push(subValue[0]);
                    }
                    cancelIds.push(subValue[0]);
                    if (createVideoMap.containsKey(keys[i])) {
                        var videoObj = createVideoMap.get(keys[i]);
                        videoObj.closeSocket();
                        createVideoMap.remove(keys[i]);
                        subscribeVideoNum--;
                        if (subscribeVideoNum < 0) {
                            subscribeVideoNum = 0;
                        }
                    }
                }
            }
            if (closeVideoId.length > 0) {
                for (var j = 0; j < closeVideoId.length; j++) {
                    realTimeVideLoad.closeVideoFun(closeVideoId[j], 14);
                }
            }
        }
    },

    // 设置订阅通道订阅颜色改变
    setChannelState: function (id, channelArray) {
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        var nodes = treeObj.getNodesByParam('id', id, null);
        for (var x = 0; x < nodes.length; x++) {
            var childrenNodes = nodes[x].children;
            if (!!childrenNodes) {
                for (var y = 0; y < childrenNodes.length; y++) {
                    if (channelArray.indexOf(childrenNodes[y].logicChannel) !== -1) {
                        realTimeVideLoad.channelSubscribeChangeIco(treeObj, childrenNodes[y], true);
                    }
                }
            }
        }
    },

    // 订阅接口数据组装
    subscribeVideoDataAssemble: function (data, info) {

        var videoData = {
            vehicleId: '79af23a1-fe76-4ba0-8a6b-2cd7b5d36514',
            channelNum: '1',
            channelType: '0',
            mobile: '13566666666',
            streamType: 'h.264',
            domId: 'v_0_Source',
            unique: '111'
        };
        // var channelType = videoDataList.channelType;

        if (!$.isEmptyObject(videoData)) {
            // 待播放窗口添加状态
            $('#v_0_Source').attr('data-channel-up', 'true');
            var unique = '111';
            // var url = 'ws://192.168.88.130:1079/tsinglive/000001001916_51?type=1&duration=600'; //音频  设备：863000001001916  指令: 9101330200
            // var url = 'ws://192.168.88.130:1079/tsinglive/123450000005_5?type=1&duration=600';  //设备： 668623450000005  指令：9101020101
            var url = 'ws://192.168.88.130:1079/tsinglive/000001001916_2?type=1&duration=600'; //设备： 863000001001916  指令：9101020101




            var audioCode = 'g726';
            var videoObj = new MseVideoConversion(
                {
                    domId: 'v_0_Source',
                    url: url,
                    codingType: audioCode,
                    data: videoData,
                    // 开始播放
                    onPlaying: function ($state, $this) {
                        realTimeVideLoad.updateWaitTime();
                        realTimeVideLoad.videoPlaySuccess($state, $this);
                    },
                    // socket关闭成功
                    socketCloseFun: function ($state) {
                        realTimeVideLoad.videoCloseSuccess($state);
                    },
                    // 连接超时
                    timeoutFun: function ($state, number) {
                        if (number < 3) {
                            realTimeVideLoad.videoConnectTimeout($state);
                        } else {
                            layer.msg('终端未响应, 请尝试重新订阅');
                        }
                    }
                }
            );


        }

    },

    // 视频播放成功事件
    videoPlaySuccess: function (state, $this) {
        var vehicleId = state.vehicleId;
        var num = state.channelNum;
        var videoType = state.channelType;
        var videoId = state.domId;

        // 获取对应通道号的云台是否连接
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        var nodes = treeObj.getNodesByParam("id", vehicleId, null);
        var channelNode = [];
        for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].children !== undefined) {
                channelNode = nodes[j].children;
                break;
            }
        }

        var connectionState;
        for (var i = 0; i < channelNode.length; i++) {
            var value = channelNode[i];
            if (value.logicChannel === num) {
                connectionState = value.connectionFlag;
                break;
            }
        }
        // 给已经播放的视频标签添加属性
        $('#' + videoId).attr('vehicle-id', vehicleId)
            .attr('channel-num', num).attr('channel-type', videoType)
            .attr('connection-state', connectionState);
        $('#' + videoId).parent().append('<div class="video-modal ' + vehicleId + '"></div>');
        // 视频点击选中事件，用于云台下发
        $('.video-modal').off('click').on('click', realTimeVideLoad.videoModuleClickFn);
        // 视频双击事件，视频方法为1屏
        $('.video-modal').off('dblclick').on('dblclick', realTimeVideLoad.videoFullShow);
        // 视频右键绑定
        $('.video-modal').off('contextmenu').on('contextmenu', realTimeVideLoad.videoRightFun);

        realTimeVideLoad.logFindCilck();
    },

    // 视频关闭成功事件
    videoCloseSuccess: function (state) {
        var videoId = state.domId;
        var vehicleId = state.vehicleId;
        var num = state.channelNum;

        var channelType = state.channelType;
        var unique = state.unique;
        var data = {
            vehicleId: vehicleId,
            orderType: 14,
            channelNum: num,
            control: 0,
            closeVideoType: 0,
            changeStreamType: 0,
            channelType: channelType,
            requestType: 0,
            unique: unique
        };

        realTimeVideLoad.videoHandleFun(data);

        $('#' + videoId).parent('div').removeClass('full-video');
        $('#' + videoId).siblings('div.video-modal').remove();
        realTimeVideLoad.clearVideoInfo(vehicleId, num, 'TIMEOUT');

        var subId = vehicleId + '-' + num;
        subscribeVideoMap.remove(subId);
        subscribeVideoNum--;
        if (subscribeVideoNum < 0) {
            subscribeVideoNum = 0;
        }
    },

    // 视频请求超时重连
    videoConnectTimeout: function (state) {
        var subscribeList = [
            {
                vehicleId: state.vehicleId,
                requestType: 0,
                channelNum: state.channelNum,
                mobile: state.mobile,
                orderType: 11,
                streamType: state.streamType,
                channelType: state.channelType
            }
        ];
        var subscribeListStr = JSON.stringify(subscribeList);
        var url = '/clbs/realTimeVideo/video/sendParamByBatch';
        var data = {videoInfoListStr: subscribeListStr};
        json_ajax("POST", url, "json", true, data, function (info) {
            realTimeVideLoad.subscribeVideoDataAssemble(info, subscribeList);
            realTimeVideLoad.setChannelState(state.vehicleId, [state.channelNum]);
            // realTimeVideLoad.updateWaitTime();
        });
    },

    // ztree 加载成功事件
    zTreeOnAsyncSuccess: function (event, treeId, treeNode, msg) {
        // 联动报警跳转
        if (alarmGoState) {
            alarmGoState = false;
            var vid = realTimeVideLoad.GetAddressUrl('vid');
            if (!!vid) {
                var pid = realTimeVideLoad.GetAddressUrl('pid');
                var node = {'id': vid, 'pid': pid};
                realTimeVideLoad.vehicleLoctionFun(node);
            }
        }

        asyncFlag = false;
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        var notExpandNodeInit = treeObj.getNodesByFilter(assignmentNotExpandFilter);

        var initLen = 0;
        var initArr = [];
        for (var i = 0; i < notExpandNodeInit.length; i++) {
            initArr.push(i);
            initLen += notExpandNodeInit[i].children.length;
            if (initLen >= 400) {
                break;
            }
        }

        for (var j = 0; j < initArr.length; j++) {
            if (notExpandNodeInit[j].type === 'assignment' && notExpandNodeInit[j].children != undefined) {
                treeObj.expandNode(notExpandNodeInit[j], true, false, false, true);
            } else {
                if ($('#search_condition').val() != '') {
                    treeObj.hideNode(notExpandNodeInit[j]);
                }
            }
        }

        // 实时监控跳转在线车辆筛选
        if (notExpandNodeInit.length > 0) {
            if (gotoRealTimeVideo) {
                var treeNode = treeObj.getNodeByParam("id", urlRewriteVideoId, null);
                if (treeNode != null){
                    realTimeVideLoad.onDbClickV(null, null, treeNode); // 测试代码
                }
                /*if (treeNode != null) {
                    gotoRealTimeVideo = false;
                    $('#search_condition').val(treeNode.name);
                    realTimeVideLoad.ztreeSearch();

                    setTimeout(function () {
                        $('#search_condition').val(treeNode.name);
                        realTimeVideLoad.ztreeSearch();
                        realTimeVideLoad.onDbClickV(null, null, treeNode); // 订阅监控对象
                    }, 1000);
                }*/
            }
        } else {
            if (urlRewriteVideoId != null) {
                var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
                $("#searchOnline").click();
            }
        }

        var nodes = treeObj.transformToArray(treeObj.getNodes());

        // 订阅对象颜色变化
        var keys = monitoringObjMap.keys();
        for (var i = 0; i < keys.length; i++) {
            var nodes = treeObj.getNodesByParam("id", keys[i], null);
            if (nodes.length > 0) {
                for (var j = 0; j < nodes.length; j++) {
                    if (ztreeOnLine.indexOf(keys[i]) != -1) {
                        $('#' + nodes[j].tId + '_span').addClass('obj_select_online');
                    } else if (ztreeHeartBeat.indexOf(keys[i]) != -1) {
                        $('#' + nodes[j].tId + '_span').addClass('obj_select_heartbeat');
                    }
                }
            }
        }
    },

    // ztree 展开事件
    zTreeOnExpand: function (event, treeId, treeNode) {
        if (treeNode.type === 'assignment') { // 获取分组下面的监控对象节点
            if (treeNode.children === undefined) {
                var url = '/clbs/m/functionconfig/fence/bindfence/putMonitorByAssign';
                var data = {'assignmentId': treeNode.id, 'isChecked': true, 'monitorType': 'monitor', 'webType': 2};
                json_ajax("POST", url, "json", true, data, function (info) {
                    realTimeVideLoad.getGroupList(info, treeNode, false)
                });
            } else {
                var param = [];
                for (var i = 0; i < treeNode.children.length; i++) {
                    var obj = {};
                    obj.vehicleID = treeNode.children[i].id;
                    param.push(obj)
                }
                // 订阅所有车辆
                var requestStrS = {
                    "desc": {
                        "MsgId": 40964,
                        "UserName": $("#userName").text()
                    },
                    "data": param
                };
                webSocket.subscribe(headers, '/user/' + $("#userName").text() + '/cachestatus', realTimeVideLoad.updataRealTree, "/app/vehicle/subscribeCacheStatusNew", requestStrS);
            }
        } else if ((treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') && treeNode.children === undefined) { // 获取监控对象的逻辑通道号
            var url = '/clbs/realTimeVideo/video/getChannels';
            var data = {'vehicleId': treeNode.id, 'isChecked': false};
            json_ajax("POST", url, "json", true, data, function (info) {
                realTimeVideLoad.getGroupList(info, treeNode, false)
            });
        }
    },

    // ztree 右键事件
    zTreeShowRightMenu: function (event, treeId, treeNode) {
        if (treeNode.type === 'vehicle' || treeNode.type === 'thing' || treeNode.type === 'people') {
            $("#rMenu").css("width", "143px");
            if (treeNode.iconSkin !== "vehicleSkin") {
                var index = $('#' + treeNode.tId + '_ico').attr('class').indexOf('icon-online')
                    , type;
                if (index !== -1) { // 在线
                    type = '在线'
                } else { // 心跳
                    type = '心跳'
                }
                //获取用户名
                var userName = $("#userName").text();
                //获取逻辑通道号 0 音视频、 1 音频、 2 视频
                var channelNumType;
                var logicChannel;
                var streamType;
                // 判断当前监控对象下是否加载了通道号信息
                if (treeNode.children == undefined) {
                    var url = '/clbs/realTimeVideo/video/getChannels';
                    var data = {'vehicleId': treeNode.id, 'isChecked': false};
                    json_ajax("POST", url, "json", false, data, function (info) {
                        realTimeVideLoad.getGroupList(info, treeNode, true)
                    });
                }

                for (var i = 0; i < treeNode.children.length; i++) {
                    //优选获取音频逻辑通道号
                    if (treeNode.children[i].channelType == 1) {
                        logicChannel = treeNode.children[i].logicChannel;
                        streamType = treeNode.children[i].streamType;
                        channelNumType = 1;
                        break;
                    }
                }

                /**
                 * 参数：
                 * treeNode.id  车辆编号
                 * event.clientX  x轴坐标
                 * event.clientY  y轴坐标
                 * type  状态类型
                 * treeNode.name  车牌号
                 * channelNum  逻辑通道号
                 * simcardNumber SIM卡号
                 * userName  用户名
                 * treeNode.plateColor 车牌颜色
                 */
                realTimeVideLoad.showRightMenu(treeNode.id, event.clientX, event.clientY, type, treeNode.name, logicChannel, treeNode.simcardNumber, userName, treeNode.plateColor, channelNumType, streamType, treeNode.deviceType);
            }
        }
    },

    // ztree dom生成事件
    zTreeOnNodeCreated: function (event, treeId, treeNode) {
        if (treeNode.type == 'vehicle' || treeNode.type == 'thing' || treeNode.type === 'people') {
            var id = treeNode.id;
            if (zTreeIdJson[id] == null) {
                var list = [treeNode.tId];
                zTreeIdJson[id] = list;
            } else {
                // zTreeIdJson[id].push(treeNode.tId);
                zTreeIdJson[id].push(treeNode.id);
            }
        }
    },

    // 获取ztree 分组下的节点
    getGroupList: function (data, treeNode, flag) {
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        var addV = treeObj.addNodes(treeNode, JSON.parse(ungzip(data.msg)), flag);

        if (addV !== null && treeNode.type == 'assignment') {
            var param = [];
            for (var i = 0; i < treeNode.children.length; i++) {
                var obj = {};
                obj.vehicleID = treeNode.children[i].id;
                param.push(obj)
            }
            // 订阅所有车辆
            var requestStrS = {
                "desc": {
                    "MsgId": 40964,
                    "UserName": $("#userName").text()
                },
                "data": param
            };
            webSocket.subscribe(headers, '/user/' + $("#userName").text() + '/cachestatus', realTimeVideLoad.updataRealTree, "/app/vehicle/subscribeCacheStatusNew", requestStrS);
        } else if (addV != null && (treeNode.type == 'vehicle' || treeNode.type == 'thing' || treeNode.type === 'people')) { // 通道图标更换
            // 一个监控对象可能会有多个分组，当另外分组展开时应该把当前订阅的通道号图标换掉
            var nodes = treeNode.children;
            for (var i = 0; i < nodes.length; i++) {
                var id = treeNode.id + '-' + nodes[i].logicChannel;
                if (subscribeVideoMap.containsKey(id)) {
                    nodes[i].iconSkin = 'btnImage channel-subscribe';
                    treeObj.updateNode(nodes[i]);
                }
            }
        }
    },

    /**
     * ztree 右键显示
     * 参数：
     * id  车辆编号
     * x  x轴坐标
     * y  y轴坐标
     * type  状态类型
     * vName  车牌号
     * channelNum  逻辑通道号
     * simcardNumber SIM卡号
     * userName  用户名
     * vehicleColor 车牌颜色
     */
    showRightMenu: function (id, x, y, type, vName, channelNum, simcardNumber, userName, vehicleColor, channelNumType, streamType, deviceType) {
        if (vName) {
            vName = encodeURI(vName);
        }
        var html = '<div class="col-md-12" id="treeRightMenu-l" style="padding:0px">';
        if (channelNum == 'null' || channelNum == undefined) {
            html += '<a href="javascript:void(0)" onClick="layer.msg(\'当前监控对象没有音频通道号，请在设置通道号指令里设置音频类型的通道并下发 \')">对讲</a>';
        } else {
            html += '<a href="/clbs/realTimeVideo/video/talkBackPage?brand=' + vName + '&vehicleId=' + id + '&mobile=' + simcardNumber + '&streamType=' + streamType + '&channelNumber=' + channelNum + '&vehicleColor=' + vehicleColor + '&channelNumType=' + channelNumType + '" data-toggle="modal" data-target="#commonSmWin">对讲</a>';
        }

        html += '<a href="javascript:;" onclick="realTimeVideLoad.rightClickMonitorFn(\'' + id + '\',\'' + vName + '\',\'' + channelNum + '\',\'' + simcardNumber + '\',\'' + userName + '\',\'' + vehicleColor + '\', \'' + channelNumType + '\', \'' + streamType + '\')">监听</a>' +
            '<a href="/clbs/realTimeVideo/video/broadCastPage" data-toggle="modal" data-target="#commonSmWin">广播</a>' +
            '<a href="/clbs/v/monitoring/getSendTextByBatchPage_' + deviceType + '" data-toggle="modal" data-target="#commonSmWin">批量文本信息下发</a>' +
            '<a href="/clbs/realTimeVideo/video/channelSettingPage?vehicleId=' + id + '&brand=' + vName + '" data-toggle="modal" data-target="#commonWin">设置通道号</a>' +
            '<a href="javascript:;" onclick="realTimeVideLoad.searchAudioAndVideoDataFn(\'' + id + '\')">查询音视频属性</a>' +
            '<a href="/clbs/realTimeVideo/video/vedioSleepSettingPage?vehicleId=' + id + '&brand=' + vName + '" data-toggle="modal" data-target="#commonWin">设置休眠唤醒</a>';
        if (type === '心跳') {
            html += '<p id="videoSleepBtn"><a onclick="realTimeVideLoad.videoSleep(\'' + id + '\', \'' + vName + '\')">休眠唤醒</a></p></div>';
        } else {
            html += '</div>';
        }
        $("#rMenu").html(html);
        currentRightClickVehicleId = id;
        realTimeVideLoad.rMenuUlShowOrPosition(x, y);
    },

    // 休眠唤醒
    videoSleep: function (id, vName) {
        var url = '/clbs/realTimeVideo/videoSetting/getVideoSleepParam';
        var data = {'vehicleId': id};
        json_ajax("POST", url, "json", true, data, function (info) {
            if (info.obj != null && info.obj.wakeupHandSign == 1) { // 手动唤醒启用
                $('#videoSleepBtn').html('<a href="/clbs/realTimeVideo/video/vedioSleepPage?brand=' + vName + '&vehicleId=' + id + '" data-toggle="modal" data-target="#commonSmWin">休眠唤醒</a>')
                setTimeout(function () {
                    $('#videoSleepBtn a').click();
                }, 200);
            } else { // 停用
                layer.msg('请在设置休眠唤醒指令里启用手动唤醒并下发');
            }
        });
    },

    // ztree 右键菜单定位
    rMenuUlShowOrPosition: function (x, y) {
        $("#rMenu ul").show();
        if (y < 0) {
            $('#rMenu').css({"top": (y - y) + "px", "left": (x + 35) + "px", "visibility": "visible"});
        } else {
            $('#rMenu').css({"top": (y) + "px", "left": (x + 35) + "px", "visibility": "visible"});
        }
    },

    // ztree 右键菜单隐藏
    onBodyMouseDown: function (event) {
        if (!(event.target.id === "rMenu" || $(event.target).parents("#rMenu").length > 0)) {
            $('#rMenu').css({"visibility": "hidden"});
        }
        if (!(event.target.id === "videoMenu" || $(event.target).parents("#videoMenu").length > 0)) {
            $('#videoMenu').css('display', 'none');
        }
    },

    //右键菜单 - 监听
    rightClickMonitorFn: function (vId, vName, channelNum, simcardNumber, userName, vehicleColor, channelNumType, streamType) {
        //判断逻辑通道号是否存在
        if (channelNum == "undefined" || channelNum == 'null') {
            layer.msg("当前监控对象没有音频通道号，请在设置通道号指令里设置音频类型的通道并下发！");
        } else {
            //菜单隐藏
            $('#rMenu').css({"visibility": "hidden"});

            var audioSubscribeList = [
                {
                    vehicleId: vId,
                    requestType: 0,
                    channelNum: channelNum,
                    mobile: simcardNumber,
                    orderType: 3,
                    streamType: streamType,
                    channelType: channelNumType
                }
            ];

            var audioSubscribeListStr = JSON.stringify(audioSubscribeList);
            var url = '/clbs/realTimeVideo/video/sendParamByBatch';
            var data = {videoInfoListStr: audioSubscribeListStr};
            json_ajax("POST", url, "json", true, data, function (info) {
                var list = {
                    mobile: simcardNumber,
                    channelNum: channelNum,
                    vehicleId: vId,
                    channelType: channelNumType,
                    brand: vName,
                    vehicleColor: vehicleColor
                };
                realTimeVideLoad.listeningSuccess(info, list);
            });
        }
    },

    // 监听下发后回调方法
    listeningSuccess: function (info, list) {
        var msg = info.obj;
        if (msg[0].flag) {
            //显示监听模块
            $("#rightClickMonitor").removeClass("hidden");

            //为按钮添加类样式 区分下发成功及失败
            $("#monitorIco").removeAttr("class");
            $("#monitorIco").addClass("monitor-success");
            realTimeVideLoad.logFindCilck();
            realTimeVideLoad.audioListening(msg[0], list.mobile, list.channelNum, list.vehicleId);
            realTimeVideLoad.updateWaitTime();
        } else {
            layer.msg('当前通道号已被占用，请稍后再试！');
        }

        //为监听按钮绑定点击事件
        $("#monitorIco").bind("click", function () {
            realTimeVideLoad.listenBtnClick(list)
        });
    },

    listenBtnClick: function (list) {
        //下发关闭监听指令
        if ($("#monitorIco").hasClass("monitor-success")) {
            // 关闭监听指令
            var surl = '/clbs/realTimeVideo/video/sendVideoParam';
            var parameter = {
                vehicleId: list.vehicleId,
                channelNum: list.channelNum,
                orderType: 4,
                control: 4,
                closeVideoType: 0,
                changeStreamType: 0,
                channelType: list.channelType,
                requestType: 0,
                unique: listenUnique
            };
            json_ajax("POST", surl, "json", false, parameter, function (data) {
                realTimeVideLoad.updateWaitTime();
                if (data.success == true) {
                    listenUnique = null;
                    $('#rightClickMonitor').removeClass('audio-listen');
                    // 关闭socket
                    audioListenSocket.closeWebsocket();
                    //清空监听时间
                    clearInterval(monitorTime);
                    $('#monitorText').html('连接中...');
                    monitorTimeIndex = 1;
                    //隐藏
                    $("#rightClickMonitor").addClass("hidden");
                    $(this).removeClass("monitor-success");
                    realTimeVideLoad.logFindCilck();
                }
            });
        }
    },

    // 监听连接成功
    monitorAudioSuccess: function () {
        $('#rightClickMonitor').addClass('audio-listen');
        //替换暂停图标
        $("#monitorIco").attr("src", "../../resources/img/pause.png");
        //监听时间
        monitorTimeIndex = 1;
        monitorTime = setInterval(function () {
            $("#monitorText").html("正在监听 时间：" + (monitorTimeIndex++) + "秒"); //替换显示状态
        }, 1000);
    },

    //右键菜单  - 查询音视频属性
    searchAudioAndVideoDataFn: function (vId) {
        //菜单隐藏
        $('#rMenu').css({"visibility": "hidden"});
        //请求查询音视频属性下发接口
        var url = "/clbs/realTimeVideo/video/sendParamCommand";
        var parameter = {vehicleId: vId, orderType: 8};
        json_ajax("POST", url, "json", true, parameter, function (data) {
            if (data.success) {
                realTimeVideLoad.logFindCilck();
            }
        });
    },

    // ztree 监控对象状态更新
    updataRealTree: function (msg) {
        var zTree = $.fn.zTree.getZTreeObj("vTreeList");
        var data = $.parseJSON(msg.body);
        if (data.desc.msgID == 39321) {
            var stateInfo = data.data;
            for (var i = 0, len = stateInfo.length; i < len; i++) {
                var info = stateInfo[i];
                if (info.vehicleStatus == '3') { // 离线
                    if (ztreeOffLine.indexOf(info.vehicleId) == -1) {
                        ztreeOffLine.push(info.vehicleId);
                    }
                    ztreeHeartBeat.remove(info.vehicleId);
                    ztreeOnLine.remove(info.vehicleId);
                } else if (info.vehicleStatus == '11') { // 心跳
                    if (ztreeHeartBeat.indexOf(info.vehicleId) == -1) {
                        ztreeHeartBeat.push(info.vehicleId);
                    }
                    ztreeOffLine.remove(info.vehicleId);
                    ztreeOnLine.remove(info.vehicleId);
                } else if (info.vehicleStatus == '4' || info.vehicleStatus == '10' || info.vehicleStatus == '5' || info.vehicleStatus == '2' || info.vehicleStatus == '9') { // 在线
                    if (ztreeOnLine.indexOf(info.vehicleId) == -1) {
                        ztreeOnLine.push(info.vehicleId);
                    }
                    ztreeHeartBeat.remove(info.vehicleId);
                    ztreeOffLine.remove(info.vehicleId);
                }
            }

            if (ztreeHeartBeat.length != 0) {
                for (var i = 0, len = ztreeHeartBeat.length; i < len; i++) {
                    var list = zTreeIdJson[ztreeHeartBeat[i]];
                    if (list != null) {
                        for (var s = 0, slen = list.length; s < slen; s++) {
                            var treeNode = zTree.getNodeByTId(list[s]);
                            if (treeNode != null) {
                                if (treeNode.type == 'vehicle' || treeNode.type == 'thing' || treeNode.type === 'people') {
                                    treeNode.iconSkin = 'btnImage icon-heartbeat';
                                    zTree.updateNode(treeNode);
                                    if (misstype) {
                                        zTree.hideNode(treeNode);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (ztreeOnLine.length != 0) {
                for (var i = 0, len = ztreeOnLine.length; i < len; i++) {
                    var list = zTreeIdJson[ztreeOnLine[i]];
                    if (list != null) {
                        for (var s = 0, slen = list.length; s < slen; s++) {
                            var treeNode = zTree.getNodeByTId(list[s]);
                            if (treeNode != null) {
                                if (treeNode.type == 'vehicle' || treeNode.type == 'thing' || treeNode.type === 'people') {
                                    treeNode.iconSkin = 'btnImage icon-online';
                                    zTree.updateNode(treeNode);
                                    if (misstype) {
                                        zTree.hideNode(treeNode);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if (data.desc.msgID == 34952 || data.desc.msgID == 30583) {//新增
            var stateInfo = data.data
                , state = stateInfo[0].vehicleStatus;
            if (state == '3') {
                if (ztreeOffLine.indexOf(stateInfo[0].vehicleId) == -1) {
                    ztreeOffLine.push(stateInfo[0].vehicleId);
                }
                ztreeHeartBeat.remove(stateInfo[0].vehicleId);
                ztreeOnLine.remove(stateInfo[0].vehicleId);
                realTimeVideLoad.getStateList(stateInfo[0].vehicleId, state);
            } else if (state == '11') {
                if (ztreeHeartBeat.indexOf(stateInfo[0].vehicleId) == -1) {
                    ztreeHeartBeat.push(stateInfo[0].vehicleId);
                }
                ztreeOffLine.remove(stateInfo[0].vehicleId);
                ztreeOnLine.remove(stateInfo[0].vehicleId);
                realTimeVideLoad.getStateList(stateInfo[0].vehicleId, state);
            } else if (state == '4' || state == '10' || state == '5' || state == '2' || state == '9') {
                if (ztreeOnLine.indexOf(stateInfo[0].vehicleId) == -1) {
                    ztreeOnLine.push(stateInfo[0].vehicleId);
                }
                ztreeOffLine.remove(stateInfo[0].vehicleId);
                ztreeHeartBeat.remove(stateInfo[0].vehicleId);
                realTimeVideLoad.getStateList(stateInfo[0].vehicleId, state);
            }
        }
    },

    // ztree 获取状态改变节点
    getStateList: function (id, type) {
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList")
            , nodes = treeObj.getNodesByParam("id", id, null);

        if (nodes != null) {
            for (var i = 0, len = nodes.length; i < len; i++) {
                realTimeVideLoad.setZtreeListStyle(nodes[i], type);
            }
        }
    },

    // ztree 设置节点样式
    setZtreeListStyle: function (node, type) {
        if (node.type === 'vehicle' || node.type === 'thing' || node.type === 'people') {
            var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
            if (type == '3') {
                node.iconSkin = 'btnImage icon-offline';
                if ($('#' + node.tId + '_span').hasClass('obj_select')) {
                    $('#' + node.tId + '_span').removeClass('obj_select');
                    realTimeVideLoad.videoCloseFun(node);
                    layer.msg(node.name + '已下线');
                }
                $('#' + node.tId + '_span').removeClass('obj_select_online');
            } else if (type == '11') {
                node.iconSkin = 'btnImage icon-heartbeat';
            } else {
                node.iconSkin = 'icon-online';
            }
            treeObj.updateNode(node);
        }
    },

    //tab选项卡向下隐藏显示函数
    tabHideDownFn: function () {
        if ($(this).hasClass("fa fa-chevron-down")) {
            //列表隐藏
            realTimeVideLoad.tableListHide();
        } else {
            //列表显示
            realTimeVideLoad.tableListShow();
        }
    },

    // ztree 模糊查询
    ztreeSearch: function () {
        if (searchTimeout !== undefined) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(function () {
            realTimeVideLoad.search_condition();
        }, 500);
    },

    // 模糊查询显示
    search_condition: function () {
        zTreeIdJson = {}; // 所有车辆id集合
        misstype = false;
        var value = $("#search_condition").val()
            , url
            , otherParam = null;
        isTreeState = true;
        var queryType = $("#searchType").val();
        if (value !== '') {
            url = '/clbs/m/functionconfig/fence/bindfence/monitorTreeFuzzy';
            otherParam = {'queryParam': value, 'queryType': queryType, 'webType': 2, 'type': 1};
        } else {
            if (allObjNum <= 5000) {
                url = '/clbs/m/functionconfig/fence/bindfence/monitorTree';
                otherParam = {'webType': 2};
            } else {
                url = '/clbs/m/functionconfig/fence/bindfence/bigDataMonitorTree';
            }
        }
        realTimeVideLoad.initZtree(url, otherParam);
    },

    // 刷新树
    refreshTree: function () {
        zTreeIdJson = {}; // 所有车辆id集合
        misstype = false;
        $("#search_condition").val("");
        var url
            , otherParam = null;
        isTreeState = true;
        if (allObjNum <= 5000) {
            url = '/clbs/m/functionconfig/fence/bindfence/monitorTree';
            otherParam = {'webType': 2};
        } else {
            url = '/clbs/m/functionconfig/fence/bindfence/bigDataMonitorTree';
        }
        realTimeVideLoad.initZtree(url, otherParam);
    },

    // ztree 不在线
    ztreeStateSearchOffLine: function (event) {
        zTreeIdJson = {}; // 所有车辆id集合
        misstype = true;
        $("#search_condition").val("");
        var url
            , otherParam = null;
        if (allObjNum <= 5000) {
            if (event.data.type == 7) {//离线车辆
                isTreeState = true;
            } else {
                isTreeState = false;
            }
            url = '/clbs/m/basicinfo/monitoring/vehicle/treeStateInfo';
            otherParam = {'webType': 2, 'type': event.data.type};
        } else {
            isTreeState = true;
            url = '/clbs/m/functionconfig/fence/bindfence/bigDataMonitorTree';
        }
        realTimeVideLoad.initZtree(url, otherParam);
    },

    // ztree 心跳和在线
    ztreeStateSearchOnLine: function (event) {
        zTreeIdJson = {}; // 所有车辆id集合
        misstype = false;
        isTreeState = false;
        $("#search_condition").val("");
        var url = '/clbs/m/basicinfo/monitoring/vehicle/treeStateInfo';
        var otherParam = {'webType': 2, 'type': event.data.type};
        realTimeVideLoad.initZtree(url, otherParam);
    },

    //列表隐藏
    tableListHide: function (header) {
        $('#videoRightTop').css('height', 'calc(100% - 44px)');
        realTimeVideLoad.videoSeparatedAdaptHide();//左下侧隐藏及全屏显示时视频分隔自适应计算函数
        $("#scalingBtn").removeClass("fa fa-chevron-down").addClass("fa fa-chevron-up");
    },

    //左下侧隐藏及全屏显示时视频分隔自适应计算函数
    videoSeparatedAdaptHide: function () {
        //判断当前屏幕分隔数 区分屏幕分隔高宽度
        var rightHeight = $('#videoMainRight').height();
        if ($("#videoFour").hasClass("video-four-check")) {
            //高宽度
            var vwidth = 100 / 2;
            //区分全屏
            var vheight = (rightHeight - 42) / 2;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
        else if ($("#videoSix").hasClass("video-six-check")) {
            //高宽度
            var vwidth = 100 / 3;
            //区分全屏
            var vheight = (rightHeight - 42) / 3;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //第一个视频高宽度
            var vOneWidth = vwidth * 2;
            var vOneHeight = vheight * 2;
            $("#video-module div.v-one").css({
                "width": vOneWidth + "%",
                "height": "calc(100% - (100% - " + (vOneHeight - 0.1) + "px))"
            });
        }
        else if ($("#videoNine").hasClass("video-nine-check")) {
            //高宽度
            var vwidth = 100 / 3;
            //区分全屏
            var vheight = (rightHeight - 42) / 3;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
        else if ($("#videoTen").hasClass("video-ten-check")) {
            //高宽度
            var vwidth = 100 / 5;
            //区分全屏
            var vheight = (rightHeight - 42) / 5;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //第一个视频高宽度
            var vOneWidth = vwidth * 4;
            var vOneHeight = vheight * 4;
            $("#video-module div.v-one").css({
                "width": vOneWidth + "%",
                "height": "calc(100% - (100% - " + (vOneHeight - 0.1) + "px))"
            });
        }
        else if ($("#videoSixteen").hasClass("video-sixteen-check")) {
            //高宽度
            var vwidth = 100 / 4;
            //区分全屏
            var vheight = (rightHeight - 42) / 4;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
    },

    //列表显示
    tableListShow: function () {
        realTimeVideLoad.videoSeparatedAdaptShow();//左下侧显示及取消全屏显示时视频分隔自适应计算函数
        $("#scalingBtn").removeClass("fa fa-chevron-up").addClass("fa fa-chevron-down");
        realTimeVideLoad.layoutChange();
    },

    //左下侧显示及取消全屏显示时视频分隔自适应计算函数
    videoSeparatedAdaptShow: function () {
        //判断当前屏幕分隔数 区分屏幕分隔高宽度
        var rightHeight = $('#videoMainRight').height();
        var bottomHeight = realTimeVideLoad.getBottomHeight();
        if ($("#videoFour").hasClass("video-four-check")) {
            //高宽度
            var vwidth = 100 / 2;
            var vheight = (rightHeight - bottomHeight) / 2;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
        else if ($("#videoSix").hasClass("video-six-check")) {
            //高宽度
            var vwidth = 100 / 3;
            var vheight = (rightHeight - bottomHeight) / 3;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //第一个视频高宽度
            var vOneWidth = vwidth * 2;
            var vOneHeight = vheight * 2;
            $("#video-module div.v-one").css({
                "width": vOneWidth + "%",
                "height": "calc(100% - (100% - " + (vOneHeight - 0.1) + "px))"
            });
        }
        else if ($("#videoNine").hasClass("video-nine-check")) {
            //高宽度
            var vwidth = 100 / 3;
            var vheight = (rightHeight - bottomHeight) / 3;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
        else if ($("#videoTen").hasClass("video-ten-check")) {
            //高宽度
            var vwidth = 100 / 5;
            var vheight = (rightHeight - bottomHeight) / 5;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //第一个视频高宽度
            var vOneWidth = vwidth * 4;
            var vOneHeight = vheight * 4;
            $("#video-module div.v-one").css({
                "width": vOneWidth + "%",
                "height": "calc(100% - (100% - " + (vOneHeight - 0.1) + "px))"
            });
        }
        else if ($("#videoSixteen").hasClass("video-sixteen-check")) {
            //高宽度
            var vwidth = 100 / 4;
            var vheight = (rightHeight - bottomHeight) / 4;
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
    },

    //隐藏左侧及底部列表
    videoWinFn: function () {
        if ($(this).hasClass("video-win")) {
            //图标改变
            $(this).removeClass("video-win").addClass("video-win-check");
            //列表隐藏
            realTimeVideLoad.tableListHide(false);
            //左侧隐藏
            $(".video-main-left").hide();
            $(".video-main-right").css("width", "100%");
            //注销全屏绑定事件
            $("#videoFullScreen").unbind();
        } else {
            //图标改变
            $(this).removeClass("video-win-check").addClass("video-win");
            //左侧显示
            $(".video-main-left").show();
            $(".video-main-right").css("width", "calc(100% - 315px)");
            //音视频模块全屏显示
            $("#videoFullScreen").on("click", realTimeVideLoad.videoFullScreenFn);
        }
    },

    //音视频模块全屏显示
    videoFullScreenFn: function () {
        // 如果视频被隐藏，点击全屏按钮不操作
        var isVideoHide = !$('#mapAllShow').children().hasClass("fa fa-chevron-left");
        if (isVideoHide) {
            return;
        }
        if ($(this).hasClass("video-full-screen")) {
            // 图标改变
            $(this).removeClass("video-full-screen").addClass("video-full-screen-check");
            // 地图隐藏
            $("#map-module").hide();
            $("#video-module").removeClass("col-md-9").addClass("col-md-12");
            // 列表隐藏
            realTimeVideLoad.tableListHide(true);
            // 左侧隐藏
            $(".video-main-left").hide();
            $(".video-main-right").css("width", "100%");
            $('#mainContent').addClass('main-full-screen');
            // 头部隐藏
            $("#header").hide();
            // 左侧及底部隐藏及tab选项卡向下隐藏显示函数绑定事件注销
            $("#videoWin,#scalingBtn").unbind();
        } else {
            // 图标改变
            $(this).removeClass("video-full-screen-check").addClass("video-full-screen");
            // 地图显示
            $("#map-module").show();
            $("#video-module").removeClass("com-md-12").addClass("col-md-9");
            // 左侧显示
            $(".video-main-left").show();
            $(".video-main-right").css("width", "calc(100% - 315px)");
            $('#mainContent').removeClass('main-full-screen');
            // 头部显示
            $("#header").show();
            // 隐藏左侧及底部列表
            $("#videoWin").on("click", realTimeVideLoad.videoWinFn);
            // tab选项卡向下隐藏显示函数
            $("#scalingBtn").on("click", realTimeVideLoad.tabHideDownFn);
        }
        // 视频区域自适应
        setTimeout(function () {
            realTimeVideLoad.windowResize();
        }, 300);
    },

    //视频显示模块分隔
    videoSeparatedFn: function () {
        // 去掉视频窗口出现的滚动条
        $('#video-main-content .video-module').css('overflow', 'hidden');
        var _thisId = $(this).attr("id");
        //4屏
        if (_thisId === "videoFour") {
            realTimeVideLoad.videoSeparatedFour(_thisId);
        }
        //6屏
        else if (_thisId === "videoSix") {
            realTimeVideLoad.videoSeparatedSix(_thisId);
        }
        //9屏
        else if (_thisId === "videoNine") {
            realTimeVideLoad.videoSeparatedNine(_thisId);
        }
        //10屏
        else if (_thisId === "videoTen") {
            realTimeVideLoad.videoSeparatedTen(_thisId);
        }
        //16屏
        else if (_thisId === "videoSixteen") {
            realTimeVideLoad.videoSeparatedSixteen(_thisId);
        }
    },

    //视频分隔4屏
    videoSeparatedFour: function (_thisId) {
        $("#videoSeparated").find("i").removeClass("video-six-check video-nine-check video-ten-check video-sixteen-check");
        if (!($("#" + _thisId).hasClass("video-four-check"))) {
            //添加高亮
            $("#" + _thisId).addClass("video-four-check");
            //移除已添加的视频
            $("#video-module>div:nth-child(4)").nextAll().hide();
            //高宽度
            var vwidth = 100 / 2;
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 2;
            } else {
                var vheight = $("#video-module").height() / 2;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
    },

    //视频分隔6屏
    videoSeparatedSix: function (_thisId) {
        $("#videoSeparated").find("i").removeClass("video-four-check video-nine-check video-ten-check video-sixteen-check");
        if ($("#" + _thisId).hasClass("video-six-check")) { // 恢复默认
            //移除高亮
            $("#" + _thisId).removeClass("video-six-check");
            //移除已添加的视频
            $("#video-module>div:nth-child(4)").nextAll().hide();
            //高宽度
            var vwidth = 100 / 2;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 2;
            } else {
                var vheight = $("#video-module").height() / 2;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //4屏按钮高亮
            $("#videoFour").addClass("video-four-check");
        } else { // 6个video
            //添加高亮
            $("#" + _thisId).addClass("video-six-check");
            //移除已添加的视频
            $("#video-module>div").show();
            $("#video-module>div:nth-child(6)").nextAll().hide();
            //定义视频
            var videoLength = $('#video-module>div').length;
            var _html = "";
            for (var i = videoLength; i < 6; i++) {
                _html +=
                    '<div class="pull-left v-' + videoName[i] + '">' +
                    '<video autoplay width="100%" height="100%" id="v_' + i + '_Source">' +
                    '<source src="" type="video/mp4">' +
                    '<source src="" type="video/ogg">' +
                    '您的浏览器不支持 video 标签。' +
                    '</video>' +
                    '</div>';
            }
            $("#video-module").append(_html);
            //高宽度
            var vwidth = 100 / 3;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 3;
            } else {
                var vheight = $("#video-module").height() / 3;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //第一个视频高宽度
            var vOneWidth = vwidth * 2;
            var vOneHeight = vheight * 2;
            $("#video-module div.v-one").css({
                "width": vOneWidth + "%",
                "height": "calc(100% - (100% - " + (vOneHeight - 0.1) + "px))"
            });
        }
    },

    //视频分隔9屏
    videoSeparatedNine: function (_thisId) {
        $("#videoSeparated").find("i").removeClass("video-four-check video-six-check video-ten-check video-sixteen-check");
        if ($("#" + _thisId).hasClass("video-nine-check")) {
            //移除高亮
            $("#" + _thisId).removeClass("video-nine-check");
            //移除已添加的视频
            $("#video-module>div:nth-child(4)").nextAll().hide();
            //高宽度
            var vwidth = 100 / 2;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 2;
            } else {
                var vheight = $("#video-module").height() / 2;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //4屏按钮高亮
            $("#videoFour").addClass("video-four-check");
        } else {
            //添加高亮
            $("#" + _thisId).addClass("video-nine-check");
            //移除已添加的视频
            $("#video-module>div").show();
            $("#video-module>div:nth-child(9)").nextAll().hide();
            //定义视频
            var videoLength = $('#video-module>div').length;
            var _html = "";
            for (var i = videoLength; i < 9; i++) {
                _html +=
                    '<div class="pull-left v-' + videoName[i] + '">' +
                    '<video autoplay width="100%" height="100%" id="v_' + i + '_Source">' +
                    '<source src="" type="video/mp4">' +
                    '<source src="" type="video/ogg">' +
                    '您的浏览器不支持 video 标签。' +
                    '</video>' +
                    '</div>';
            }
            $("#video-module").append(_html);
            // 视频右键绑定
            $('video').off('contextmenu').on('contextmenu', realTimeVideLoad.videoRightFun);
            //高宽度
            var vwidth = 100 / 3;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 3;
            } else {
                var vheight = $("#video-module").height() / 3;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
    },

    // 关闭视频回掉函数
    videoCloseFun: function (treeNode) {
        var id = treeNode.id;
        var treeObj = $.fn.zTree.getZTreeObj('vTreeList');
        var nodes = treeObj.getNodesByParam('id', id, null);
        for (var i = 0, len = nodes.length; i < len; i++) {
            $('#' + nodes[i].tId + '_span').attr('class', 'node_name');
            // 恢复通道号图标(换成没订阅状态)
            var childrens = nodes[i].children;
            if (!!childrens) {
                for (var j = 0; j < childrens.length; j++) {
                    if (childrens[j].iconSkin == 'btnImage channel-subscribe') {
                        // 图标恢复默认
                        realTimeVideLoad.channelSubscribeChangeIco(treeObj, childrens[j], false);
                    }
                }
            }
        }

        // 删除对应id的监控对象信息
        subscribeObjInfoMap.remove(id);
        realTimeVideLoad.objInfoUpdate();

        // 清空地图对应的marker数据
        if (monitoringObjMap.containsKey(id)) {
            var marker = monitoringObjMap.get(id);
            if (marker !== null) {
                marker.stopMove();
                videoMap.remove([marker]);
            }
            monitoringObjMap.remove(id);
        }

        // marker名称清除
        if (monitoringObjNameMap.containsKey(id)) {
            var nameMarker = monitoringObjNameMap.get(id);
            videoMap.remove([nameMarker]);
        }
        monitoringObjNameMap.remove(id);

        monitoringObjLngLatMap.remove(id);

        // 取消的是聚焦跟踪id
        if (monitoringObjFocusId === id) {
            monitoringObjFocusId = undefined;
        }

        // 取消订阅位置信息
        var cancelStrS = {
            "desc": {
                "MsgId": 40964,
                "UserName": $("#userName").text()
            },
            "data": [{vehicleID: id}]
        };

        webSocket.unsubscribealarm(headers, "/app/vehicle/unsubscribelocation", cancelStrS);

        realTimeVideLoad.closeVideoFun(id, 14);

        realTimeVideLoad.clearSubscribeMap(id);

    },

    // 情空订阅集合
    clearSubscribeMap: function (id) {
        var keys = subscribeVideoMap.keys();
        for (var i = 0; i < keys.length; i++) {
            var this_key = keys[i];
            if (this_key.indexOf(id) !== -1) {
                subscribeVideoMap.remove(this_key);
            }
        }
        ;
    },

    //视频分隔10屏
    videoSeparatedTen: function (_thisId) {
        $("#videoSeparated").find("i").removeClass("video-four-check video-six-check video-nine-check video-sixteen-check");
        if ($("#" + _thisId).hasClass("video-ten-check")) {
            //移除高亮
            $("#" + _thisId).removeClass("video-ten-check");
            //移除已添加的视频
            $("#video-module>div:nth-child(4)").nextAll().hide();
            //高宽度
            var vwidth = 100 / 2;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 2;
            } else {
                var vheight = $("#video-module").height() / 2;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //4屏按钮高亮
            $("#videoFour").addClass("video-four-check");
        } else {
            //添加高亮
            $("#" + _thisId).addClass("video-ten-check");
            //移除已添加的视频
            $("#video-module>div").show();
            $("#video-module>div:nth-child(10)").nextAll().hide();
            //定义视频
            var videoLength = $('#video-module>div').length;
            var _html = "";
            for (var i = videoLength; i < 10; i++) {
                _html +=
                    '<div class="pull-left v-' + videoName[i] + '">' +
                    '<video autoplay width="100%" height="100%" id="v_' + i + '_Source">' +
                    '<source src="" type="video/mp4">' +
                    '<source src="" type="video/ogg">' +
                    '您的浏览器不支持 video 标签。' +
                    '</video>' +
                    '</div>';
            }
            $("#video-module").append(_html);
            //高宽度
            var vwidth = 100 / 5;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 5;
            } else {
                var vheight = $("#video-module").height() / 5;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //第一个视频高宽度
            var vOneWidth = vwidth * 4;
            var vOneHeight = vheight * 4;
            $("#video-module div.v-one").css({
                "width": vOneWidth + "%",
                "height": "calc(100% - (100% - " + (vOneHeight - 0.1) + "px))"
            });
        }
    },

    //视频分隔16屏
    videoSeparatedSixteen: function (_thisId) {
        $("#videoSeparated").find("i").removeClass("video-four-check video-six-check video-nine-check video-ten-check");
        if ($("#" + _thisId).hasClass("video-sixteen-check")) {
            //移除高亮
            $("#" + _thisId).removeClass("video-sixteen-check");
            //移除已添加的视频
            $("#video-module>div:nth-child(4)").nextAll().hide();
            //高宽度
            var vwidth = 100 / 2;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 2;
            } else {
                var vheight = $("#video-module").height() / 2;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
            //4屏按钮高亮
            $("#videoFour").addClass("video-four-check");
        } else {
            //添加高亮
            $("#" + _thisId).addClass("video-sixteen-check");
            //移除已添加的视频
            $("#video-module>div").show();
            if (subscribeVideoNum > 16) {
                $('#video-module>div:nth-child(' + subscribeVideoNum + ')').nextAll().hide();
            } else {
                $("#video-module>div:nth-child(16)").nextAll().hide();
            }
            // 超出16个窗口，显示滚动条
            $('#video-main-content .video-module').css('overflow', 'auto');
            //定义视频
            var videoLength = $('#video-module>div').length;
            var _html = "";
            for (var i = videoLength; i < 16; i++) {
                _html +=
                    '<div class="pull-left v-' + videoName[i] + '">' +
                    '<video autoplay width="100%" height="100%" id="v_' + i + '_Source">' +
                    '<source src="" type="video/mp4">' +
                    '<source src="" type="video/ogg">' +
                    '您的浏览器不支持 video 标签。' +
                    '</video>' +
                    '</div>';
            }
            $("#video-module").append(_html);
            //高宽度
            var vwidth = 100 / 4;
            //判断视频模块是否隐藏
            if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
                var vheight = $("#map-module").height() / 4;
            } else {
                var vheight = $("#video-module").height() / 4;
            }
            $("#video-module>div").css({
                "width": vwidth + "%",
                "height": "calc(100% - (100% - " + vheight + "px))"
            });
        }
    },

    // 监控对象位置信息订阅
    vehicleLoctionFun: function (node) {
        var userName = $("#userName").text();
        var id = node.vehicleId ? node.vehicleId : node.id;
        var requestStrS = {
            "desc": {
                "MsgId": 40964,
                "UserName": userName
            },
            "data": [{vehicleID: id}]
        };
        webSocket.subscribe(headers, '/user/' + userName + '/location', realTimeVideLoad.updateRealLocation, "/app/vehicle/location", requestStrS);

        // 联动报警车辆树订阅
        if (!node.iconSkin) {
            setTimeout(function () {
                var treeObj = $.fn.zTree.getZTreeObj('vTreeList');
                var treeParentNode = treeObj.getNodeByParam("id", node.pid, null);
                treeObj.expandNode(treeParentNode, true, false, false, true); // 展开分组
                realTimeVideLoad.alarmGetZtreeDom(node.id);
            }, 500);
        }
    },

    // 联动报警获取节点
    alarmGetZtreeDom: function (id) {
        setTimeout(function () {
            var treeObj = $.fn.zTree.getZTreeObj('vTreeList');
            var treeNode = treeObj.getNodeByParam("id", id, null);
            if (treeNode != null) {
                // realTimeVideLoad.videoCloseFun(treeNode)
                realTimeVideLoad.onDbClickV(null, null, treeNode); // 订阅监控对象
            } else {
                realTimeVideLoad.alarmGetZtreeDom(id);
            }
        }, 1000);
    },

    // 监控对象订阅实时信息
    updateRealLocation: function (msg) {
        var data = JSON.parse(msg.body);
        if (data.desc !== "neverOnline") {
            if (data.desc.msgID === 513) {
                var obj = {};
                obj.desc = data.desc;
                var da = {};
                da.msgHead = data.data.msgHead;
                da.msgBody = data.data.msgBody.gpsInfo;
                obj.data = da;
                // 状态信息
                realTimeVideLoad.updateVehicleMap(obj);
            } else {
                var cid = data.data.msgBody.monitorInfo.monitorId;
                realTimeVideLoad.updateVehicleMap(data);
            }
        } else {
            if (monitoringObjMap.containsKey(data.vid)) {
                monitoringObjMap.remove(data.vid);
            }
            monitoringObjMap.put(data.vid, null);
        }
    },

    //云台控制
    cloudStationFn: function () {
        //车辆树是否订阅
        if (haeundaeZtreeIsCheck) {
            //视频是否选择
            if ($("#video-module div").hasClass("this-click")) {
                var connectState = $('#connectState').attr('value');
                if (connectState == 1) { // 云台连接打开
                    if ($(this).hasClass("video-yun-sett")) {
                        //图标改变
                        $(this).removeClass("video-yun-sett").addClass("video-yun-sett-check");
                        $("#haeundaeModal").modal("show");
                        //云台宽度
                        $("#haeundaeModal>.modal-dialog").css("width", "500px");
                        $("#haeundaeModal .modal-dialog").css("top", (winHeight - 308) / 2 + "px");//位置
                    } else {
                        //图标改变
                        $(this).removeClass("video-yun-sett-check").addClass("video-yun-sett");
                    }
                } else {
                    layer.msg('该通道号云台未连接');
                }

            } else {
                layer.msg("请先选中一个音视频窗口");
            }
        } else {
            layer.msg("请双击订阅监控对象");
        }
    },

    //视频点击开启声音函数
    videoModuleClickFn: function () {
        //添加类样式  区分当前点击的video
        $("#video-module").find("div").removeClass("this-click");
        $(this).addClass("this-click");
        //获取当前点击video通道号相关信息
        var channelNum = $(this).siblings('video').attr('channel-num');
        var connectState = $(this).siblings('video').attr('connection-state');
        if (channelNum == undefined) {
            haeundaeChannelNum = "";
        } else {
            //云台功能视频通道号赋值
            haeundaeChannelNum = channelNum;
        }
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        var id = $(this).siblings('video').attr('vehicle-id');
        var node = treeObj.getNodeByParam('id', id, null);
        $('#haeundaeBrand').text(node.name + '-' + channelNum);
        $('#connectState').attr('value', connectState);
        realTimeVideLoad.openChannelVoice(id, channelNum);
    },

    // 开启对应通道号声音
    openChannelVoice: function (id, cNum) {
        if (createChannelVoice != null) {
            if (createVideoMap.containsKey(createChannelVoice)) {
                var videoObj = createVideoMap.get(createChannelVoice);
                videoObj.closeVideoVoice();
            }
        }
        var videoId = id + '-' + cNum;
        if (createVideoMap.containsKey(videoId)) {
            var thisVideoObj = createVideoMap.get(videoId);
            thisVideoObj.openVideoVoice();
            createChannelVoice = videoId;
        }
    },

    //云台关闭
    cloudStationCloseFn: function () {
        $("#videoYunSett").removeClass("video-yun-sett-check").addClass("video-yun-sett");
        $("#haeundaeModal").modal("hide");
    },

    //云台速度滑块控制函数
    cloudSilderValueFn: function (_thisVal) {
        //获取云台速度变倍参数值
        speedZoomParameter = _thisVal;
    },

    //灯光开关监听函数
    haeundaeLightCheckedFn: function () {
        var control;
        //开启
        if ($(this).is(":checked")) {
            layer.msg("灯光开启");
            control = 1;
        } else {
            layer.msg("灯光关闭");
            control = 0;
        }
        if (control != null && control != undefined) {
            var type = 4; // 灯光
            var channelNum = haeundaeChannelNum; // 通道号
            var vehicleId = haeundaeVehicleId;
            var url = "/clbs/cloudTerrace/sendParam";
            var data = {"vehicleId": vehicleId, "channelNum": channelNum, "type": type, "control": control};
            json_ajax("post", url, "json", false, data, function (data) {
                if (data.success) {
                    realTimeVideLoad.logFindCilck();
                    realTimeVideLoad.updateWaitTime();
                }
            });
        }
    },

    //雨刷开关监听函数
    haeundaeWipersCheckedFn: function () {
        var control;
        //开启
        if ($(this).is(":checked")) {
            layer.msg("雨刷开启");
            control = 1;
        } else {
            layer.msg("雨刷关闭");
            control = 0;
        }
        if (control != null && control != undefined) {
            var type = 3; // 雨刷
            var channelNum = haeundaeChannelNum; // 通道号
            var vehicleId = haeundaeVehicleId;
            var url = "/clbs/cloudTerrace/sendParam";
            var data = {"vehicleId": vehicleId, "channelNum": channelNum, "type": type, "control": control};
            json_ajax("post", url, "json", false, data, function (data) {
                if (data.success) {
                    realTimeVideLoad.logFindCilck();
                    realTimeVideLoad.updateWaitTime();
                }
            });
        }
    },

    //变焦 变倍 光圈控制函数
    zoomDoubleApertureFn: function () {
        var control; // 0:调大 1：调小
        var type; // 1 调焦 2 调光 5 变倍
        var clickId = $(this).attr("id");
        //变焦 加
        if (clickId === "zoomPlus") {
            layer.msg("变焦 加");
            type = 1;
            control = 0;

        }
        //变焦 减
        else if (clickId === "zoomLess") {
            layer.msg("变焦 减");
            type = 1;
            control = 1;
        }
        //变倍 加
        else if (clickId === "doublePlus") {
            layer.msg("变倍 加");
            type = 5;
            control = 0;
        }
        //变倍 减
        else if (clickId === "doubleLess") {
            layer.msg("变倍 减");
            type = 5;
            control = 1;
        }
        //光圈  加
        else if (clickId === "aperturePlus") {
            layer.msg("光圈  加");
            type = 2;
            control = 0;
        }
        //光圈 减
        else if (clickId === "apertureLess") {
            layer.msg("光圈 减");
            type = 2;
            control = 1;
        }
        if (type != undefined && control != undefined) {
            var channelNum = haeundaeChannelNum; // 通道号
            var vehicleId = haeundaeVehicleId;
            var url = "/clbs/cloudTerrace/sendParam";
            var data = {"vehicleId": vehicleId, "channelNum": channelNum, "type": type, "control": control};
            json_ajax("post", url, "json", false, data, function (data) {
                if (data.success) {
                    realTimeVideLoad.logFindCilck();
                    realTimeVideLoad.updateWaitTime();
                }
            });
        }
    },

    //云台控制摄像头方向函数
    haeundaeCameraPathFn: function () {
        var direction = [];
        var _thisId = $(this).attr("id");
        //左上  1 & 3
        if (_thisId === "haeundaeLeftTop") {
            // 下发两次 上和左
            direction = [1, 3];
        }
        //上 1
        else if (_thisId === "haeundaeTop") {
            direction = [1];
        }
        //右上 1 & 4
        else if (_thisId === "haeundaeRightTop") {
            direction = [1, 4];
        }
        //左 3
        else if (_thisId === "haeundaeLeft") {
            direction = [3];
        }
        //中(停止) 0
        else if (_thisId === "haeundaeCenter") {
            direction = [0];
        }
        //右 4
        else if (_thisId === "haeundaeRight") {
            direction = [4];
        }
        //左下 2 & 3
        else if (_thisId === "haeundaeLeftBottom") {
            direction = [2, 3];
        }
        //下 2
        else if (_thisId === "haeundaeBottom") {
            direction = [2];
        }
        //右下 2 & 4
        else if (_thisId === "haeundaeRightBottom") {
            direction = [2, 4];
        }

        if (direction.length > 0) {
            /**
             * 0:云台旋转 0x9301
             * 1:云台调整焦距控制 0x9302
             * 2:云台调整光圈控制 0x9303
             * 3:云台雨刷控制 0x9304
             * 4:红外补光控制 0x9305
             * 5:云台变倍控制 0x9306
             * @type {number}
             */
            var type = 0; // 下发指令
            var speed = speedZoomParameter; // 旋转速度
            var channelNum = haeundaeChannelNum; // 通道号
            var vehicleId = haeundaeVehicleId;
            var url = "/clbs/cloudTerrace/sendParam";
            for (var i = 0; i < direction.length; i++) {
                // 组装数据
                var control = direction[i]; // 方向
                var data = {
                    "vehicleId": vehicleId,
                    "channelNum": channelNum,
                    "type": type,
                    "speed": speed,
                    "control": control
                };
                json_ajax("post", url, "json", false, data, function (data) {
                    if (data.success) {
                        realTimeVideLoad.logFindCilck();
                        realTimeVideLoad.updateWaitTime();
                    }
                });
            }
        }
    },

    // 更新地图信息
    updateVehicleMap: function (data) {
        var msgBody = data.data.msgBody;
        var msgDesc = data.desc;

        // 判断推送的是否是当前聚焦跟踪的监控对象信息
        if (monitoringObjFocusId != msgDesc.monitorId) return;

        var monitorInfo = data.data.msgBody.monitorInfo;
        var vehicleName = monitorInfo.monitorName; // 监控对象名称
        var time = realTimeVideLoad.timeTransform(msgBody.gpsTime.toString()); // 定位时间
        var deviceNo = monitorInfo.deviceNumber; // 终端号
        var simNo = monitorInfo.simcardNumber; // sim卡号
        var driverName = (monitorInfo.professionalsName == '' || monitorInfo.professionalsName == 'null' || monitorInfo.professionalsName == null || monitorInfo.professionalsName == undefined ? '-' : monitorInfo.professionalsName); // 从业人员
        var speed = msgBody.gpsSpeed; // 速度
        var formattedAddress = ((msgBody.positionDescription == '' || msgBody.positionDescription == null || msgBody.positionDescription == 'null') ? '未定位' : msgBody.positionDescription); // 位置信息

        var this_longitude = msgBody.longitude; // 经度
        var this_latitude = msgBody.latitude; // 纬度
        var vehicleIcon = monitorInfo.monitorIcon; // 车辆图标

        var vehicleId = monitorInfo.monitorId; // 监控对象ID
        var stateInfo = msgBody.stateInfo; // 车辆状态

        // 订阅监控对象信息保存及更新
        if (subscribeObjInfoMap.containsKey(vehicleId)) {
            subscribeObjInfoMap.remove();
        }
        var infoArray = [vehicleName, time, deviceNo, simNo, driverName, speed, formattedAddress];
        subscribeObjInfoMap.put(vehicleId, infoArray);

        // 信息窗体信息
        var statusMsg = (Array(32).join(0) + msgBody.status.toString(2)).slice(-32);//高位补零
        var vehicleColor = getPlateColor(monitorInfo.plateColor);//车牌颜色
        var runState = speed == 0 ? '停止' : '行驶';
        var business = monitorInfo.groupName == undefined ? "" : monitorInfo.groupName; // 所属企业
        var groupNames = monitorInfo.assignmentName === undefined ? '未绑定分组' : monitorInfo.assignmentName; // 所属分组
        var vehicleTypeName = monitorInfo.vehicleType == '' || monitorInfo.vehicleType == undefined || monitorInfo.vehicleType == null ? '为设置分类' : monitorInfo.vehicleType; // 对象类型

        var accState = msgBody.status + ''; // ACC状态
        if (msgDesc.msgID == "512" || msgDesc.msgID == "513" || msgDesc.msgID == "1796" || msgDesc.msgID == "1280") {
            accState = msgBody.status & 1;
        } else if (acc.length == 32) {
            accState = (msgBody.status).substring(18, 19);
        } else {
            accState = msgBody.status;
        }
        if ((accState + '').length == 1) {
            accState = accState == 0 ? '关' : '开';
        } else if (acc == "21") {
            accState = '点火静止';
        } else if (acc == "16") {
            accState = '熄火拖车';
        } else if (acc == "1A") {
            accState = '熄火假拖车';
        } else if (acc == "11") {
            accState = '熄火静止';
        } else if (acc == "12") {
            accState = '熄火移动';
        } else if (acc == "22") {
            accState = '点火移动';
        } else if (acc == "41") {
            accState = '无点火静止';
        } else if (acc == "42") {
            accState = '无点火移动';
        }
        ;

        var todayDistance = msgBody.dayMileage === undefined ? '0.0' : Number(msgBody.dayMileage).toFixed(1); // 当日里程
        // 南北纬
        var latitude;
        var longitude;
        if (msgBody.latitude < 1000 && msgBody.longitude < 1000) {
            latitude = Number(msgBody.latitude).toFixed(6);//纬度
            longitude = Number(msgBody.longitude).toFixed(6);//经度
        } else {
            latitude = msgBody.latitude / 1000000;//纬度
            longitude = msgBody.longitude / 1000000;//经度
        }
        var this_latitude_state;
        if (statusMsg.substring(29, 30) == 0) {
            this_latitude_state = '北纬：' + latitude;
        } else if (statusMsg.substring(30, 31) == 1) {
            this_latitude_state = '南纬：' + latitude;
        }

        var this_longitude_state;
        if (statusMsg.substring(28, 29) == 0) {
            this_longitude_state = '东经：' + longitude;
        } else if (statusMsg.substring(28, 29) == 1) {
            this_longitude_state = '西经：' + longitude;
        }

        // 总里程
        var mileage = 0;
        if (msgBody.gpsMileage != undefined) {
            mileage = msgBody.gpsMileage;
        }

        // 方向
        var direction = realTimeVideLoad.toDirectionStr(msgBody.direction);

        // 记录仪速度
        var speedX = 0;
        var gpsAttachInfoList = msgBody.gpsAttachInfoList;
        if (gpsAttachInfoList != undefined) {
            if (Array.isArray(gpsAttachInfoList)) {
                for (var i = 0; i < gpsAttachInfoList.length; i++) {
                    var gpsAttachInfoID = gpsAttachInfoList[i].gpsAttachInfoID;
                    if (gpsAttachInfoID == 3) {
                        speedX = gpsAttachInfoList[i].speed;
                    }
                    ;
                }
                ;
            }
            ;
        }
        ;

        // 高程
        var gps_altitude = realTimeVideLoad.fiterNumber(msgBody.altitude);
        gps_altitude = gps_altitude == undefined ? '0' : gps_altitude;

        // 电子运单
        var electronicWaybill = '';

        // 从业资格证
        var employedQualificationNumber = '';

        // 是否运营
        var isOperating;
        if (statusMsg.substring(27, 28) == 0) {
            isOperating = '运营状态';
        } else if (statusMsg.substring(27, 28) == 1) {
            isOperating = '停运状态';
        }

        // 车辆油路状态
        var carOilState;
        if (statusMsg.substring(21, 22) == 0) {
            carOilState = '车辆油路正常';
        } else if (statusMsg.substring(21, 22) == 1) {
            carOilState = '车辆油路断开';
        }

        // 车辆电路状态
        var carCircuitState;
        if (statusMsg.substring(20, 21) == 0) {
            carCircuitState = '车辆电路正常';
        } else if (statusMsg.substring(20, 21) == 1) {
            carCircuitState = '车辆电路断开';
        }

        // 车门是否锁定
        var isCarDoorLock;
        if (statusMsg.substring(19, 20) == 0) {
            isCarDoorLock = '车门解锁';
        } else if (statusMsg.substring(19, 20) == 1) {
            isCarDoorLock = '车门加锁';
        }

        // 原始经纬度
        var originalLongitude = msgBody.originalLongitude;
        var originalLatitude = msgBody.originalLatitude;

        var content = [
            vehicleId, // 车辆ID
            time, // 时间
            vehicleName, // 监控对象
            vehicleColor, // 监控对象颜色
            deviceNo, // 终端号
            simNo, // sim卡号
            runState, //行驶状态
            speed, // 行驶速度
            formattedAddress, //位置
            business, // 所属企业
            groupNames, // 所属分组
            vehicleTypeName, // 对象类型
            accState, // ACC状态
            todayDistance, // 当日里程
            this_latitude_state, // 纬度
            this_longitude_state, // 经度
            mileage, // 总里程
            direction, // 方向
            speedX, // 记录仪速度
            gps_altitude, // 高程
            electronicWaybill, // 电子运单
            driverName, // 从业人员
            employedQualificationNumber, // 从业资格证书
            isOperating, // 运营状态
            carOilState, // 车辆油路状态
            carCircuitState, // 车辆电路状态
            isCarDoorLock, // 车门是否锁定
            originalLongitude, // 原始经度
            originalLatitude // 原始纬度
        ];

        // 更新信息窗口信息
        if (objImformationMap.containsKey(vehicleId)) {
            var value = objImformationMap.get(vehicleId);
            content[29] = value[29] ? value[29] : '';
            objImformationMap.remove(vehicleId);
        }
        objImformationMap.put(vehicleId, content);

        if (monitoringObjFocusId === vehicleId || monitoringObjFocusId === undefined) {
            $('#vehicleName').text(vehicleName);
            $('#updateTime').text(time);
            $('#deviceNo').text(deviceNo);
            $('#simNo').text(simNo);
            $('#driverName').text(driverName);
            $('#updateSpeed').text(speed + 'km/h');
            $('#formattedAddress').text(formattedAddress);
        }

        realTimeVideLoad.updateMapInfo(vehicleId, vehicleName, this_longitude, this_latitude, vehicleIcon, stateInfo);
    }
    ,

    // 时间转换
    timeTransform: function (sysTime) {
        var serviceSystemTime;
        if (sysTime.length === 12) {
            serviceSystemTime = 20 + sysTime.substring(0, 2) + "-" + sysTime.substring(2, 4) + "-" + sysTime.substring(4, 6) + " " +
                sysTime.substring(6, 8) + ":" + sysTime.substring(8, 10) + ":" + sysTime.substring(10, 12);
        } else if (sysTime.length === 13) {
            //毫秒级时间戳转换
            var dateTime = new Date(parseInt(sysTime));
            serviceSystemTime = dateTime.getFullYear() + "-"
                + ((dateTime.getMonth() + 1) < 10 ? "0" + (dateTime.getMonth() + 1) : (dateTime.getMonth() + 1))
                + "-" + (dateTime.getDate() < 10 ? "0" + dateTime.getDate() : dateTime.getDate())
                + " "
                + (dateTime.getHours() < 10 ? "0" + dateTime.getHours() : dateTime.getHours()) + ":"
                + (dateTime.getMinutes() < 10 ? "0" + dateTime.getMinutes() : dateTime.getMinutes()) + ":"
                + dateTime.getSeconds();
        } else {
            serviceSystemTime = sysTime;
        }

        return serviceSystemTime;
    }
    ,

    // 封装map集合
    mapVehicle: function () {
        this.elements = [];
        //获取MAP元素个数
        this.size = function () {
            return this.elements.length;
        };
        //判断MAP是否为空
        this.isEmpty = function () {
            return (this.elements.length < 1);
        };
        //删除MAP所有元素
        this.clear = function () {
            this.elements = [];
        };
        //向MAP中增加元素（key, value)
        this.put = function (_key, _value) {
            this.elements.push({
                key: _key,
                value: _value
            });
        };
        //删除指定KEY的元素，成功返回True，失败返回False
        this.remove = function (_key) {
            var bln = false;
            try {
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    if (this.elements[i].key === _key) {
                        this.elements.splice(i, 1);
                        return true;
                    }
                }
            } catch (e) {
                bln = false;
            }
            return bln;
        };
        //获取指定KEY的元素值VALUE，失败返回NULL
        this.get = function (_key) {
            try {
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    if (this.elements[i].key === _key) {
                        return this.elements[i].value;
                    }
                }
            } catch (e) {
                return null;
            }
        };
        //获取指定索引的元素（使用element.key，element.value获取KEY和VALUE），失败返回NULL
        this.element = function (_index) {
            if (_index < 0 || _index >= this.elements.length) {
                return null;
            }
            return this.elements[_index];
        };
        //判断MAP中是否含有指定KEY的元素
        this.containsKey = function (_key) {
            var bln = false;
            try {
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    if (this.elements[i].key === _key) {
                        bln = true;
                    }
                }
            } catch (e) {
                bln = false;
            }
            return bln;
        };
        //判断MAP中是否含有指定VALUE的元素
        this.containsValue = function (_value) {
            var bln = false;
            try {
                for (var i = 0, len = this.elements.length; i < len; i++) {
                    if (this.elements[i].value === _value) {
                        bln = true;
                    }
                }
            } catch (e) {
                bln = false;
            }
            return bln;
        };
        //获取MAP中所有VALUE的数组（ARRAY）
        this.values = function () {
            var arr = [];
            for (var i = 0, len = this.elements.length; i < len; i++) {
                arr.push(this.elements[i].value);
            }
            return arr;
        };
        //获取MAP中所有KEY的数组（ARRAY）
        this.keys = function () {
            var arr = [];
            for (var i = 0, len = this.elements.length; i < len; i++) {
                arr.push(this.elements[i].key);
            }
            return arr;
        };
    }
    ,

    // 更新地图位置信息
    updateMapInfo: function (id, name, longitude, latitude, icon, stateInfo) {
        var lngLat = [longitude, latitude];
        // 车辆经纬度集合
        if (monitoringObjLngLatMap.containsKey(id)) {
            var value = monitoringObjLngLatMap.get(id);
            monitoringObjLngLatMap.remove(id);
            value.push(lngLat);
            monitoringObjLngLatMap.put(id, value);
        } else {
            monitoringObjLngLatMap.put(id, [lngLat]);
        }

        // 图标位置更新
        if (monitoringObjMap.containsKey(id)) { // 判断是否已经有该ID的车辆marker
            if (monitoringObjFocusId === id) {
                realTimeVideLoad.markerMove(id, name, icon, stateInfo);
            }
        } else {
            realTimeVideLoad.carNameEvade(id, name, lngLat, icon, stateInfo, true);
        }
    }
    ,

    // 车牌避让
    carNameEvade: function (id, name, lngLat, icon, stateInfo, isFirstCreate) {
        /*if (name.length > 7) {
            name = name.substring(0, 6) + '...';
        }*/

        var value = lngLat; // 经纬度
        var picWidth; // 图片宽度
        var picHeight; // 图片高度
        var icons; // 图片marker路劲
        if (icon === "null" || icon === undefined || icon == null) {
            icons = "../../resources/img/vehicle.png";
        } else {
            icons = "../../resources/img/vico/" + icon;
        }

        picWidth = 58 / 2;
        picHeight = 26 / 2;

        // 显示对象姓名区域大小
        var nameAreaWidth = 90;
        var nameAreaHeight = 38;

        // 车辆状态判断
        var carState = realTimeVideLoad.stateCallBack(stateInfo);

        // 监控对象旋转角度
        var markerAngle = 0; //图标旋转角度
        if (monitoringObjMap.containsKey(id)) {
            var thisCarMarker = monitoringObjMap.get(id);
            markerAngle = thisCarMarker.getAngle();
            if (markerAngle > 360) {
                var i = Math.floor(markerAngle / 360);
                markerAngle = markerAngle - 360 * i;
            }
        }

        // 将经纬度转为像素
        var pixel = videoMap.lngLatToContainer(value);
        var pixelX = pixel.getX();
        var pixelY = pixel.getY();
        var pixelPX = [pixelX, pixelY];

        // 得到车辆图标四个角的像素点(假设车图标永远正显示)58*26
        var defaultLU = [pixelX - picWidth, pixelY - picHeight];//左上
        var defaultRU = [pixelX + picWidth, pixelY - picHeight];//右上
        var defaultLD = [pixelX - picWidth, pixelY + picHeight];//左下
        var defaultRD = [pixelX + picWidth, pixelY + picHeight];//右下

        // 计算后PX
        var pixelRD = realTimeVideLoad.countAnglePX(markerAngle, defaultRD, pixelPX, 1, picWidth, picHeight);
        var pixelRU = realTimeVideLoad.countAnglePX(markerAngle, defaultRU, pixelPX, 2, picWidth, picHeight);
        var pixelLU = realTimeVideLoad.countAnglePX(markerAngle, defaultLU, pixelPX, 3, picWidth, picHeight);
        var pixelLD = realTimeVideLoad.countAnglePX(markerAngle, defaultLD, pixelPX, 4, picWidth, picHeight);

        // 四点像素转为经纬度
        var llLU = videoMap.containTolnglat(new AMap.Pixel(pixelLU[0], pixelLU[1]));
        var llRU = videoMap.containTolnglat(new AMap.Pixel(pixelRU[0], pixelRU[1]));
        var llLD = videoMap.containTolnglat(new AMap.Pixel(pixelLD[0], pixelLD[1]));
        var llRD = videoMap.containTolnglat(new AMap.Pixel(pixelRD[0], pixelRD[1]));

        // 车牌显示位置左上角PX
        var nameRD_LU = [pixelRD[0], pixelRD[1]];
        var nameRU_LU = [pixelRU[0], pixelRU[1] - nameAreaHeight];
        var nameLU_LU = [pixelLU[0] - nameAreaWidth, pixelLU[1] - nameAreaHeight];
        var nameLD_LU = [pixelLD[0] - nameAreaWidth, pixelLD[1]];

        // 分别将上面四点转为经纬度
        var llNameRD_LU = videoMap.containTolnglat(new AMap.Pixel(nameRD_LU[0], nameRD_LU[1]));
        var llNameRU_LU = videoMap.containTolnglat(new AMap.Pixel(nameRU_LU[0], nameRU_LU[1]));
        var llNameLU_LU = videoMap.containTolnglat(new AMap.Pixel(nameLU_LU[0], nameLU_LU[1]));
        var llNameLD_LU = videoMap.containTolnglat(new AMap.Pixel(nameLD_LU[0], nameLD_LU[1]));

        //判断车牌号该显示的区域
        var mapPixel = llRD;
        var LUPX = llNameRD_LU;
        var showLocation = 'carNameShowRD';
        if (isFirstCreate) { // 第一次创建对应ID marker

            // 创建marker
            var marker = new AMap.Marker({
                position: value,
                icon: icons,
                offset: new AMap.Pixel(-picWidth, -picHeight), //相对于基点的位置
                autoRotation: true,//自动调节图片角度
                map: videoMap
            });

            marker.off('click').on('click', realTimeVideLoad.markerClickFun);

            // id, name, lngLat, icon, stateInfo, isFirstCreate
            marker.id = id;
            marker.name = name;
            marker.icon = icon;
            marker.stateInfo = stateInfo;
            if (monitoringObjFocusId !== id) {
                marker.hide();
            } else {
                videoMap.setCenter(value);
            }

            monitoringObjMap.put(id, marker);

            // 创建车牌号marker
            var carContent = "<p class='" + showLocation + "'><i class='" + carState + "'></i>&ensp;<span class='monitorNameBox'>" + name + "</span></p>";
            if (monitoringObjNameMap.containsKey(id)) {
                var nameMarker = monitoringObjNameMap.get(id);
                videoMap.remove([nameMarker]);
                monitoringObjNameMap.remove(id);
            }
            var thisNameMarker = new AMap.Marker({
                position: mapPixel,
                content: carContent,
                offset: new AMap.Pixel(0, 0),
                autoRotation: true,//自动调节图片角度
                map: videoMap,
                zIndex: 999
            });
            thisNameMarker.setMap(videoMap);
            monitoringObjNameMap.put(id, thisNameMarker);
        } else { // 不是第一次创建
            var carContentHtml = "<p class='" + showLocation + "'><i class='" + carState + "'></i>&ensp;<span class='monitorNameBox'>" + name + "</span></p>";
            if (monitoringObjNameMap.containsKey(id)) {
                var nameMarker = monitoringObjNameMap.get(id);
                nameMarker.show();
                nameMarker.setContent(carContentHtml);
                nameMarker.stateInfo = stateInfo;
                nameMarker.setPosition(llRD);
                nameMarker.setOffset(new AMap.Pixel(0, 0));
            }
        }
    }
    ,

    //计算车牌号四个定点的像素坐标
    countAnglePX: function (angle, pixel, centerPX, num, picWidth, picHeight) {
        var thisPX;
        var thisX;
        var thisY;
        if ((angle <= 45 && angle > 0) || (angle > 180 && angle <= 225) || (angle >= 135 && angle < 180) || (angle >= 315 && angle < 360)) {
            angle = 0;
        }
        if ((angle < 90 && angle > 45) || (angle < 270 && angle > 225) || (angle > 90 && angle < 135) || (angle > 270 && angle < 315)) {
            angle = 90;
        }
        if (angle === 90 || angle === 270) {
            if (num === 1) {
                thisX = centerPX[0] + picHeight;
                thisY = centerPX[1] + picWidth;
            }
            if (num === 2) {
                thisX = centerPX[0] + picHeight;
                thisY = centerPX[1] - picWidth;
            }
            if (num === 3) {
                thisX = centerPX[0] - picHeight;
                thisY = centerPX[1] - picWidth;
            }
            if (num === 4) {
                thisX = centerPX[0] - picHeight;
                thisY = centerPX[1] + picWidth;
            }
        }
        if (angle === 0 || angle === 180 || angle === 360) {
            thisX = pixel[0];
            thisY = pixel[1];
        }
        thisPX = [thisX, thisY];
        return thisPX;
    }
    ,

    // 监控对象状态返回
    stateCallBack: function (stateInfo) {
        var state;
        switch (stateInfo) {
            case 4:
                state = 'carStateRun';
                break;
            case 10:
                state = 'carStateRun';
                break;
            case 5:
                state = 'carStateRun';
                break;
            case 2:
                state = 'carStateRun';
                break;
            case 3:
                state = 'carStateOffLine';
                break;
            case 9:
                state = 'carStateRun';
                break;
            case 11:
                state = 'carStateheartBeat';
                break;
        }
        return state;
    }
    ,

    // marker 移动
    markerMove: function (id, name, icon, stateInfo) {
        var value = monitoringObjLngLatMap.get(id);
        if (value.length == 2) {
            var position = value[1];
            if (value[0][0] == position[0] && value[0][1] == position[1]) {
                monitoringObjLngLatMap.remove(id);
                value.splice(0, 1);
                monitoringObjLngLatMap.put(id, value);
                if (value.length == 2) {
                    realTimeVideLoad.markerMove(id, name, icon, stateInfo);
                }
            } else {
                var marker = monitoringObjMap.get(id);
                var speed = 80;
                marker.moveTo(position, speed);
                // marker 移动过程监听事件
                marker.on('moving', function (info) {
                    realTimeVideLoad.markerMoving(info, id, name, icon, stateInfo)
                });
                // marker 移动结束事件
                marker.on('moveend', function () {
                    realTimeVideLoad.markerMoveend(id)
                });
            }
        }
    }
    ,

    // 移动过程监听事件
    markerMoving: function (info, id, name, icon, stateInfo) {
        var movelnglat = [info.passedPath[1].lng, info.passedPath[1].lat];
        // 判断当前点是否在地图可以范围内
        if (mapBounds && !mapBounds.contains(movelnglat)) {
            videoMap.setCenter(movelnglat);
            realTimeVideLoad.getMapArea();
        }
        realTimeVideLoad.carNameEvade(id, name, movelnglat, icon, stateInfo, false);
    }
    ,

    // 移动结束事件
    markerMoveend: function (id) {
        var value = monitoringObjLngLatMap.get(id);
        monitoringObjLngLatMap.remove(id);
        value = value.splice(0, 1);
        monitoringObjLngLatMap.put(id, value);
        if (value.length >= 2) {
            realTimeVideLoad.moveendBeforeCallBack(id);
        }
    }
    ,

    // 监控对象未走完，数据先上来
    moveendBeforeCallBack: function (id) {
        var value = monitoringObjLngLatMap.get(id);
        var position = value[1];
        if (value[0][0] == position[0] && value[0][1] == position[1]) {
            monitoringObjLngLatMap.remove(id);
            value.splice(0, 1);
            monitoringObjLngLatMap.put(id, value);
            realTimeVideLoad.moveendBeforeCallBack(id);
        } else {
            var marker = monitoringObjMap.get(id);
            var speed = 80;
            marker.moveTo(position, speed);
            // marker 移动过程监听事件
            marker.on('moving', function (info) {
                realTimeVideLoad.markerMoving(info, id, name, icon, stateInfo)
            });
            // marker 移动结束事件
            marker.on('moveend', function () {
                realTimeVideLoad.markerMoveend(id)
            });
        }
    }
    ,

    // 获取map可视区域范围
    getMapArea: function () {
        var southWest = videoMap.getBounds().getSouthWest(); // 西南角
        var northEast = videoMap.getBounds().getNorthEast(); // 东北角
        var neLng = northEast.lng - ((northEast.lng - southWest.lng) * 0.2); // 东北角经度
        var neLat = northEast.lat - ((northEast.lat - southWest.lat) * 0.2); // 东北角纬度
        var swLng = southWest.lng + ((northEast.lng - southWest.lng) * 0.2); // 西南角经度
        var swLat = southWest.lat + ((northEast.lat - southWest.lat) * 0.2); // 西南角纬度
        var southWestValue = [swLng, swLat];
        var northEastValue = [neLng, neLat];
        mapBounds = new AMap.Bounds(southWestValue, northEastValue);
    }
    ,

    // 地图层级改变触发事件
    mapZoomChange: function () {
        if (monitoringObjFocusId !== undefined) {
            var marker = monitoringObjMap.get(monitoringObjFocusId);
            if (marker !== null) {
                var id = marker.id
                    , name = marker.name
                    , lngLat = marker.getPosition()
                    , icon = marker.icon
                    , stateInfo = marker.stateInfo;
                realTimeVideLoad.carNameEvade(id, name, lngLat, icon, stateInfo, false);
            }
            realTimeVideLoad.getMapArea();
        }
    }
    ,

    // 日志记录
    logFindCilck: function () {
        if (clickLogCount == 0) {
            webSocket.subscribe(headers, '/user/' + $("#userName").text() + '/deviceReportLog', function () {
                var data = {"eventDate": logTime, "webType": 2}
                address_submit("POST", '/clbs/m/reportManagement/logSearch/findLog', "json", true, data, true, realTimeVideLoad.logFind);
            }, null, null);
            clickLogCount = 1;
        }
        var data = {"eventDate": logTime, "webType": 2}
        address_submit("POST", '/clbs/m/reportManagement/logSearch/findLog', "json", true, data, true, realTimeVideLoad.logFind);
        setTimeout(function () {
            realTimeVideLoad.layoutChange();
            realTimeVideLoad.windowResize();
        }, 200);
    }
    ,
    logFind: function (data) {
        operationLogLength = data.length;
        $("#loggingDataTable").children("tbody").empty();
        var logTable = 1;
        var html = "";
        var logType = "";
        var content = "";
        for (var i = 0; i < data.length; i++) {
            if (data[i].logSource == "1") {
                logType = '终端上传';
                content = "<a onclick = 'realTimeVideLoad.showLogContent(\"" + data[i].message + "\")'>" + data[i].monitoringOperation + "</a>";
            } else if (data[i].logSource == "2") {
                logType = '平台下发';
                content = data[i].message;
            } else {
                logType = '平台操作';
                if (data[i].monitoringOperation === "批量文本信息下发") {
                    content = "<a onclick = 'realTimeVideLoad.showLogContent(\"" + data[i].message + "\")'>" + data[i].monitoringOperation + "</a>";
                } else {
                    content = data[i].message;
                }
            }
            html += "<tr><td>" + logTable + "</td><td>" + data[i].eventDate + "</td><td>" + (data[i].ipAddress != null ? data[i].ipAddress : "") + "</td><td>" + (data[i].username != null ? data[i].username : "") + "</td><td>" + data[i].brand + "</td><td>" + (data[i].plateColorStr === "" ? "-" : data[i].plateColorStr) + "</td><td>" + content + "</td><td>" + logType + "</td></tr>";
            logTable++;
        }
        $("#loggingDataTable").children("tbody").append(html);
        realTimeVideLoad.layoutChange();
    }
    ,

    showLogContent: function (content) { // 显示log详情
        $("#logDetailDiv").modal("show");
        $("#logContent").html(content);
    }
    ,

    // 获取当前服务器系统时间
    getNowFormatDate: function () {
        var url = "/clbs/v/monitoring/getTime"
        logTime = new Date().getTime()
    }
    ,

    // 视频显示比例显示
    scaleAreaShow: function () {
        if ($('#scaleRight').css('opacity') == 1) {
            $('#scaleRight').animate({'opacity': 0});
        } else {
            $('#scaleRight').animate({'opacity': 1});
        }
    }
    ,

    // 视频右键点击事件
    videoRightFun: function (e) {
        subtitleParentDom = $(this);
        var domId = $(this).siblings('video').attr('id');
        var y = e.clientY, x = e.clientX;
        var id = $('#' + domId).attr('vehicle-id');
        if (id != '') {
            $('#videoMenu li').show();
            var channelNum = $('#' + domId).attr('channel-num');
            var videoType = $('#' + domId).attr('channel-type');

            $('#videoVehicleId').val(id);
            $('#videoChannelNum').val(channelNum);
            $('#videoChannelType').val(videoType);
            $('#videoDomId').val(domId);
            $('#scaleRight').css('opacity', 0);
            $('#videoMenu').css({top: y + 'px', left: x + 'px', display: 'block'});
        }
        ;

        e.preventDefault();
    }
    ,

    // 关闭视频
    closeVideoFun: function (id, orderType) {
        var vehicleId = null;
        var channelNum = null;
        var channelType = null;
        var unique = null;
        if (orderType === 15) {
            var values = realTimeVideLoad.videoPropertyFun(null);
            vehicleId = values[0];
            channelNum = values[1];
            channelType = values[2];
            unique = values[3];
            realTimeVideLoad.videoCloseSocket(null, null);
            realTimeVideLoad.clearVideoInfo(null, null);
        } else if (orderType === 14 && id === null) {
            vehicleId = $('#videoVehicleId').val();
            channelNum = $('#videoChannelNum').val();
            channelType = $('#videoChannelType').val();
            unique = subscribeVideoMap.get(vehicleId + '-' + channelNum)[4];
            realTimeVideLoad.videoCloseSocket(vehicleId, channelNum);
            realTimeVideLoad.clearVideoInfo(vehicleId, channelNum, null);
        } else {
            var values = realTimeVideLoad.videoPropertyFun(id);
            vehicleId = values[0];
            channelNum = values[1];
            channelType = values[2];
            unique = values[3];
            realTimeVideLoad.videoCloseSocket(id, null);
            realTimeVideLoad.clearVideoInfo(id, null, null);
        }

        if (vehicleId !== '') {
            var data = {
                vehicleId: vehicleId,
                orderType: orderType,
                channelNum: channelNum,
                control: 0,
                closeVideoType: 0,
                changeStreamType: 0,
                channelType: channelType,
                requestType: 0,
                unique: unique
            };
            realTimeVideLoad.videoHandleFun(data);
        }

        // 关闭视频info集合
        $('#videoMenu').hide();
    }
    ,

    /**
     * 五分钟取消所有
     */
    clearAllVideo5Min: function () {
        var values = realTimeVideLoad.videoPropertyFun(null);

        var ids = values[0].split(',');
        var newIds = realTimeVideLoad.unique(ids);

        var url = "/clbs/vehicle/unSubAllVideo";
        var data = {
            userName: $("#userName").text(),
            vids: newIds.join(',')
        };
        json_ajax("POST", url, "json", true, data, function (data) {
            if (data.success) {
                realTimeVideLoad.videoCloseSocket(null, null);
                realTimeVideLoad.clearVideoInfo(null, null, null);
            }
        });
    }
    ,

    /**
     * 数组去重
     */
    unique: function (array) {
        var res = [];
        var json = {};
        for (var i = 0; i < array.length; i++) {
            if (!json[array[i]]) {
                res.push(array[i]);
                json[array[i]] = 1;
            }
        }
        return res;
    }
    ,

    // 主码流
    mainCodeStreamFun: function () {
        var id = $('#videoVehicleId').val();
        var channelNum = $('#videoChannelNum').val();
        var type = $('#videoChannelType').val();
        var data = {
            vehicleId: id,
            orderType: 20,
            channelNum: channelNum,
            control: 1,
            closeVideoType: 0,
            changeStreamType: 0,
            channelType: type,
            requestType: 0
        };
        realTimeVideLoad.videoHandleFun(data);
        $('#videoMenu').hide();
    }
    ,

    // 子码流
    subcodeFlowFun: function () {
        var id = $('#videoVehicleId').val();
        var channelNum = $('#videoChannelNum').val();
        var type = $('#videoChannelType').val();
        var data = {
            vehicleId: id,
            orderType: 21,
            channelNum: channelNum,
            control: 1,
            closeVideoType: 0,
            changeStreamType: 1,
            channelType: type,
            requestType: 0
        };
        realTimeVideLoad.videoHandleFun(data);
        $('#videoMenu').hide();
    }
    ,

    // 抓拍
    takePhotoFun: function () {
        $('#snapText').val('');
        var vid = $('#videoVehicleId').attr('value');
        var cNumber = $('#videoChannelNum').attr('value');
        var id = vid + '-' + cNumber;
        var videoObj = createVideoMap.get(id);
        photoImageFormData = videoObj.videoScreenshots('canvasForVideo', 524, 400);
        $('#videoSnap').modal('show');
        var treeObj = $.fn.zTree.getZTreeObj("vTreeList");
        var node = treeObj.getNodeByParam("id", vid, null);
        // $('#videoImage').attr('value', image);
        $('#photoObjName').text(node.name);
        $('#photoObjColor').text(getPlateColor(node.plateColor));
        $('#photoObjNumber').text(cNumber);
        $('#vehicleId').attr('value', vid);
        $('#videoMenu').hide();
    }
    ,

    // 默认比例
    defaultScaleFun: function () {
        var videoId = $('#videoDomId').val();
        $('#' + videoId).css('height', '100%');
        $('#videoMenu').hide();
    }
    ,

    // 4:3
    twoScaleFun: function () {
        var videoId = $('#videoDomId').val();
        $('#' + videoId).css('height', '75%');
        $('#videoMenu').hide();
    }
    ,

    // 16:9
    threeScaleFun: function () {
        var videoId = $('#videoDomId').val();
        $('#' + videoId).css('height', '56%');
        $('#videoMenu').hide();
    }
    ,

    // 关闭视频、清除视频、暂停视频、清除视频、主子码流切换、静音 下发接口、关闭双向对讲
    videoHandleFun: function (data) {
        var url = '/clbs/realTimeVideo/video/sendVideoParam';
        json_ajax("POST", url, "json", false, data, function (info) {
            if (info.success) { // 下发成功9102操作
                realTimeVideLoad.updateWaitTime();
                realTimeVideLoad.logFindCilck();
            } else {
                layer.msg('下发失败');
            }
        });
    }
    ,

    // 9102或9101操作后，更新监听时间
    updateWaitTime: function () {
        clearTimeout(waitTimeTimeout);
        if (subscribeVideoNum == undefined || subscribeVideoNum == null || subscribeVideoNum == 0) {
            return;
        }
        waitTimeTimeout = setTimeout(function () {
            // 5分钟后无操作弹出窗口
            // 5秒计时，无操作默认执行关闭
            var fiveSecoundTimeout;
            var isConfirmHandle = false;
            var timeText = handleTime / 1000;
            layer.confirm('您已' + timeText + '秒无任何操作，是否继续查看音视频？', {
                title: '提示',
                btn: ['YES，继续看', 'NO，关闭 (<span id="timeUpdate">5</span>)'], //按钮
                btnAlign: 'c',
                fixed: false,
                // 弹出成功
                success: function () {
                    var index = 5;
                    fiveSecoundTimeout = setInterval(function () {
                        index -= 1;
                        $('#timeUpdate').text(index);
                        if (index == 0) {
                            layer.closeAll();
                            // realTimeVideLoad.clearAllVideo5Min();
                            // clearInterval(fiveSecoundTimeout);
                        }
                    }, 1000);
                },
                // 确定
                yes: function () {
                    isConfirmHandle = true;
                    clearInterval(fiveSecoundTimeout);
                    realTimeVideLoad.updateWaitTime();
                    layer.closeAll();
                },
                // 关闭
                cancel: function () {
                    clearInterval(fiveSecoundTimeout);
                    realTimeVideLoad.clearAllVideo5Min();
                },
                // 关闭
                end: function () {
                    if (!isConfirmHandle) {
                        clearInterval(fiveSecoundTimeout);
                        realTimeVideLoad.clearAllVideo5Min();
                    }
                },
            })
        }, handleTime);
    }
    ,

    // 视频参数id、通道号和通道类型组装
    videoPropertyFun: function (vehicleId) {
        var ids = '';
        var values = '';
        var types = '';
        var uniqus = '';

        var subValues = subscribeVideoMap.values();
        for (var i = 0; i < subValues.length; i++) {
            var info = subValues[i];
            if (vehicleId === null) {
                ids += info[0] + ',';
                values += info[1] + ',';
                types += info[2] + ',';
                uniqus += info[4] + ',';
            } else {
                if (vehicleId === info[0]) {
                    ids += info[0] + ',';
                    values += info[1] + ',';
                    types += info[2] + ',';
                    uniqus += info[4] + ',';
                }
            }
        }

        ids = ids.substring(0, ids.length - 1);
        values = values.substring(0, values.length - 1);
        types = types.substring(0, types.length - 1);
        uniqus = uniqus.substring(0, uniqus.length - 1);
        return [ids, values, types, uniqus];
    }
    ,

    // 监听
    goListen: function () {
        //监听参数显示隐藏
        if ($("#listeningContent").is(":hidden")) {
            $("#listeningContent").slideDown();
            $('.listenFooter').show();
            $('#takePicturesContent').hide();
            $('.takePicturesFooter').hide();
            $('#sendTextMessages').hide();
            $('.sendTextFooter').hide();
        } else {
            $("#listeningContent").slideUp();
            $('.listenFooter').hide();
        }
        setTimeout("realTimeVideLoad.logFindCilck()", 500);
    },
    // 拍照
    photo: function () {
        realTimeVideLoad.getPhoto();
        $('#videoMenu').hide();
    }
    ,
    getPhoto: function (data) {
        //拍照参数显示隐藏
        if ($("#takePicturesContent").is(":hidden")) {
            $("#takePicturesContent").slideDown();
            $('.takePicturesFooter').show();
            $("#sendTextMessages").hide();
            $('.sendTextFooter').hide();
            $("#listeningContent").hide();
            $('.listenFooter').hide();
        } else {
            $("#takePicturesContent").slideUp();
            $('.takePicturesFooter').hide();
        }
        setTimeout("realTimeVideLoad.logFindCilck()", 500);
    }
    ,
    // 监听下发
    listenForAlarm: function () {
        if (realTimeVideLoad.listenValidate()) {
            // 为车id赋值
            var vehicleId = $("#vUuid").val();
            $("#vidforAlarmListen").val(vehicleId);
            $("#brandListen").val($("#warningCarName").text());
            $("#alarmListen").val($("#warningType").val());
            $("#startTimeListen").val($("#warningTime").text());

            $("#simcardListen").val($('#simcard').val());
            $("#deviceListen").val($("#device").val());
            $("#snoListen").val($("#sno").val());
            $("#handleTypeListen").val("监听");
            $("#descriptionListen").val($("#warningDescription").text());
            $("#remarkListen").val($("#alarmRemark").val());
            $("#goListeningForAlarm").attr("disabled", "disabled");
            $("#listeningAlarm").ajaxSubmit(function (data) {
                /*if (JSON.parse(data).success) {
                    layer.msg(publicIssuedSuccess);
                    if(isSwitchSignal == 'alarm_switchSignal'){
                        realTimeVideLoad.alarmDataTable_switchSignal();
                    }else{
                        realTimeVideLoad.alarmDataTable();
                    }
                    $("#warningManage").modal('hide');
                } else {
                    layer.msg(publicIssuedFailure);
                }*/
                $("#warningManage").modal('hide');
                $("#goListeningForAlarm").removeAttr("disabled");
            });
        }
        $("#goListeningForAlarm").removeAttr("disabled");
    },
    listenValidate: function () {
        return $("#listeningAlarm").validate({
            rules: {
                monitorPhone: {
                    isNewTel: true,
                    required: true
                },
            },
            messages: {
                monitorPhone: {
                    required: '请输入电话号码'
                },
            }
        }).form();
    },
    //报警处理拍照下发
    takePhotoForAlarm: function () {
        if (realTimeVideLoad.photoValidateForAlarm()) {
            // 为车id赋值
            var vehicleId = $("#vUuid").val();
            $("#vidforAlarm").val(vehicleId);
            $("#brandPhoto").val($("#warningCarName").text());
            $("#alarmPhoto").val($("#warningType").val());
            $("#startTimePhoto").val($("#warningTime").text());

            $("#simcardPhoto").val($('#simcard').val());
            $("#devicePhoto").val($("#device").val());
            $("#snoPhoto").val($("#sno").val());
            $("#handleTypePhoto").val("拍照");
            $("#description-photo").val($("#warningDescription").text());
            $("#remark-photo").val($("#alarmRemark").val());
            $("#goPhotographsForAlarm").attr("disabled", "disabled");
            $("#takePhotoForAlarm").ajaxSubmit(function (data) {
                /*$("#warningManage").modal('hide');
        if (JSON.parse(data).success) {
          layer.msg(publicIssuedSuccess)
          setTimeout("realTimeVideLoad.logFindCilck()", 500);
        } else {
          layer.msg(publicIssuedFailure);
        }*/

            });
            // 根据需求, 此处无需等待响应成功
            $("#warningManage").modal('hide');
            realTimeVideLoad.updateHandleStatus($("#warningCarName").text());
            setTimeout("realTimeVideLoad.logFindCilck()", 500);
        }
        $("#goPhotographsForAlarm").removeAttr("disabled");
    }
    ,
    //报警处理拍照下发数据校验
    photoValidateForAlarm: function () {
        return $("#takePhotoForAlarm").validate({
            rules: {
                wayID: {
                    required: true
                },
                time: {
                    required: true,
                    digits: true,
                    range: [0, 65535]
                },
                command: {
                    range: [0, 10],
                    required: true
                },
                saveSign: {
                    required: true
                },
                distinguishability: {
                    required: true
                },
                quality: {
                    range: [1, 10],
                    required: true
                },
                luminance: {
                    range: [0, 255],
                    required: true
                },
                contrast: {
                    range: [0, 127],
                    required: true
                },
                saturability: {
                    range: [0, 127],
                    required: true
                },
                chroma: {
                    range: [0, 255],
                    required: true
                },
            },
            messages: {
                wayID: {
                    required: alarmSearchChannelID
                },
                time: {
                    required: alarmSearchIntervalTime,
                    digits: alarmSearchIntervalError,
                    range: alarmSearchIntervalSize
                },
                command: {
                    range: alarmSearchPhotoSize,
                    required: alarmSearchPhotoNull
                },
                saveSign: {
                    required: alarmSearchSaveNull
                },
                distinguishability: {
                    required: alarmSearchResolutionNull
                },
                quality: {
                    range: alarmSearchMovieSize,
                    required: alarmSearchMovieNull
                },
                luminance: {
                    range: alarmSearchBrightnessSize,
                    required: alarmSearchBrightnessNull
                },
                contrast: {
                    range: alarmSearchContrastSize,
                    required: alarmSearchContrastNull
                },
                saturability: {
                    range: alarmSearchSaturatedSize,
                    required: alarmSearchSaturatedNull
                },
                chroma: {
                    range: alarmSearchColorSize,
                    required: alarmSearchColorNull
                }
            }
        }).form();
    },
    //下发短信界面
    send: function () {
        if ($("#sendTextMessages").is(":hidden")) {
            $("#sendTextMessages").slideDown();
            $('.sendTextFooter').show();
            $("#takePicturesContent").hide();
            $('.takePicturesFooter').hide();
            $("#listeningContent").hide();
            $('.listenFooter').hide();
        } else {
            $("#sendTextMessages").slideUp();
            $('.sendTextFooter').hide();
        }
        setTimeout("realTimeVideLoad.logFindCilck()", 500);
    }
    ,
    //下发短信
    goTxtSendForAlarm: function () {
        // 为车id赋值
        var vehicleId = $("#vUuid").val();
        $("#vidSendTxtForAlarm").val(vehicleId);
        $("#brandTxt").val($("#warningCarName").text());
        $("#alarmTxt").val($("#warningType").val());
        $("#startTimeTxt").val($("#warningTime").text());

        $("#simcardTxt").val($('#simcard').val());
        $("#deviceTxt").val($("#device").val());
        $("#snoTxt").val($("#sno").val());
        $("#handleTypeTxt").val("下发短信");
        $("#deviceTypeTxt").val(deviceTypeTxt);
        $("#description-Txt").val($("#warningDescription").text());
        $("#remark-Txt").val($("#alarmRemark").val());

        var smsTxt = $("#smsTxt").val();
        if (smsTxt == null || smsTxt.length == 0) {
            realTimeVideLoad.showErrorMsg("下发内容不能为空", "smsTxt");
            return;
        }
        if (smsTxt.length > 512) {
            layer.msg("下发内容不能超过512个字符");
            return;
        }
        $("#goTxtSendForAlarm").attr("disabled", "disabled");
        $("#txtSendForAlarm").ajaxSubmit(function (data) {
            /*$("#warningManage").modal('hide');
      if (JSON.parse(data).success) {
        layer.msg(publicIssuedSuccess)
        setTimeout("realTimeVideLoad.logFindCilck()", 500);
      } else {
        layer.msg(publicIssuedFailure);
      }*/

        });
        $("#goTxtSendForAlarm").removeAttr("disabled");
        $("#warningManage").modal('hide');
        realTimeVideLoad.updateHandleStatus($("#warningCarName").text());
        setTimeout("realTimeVideLoad.logFindCilck()", 500);
    }
    ,
    handleAlarm: function (handleType) {
        var startTime = $("#warningTime").text();
        var plateNumber = $("#warningCarName").text();
        var description = $("#warningDescription").text();
        var vehicleId = $("#vUuid").val();
        var simcard = $('#simcard').val();
        var device = $("#device").val();
        var sno = $("#sno").val();
        var alarm = $("#warningType").val();
        var remark = $("#alarmRemark").val();
        var url = "/clbs/v/monitoring/handleAlarm";
        var data = {
            "vehicleId": vehicleId,
            "plateNumber": plateNumber,
            "alarm": alarm,
            "description": description,
            "handleType": handleType,
            "startTime": startTime,
            "simcard": simcard,
            "device": device,
            "sno": sno,
            "webType": 2,
            "remark": remark
        };
        json_ajax("POST", url, "json", true, data, null);
        $("#warningManage").modal('hide');
        realTimeVideLoad.updateHandleStatus($("#warningCarName").text());
        setTimeout("realTimeVideLoad.logFindCilck()", 500);
        layer.closeAll();
    }
    ,
    // 更新报警处理状态
    updateHandleStatus: function (plateNumber) {
        $("#alarmRecordDataTable").children("tbody").children("tr").each(function () {
            if ($(this).children("td:nth-child(2)").text() == plateNumber) {
                $(this).children("td:nth-child(4)").removeAttr("onclick");
                $(this).children("td:nth-child(4)").text("已处理").removeAttr("style");
            }
        });
    }
    ,
    // 打开视频布局样式
    openVideoArea: function (num, type) {
        var noSubscribe = 0;
        for (var i = 0; i < num.length; i++) {
            if (num[i].iconSkin == 'channelSkin') {
                if (num[i].channelType == 0 || num[i].channelType == 2) {
                    noSubscribe++;
                }
            }
        }

        var l; // 请求视频数量个数
        if (type != 'channel') {
            l = noSubscribe;
        } else {
            l = noSubscribe + subscribeVideoNum;
        }

        if (subscribeVideoNum >= 16) {
            $('#videoSixteen').removeClass("video-sixteen-check");
            realTimeVideLoad.videoSeparatedSixteen('videoSixteen');
            realTimeVideLoad.createVideoDom(l);
        } else {
            if (l > 4 && l <= 6) {
                $("#videoSix").removeClass("video-six-check");
                realTimeVideLoad.videoSeparatedSix('videoSix');
            } else if (l > 6 && l <= 9) {
                $('#videoNine').removeClass("video-nine-check");
                realTimeVideLoad.videoSeparatedNine('videoNine');
            } else if (l > 9 && l <= 10) {
                $("#videoTen").removeClass("video-ten-check");
                realTimeVideLoad.videoSeparatedTen('videoTen');
            } else if (l > 10 && l <= 16) {
                $('#videoSixteen').removeClass("video-sixteen-check");
                realTimeVideLoad.videoSeparatedSixteen('videoSixteen');
            } else if (l > 16) {
                $("#videoSeparated").find("i").removeClass("video-four-check video-six-check video-nine-check video-ten-check");
                $('#videoSixteen').addClass("video-sixteen-check");
                realTimeVideLoad.createVideoDom(l);
            }
        }
    }
    ,

    // 创建video标签
    createVideoDom: function (num) {
        var _html = "";
        for (var i = subscribeVideoNum; i < num; i++) {
            _html +=
                '<div class="pull-left">' +
                '<video autoplay width="100%" height="100%" id="v_' + i + '_Source">' +
                '<source src="" type="video/mp4">' +
                '<source src="" type="video/ogg">' +
                '您的浏览器不支持 video 标签。' +
                '</video>' +
                '</div>';
        }
        $("#video-module").append(_html);
        //高宽度
        var vwidth = 100 / 4;
        //判断视频模块是否隐藏
        if ($("#mapAllShow").children().hasClass("fa fa-chevron-right")) {
            var vheight = $("#map-module").height() / 4;
        } else {
            var vheight = $("#video-module").height() / 4;
        }
        $("#video-module>div").css({
            "width": vwidth + "%",
            "height": "calc(100% - (100% - " + vheight + "px))"
        });
        // 超出16个窗口后，出现滚动条
        $('#video-main-content .video-module').css('overflow', 'auto');
    }
    ,

    // 清除视频时去除订阅、暂停集合数据
    clearVideoInfo: function (id, channelNum, type) {
        var treeObj = $.fn.zTree.getZTreeObj('vTreeList');
        if (id !== null && channelNum !== null) {
            var subId = id + '-' + channelNum;
            if (subscribeVideoMap.containsKey(subId)) {
                var nodes = treeObj.getNodesByParam('id', id, null);
                for (var i = 0; i < nodes.length; i++) {
                    var childrens = nodes[i].children;
                    if (!!childrens) {
                        for (var j = 0; j < childrens.length; j++) {
                            if (channelNum == childrens[j].logicChannel) {
                                realTimeVideLoad.channelSubscribeChangeIco(treeObj, childrens[j], false);
                            }
                        }
                    }
                }
                if (type === null) {
                    subscribeVideoMap.remove(subId);
                }
            }
        } else {
            if (id !== null) {
                var keys = subscribeVideoMap.keys();
                for (var s = 0; s < keys.length; s++) {
                    if (keys[s].indexOf(id) !== -1) {
                        if (subscribeVideoMap.containsKey(keys[s])) {
                            subscribeVideoMap.remove(keys[s]);
                            subscribeVideoNum--;
                            if (subscribeVideoNum < 0) {
                                subscribeVideoNum = 0;
                            }
                        }
                    }
                }
                var nodes = treeObj.getNodesByParam('id', id, null);
                for (var i = 0; i < nodes.length; i++) {
                    var childrens = nodes[i].children;
                    if (!!childrens) {
                        for (var j = 0; j < childrens.length; j++) {
                            realTimeVideLoad.channelSubscribeChangeIco(treeObj, childrens[j], false);
                        }
                    }
                }
            } else {
                subscribeVideoMap.clear();
                subscribeVideoNum = 0;
            }

            var values = subscribeVideoMap.values();
            for (var i = 0; i < values.length; i++) {
                var value = values[i];
                if (value[0] == id || id == null) {
                    var nodes = treeObj.getNodesByParam('id', value[0], null);
                    // var url = '/clbs/realTimeVideo/video/getChannels';
                    // var data = {'vehicleId': value[0], 'isChecked': false};
                    // var treeInfo;
                    // json_ajax("POST", url, "json", false, data, function (info) {
                    //   treeInfo = info;
                    // });
                    for (var j = 0; j < nodes.length; j++) {
                        var childrens = nodes[j].children;
                        // if (childrens == undefined) {
                        //   realTimeVideLoad.getGroupList(treeInfo, nodes[j], true);
                        // }
                        // childrens = nodes[j].children;
                        if (!!childrens) {
                            for (var k = 0; k < childrens.length; k++) {
                                realTimeVideLoad.channelSubscribeChangeIco(treeObj, childrens[k], false);
                                // var subId = value[0] + '-' + childrens[k].logicChannel;
                                // if (subscribeVideoMap.containsKey(subId)) {
                                //   subscribeVideoMap.remove(subId);
                                //   subscribeVideoNum--;
                                //   if (subscribeVideoNum < 0) {
                                //     subscribeVideoNum = 0;
                                //   }
                                // }
                            }
                        }
                    }
                }
            }
            // subscribeVideoNum = 0;
        }
    }
    ,

    // 页面左下角监控对象信息
    objInfoUpdate: function (id) {
        var value = [];
        if (id != undefined) {
            if (subscribeObjInfoMap.containsKey(id)) {
                value = subscribeObjInfoMap.get(id);
            }
        }
        $('#vehicleName').text(value.length == 0 ? '' : value[0]);
        $('#updateTime').text(value.length == 0 ? '' : value[1]);
        $('#deviceNo').text(value.length == 0 ? '' : value[2]);
        $('#simNo').text(value.length == 0 ? '' : value[3]);
        $('#driverName').text(value.length == 0 ? '' : value[4]);
        $('#updateSpeed').text(value.length == 0 ? '' : value[5] + 'km/h');
        $('#formattedAddress').text(value.length == 0 ? '' : value[6]);
    }
    ,

    // 通道号订阅后图标变化
    channelSubscribeChangeIco: function (treeObj, node, state) {
        if (state) { // 通道号订阅状态
            node.iconSkin = 'btnImage channel-subscribe';
        } else { // 通道号默认状态
            node.iconSkin = 'channelSkin';
        }
        treeObj.updateNode(node);
    }
    ,

    jumpToResource: function () {
        var jumpFlag = false;
        var permissionUrls = $("#permissionUrls").val();
        if (permissionUrls != null && permissionUrls != undefined) {
            var urllist = permissionUrls.split(",");
            if (urllist.indexOf("/realTimeVideo/resource/list") > -1) {
                jumpFlag = true;
                // location.href = "/clbs/realTimeVideo/resource/list";
                return true;
            }
        }
        if (!jumpFlag) {
            layer.msg("无操作权限，请联系管理员");
        }
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    ,

    // 视频全屏显示
    videoFullShow: function () {
        var $this = $(this).parent('div');
        if ($this.hasClass('full-video')) {
            $this.removeClass('full-video');
        } else {
            $this.addClass('full-video');
        }
    }
    ,

    //特殊参数设置表单显示隐藏函数
    specialParamSetShow: function () {
        var surl = '/clbs/realTimeVideo/video/getDiskInfo';
        $('#diskSaveModal label.error').remove();
        json_ajax("POST", surl, "json", true, {}, function (data) {
            if (data.success) {
                // 视频播放缺省时间
                var videoPlayTime = data.obj.videoPlayTime;
                // 视频空闲断开时间
                var videoStopTime = data.obj.videoStopTime;
                // FTP存储空间
                var memoryRate = data.obj.memoryRate;
                // FTP音视频存储状态
                var memory = data.obj.memory;
                var lineColor;
                if (memory <= 60) {
                    lineColor = 'green';
                } else if (memory > 60 || memory <= 90) {
                    lineColor = 'yellow';
                } else {
                    lineColor = 'red';
                }
                // 存储空间满后处理类型：0：空间满后自动覆盖； 1：空间满后停止录制
                var memoryType = data.obj.memoryType;
                $('#videoPlayTime').val(videoPlayTime);
                $('#videoRequestTime').val(videoStopTime);
                $('#ftpStorage').val(memoryRate);
                $('#videoMemory').text(memory + '%');
                $('#videoSaveState').val(memory);
                $('#videoMemoryProgress').css({
                    'width': memory + '%',
                    'background-color': lineColor
                });
                $("#specialParamSet input:radio[name='type'][value=" + memoryType + "]").prop('checked', 'true');
            }
        });
        $('#diskSaveModal').modal('show')
    }
    ,

    //特殊参数表单提交
    doSubmit: function () {
        if (realTimeVideLoad.validates()) {
            $("#specialParamSet").ajaxSubmit(function (data) {
                if (data != null) {
                    var result = $.parseJSON(data);
                    if (result.success) {
                        $('#diskSaveModal').modal('hide');
                    } else {
                        layer.msg(result.msg, {move: false});
                    }
                }
            });
        }
    }
    ,

    //特殊参数表单验证
    validates: function () {
        return $("#specialParamSet").validate({
            rules: {
                videoPlayTime: {
                    required: true,
                    digits: true,
                    range: [30, 86400]
                },
                videoStopTime: {
                    required: true,
                    digits: true,
                    range: [30, 600]
                },
                memoryRate: {
                    required: true,
                    digits: true,
                    range: [1, 100]
                }
            },
            messages: {
                videoPlayTime: {
                    required: "缺省时间未设置",
                    digits: "必须是正整数哦！",
                    range: "输入值范围为30-86400"
                },
                videoStopTime: {
                    required: "断开时间未设置",
                    digits: "必须是正整数哦！",
                    range: "输入值范围为30-600"
                },
                memoryRate: {
                    required: "FTP存储空间未设置",
                    digits: "必须是正整数哦！",
                    range: "输入值范围为1-100"
                }
            }
        }).form();
    }
    ,

    //视频画面设置显示函数
    videoDimmingFn: function () {
        //车辆树是否订阅
        if (haeundaeZtreeIsCheck) {
            if ($("#videoDimming").hasClass("video-dimming")) {
                $("#videoDimming").removeClass("video-dimming");
                $("#videoDimming").addClass("video-dimming-check");
                $("#videoScreenControl").modal("show");
                $("#videoScreenControl .modal-dialog").css("top", (winHeight - 268) / 2 + "px");//位置
            } else {
                $("#videoDimming").removeClass("video-dimming-check");
                $("#videoDimming").addClass("video-dimming");
            }

        } else {
            layer.msg("请双击订阅监控对象");
        }
    }
    ,

    //监听视频画面控制模块关闭
    listenVideoScreenControlOff: function () {
        $('#videoScreenControl').on('hidden.bs.modal', function (e) {
            $("#videoDimming").removeClass("video-dimming-check");
            $("#videoDimming").addClass("video-dimming");
        });
    }
    ,
    // 方向
    toDirectionStr: function (angle) {
        if ((angle >= 0 && angle <= 22.5) || (angle > 337.5 && angle <= 360)) {
            direction = '北';
        } else if (angle > 22.5 && angle <= 67.5) {
            direction = '东北';
        } else if (angle > 67.5 && angle <= 112.5) {
            direction = '东';
        } else if (angle > 112.5 && angle <= 157.5) {
            direction = '东南';
        } else if (angle > 157.5 && angle <= 202.5) {
            direction = '南';
        } else if (angle > 202.5 && angle <= 247.5) {
            direction = '西南';
        } else if (angle > 247.5 && angle <= 292.5) {
            direction = '西';
        } else if (angle > 292.5 && angle <= 337.5) {
            direction = '西北';
        } else {
            direction = '未知数据';
        }
        return direction;
    }
    ,
    //过滤小数点为0
    fiterNumber: function (data) {
        if (data == null || data == undefined || data == "") {
            return data;
        }
        var data = data.toString();
        data = parseFloat(data);
        return data;

    }
    ,

    // 监控对象点击事件
    markerClickFun: function (e) {
        var id = e.target.id;
        var position = e.target.getPosition();
        var value = objImformationMap.get(id);
        var alarmType = value[29] == undefined ? '' : value[29];
        var stateColor;
        if (value[6] == '行驶') {
            stateColor = 'car-run';
        } else {
            stateColor = 'car-stop';
        }
        var html = '<div class="information-info">'
            + '<div>时间： ' + value[1] + '</div>'
            + '<div>监控对象：' + value[2] + '(' + value[3] + ')</div>'
            + '<div>终端号：' + value[4] + '</div>'
            + '<div>SIM卡号：' + value[5] + '</div>'
            + '<div>行驶状态：<span class="' + stateColor + '">' + value[6] + '</span></div>'
            + '<div>行驶速度：' + value[7] + '</div>'
            + '<div>位置：' + value[8] + '</div>'
            + '<i class="fa fa-chevron-circle-right fa-2x inforwindow-cut" id="inforwindomIcon" onClick="realTimeVideLoad.inforwindowCut()"></i>'
            + '</div>'
            + '<div class="information-info information-default">'
            + '<div>所属企业：' + value[9] + '</div>'
            + '<div>所属分组：' + value[10] + '</div>'
            + '<div>对象类型：' + value[11] + '</div>';

        if (value[12] == "开" || (value[12].indexOf("无") == -1 && value[12].indexOf("点火") > -1)) {
            html += '<div>ACC：' + value[12] + ' <img src="../../resources/img/acc_on.svg" style="margin: -3px 0px 0px 0px;height:24px;" /></div>';
        } else {
            html += '<div>ACC：' + value[12] + ' <img src="../../resources/img/acc_off.svg" style="margin: -3px 0px 0px 0px;height:24px;" /></div>';
        }

        html += '<div>当日里程：' + value[13] + '公里</div>'
            + '<div>' + value[14] + '</div>'
            + '<div>' + value[15] + '</div>'
            + '<div>总里程：' + value[16] + '公里</div>'
            + '<div>' + alarmType + '</div>'
            + '</div>'
            + '<div class="information-info information-default">'
            + '<div>方向：' + value[17] + '</div>'
            + '<div>记录仪速度：' + value[18] + '</div>'
            + '<div>高程：' + value[19] + '</div>'
            + '<div>电子运单：' + value[20] + '</div>'
            + '<div>从业人员：' + value[21] + '</div>'
            + '<div>从业资格证号：' + value[22] + '</div>'
            + '<div>' + value[23] + '</div>'
            + '<div>' + value[24] + '</div>'
            + '<div>' + value[25] + '</div>'
            + '<div>' + value[26] + '</div>'
            + '</div>';
        infoWindow.setContent(html);
        infoWindow.open(videoMap, position);
    }
    ,

    doVideoScreenControl: function () {
        var saturate = $("#saturationVal").val() / 51;
        var hue = $("#chromaVal").val();
        var brightness = $("#brightnessVal").val() / 255;
        var contrast = $("#contrastVal").val() / 51;

        var filters = "saturate(" + saturate + ") hue-rotate(" + hue + "deg) brightness(" + brightness + ") contrast(" + contrast + ")";

        $("video").css('-webkit-filter', filters);
        $("video").css('-ms-filter', filters);
        $("video").css('-moz-filter', filters);
        $("video").css('-o-filter', filters);
        $("video").css('filter', filters);
    }
    ,
    // 视频画面控制
    videoScreenControlFn: function () {
        //亮度
        $('.nsBrightness').nstSlider({
            "left_grip_selector": ".leftGrip", "value_changed_callback": function (cause, leftValue) {
                $('#brightnessVal').val(leftValue);
                realTimeVideLoad.doVideoScreenControl();
            }
        });
        //色度
        $('.nsChroma').nstSlider({
            "left_grip_selector": ".leftGrip", "value_changed_callback": function (cause, leftValue) {
                $('#chromaVal').val(leftValue);
                realTimeVideLoad.doVideoScreenControl();
            }
        });
        //对比度
        $('.nsContrast').nstSlider({
            "left_grip_selector": ".leftGrip", "value_changed_callback": function (cause, leftValue) {
                $('#contrastVal').val(leftValue);
                realTimeVideLoad.doVideoScreenControl();
            }
        });
        //饱和度
        $('.nsSaturation').nstSlider({
            "left_grip_selector": ".leftGrip", "value_changed_callback": function (cause, leftValue) {
                $('#saturationVal').val(leftValue);
                realTimeVideLoad.doVideoScreenControl();
            }
        });
        //音量
        $('.nsVolume').nstSlider({
            "left_grip_selector": ".leftGrip", "value_changed_callback": function (cause, leftValue) {
                $('#volumeVal').val(leftValue);
                var videoList = createVideoMap.values();
                for (var i = 0; i < videoList.length; i++) {
                    videoList[i].setAudioVoice(leftValue / 100);
                }
            }
        });
    }
    ,
    // 信息框切换操作
    inforwindowCut: function () {
        var $inforwindomIcon = $('#inforwindomIcon');
        if ($inforwindomIcon.hasClass('fa-chevron-circle-right')) {
            $inforwindomIcon.removeClass('fa-chevron-circle-right').addClass('fa-chevron-circle-left');
            $('.information-default').css('display', 'block');
            $('.amap-info-content').css('width', '584px');
            $('.information-info').addClass('information-show');
            $('.inforwindow-cut').css('right', '5px');
        } else {
            $inforwindomIcon.removeClass('fa-chevron-circle-left').addClass('fa-chevron-circle-right');
            $('.information-default').css('display', 'none');
            $('.amap-info-content').css('width', '196px');
            $('.information-info').removeClass('information-show');
            $('.inforwindow-cut').css('right', '-13px');
        }
        infoWindow.setPosition(infoWindow.getPosition());
    }
    ,

    // 信息窗口隐藏
    inforwindowHidden: function () {
        infoWindow.close();
    }
    ,

    // 监听
    audioListening: function (data, sNumber, cNum, vehicleId) {
        var simCardLength = sNumber.length;
        if (simCardLength < 12) {
            for (var i = 0; i < 12 - simCardLength; i++) {
                sNumber = '0' + sNumber;
            }
        }

        var audioCode = data.audio.audioCode;
        var unique = data.unique;
        listenUnique = unique;
        var url = 'ws://' + videoRequestUrl + ':' + audioRequestPort + '/' + unique;

        audioListenSocket = new AudioCollect({
            url: url,
            type: 'UP_WAY',
            codingType: audioCode,
            openAudioSuccess: function () {
                realTimeVideLoad.monitorAudioSuccess();
            },
            socketTimeoutFun: function () {
            }
        });
    }
    ,

    // 报警记录 or 日志记录添加后改变布局
    layoutChange: function () {
        if (!$('#scalingBtn').hasClass('fa-chevron-up')) {
            var length;
            if ($('#warnRecord').hasClass('active')) {
                length = $('#alarmRecordDataTable tbody tr').length;
                $('#alarmRecord').css({
                    'overflow': 'auto',
                    'max-height': '250px'
                });
            } else if ($('#operationLog').hasClass('active')) {
                length = $('#loggingDataTable tbody tr').length;
                $('#logging').css({
                    'overflow': 'auto',
                    'max-height': '250px'
                });
            }

            if (length <= 5) {
                var changePx = (85 + length * 41 + 13 + 15) + 'px';
                $('#videoRightTop').css('height', 'calc(100% - ' + changePx + ')');
            } else {
                var changePx = (85 + 5 * 41 + 13 + 15) + 'px';
                $('#videoRightTop').css('height', 'calc(100% - ' + changePx + ')');
            }
        }
    }
    ,

    // 抓拍提交
    snapSubmitFun: function () {
        // var image = $('#videoImage').attr('value');
        // var objName = $('#photoObjName').text();
        // var objColor = $('#photoObjColor').text();
        var cNumber = $('#photoObjNumber').text();
        var snapText = $('#snapText').val();
        var id = $('#vehicleId').attr('value');
        var url = '/clbs/realTimeVideo/video/screenshot';
        // var data = {vehicleId: id, wayId: cNumber, description:snapText, file: photoImageFormData}
        photoImageFormData.append('vehicleId', id);
        photoImageFormData.append('wayId', cNumber);
        photoImageFormData.append('description', snapText);

        $.ajax({
            url: url,
            data: photoImageFormData,
            type: "Post",
            dataType: "json",
            cache: false,//上传文件无需缓存
            processData: false,//用于对data参数进行序列化处理 这里必须false
            contentType: false, //必须
            success: function (result) {
            },
        })
    }
    ,
    //获取底部高度
    getBottomHeight: function () {
        var length;
        if ($('#warnRecord').hasClass('active')) {
            length = $('#alarmRecordDataTable tbody tr').length;

        } else if ($('#operationLog').hasClass('active')) {
            length = $('#loggingDataTable tbody tr').length;
        }
        ;
        var changePx;
        if (length <= 5) {
            changePx = 85 + length * 41 + 13 + 15;
        } else {
            changePx = 85 + 5 * 41 + 13 + 15;
        }
        return changePx;
    }
    ,

    // 窗口大小改变后响应式
    windowResize: function () {
        if ($('#scalingBtn').hasClass("fa fa-chevron-down")) {
            realTimeVideLoad.videoSeparatedAdaptShow();//左下侧显示及取消全屏显示时视频分隔自适应计算函数
        } else {
            realTimeVideLoad.videoSeparatedAdaptHide();//左下侧隐藏及全屏显示时视频分隔自适应计算函数
        }
    }
    ,

    // 手动关闭视频socket
    videoCloseSocket: function (vehicleId, cNum) {
        if (vehicleId !== null && cNum !== null) {
            var id = vehicleId + '-' + cNum;
            if (createVideoMap.containsKey(id)) {
                var obj = createVideoMap.get(id);
                createVideoMap.remove(id);
                obj.closeSocket();
            }
        } else if (vehicleId !== null && cNum === null) {
            var keys = createVideoMap.keys();
            for (var j = 0; j < keys.length; j++) {
                var id = keys[j];
                if (id.indexOf(vehicleId) !== -1) {
                    var obj = createVideoMap.get(id);
                    obj.closeSocket();
                    createVideoMap.remove(id);
                }
            }
        } else {
            var values = createVideoMap.values();
            createVideoMap.clear();
            for (var i = 0; i < values.length; i++) {
                values[i].closeSocket();
            }
        }
    }
    ,
    // 监听声音控制
    controlAudioVoice: function () {
        $('.audioVoice').nstSlider({
            "left_grip_selector": ".leftGrip", "value_changed_callback": function (cause, leftValue) {
                var number = leftValue / 100;
                if (audioListenSocket) {
                    audioListenSocket.setAudioVoice(number);
                }
            }
        });
    }
    ,

    // 获取操作超时时间
    getTimeout: function () {
        var surl = '/clbs/realTimeVideo/video/getDiskInfo';
        json_ajax("POST", surl, "json", true, {}, function (data) {
            if (data.success) {
                // 视频播放缺省时间
                handleTime = Number(data.obj.videoPlayTime) * 1000;
                // 视频空闲时间
                videoFreeTime = Number(data.obj.videoStopTime) * 1000;
            } else {
                handleTime = 300000;
                videoFreeTime = 30000;
            }
        })
    }
    ,

    /**
     * 更新空闲等待时间
     */
    updateStopTime: function () {
        var values = createVideoMap.values();
        for (var i = 0; i < values.length; i++) {
            if (values[i].isOpenFreeTime) {
                values[i].freeTimeoutClose(videoStopTime);
            }
        }
    }
    ,

    // 检测是否有处理报警的权限
    checkAlarmRole: function () {
        var surl = '/clbs/v/monitoring/checkAlarmRole';
        json_ajax("POST", surl, "json", true, {}, function (data) {
            if (data.success) {
                alarmRole = true;
            }
        })
    }
    ,
    showErrorMsg: function (msg, inputId) {
        if ($("#error_label").is(":hidden")) {
            $("#error_label").text(msg);
            $("#error_label").insertAfter($("#" + inputId));
            $("#error_label").show();
        } else {
            $("#error_label").is(":hidden");
        }
    }
    ,

};

$(function () {
    realTimeVideLoad.init(); //页面初始化
    // realTimeVideLoad.checkAlarmRole();


})

/*})(window,$);*/
