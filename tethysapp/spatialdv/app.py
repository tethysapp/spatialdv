from tethys_sdk.base import TethysAppBase, url_map_maker


class Spatialdv(TethysAppBase):


    name = 'Spatial Data Viewer'
    index = 'spatialdv:home'
    icon = 'tethys_apps/images/default_app_icon.gif'
    package = 'spatialdv'
    root_url = 'spatialdv'
    color = '#16a085'
    description = ''
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='spatialdv',
                controller='spatialdv.controllers.home'
            ),
            UrlMap(
                name='searchHydroshare',
                url='spatialdv/search_hydroshare',
                controller='spatialdv.controllers.search_hydroshare'
            ),
            UrlMap(
                name='getResourceMetadata',
                url='spatialdv/get_resource_metadata',
                controller='spatialdv.controllers.get_resource_metadata'
            )

        )

        return url_maps
