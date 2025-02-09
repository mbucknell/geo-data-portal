/*
 * Currently retrieving this information from json files using the MetatdataRecordsStore.
 * Leaving this in in case we want to revert.
 */

Ext.ns("GDP");

GDP.CSWGetRecordsReader = function(meta, recordType) {
    meta = meta || {};
    if(!meta.format) {
        meta.format = new OpenLayers.Format.CSWGetRecords();
    }
    if(typeof recordType !== "function") {
        recordType = Ext.data.Record.create(meta.fields || [
            {name: "identifier", type: "string"},
            {name: "derivatives"}, // Array of objects
            {name: "scenarios"}, // Array of objects
            {name: "gcms"}, // Array of objects
            {name: "opendap", type: "string"},
            {name: "wms", type: "string"},
            {name: "sos", type: "string"},
            {name: "fieldLabels"},
            {name: "helptext"}
        ]
        );
    }
    GDP.CSWGetRecordsReader.superclass.constructor.call(
        this, meta, recordType
    );
};

Ext.extend(GDP.CSWGetRecordsReader, Ext.data.DataReader, {


    /** api: config[attributionCls]
     *  ``String`` CSS class name for the attribution DOM elements.
     *  Element class names append "-link", "-image", and "-title" as
     *  appropriate.  Default is "gx-attribution".
     */
    attributionCls: "gx-attribution",

    /** private: method[read]
     *  :param request: ``Object`` The XHR object which contains the parsed XML
     *      document.
     *  :return: ``Object`` A data block which is used by an ``Ext.data.Store``
     *      as a cache of ``Ext.data.Record`` objects.
     */
    read: function(request) {
        var data = request.responseXML;
        if(!data || !data.documentElement) {
            data = request.responseText;
        }
        return this.readRecords(data);
    },


    /** private: method[readRecords]
     *  :param data: ``DOMElement | String | Object`` A document element or XHR
     *      response string.  As an alternative to fetching capabilities data
     *      from a remote source, an object representing the capabilities can
     *      be provided given that the structure mirrors that returned from the
     *      capabilities parser.
     *  :return: ``Object`` A data block which is used by an ``Ext.data.Store``
     *      as a cache of ``Ext.data.Record`` objects.
     *
     *  Create a data block containing Ext.data.Records from an XML document.
     */
    readRecords: function(data) {
        if(typeof data === "string" || data.nodeType) {
            data = this.meta.format.read(data);
        }

        var records = [];

        Ext.iterate(data.records, function (item) {
            var values = {};
            values.identifier = item.fileIdentifier.CharacterString.value;
            values.derivatives = [];
            values.scenarios = [];
            values.gcms = [];

            var idInfos = item.identificationInfo;

            Ext.iterate(idInfos, function (idInfo) {
                var keywordTypes = idInfo.descriptiveKeywords;
                var srvId = idInfo.serviceIdentification;
                var abstrakt;
                try {
                    abstrakt = Ext.decode(idInfo["abstract"].CharacterString.value, true);
                }
                catch (ex) {
                    // means not json, set abstract to null
                    abstrakt = null;
                }

                if (keywordTypes) {
                    Ext.iterate(keywordTypes, function (kt) {
                        if (kt.type.codeListValue === "derivative") {
                            Ext.iterate(kt.keyword, function(key) {
                                var derivArr = [];
                                var val = key.CharacterString.value;
                                derivArr.push(val);
                                if (abstrakt !== null) {
                                    derivArr.push(abstrakt.quicktips.derivatives[val]);
                                }
                                values.derivatives.push(derivArr);
                            }, this);
                        }
                        else if (kt.type.codeListValue === "scenario") {
                            Ext.iterate(kt.keyword, function(key) {
                                var scenarioArr = [];
                                var val = key.CharacterString.value;
                                scenarioArr.push(val);
                                if (abstrakt !== null) {
                                    scenarioArr.push(abstrakt.quicktips.scenarios[val]);
                                }
                                values.scenarios.push(scenarioArr);
                            }, this);
                        }
                        else if (kt.type.codeListValue === "gcm") {
                            Ext.iterate(kt.keyword, function(key) {
                                var gcmArr = [];
                                var val = key.CharacterString.value;
                                gcmArr.push(val);
                                if (abstrakt !== null) {
                                    gcmArr.push(abstrakt.quicktips.gcms[val]);
                                }
                                values.gcms.push(gcmArr);
                            }, this);
                        }
                    }, this);
                }
                if (srvId) {
                    var serviceId = srvId.id;
                    var opMeta = srvId.operationMetadata;
                    if (opMeta) var linkage = opMeta.linkage;
                    if (linkage) var endpoint = linkage.URL;
                    if (serviceId) {
                        if (serviceId === "OPeNDAP") {
                            values.opendap = endpoint;
                        }
                        else if (serviceId === "OGC-WMS") {
                            values.wms = endpoint;
                        }
                        else if (serviceId === "OGC-SOS") {
                            values.sos = endpoint;
                        }
                    }
                }
                if (abstrakt !== null) {
                    values.fieldLabels = abstrakt.fieldlabels;
                    values.helptext = abstrakt.helptext;
                }

            }, this);

            records.push(new this.recordType(values));
        }, this);

        return {
            totalRecords: records.length,
            success: true,
            records: records
        };

    }

});
