/// <reference path="../csgo.d.ts" />
var IconUtil = (function () {
    const _SetPNGImageFallback = function (mapIconDetails, icon_image_path) {
        if (mapIconDetails.m_type == 'svg') {
            mapIconDetails.m_type = 'png';
            mapIconDetails.m_icon.SetImage(icon_image_path + '.png');
        }
        else {
            mapIconDetails.m_icon.SetImage('file://{images}/map_icons/map_icon_NONE.png');
        }
    };
    const _SetupFallbackMapIcon = function (elIconPanel, icon_image_path) {
        const mapIconDetails = { m_icon: elIconPanel, m_type: 'svg', m_handler: -1 };
        $.RegisterEventHandler('ImageFailedLoad', elIconPanel, () => _SetPNGImageFallback(mapIconDetails, icon_image_path));
    };
    return {
        SetupFallbackMapIcon: _SetupFallbackMapIcon
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImljb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscUNBQXFDO0FBS3JDLElBQUksUUFBUSxHQUFHLENBQUU7SUFVYixNQUFNLG9CQUFvQixHQUFHLFVBQVcsY0FBOEIsRUFBRSxlQUF1QjtRQUUzRixJQUFLLGNBQWMsQ0FBQyxNQUFNLElBQUksS0FBSyxFQUNuQztZQUNJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQzlCLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFFLGVBQWUsR0FBRyxNQUFNLENBQUUsQ0FBQztTQUM5RDthQUVEO1lBRUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUUsNkNBQTZDLENBQUUsQ0FBQztTQUNuRjtJQUNMLENBQUMsQ0FBQztJQUVGLE1BQU0scUJBQXFCLEdBQUcsVUFBVyxXQUFvQixFQUFFLGVBQXVCO1FBRWxGLE1BQU0sY0FBYyxHQUFtQixFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM3RixDQUFDLENBQUMsb0JBQW9CLENBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFFLGNBQWMsRUFBRSxlQUFlLENBQUUsQ0FBRSxDQUFDO0lBRTVILENBQUMsQ0FBQztJQUVGLE9BQU87UUFDSCxvQkFBb0IsRUFBRSxxQkFBcUI7S0FDOUMsQ0FBQztBQUNOLENBQUMsQ0FBRSxFQUFFLENBQUMifQ==