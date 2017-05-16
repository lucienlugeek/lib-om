// framework based on openlayers Version v4.0.1 by lucien
(function (root, factory) {
    if (typeof exports === "object") {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(['ol'], factory);
    } else {
        root.OpenMap = factory();
    }
}(this, function (ol) {
    var OpenMap = window.OpenMap = function () {
        if (arguments.length) {
            this.init.apply(this, arguments);
        }
    };
    /**
     * @desc 判断是否为 Object,Array,String,RegExp,Boolean,Number,Function
     */
    OpenMap.is = function (arg1, arg2) {
        return Object.prototype.toString.call((arg1)) === '[object ' + arg2 + ']';
    };
    /**
    * @desc 计算半径的长度(单位米)
    * @param OpenMap,Object
    */
    OpenMap.calcRadius = function (map, event) {
        event.feature.set("type", 'circle');
        var radius = event.feature.getGeometry().getRadius();
        var center = event.feature.getGeometry().getCenter();
        var lonlat = center[0] + "," + center[1];

        //var coordinates = event.feature.getGeometry().v;
        var start = center;//new ol.Coordinate();
        var end = event.feature.getGeometry().getLastCoordinate(); //new ol.Coordinate();
        var mapProjection = map.getView().getProjection();
        var t1 = ol.proj.transform(start, mapProjection, 'EPSG:4326');
        var t2 = ol.proj.transform(end, mapProjection, 'EPSG:4326');

        // create sphere to measure on
        var wgs84sphere = new ol.Sphere(6378137); // one of WGS84 earth radius'
        // get distance on sphere
        var dist = wgs84sphere.haversineDistance(t1, t2);
        dist = dist.toFixed(6);//单位是 米
        return dist;
    };
    OpenMap.prototype = {
        constructor: OpenMap,
        initParam: {
            projection: new ol.proj.Projection({
                code: 'EPSG:4490',
                units: 'degrees',
            }),
            center: [121.84059516385024, 29.902349218390047]//如不指定，则默认北仑区政府
        },
        /**
         * @desc 根据指定参数，初始化地图到容器中
         */
        init: function (id, options) {
            var ele = document.getElementById(typeof id === 'undefined' ? '' : id);
            if (ele === null) {
                console.error('地图容器的id为空或找不到id = ' + id + '的DOM元素');
                return;
            }
            var self = this;
            if (options) {
                $.extend(self.initParam, options); //地图初始化参数
            }
            var initParam = self.initParam;
            var bounds = [121.64747112300006, 29.702835634000053,
                122.1792500360001, 30.002109405000056];
            //地图底图
            var baseMapKJ = new ol.layer.Tile({
                source:
                new ol.source.TileWMS({
                    url: 'http://192.168.3.233:8180/geowebcache/service/wms',
                    params: {
                        'FORMAT': 'image/png',
                        'VERSION': '1.1.1',
                        'LAYERS': 'beiluncacheKJ',
                        'SRS': 'EPSG:4490'
                    },
                    tileGrid: ol.tilegrid.TileGrid({
                        minZoom: 0,
                        maxZoom: 9,
                        resolutions: [0.00068664552062088911, 0.00034332276031044456, 0.00017166138015522228, 8.5830690077611139e-005, 4.291534503880557e-005, 2.1457672519402785e-005,
                            1.0728836259701392e-005, 5.3644181298506962e-006, 2.6822090649253481e-006, 1.3411045324626741e-006],
                        origin: [-180.0, 90.0]
                    })
                }),
                extent: bounds
            });
            //地图标注
            var baseMapBZ = new ol.layer.Tile({
                source:
                new ol.source.TileWMS({
                    url: 'http://192.168.3.233:8180/geowebcache/service/wms',
                    params: {
                        'FORMAT': 'image/png',
                        'VERSION': '1.1.1',
                        'LAYERS': 'beiluncacheBZ',
                        'SRS': 'EPSG:4490'
                    },
                    tileGrid: ol.tilegrid.TileGrid({
                        minZoom: 0,
                        maxZoom: 9,
                        resolutions: [0.00068664552062088911, 0.00034332276031044456, 0.00017166138015522228, 8.5830690077611139e-005, 4.291534503880557e-005, 2.1457672519402785e-005,
                            1.0728836259701392e-005, 5.3644181298506962e-006, 2.6822090649253481e-006, 1.3411045324626741e-006],
                        origin: [-180.0, 90.0]
                    })
                }),
                extent: bounds
            });
            self._map = new ol.Map({
                controls: ol.control.defaults({
                    attribution: false
                }),
                target: ele,
                loadTilesWhileAnimating: true,
                view: new ol.View({
                    center: initParam.center,
                    zoom: initParam.zoom || 10,
                    minZoom: initParam.minZoom || 12,
                    maxZoom: initParam.maxZoom || 19,
                    projection: initParam.projection,
                    extent: initParam.extent || undefined
                }),
                layers: [baseMapKJ, baseMapBZ],
                extent: bounds
            });
            //保存所有的layer
            self._layer = {};
            //鼠标在地图上移动到某个feature上的时候，更改cursor样式
            self._map.on('pointermove', function (evt) {
                var jq = $(self._map.getTargetElement());
                jq.css({
                    cursor: self._map.hasFeatureAtPixel(evt.pixel) ? 'pointer' : ''
                });
            });
        },
        /**
         * @desc 获取map对象
         */
        getMap: function () {
            return this._map;
        },
        removeLayer: function (layerName) {
            this._map.removeLayer(this.getLayer(layerName));
            this._layer[layerName] = null;
        },
        /**
         * @desc 添加层
         */
        addLayer: function (layerName, vector) {
            if (this._layer[layerName]) {
                return;
            }
            var _vector = this._layer[layerName] = vector;
            if (!_vector) {
                _vector = this._layer[layerName] = new ol.layer.Vector({ //存放标注点的layer
                    source: new ol.source.Vector({
                        features: [],
                        overlaps: false//是否允许重叠
                    }),
                    style: function (fea) {
                        return new ol.style.Style({
                            image: new ol.style.Icon({
                                rotation: fea.get('rotation') || 0,
                                src: fea.get('image'),
                                anchor: fea.get('anchor')
                            })
                        });
                    }
                });
            }
            this._map.addLayer(_vector);
        },
        /**
         * @desc 获取层
         */
        getLayer: function (layerName, init) {
            if (init) {
                this.addLayer(layerName);
            }
            return this._layer[layerName];
        },
        /**
         * @desc 向地图添加marker标记
         * @returns {*} 返回构建的marker对象
         */
        addMarker: function (option) {
            if (typeof option === 'undefined'
                || typeof option.position === 'undefined'
                || typeof option.layer === 'undefined') {
                console.error('必须指定marker的图层名称！');
                return;
            }
            var self = this;
            var _layer = self.getLayer(option.layer, true);
            this.addLayerListener(_layer);

            var fea = new ol.Feature({
                geometry: new ol.geom.Point(option.position),
                anchor: option.anchor,
                image: option.image,
                onClick: option.onClick,
                extData: option.extData,
                layerName: option.layer,
                rotation: option.rotation
            });
            fea.setId(option.id);
            _layer.getSource().addFeatures([fea]);
            OpenMap.is(option.visible, 'Undefined') ? null : _layer.setVisible(option.visible);
            return fea;
        },
        /**
         * @desc 根据id获取marker
         */
        getMarkerById: function (id) {
            if (typeof id === 'undefined') {
                console.error('请传入marker的id');
                return;
            }
            var self = this;
            for (var l in self._layer) {
                if (self._layer.hasOwnProperty(l)) {
                    var f = self._layer[l].getSource().getFeatureById(id);
                    if (f) {
                        return f;
                    } else {
                        continue;
                    }
                }
            }
        },
        /**
         * @desc 添加聚合图层
         */
        addCluster: function (arg) {
            if (typeof arg === 'undefined' || !OpenMap.is(arg, 'Array')) {
                console.error('请输入数组类型的参数');
                return;
            }
            var self = this;
            var len = arg.length;
            var features = new Array(len);
            var la, vi;//layername visible
            for (var i = 0; i < len; i++) {
                if (!la) { la = arg[i].layerName }
                if (!vi) { vi = arg[i].visible }
                var coordinates = arg[i].coordinates;
                coordinates[0] = Number(coordinates[0]);
                coordinates[1] = Number(coordinates[1]);
                features[i] = new ol.Feature({
                    geometry: new ol.geom.Point(coordinates),
                    status: !!arg[i].isTrue//在线，离线
                });
            }
            var source = new ol.source.Vector({
                features: features
            });
            var clusterSource = new ol.source.Cluster({
                distance: 100,
                source: source
            });
            var styleCache = {};
            var _layer = self.getLayer();
            if (!_layer) {
                _layer = self._layer[la] = new ol.layer.Vector({
                    source: clusterSource,
                    style: function (feature) {
                        var feas = feature.get('features'), i = 0, normalSize = 0;
                        var size = feas.length;
                        for (; i < size; i++) {
                            normalSize = normalSize + (feas[i].getProperties().status)
                        }
                        var rO, rI;
                        if (size >= 100) {
                            rO = 44;
                            rI = 33;
                        } else if (size >= 10 && size <= 99) {
                            rO = 32;
                            rI = 24;
                        } else {
                            rO = 28;
                            rI = 18;
                        }
                        style = new ol.style.Style({
                            image: new ol.style.Icon({
                                img: dcanvas($('canvas.process').clone().show().get(0), {
                                    'centerX': '45',
                                    'centerY': '45',
                                    'radiusOutside': rO,
                                    'radiusInside': rI,
                                    'normalSize': normalSize,
                                    'size': size
                                }),
                                imgSize: [90, 90]
                            }),
                        });
                        return style;
                    }
                });
                self.addLayer(_layer);
                _layer.setVisible(vi);
            }
        },
        /**
         * @desc 添加覆盖元素
         */
        addOverLay: function (option) {
            if (!option || !option.position || !option.eid) {
                console.error('invalid param');
                return;
            }
            var self = this;
            var element = document.getElementById(option.eid);
            if (option.hide) {
                element.style.display = 'none';
            }
            var popup = new ol.Overlay({
                id: option.id,
                element: element,
                stopEvent: typeof option.stopEvent !== 'undefined' ? option.stopEvent : false,
                offset: option.offset || [0, 0],
                positioning: option.positioning || 'center-center' //中心点位于容器的正中间
            });
            popup.setPosition(option.position);
            self._map.addOverlay(popup);
        },
        /**
         * @desc 获取所有的覆盖元素
         */
        getOverlay: function () {
            if (arguments.length === 0) {
                return this._map.getOverlays().getArray();
            } else {
                var id = arguments[0];
                var ov = this._map.getOverlayById(id);
                return ov ? [ov] : [];
            }
        },
        /**
         * @desc 移除marker
         */
        removeMarker: function (m) {
            if (typeof m === 'undefined' || !OpenMap.is(m, 'Object')) {
                console.error('参数错误');
                return;
            }
            var layerName = m.getProperties()['layerName'];
            var self = this;
            self.getLayer(layerName).getSource().removeFeature(m);
        },
        /**
         * @desc 移除指定layer，从而移除依载该layer的所有marker
         * @param arg
         */
        removeMarkerByLayer: function (arg) {
            if (typeof arg === 'undefined') {
                console.error('请传入layer名称');
                return;
            }
            var layer = this.getLayer(arg);
            if (layer) {
                layer.getSource().clear();
            }
        },
        /**
         * @desc 移除指定id的marker
         */
        removeMarkerById: function (id) {
            if (typeof id === 'undefined') {
                console.error('请传入marker的id');
                return;
            }
            var self = this;
            for (var l in self._layer) {
                if (self._layer.hasOwnProperty(l)) {
                    var f = self._layer[l].getSource().getFeatureById(id);
                    if (f) {
                        self._layer[l].getSource().removeFeature(f);
                        break;
                    }
                }
            }
        },
        /**
         * @desc 添加layer的监听事件
         */
        addLayerListener: function (layer) {
            //单个选择要素
            var layerSelect = new ol.interaction.Select({
                condition: ol.events.condition.click,
                layers: [layer],
                style: function (fea) {//点击marker时不发生样式的变化，还是使用本身的image作为src
                    return new ol.style.Style({
                        image: new ol.style.Icon({
                            anchor: [0.5, 0.5],
                            // offset: option.offset || [0, 0],
                            src: fea.get('image')
                        })
                    });
                }
            });
            layerSelect.on('select', function (evt) { //监听某个layer的选择事件
                if (evt.selected.length === 0) {
                    return;
                }
                // var coordinate = evt.mapBrowserEvent.coordinate;
                evt.selected.forEach(function (feature) {
                    var clickFun = feature.getProperties().onClick;
                    clickFun ? clickFun.call(feature, feature) : null;
                });
            });
            this._map.addInteraction(layerSelect);
        },
        /**
         * @desc 开启绘画功能
         * @param type {Point|LineString|Box|Polygon|Circle} 点、线、矩形、多边形、圆
         *        events : drawstart,drawend,change,propertychange
         */
        openDraw: function (type, events) {
            if (type === 'undefined' || ['Point', 'LineString', 'Box', 'Polygon', 'Circle'].indexOf(type) === -1) {
                console.error('draw type is error!');
                return;
            }
            var self = this;
            var map = self.getMap();
            var source = new ol.source.Vector({ wrapX: false });
            var _drawLayer = new ol.layer.Vector({
                source: source
            });
            self._layer._drawLayer = _drawLayer;
            self.addLayer(_drawLayer);
            // self._featureOverlay = new ol.layer.Vector({ //画图所用的layer对象
            //     source: new ol.source.Vector({
            //         features: features
            //     }),
            //     style: new ol.style.Style({
            //         fill: new ol.style.Fill({
            //             color: 'rgba(255, 255, 255, 0.6)'
            //         }),
            //         stroke: new ol.style.Stroke({
            //             color: '#ffcc33',
            //             width: 2
            //         }),
            //         image: new ol.style.Circle({
            //             radius: 7,
            //             fill: new ol.style.Fill({
            //                 color: '#ffcc33'
            //             })
            //         })
            //     })
            // });
            // self._featureOverlay.setMap(map);
            // var modify = new ol.interaction.Modify({
            //     features: features,
            //     deleteCondition: function (event) {
            //         return ol.events.condition.shiftKeyOnly(event) &&
            //             ol.events.condition.singleClick(event);
            //     }
            // });
            // map.addInteraction(modify);
            self._draw = new ol.interaction.Draw({
                source: source,
                type: /** @type {ol.geom.GeometryType} */ (type === "Box" ? "Circle" : type),
                geometryFunction: type === "Box" ? ol.interaction.Draw.createBox() : undefined
            });

            map.addInteraction(self._draw);
            if (events && !OpenMap.is(events, 'Object')) {
                console.warn('事件参数错误！');
                return;
            } else {
                for (var e in events) {
                    if (events.hasOwnProperty(e)) {
                        self._draw.dispatchEvent(e);
                        self._draw.on(e, events[e]);
                    }
                }
            }
        },
        /**
         * @desc 返回绘画对象
         */
        getDraw: function () {
            return this._draw;
        },
        /**
         * @desc 关闭绘画功能
         */
        closeDraw: function () {
            if (this._draw) {
                this._map.removeInteraction(this._draw);
                this._draw = null;
            }
        },
        /**
        * 路况图层
        *'beilun:TRANETROAD','FEATUREGUI,FCODE,FNAME,FSCALE,DISPLAY,GEOMETRY'
        */
        adminLayerVisibility: function (typeName, propertyName) {
            var self = this;
            //wfs回调方法
            function loadWfs(res) {
                var myprojection = self.initParam.projection;
                var format = new ol.format.GeoJSON();
                self.roadFeatures = format.readFeatures(res, { featureProjection: myprojection });
                self.getLayer('roadLayer').getSource().addFeatures(self.roadFeatures);
                // adminWfsLayer.getSource().addFeatures(self.roadFeatures);
            }
            window.loadWfs = loadWfs;
            function getFeature(options) {
                $.ajax('http://192.168.3.233:8888/geoserver/beilun/wfs', {
                    type: 'GET',
                    data: {
                        service: 'WFS',
                        version: '1.1.0',
                        request: 'GetFeature',
                        typename: options.typename,
                        propertyname: options.propertyname,
                        maxfeatures: options.maxfeatures,
                        srsname: options.srid,
                        outputFormat: 'text/javascript',
                        viewparams: options.viewparams,
                        bbox: (options.extent === undefined) ? undefined : options.extent.join(',') + ',' + options.srid,//与filter只能用一个
                        filter: options.filter
                    },
                    dataType: 'jsonp',
                    jsonpCallback: 'callback:' + options.callback,
                    jsonp: 'format_options'
                })
            }

            var wfcVectorSource = new ol.source.Vector();
            getFeature({
                typename: typeName,//'poi:POI_POINT',
                propertyname: propertyName, //'ID,NAMEC,GEOMETRY',
                maxfeatures: 20000,
                srid: 'EPSG:4326',
                // filter:'<Filter xmlns="http://www.opengis.net/ogc"><PropertyIsEqualTo><PropertyName>STNAMEC</PropertyName><Literal>104国道</Literal></PropertyIsEqualTo></Filter>',
                //filter:ol.format.filter.equalTo('OWNER', '360300'),  无效，用xml格式，并且有命名空间
                callback: 'loadWfs'
            });

            var getText = function (feature, resolution) {
                var type = "normal";
                var maxResolution = 0.000005364418029785156;//6.705522537231445e-7;
                var text = feature.get('FNAME');
                //style.getText().setText(resolution < 5000 ? feature.get('name') : '');
                if (resolution > maxResolution) {
                    text = '';
                } else if (type == 'hide') {
                    text = '';
                } else if (type == 'shorten') {
                    text = text.trunc(12);
                } else if (type == 'wrap') {
                    text = stringDivider(text, 16, '\n');
                }

                //console.info("zoom:"+ map.getView().getZoom() + "resolution:"+ resolution );
                return text;
            };
            var highlightStyleCache = {};
            var colorValue = 10;
            var createPolygonStyleFunction = function () {
                return function (feature, resolution) {
                    var text = resolution < 000005364418029785156 ? feature.get('FNAME') : '';
                    if (!highlightStyleCache[text]) {
                        highlightStyleCache[text] = new ol.style.Style({
                            fill: new ol.style.Fill({
                                color: "rgba(255, 255, 255, 1)" //getAreaColor("",0,100,colorValue ) //****.parkFillColor   rgba(255, 255, 255, 1)
                            }),
                            stroke: new ol.style.Stroke({
                                color: roadColor(feature), //"rgba(0, 255, 255, 1)",//"#319FD3",//****.parkBorderColor,
                                width: 3
                            }),
                            text: createTextStyle(feature, resolution)
                        });
                    }
                    return [highlightStyleCache[text]];//[style];
                }
            };

            var roadColor = function (feature) {
                var color = "#c5c3c8";
                /* if(feature.get('LANES')=="6" ||feature.get('LANES')=="5" ){
                    color ='#17BF00'; //G
                }else if(feature.get('LANES')=="4" ||feature.get('LANES')=="3" ){
                    color ='#F33030';   //R
                }else if(feature.get('LANES')=="2"){
                    color ='#FF9E19';
                } */
                if (feature.get('FNAME') == undefined) {
                    color = '#17BF00'; //G
                } else {
                    color = '#F33030';  //r
                }

                return color;
            }
            var createTextStyle = function (feature, resolution) {
                var align = "center";  //center 'left', 'right', 'center', 'end' or 'start'. Default is 'start'.
                var baseline = "hanging";  // middle 'bottom', 'top', 'middle', 'alphabetic', 'hanging', 'ideographic'. Default is 'alphabetic'.
                var size = "10px";
                var offsetX = 0;
                var offsetY = 10;
                var weight = "100"; //normal  bold
                var rotation = "0";//feature.get('rotation');
                var font = weight + ' ' + size + ' ' + "Arial";  //
                var fillColor = 'black';
                var outlineColor = 'black';
                var outlineWidth = 1;

                return new ol.style.Text({
                    textAlign: align,
                    textBaseline: baseline,
                    font: font,
                    text: getText(feature, resolution),
                    fill: new ol.style.Fill({ color: fillColor }),
                    stroke: new ol.style.Stroke({ color: outlineColor, width: outlineWidth }),
                    offsetX: offsetX,
                    offsetY: offsetY,
                    rotation: rotation
                });
            };

            var myprojection = this.initParam.projection;
            // 构建图层
            var adminWfsLayer = new ol.layer.Vector({
                source: wfcVectorSource,
                projection: myprojection,
                style: createPolygonStyleFunction()
            });

            //添加图层
            this.addLayer("roadLayer", adminWfsLayer);

            var getAreaColor = function (name, min, max, value) {
                value = parseFloat(value);
                colorValue += 10;
                if (value > 100) {
                    value = 100;
                }
                min = parseFloat(min);
                max = parseFloat(max);
                if (value < min) value = min;
                var colorRange = ['#ff3333', '#FFA500', '#FFFF00', '#00FF00'].reverse();
                var colorIndex = (value - min) * 1.0 / (max - min) * (colorRange.length - 1);
                colorIndex = Math.floor(colorIndex);
                if (colorIndex == colorRange.length - 1) colorIndex = colorRange.length - 2;

                var startColor = colorRange[colorIndex];
                var endColor = colorRange[colorIndex + 1];

                var step = (max - min) / (colorRange.length - 1);
                value = value - min - ((max - min) * (colorIndex) / (colorRange.length - 1));

                var startRGB = colorRgb(startColor);//转换为rgb数组模式
                var startR = startRGB[0];
                var startG = startRGB[1];
                var startB = startRGB[2];

                var endRGB = colorRgb(endColor);
                var endR = endRGB[0];
                var endG = endRGB[1];
                var endB = endRGB[2];

                var sR = (endR - startR) / step * value + startR;//总差值
                var sG = (endG - startG) / step * value + startG;
                var sB = (endB - startB) / step * value + startB;
                var result = 'rgba(' + parseInt(sR) + ',' + parseInt(sG) + ',' + parseInt(sB) + ',' + 0.3 + ')';
                return colorHex(result);
            }

            var colorRgb = function (sColor) {
                var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
                var sColor = sColor.toLowerCase();
                if (sColor && reg.test(sColor)) {
                    if (sColor.length === 4) {
                        var sColorNew = "#";
                        for (var i = 1; i < 4; i += 1) {
                            sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
                        }
                        sColor = sColorNew;
                    }
                    //处理六位的颜色值
                    var sColorChange = [];
                    for (var i = 1; i < 7; i += 2) {
                        sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
                    }
                    return sColorChange;
                } else {
                    return sColor;
                }
            };

            var colorHex = function (rgb) {
                var _this = rgb;
                var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
                if (/^(rgb|RGB)/.test(_this)) {
                    var aColor = _this.replace(/(?:(|)|rgb|RGB)*/g, "").split(",");
                    var strHex = "#";
                    for (var i = 0; i < aColor.length; i++) {
                        var hex = Number(aColor[i]).toString(16);
                        hex = hex < 10 ? 0 + '' + hex : hex;// 保证每个rgb的值为2位
                        if (hex === "0") {
                            hex += hex;
                        }
                        strHex += hex;
                    }
                    if (strHex.length !== 7) {
                        strHex = _this;
                    }
                    return strHex;
                } else if (reg.test(_this)) {
                    var aNum = _this.replace(/#/, "").split("");
                    if (aNum.length === 6) {
                        return _this;
                    } else if (aNum.length === 3) {
                        var numHex = "#";
                        for (var i = 0; i < aNum.length; i += 1) {
                            numHex += (aNum[i] + aNum[i]);
                        }
                        return numHex;
                    }
                } else {
                    return _this;
                }
            }

        },
        //添加路网鼠标悬浮事件
        addLayerMoveListener: function (layerName) {
            var adminWfsLayer = this.getLayer(layerName);
            var self = this;
            //单个选择要素
            var adminLayerSelect = new ol.interaction.Select({
                condition: ol.events.condition.pointerMove,  //click,
                layers: [adminWfsLayer],
                style: new ol.style.Style({

                    fill: new ol.style.Fill({
                        color: 'rgba(0, 255, 255, 0.6)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: 'rgba(00, 255, 255, 0.6)',
                        width: 5
                    })
                })
            });

            adminLayerSelect.on('select', function (evt) {
                var container = document.getElementById('popup');
                if (evt.selected.length > 0) {
                    self._map.getViewport().style.cursor = 'hand';
                    var coordinate = evt.mapBrowserEvent.coordinate;
                    /* evt.selected.forEach(function (feature) {

                    });  */
                    var content = document.getElementById('popup-content');
                    var title = document.getElementById('popup-title');

                    var overlay = self._map.getOverlayById("openOverlay");
                    /*  var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
                             coordinate, 'EPSG:4490', 'EPSG:4490'));  */
                    overlay.setPosition(coordinate);
                    content.innerHTML = '<p>You clicked here:</p><code>' + ' 路名称: ' + evt.selected[0].get("FNAME") + '\n' + ' FEATUREGUI' + evt.selected[0].get("FEATUREGUI")   //feature.get("name")
                    '</code>';
                    container.style.display = 'block';
                    title.innerHTML = "提示信息";
                    title.style.display = 'block';
                } else {
                    container.style.display = 'none';
                    self._map.getViewport().style.cursor = 'default';
                }
            });
            self._map.addInteraction(adminLayerSelect);
            return adminLayerSelect;
        },
        //选中某道路
        locateRoad: function (rId, adminLayerSelect) {
            var selectedFeatures = adminLayerSelect.getFeatures();
            var roadFeature = this.roadFeatures;
            if (roadFeature) {
                for (var i = 0; i < roadFeature.length; i++) {
                    if (rId == roadFeature[i].get('FEATUREGUI')) {
                        var tempFeature = roadFeature[i];

                        selectedFeatures.clear();
                        selectedFeatures.push(tempFeature);
                        this._map.getView().fit(tempFeature.getGeometry());
                        break;
                    }
                }
            }
        }
    };
    return OpenMap;
}));
/**
 * 为聚合图层画canvas图
 * @param {*} ele
 * @param {*} data
 */
function dcanvas(ele, data) {
    // 一个canvas标签
    var canvas = ele;
    var x = data.centerX;
    var y = data.centerY;
    var rO = data.radiusOutside;
    var rI = data.radiusInside;
    var lineWidth = 8;
    // 拿到绘图上下文,目前只支持"2d"
    var context = canvas.getContext('2d');
    // 将绘图区域清空,如果是第一次在这个画布上画图,画布上没有东西,这步就不需要了
    context.clearRect(0, 0, 2 * rO, 2 * rO);

    //画最大的半透明的圆
    context.beginPath();
    context.moveTo(x, y);//坐标移动到圆心
    context.arc(x, y, rO, 0, Math.PI * 2, false);
    context.closePath();
    context.fillStyle = 'rgba(255,169,76,0.4)';// 填充颜色
    context.fill();

    //画白色轮廓
    context.moveTo(x + rI, y);
    context.beginPath();
    context.lineWidth = lineWidth;
    context.strokeStyle = '#fff';
    context.arc(x, y, rI, 0, 2 * Math.PI);
    context.closePath();
    context.stroke();

    if (data.normalSize) {
        //画橙色进度条的轮廓
        context.moveTo(x, y);
        context.beginPath();
        context.lineWidth = lineWidth;
        context.lineCap = 'round';
        context.strokeStyle = "#ffa94c";
        context.arc(x, y, rI, -Math.PI / 2, Math.PI * (data.normalSize / data.size) * 2 - Math.PI / 2);
        context.stroke();
    }

    //在中间写字
    context.font = "9pt Arial";
    context.fillStyle = '#000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.moveTo(x, y);
    context.fillText(data.normalSize + '/' + data.size, x, y);
    return canvas;
}