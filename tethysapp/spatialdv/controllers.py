from django.shortcuts import render
from tethys_sdk.permissions import login_required
from tethys_sdk.gizmos import Button, MapView, MVDraw, MVView, MVLayer, MVLegendClass
from django.http import JsonResponse
import requests
import json
from .utilities import get_layers

hydroshare_url = "https://www.hydroshare.org"


@login_required()
def home(request):
    """
    Controller for the app home page.
    """

    # Define view options
    view_options = MVView(
        projection='EPSG:4326',
        center=[-100, 40],
        zoom=3.5,
        maxZoom=18,
        minZoom=2
    )

    # Define drawing options
    drawing_options = MVDraw(
        controls=['Modify', 'Delete', 'Move', 'Point', 'LineString', 'Polygon', 'Box'],
        initial='Point',
        output_format='WKT'
    )

    # Define base map options
    esri_layer_names = [
        'NatGeo_World_Map',
        'World_Imagery',
        'World_Physical_Map',
        'World_Street_Map',
        'World_Topo_Map',
    ]
    esri_layers = [{'ESRI': {'layer': l}} for l in esri_layer_names]
    basemaps = [

    ]
    basemaps.extend(esri_layers)

    # Specify OpenLayers version
    MapView.ol_version = '5.3.0'

    # Define map view options
    map_view_options = MapView(
        height='100%',
        width='100%',
        controls=['ZoomSlider', 'Rotate', 'FullScreen',
                  {'MousePosition': {'projection': 'EPSG:4326'}},
                  {'ZoomToExtent': {'projection': 'EPSG:4326', 'extent': [-130, 22, -65, 54]}}],
        layers=[],
        view=view_options,
        basemap=basemaps,
        legend=True
    )

    context = {

        'map_view_options': map_view_options
    }

    return render(request, 'spatialdv/home.html', context)


def search_hydroshare(request):

    draw = request.POST.get('draw')
    length = int(request.POST.get('length'))
    start = int(request.POST.get('start'))
    search_value = request.POST.get('searchValue')
    search_param = f"&full_text_search={search_value}" if search_value else ""
    print(search_param)
    page, r = divmod(start, length)

    # Using the API url instead of the restclient since the rest client asks for authentication even for
    # public resources.

    request_url_upper = f"{hydroshare_url}/hsapi/resource/?type=CompositeResource&page={page+1}&include_obsolete=false&count={length}{search_param}"
    request_url_lower = f"{hydroshare_url}/hsapi/resource/?type=CompositeResource&[age={page+2}&include_obsolete=false&count={length}{search_param}"
    response_upper = requests.get(request_url_upper)
    response_lower = requests.get(request_url_lower)
    results_upper = json.loads(response_upper.content)
    results_lower = json.loads(response_lower.content)

    try:
        records = results_upper.get("count")

        data_upper = [[i["resource_type"], i["resource_title"].strip(), i["resource_id"].strip()]
                      for i in results_upper["results"]][r:]

    except Exception as e:
        records = "0"
        data_upper = []
    try:
        data_lower = [[i["resource_type"], i["resource_title"].strip(), i["resource_id"].strip()]
                      for i in results_lower["results"]][:-int(length - r)]
    except:
        data_lower = []

    return JsonResponse({
        "draw": [int(draw)],
        "recordsTotal": records,
        "recordsFiltered": records,
        "data": data_upper + data_lower
    })


def get_resource_metadata(request):

    return_obj = {}

    resource_id = request.POST.get('resourceId')

    request_url = f"{hydroshare_url}/hsapi/resource/{resource_id}/sysmeta/"
    response = json.loads(requests.get(request_url).content)

    if response["public"] is True:
        sharing_status = "Public"
    elif response["discoverable"] is True:
        sharing_status = "Discoverable"
    else:
        sharing_status = "Private"

    bounding_box = None
    coverages = [coverage for coverage in response["coverages"] if coverage["type"] in ("point", "box")]
    for coverage in response["coverages"]:
        if coverage["type"] == "point":
            bounding_box = {
                "min_x": coverage["value"]["east"],
                "min_y": coverage["value"]["north"],
                "max_x": coverage["value"]["east"],
                "max_y": coverage["value"]["north"]
            }
        elif coverage["type"] == "box":
            bounding_box = {
                "min_x": coverage["value"]["westlimit"],
                "min_y": coverage["value"]["southlimit"],
                "max_x": coverage["value"]["eastlimit"],
                "max_y": coverage["value"]["northlimit"],
            }

    layer_list = get_layers(resource_id)

    # -------------------- #
    #   RETURNS RESPONSE   #
    # -------------------- #

    return_obj["resourceTitle"] = response["resource_title"]
    return_obj["resourceAbstract"] = response["abstract"]
    return_obj["creator"] = response["creator"]
    return_obj["dateCreated"] = response["date_created"]
    return_obj["lastUpdated"] = response["date_last_updated"]
    return_obj["resourceId"] = resource_id
    return_obj["resourceLink"] = response["resource_url"]
    return_obj["sharingStatus"] = sharing_status
    return_obj["resourceType"] = response["resource_type"]
    return_obj["layerList"] = layer_list
    return_obj["boundingBox"] = bounding_box

    return JsonResponse(return_obj)
