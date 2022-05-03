var discoverTable
var discoverSearchTimeout
var activeResource = null
var activeLayer = null
var dataViewerVisible = false
var navigationVisible = true
var layerList = {}
var aggregationsList = []
var selectedLayer = {}

$(document).ready(function() {
    $(".discover-content").show()

    buildDiscoverTable()
    // $(".discover-loading-container").hide()
    // Test Adding A WMS layer from Hydroshare

    // var ol_map = TETHYS_MAP_VIEW.getMap()

    // var wmsLayer = new ol.layer.ImageLayer({
    //     source: {
    //         url:
    //             "https://geoserver.hydroshare.org/geoserver/HS-6461528501c14f7c9d6b10d20dd4f657/wms",
    //         params: { LAYERS: "ne:ne" },
    //         serverType: "geoserver",
    //         crossOrigin: "anonymous"
    //     }
    // })

    // console.log(ol_map)
    // ol_map.addLayer(...);
})

/* Builds discover table */
function buildDiscoverTable() {
    // Adds loading screen
    let scrollY = $("#discover-table-container").height()
    // Remove existing table
    try {
        discoverTable.destroy()
        $(".discover-loading-container").show()
        $("#discover-table_info").remove()
    } catch {}

    // Initializes Discover Table
    discoverTable = $("#discover-table").DataTable({
        select: {
            style: "single"
        },
        searching: true,
        serverSide: true,
        order: [[2, "desc"]],
        lengthChange: false,
        ajax: {
            url: URL_searchHydroshare,
            type: "POST",
            data: function(data) {
                data.searchValue = $("#discover-input").val()
            },
            dataSrc: function(json) {
                for (var i = 0; i < json.data.length; i++) {
                    json.data[
                        i
                    ][0] = `<img class="discover-icon" src="${STATICURL_CompositeImg}">`
                }
                return json.data
            }
        },
        drawCallback: function() {
            discoverTable
                .rows()
                .eq(0)
                .each(function(index) {
                    var row = discoverTable.row(index)
                    var data = row.data()
                    if (data[2] === activeResource) {
                        row.select()
                    }
                })
        },
        columnDefs: [{ visible: false, targets: [2] }],
        createdRow: function(row, data, dataIndex) {
            $(row).addClass("nav-table-row")
        },
        deferRender: true,
        scrollY: scrollY,
        language: {
            loadingRecords: `<div class="main-loading-container">
                <img class="main-loading-animation" src="${STATICURL_GridImg}">
                </div>`,
            processing: `<div class="main-loading-container">
                <img class="main-loading-animation" src="${STATICURL_GridImg}">
                </div>`
        },
        scroller: {
            loadingIndicator: true,
            displayBuffer: 4
        },
        initComplete: (settings, json) => {
            $(".discover-loading-container").hide()
            $("#discover-table_info").appendTo("#discover-section-footer")
        }
    })

    // Adds event listeners to Discover Table
    discoverTable.on("select", setActiveResource)
    discoverTable.on("deselect", setActiveResource)
}

/* Searches discover table */
function searchDiscoverTable(evt) {
    // Clear timeout
    clearTimeout(discoverSearchTimeout)

    // Reset timeout
    discoverSearchTimeout = setTimeout(function() {
        buildDiscoverTable()
    }, 250)
}

/* Sets active resource */
function setActiveResource(evt) {
    var discoverRowSelected = discoverTable.rows({ selected: true }).data()
    if (discoverRowSelected[0] != null) {
        var discoverResource = discoverRowSelected[0][2]
    } else {
        var discoverResource = null
    }
    if (discoverResource !== activeResource) {
        activeResource = discoverResource
        updateDataViewer()
    }
}

function zoomToExtent(minX, minY, maxX, maxY) {
    var extent = ol.extent.createEmpty()
    var bottomPadding = dataViewerVisible ? 300 : 0
    var leftPadding = navigationVisible ? 300 : 0
    var layerExtent = ol.proj.transformExtent(
        [minX, minY, maxX, maxY],
        "EPSG:4326",
        "EPSG:3857"
    )
    ol.extent.extend(extent, layerExtent)
    var ol_map = TETHYS_MAP_VIEW.getMap()
    ol_map
        .getView()
        .fit(extent, { padding: [0, 0, bottomPadding, leftPadding] } /*, map.getSize()*/)
}

/* Builds aggregation table */
function buildAggregationList(aggregationList) {
    $("#resource-aggregation-list").empty()
    aggregationsList = aggregationList
    for (var i = 0; i < aggregationList.length; i++) {
        switch (aggregationList[i]["layerType"]) {
            case "point":
            case "line":
            case "polygon":
                var aggregationIcon = `<img class="resource-aggregation-icon" src="${STATICURL_GeographicFeatureResource}"/>`
                break
            case "raster":
                var aggregationIcon = `<img class="resource-aggregation-icon" src="${STATICURL_RasterResource}"/>`
                break
        }
        if (layerList[aggregationList[i]["layerCode"]] === undefined) {
            var aggregationAction =
                '<div class="resource-aggregation-add resource-aggregation-action"><span class="glyphicon glyphicon-plus"></span></div>'
        } else if (
            layerList[aggregationList[i]["layerCode"]]["layerCode"] === activeLayer
        ) {
            var aggregationAction = '<div class="resource-aggregation-action"></div>'
        } else {
            var aggregationAction =
                '<div class="resource-aggregation-edit resource-aggregation-action"><span class="glyphicon glyphicon-pencil"></span></div>'
        }
        var aggregationRow = `<div class="resource-aggregation-row" layer_id="${
            aggregationList[i]["layerCode"]
        }" layer_type="${aggregationList[i]["layerType"]}">
                  ${aggregationIcon}
                  <div class="resource-aggregation-name">${
                      aggregationList[i]["layerName"]
                  }</div>
                  ${aggregationAction}
                </div>`
        $("#resource-aggregation-list").append(aggregationRow)
    }
    if (aggregationList.length > 0) {
        $("#resource-aggregation-list").show()
        $("#aggregation-no-data").hide()
    } else {
        $("#resource-aggregation-list").hide()
        $("#aggregation-no-data").show()
    }
}

/* Gets resource metadata */
function getResourceMetadata(addLayers, resourceZoom) {
    $.ajax({
        type: "POST",
        data: {
            resourceId: activeResource
        },
        url: URL_getMetadata,
        success: function(response) {
            console.log(response)

            if (response["resourceId"] === activeResource) {
                $("#resource-title").text(response["resourceTitle"])
                $("#resource-creator").text(response["creator"])
                $("#resource-date-created").text(response["dateCreated"])
                $("#resource-last-updated").text(response["lastUpdated"])
                $("#resource-id").text(response["resourceId"])
                $("#resource-link").text(response["resourceLink"])
                $("#resource-link").attr("href", response["resourceLink"])
                $("#resource-sharing-status").text(response["sharingStatus"])
                $("#resource-type").text(response["resourceType"])
                $("#resource-abstract").text(response["resourceAbstract"])
                if (response["boundingBox"] !== null && resourceZoom === true) {
                    zoomToExtent(
                        parseFloat(response["boundingBox"]["min_x"]),
                        parseFloat(response["boundingBox"]["min_y"]),
                        parseFloat(response["boundingBox"]["max_x"]),
                        parseFloat(response["boundingBox"]["max_y"])
                    )
                }
                buildAggregationList(response["layerList"])
                $(".resource-info-container").show()
                $(".data-view-loading-container").hide()
                if (addLayers === true) {
                    $(".workspace-loading-container").hide()
                    for (var i = 0; i < response["layerList"].length; i++) {
                        addLayerToMap(response["layerList"][i])
                    }
                }
            }
        },
        error: function(response) {
            $(".workspace-loading-container").hide()
            console.log("Layer Load Failed")
        }
    })
}

/* Updates Data Viewer */
function updateDataViewer(collapse) {
    $(".data-viewer-page").hide()
    $(".data-viewer-tab").hide()
    $(".layer-options-container").hide()
    $("#show-layer-btn").addClass("hidden")
    $("#hide-layer-btn").addClass("hidden")
    $(".data-viewer-tab").removeClass("active-tab")
    $("#label-field-input").empty()
    try {
        mapPopup.setPosition(undefined)
    } catch {}
    if (activeLayer != null) {
        $(".resource-info-container").hide()
        $(".data-view-loading-container").show()
        getResourceMetadata(false, false)
        showDataViewer()
        if (layerList[activeLayer]["layerVisible"]) {
            $("#hide-layer-btn").removeClass("hidden")
        } else {
            $("#show-layer-btn").removeClass("hidden")
        }
        $("#data-viewer-hide").removeClass("hidden")
        $("#resource-info").show()
        $("#layer-options").show()
        $("#layer-options").addClass("active-tab")
        $("#layer-options-view").show()
        $("#layer-actions-container").show()
        $("#layer-name-input").val(layerList[activeLayer]["layerName"])
        switch (layerList[activeLayer]["layerType"]) {
            case "timeseries":
                $("#attr-table").show()
                $("#ts-plot").show()
                $("#layer-fill-container").show()
                $("#layer-stroke-container").show()
                $("#layer-labels-container").show()
                buildAttributeTable()
                break
            case "point":
                $("#attr-table").show()
                $("#layer-fill-container").show()
                $("#layer-stroke-container").show()
                $("#layer-labels-container").show()
                buildAttributeTable()
                break
            case "line":
                $("#attr-table").show()
                $("#layer-stroke-container").show()
                $("#layer-labels-container").show()
                buildAttributeTable()
                break
            case "polygon":
                $("#attr-table").show()
                $("#layer-fill-container").show()
                $("#layer-stroke-container").show()
                $("#layer-labels-container").show()
                buildAttributeTable()
                break
            case "raster":
                $("#layer-fill-container").show()
                break
        }
        updateSymbologyFields()
    } else if (activeResource != null) {
        $(".resource-info-container").hide()
        $(".data-view-loading-container").show()
        getResourceMetadata(false, true)
        showDataViewer()
        $("#data-viewer-hide").removeClass("hidden")
        $("#resource-info-view").show()
        $("#resource-info").show()
        $("#resource-info").addClass("active-tab")
    } else {
        hideDataViewer()
        $("#data-viewer-show").addClass("hidden")
    }
}

/* Shows the data viewer window */
function showDataViewer() {
    $(".data-viewer-container").addClass("data-viewer-container-expanded")
    $(".ol-scale-line").addClass("ol-scale-line-up")
    $(".ol-overviewmap").addClass("ol-overviewmap-up")
    $("#data-viewer-show").addClass("hidden")
    $("#data-viewer-hide").removeClass("hidden")
    $("#data-viewer-tabs").removeClass("hidden")
    dataViewerVisible = true
}

/* Hides the data viewer window */
function hideDataViewer() {
    $(".data-viewer-container").removeClass("data-viewer-container-expanded")
    $(".ol-scale-line").removeClass("ol-scale-line-up")
    $(".ol-overviewmap").removeClass("ol-overviewmap-up")
    $("#data-viewer-show").removeClass("hidden")
    $("#data-viewer-hide").addClass("hidden")
    $("#data-viewer-tabs").addClass("hidden")
    dataViewerVisible = false
}

function dataViewerAddLayer(evt) {
    var aggregationData =
        aggregationsList[
            aggregationsList.findIndex(
                (x) =>
                    x.layerCode ===
                    $(this)
                        .parent()
                        .attr("layer_id")
            )
        ]
    $(this).removeClass("resource-aggregation-add")
    $(this).addClass("resource-aggregation-loading")
    $(this).html(`<img class="data-view-layer-loading-icon" src="${STATICURL_Spinner}">`)
    var layerAdded = addLayerToMap(aggregationData)
    if (layerAdded) {
        $(this).removeClass("resource-aggregation-loading")
        $(this).addClass("resource-aggregation-edit")
        $(this).html('<span class="glyphicon glyphicon-minus"></span>')
    } else {
        $(this).removeClass("resource-aggregation-loading")
        $(this).addClass("resource-aggregation-add")
        $(this).html('<span class="glyphicon glyphicon-plus"></span>')
    }
}

/* Adds layer to map */
function addLayerToMap(layerData) {
    // Builds layer object
    var layerCode = layerData["layerCode"]
    layerList[layerCode] = layerData

    // Creates layer WMS object
    layerList[layerCode]["layerWMS"] = new ol.source.ImageWMS({
        url: `https://geoserver.hydroshare.org/geoserver/wms`,
        params: { LAYERS: layerList[layerCode]["layerCode"] },
        serverType: "geoserver",
        crossOrigin: "Anonymous"
    })

    // Creates layer image object
    layerList[layerCode]["layerSource"] = new ol.layer.Image({
        source: layerList[layerCode]["layerWMS"]
    })

    var ol_map = TETHYS_MAP_VIEW.getMap()

    // Add layer to map
    ol_map.addLayer(layerList[layerCode]["layerSource"])

    // //Reorder map layers
    // reorderMapLayers();

    // // Update legend
    // updateLegend();

    return true
}

$(document).on("keyup", "#discover-input", searchDiscoverTable)
$(document).on("click", ".resource-aggregation-add", dataViewerAddLayer)
