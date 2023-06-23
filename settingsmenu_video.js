/// <reference path="csgo.d.ts" />
/// <reference path="settingsmenu_shared.ts" />
var SettingsMenuVideo;
(function (SettingsMenuVideo) {
    function SelectSimpleVideoSettings() {
        SettingsMenuShared.VideoSettingsDiscardChanges();
        SettingsMenuShared.SetVis('video_settings', true);
        SettingsMenuShared.SetVis('advanced_video', false);
        $('#SimpleVideoSettingsRadio').checked = true;
        $('#AdvancedVideoSettingsRadio').checked = false;
    }
    SettingsMenuVideo.SelectSimpleVideoSettings = SelectSimpleVideoSettings;
    function SelectAdvancedVideoSettings() {
        SettingsMenuShared.VideoSettingsDiscardChanges();
        SettingsMenuShared.SetVis('video_settings', false);
        SettingsMenuShared.SetVis('advanced_video', true);
        $('#SimpleVideoSettingsRadio').checked = false;
        $('#AdvancedVideoSettingsRadio').checked = true;
    }
    SettingsMenuVideo.SelectAdvancedVideoSettings = SelectAdvancedVideoSettings;
    function Init() {
        let parent = $('#MainMenuBkgSettingContainer');
        let cvarInfo = GameInterfaceAPI.GetSettingInfo("ui_mainmenu_bkgnd_movie");
        let aMaps = cvarInfo.allowed_values;
        aMaps.forEach(map => {
            let p = $.CreatePanel("Label", parent, "ui_mainmenu_bkgnd_movie_" + map, {
                text: "#SFUI_Map_de_" + map,
                value: map
            });
            parent.AddOption(p);
        });
        parent.RefreshDisplay();
    }
    SettingsMenuVideo.Init = Init;
    function ShowHudEdgePositions() {
        UiToolkitAPI.ShowCustomLayoutPopupWithCancelCallback('', 'file://{resources}/layout/popups/popup_hud_edge_positions.xml', () => { });
    }
    SettingsMenuVideo.ShowHudEdgePositions = ShowHudEdgePositions;
})(SettingsMenuVideo || (SettingsMenuVideo = {}));
SettingsMenuVideo.SelectSimpleVideoSettings();
SettingsMenuVideo.Init();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NtZW51X3ZpZGVvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2V0dGluZ3NtZW51X3ZpZGVvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQywrQ0FBK0M7QUFFL0MsSUFBVSxpQkFBaUIsQ0F3QzFCO0FBeENELFdBQVUsaUJBQWlCO0lBRXZCLFNBQWdCLHlCQUF5QjtRQUVyQyxrQkFBa0IsQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ2pELGtCQUFrQixDQUFDLE1BQU0sQ0FBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUUsQ0FBQztRQUNwRCxrQkFBa0IsQ0FBQyxNQUFNLENBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDckQsQ0FBQyxDQUFFLDJCQUEyQixDQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNqRCxDQUFDLENBQUUsNkJBQTZCLENBQUcsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3hELENBQUM7SUFQZSwyQ0FBeUIsNEJBT3hDLENBQUE7SUFFRCxTQUFnQiwyQkFBMkI7UUFFdkMsa0JBQWtCLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUNqRCxrQkFBa0IsQ0FBQyxNQUFNLENBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDckQsa0JBQWtCLENBQUMsTUFBTSxDQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBRSxDQUFDO1FBQ3BELENBQUMsQ0FBRSwyQkFBMkIsQ0FBRyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDbEQsQ0FBQyxDQUFFLDZCQUE2QixDQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUN2RCxDQUFDO0lBUGUsNkNBQTJCLDhCQU8xQyxDQUFBO0lBRUQsU0FBZ0IsSUFBSTtRQUVoQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUUsOEJBQThCLENBQWdDLENBQUM7UUFDL0UsSUFBSSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFFLHlCQUF5QixDQUFFLENBQUM7UUFDNUUsSUFBSSxLQUFLLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQztRQUNwQyxLQUFLLENBQUMsT0FBTyxDQUFFLEdBQUcsQ0FBQyxFQUFFO1lBRWpCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSwwQkFBMEIsR0FBRyxHQUFHLEVBQUU7Z0JBQ3RFLElBQUksRUFBRSxlQUFlLEdBQUcsR0FBRztnQkFDM0IsS0FBSyxFQUFFLEdBQUc7YUFDYixDQUFFLENBQUM7WUFDSixNQUFNLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBRSxDQUFDO1FBQzFCLENBQUMsQ0FBRSxDQUFDO1FBQ0osTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFkZSxzQkFBSSxPQWNuQixDQUFBO0lBRUQsU0FBZ0Isb0JBQW9CO1FBRWhDLFlBQVksQ0FBQyx1Q0FBdUMsQ0FBRSxFQUFFLEVBQUUsK0RBQStELEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFFLENBQUM7SUFDM0ksQ0FBQztJQUhlLHNDQUFvQix1QkFHbkMsQ0FBQTtBQUNMLENBQUMsRUF4Q1MsaUJBQWlCLEtBQWpCLGlCQUFpQixRQXdDMUI7QUFFRCxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO0FBQzlDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDIn0=