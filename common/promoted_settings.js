/// <reference path="../csgo.d.ts" />
var g_PromotedSettingsVersion = 1;
var g_PromotedSettings = [
    {
        id: "BuyMenuDonationKey",
        loc_name: "#SFUI_Settings_BuyWheelDonateKey",
        loc_desc: "#SFUI_Settings_BuyWheelDonateKey_Info",
        section: "GameSettings",
        start_date: new Date('December 17, 2020'),
        end_date: new Date('April 31, 2021'),
    },
    {
        id: "SettingsChatWheel",
        loc_name: "#settings_ui_chatwheel_section",
        loc_desc: "#Chatwheel_description",
        section: "KeybdMouseSettings",
        start_date: new Date('November 25, 2020'),
        end_date: new Date('April 30, 2021'),
    },
    {
        id: "SettingsCommunicationSettings",
        loc_name: "#SFUI_Settings_FilterText_Title",
        loc_desc: "#SFUI_Settings_FilterText_Title_Tooltip",
        section: "GameSettings",
        start_date: new Date('June 11, 2020'),
        end_date: new Date('June 30, 2020')
    },
    {
        id: "MainMenuMovieSceneSelector",
        loc_name: "#GameUI_MainMenuMovieScene",
        loc_desc: "#GameUI_MainMenuMovieScene_Tooltip",
        section: "VideoSettings",
        start_date: new Date('May 26, 2020'),
        end_date: new Date('June 15, 2020')
    },
    {
        id: "XhairShowObserverCrosshair",
        loc_name: "#GameUI_ShowObserverCrosshair",
        loc_desc: "#GameUI_ShowObserverCrosshair_Tooltip",
        section: "GameSettings",
        start_date: new Date('April 15, 2020'),
        end_date: new Date('May 1, 2020')
    },
    {
        id: "SettingsCrosshair",
        loc_name: "#settings_crosshair",
        loc_desc: "#settings_crosshair_info",
        section: "GameSettings",
        start_date: new Date('February 24, 2019'),
        end_date: new Date('March 28, 2020')
    },
    {
        id: "TripleMonitor",
        loc_name: "#SFUI_Settings_Triple_Monitor",
        loc_desc: "#GameUI_TripleMonitor_Tooltip",
        section: "VideoSettings",
        start_date: new Date('November 20, 2019'),
        end_date: new Date('January 30, 2020')
    },
    {
        id: "ClutchKey",
        loc_name: "#GameUI_Clutch_Key",
        loc_desc: "#GameUI_Clutch_Key_Tooltip",
        section: "KeybdMouseSettings",
        start_date: new Date('September 21, 2019'),
        end_date: new Date('January 30, 2020')
    },
    {
        id: "id-friendlyfirecrosshair",
        loc_name: "#GameUI_FriendlyWarning",
        loc_desc: "#GameUI_FriendlyWarning_desc",
        section: "GameSettings",
        start_date: new Date('October 7, 2019'),
        end_date: new Date('February 30, 2020')
    },
    {
        id: "SettingsCommunicationSettings",
        loc_name: "#settings_comm_binds_section",
        loc_desc: "#settings_comm_binds_info",
        section: "GameSettings",
        start_date: new Date('September 13, 2019'),
        end_date: new Date('January 30, 2020')
    },
    {
        id: "RadialWepMenuBinder",
        loc_name: "#SFUI_RadialWeaponMenu",
        loc_desc: "#SFUI_RadialWeaponMenu_Desc",
        section: "KeybdMouseSettings",
        start_date: new Date('September 18, 2019'),
        end_date: new Date('January 30, 2020')
    },
];
var PromotedSettingsUtil = (function () {
    function _GetUnacknowledgedPromotedSettings() {
        if (g_PromotedSettings.length == 0)
            return [];
        const settingsInfo = GameInterfaceAPI.GetSettingString("cl_promoted_settings_acknowledged").split(':');
        const version = parseInt(settingsInfo.shift());
        const arrNewSettings = [];
        if (version === g_PromotedSettingsVersion) {
            const timeLastViewed = new Date(parseInt(settingsInfo.shift()));
            for (const setting of g_PromotedSettings) {
                const now = new Date();
                if (setting.start_date > timeLastViewed && setting.start_date <= now)
                    arrNewSettings.push(setting);
            }
        }
        else {
            const now = new Date();
            return g_PromotedSettings.filter(setting => setting.start_date <= now && setting.end_date > now);
        }
        return arrNewSettings;
    }
    const hPromotedSettingsViewedEvt = $.RegisterForUnhandledEvent("MainMenu_PromotedSettingsViewed", function (id) {
        GameInterfaceAPI.SetSettingString("cl_promoted_settings_acknowledged", "" + g_PromotedSettingsVersion + ":" + Date.now());
        $.UnregisterForUnhandledEvent("MainMenu_PromotedSettingsViewed", hPromotedSettingsViewedEvt);
    });
    return {
        GetUnacknowledgedPromotedSettings: _GetUnacknowledgedPromotedSettings
    };
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbW90ZWRfc2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9tb3RlZF9zZXR0aW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFHckMsSUFBSSx5QkFBeUIsR0FBRyxDQUFDLENBQUM7QUFZbEMsSUFBSSxrQkFBa0IsR0FBd0I7SUFpQjdDO1FBQ0MsRUFBRSxFQUFFLG9CQUFvQjtRQUN4QixRQUFRLEVBQUUsa0NBQWtDO1FBQzVDLFFBQVEsRUFBRSx1Q0FBdUM7UUFDakQsT0FBTyxFQUFFLGNBQWM7UUFDdkIsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFFLG1CQUFtQixDQUFFO1FBQzNDLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBRSxnQkFBZ0IsQ0FBRTtLQUN0QztJQUNEO1FBQ0MsRUFBRSxFQUFFLG1CQUFtQjtRQUN2QixRQUFRLEVBQUUsZ0NBQWdDO1FBQzFDLFFBQVEsRUFBRSx3QkFBd0I7UUFDbEMsT0FBTyxFQUFFLG9CQUFvQjtRQUM3QixVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUUsbUJBQW1CLENBQUU7UUFDM0MsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFFLGdCQUFnQixDQUFFO0tBQ3RDO0lBQ0Q7UUFDQyxFQUFFLEVBQUUsK0JBQStCO1FBR25DLFFBQVEsRUFBRSxpQ0FBaUM7UUFDM0MsUUFBUSxFQUFFLHlDQUF5QztRQUNuRCxPQUFPLEVBQUUsY0FBYztRQUN2QixVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUUsZUFBZSxDQUFFO1FBQ3ZDLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBRSxlQUFlLENBQUU7S0FDckM7SUFDRDtRQUNDLEVBQUUsRUFBRSw0QkFBNEI7UUFDaEMsUUFBUSxFQUFFLDRCQUE0QjtRQUN0QyxRQUFRLEVBQUUsb0NBQW9DO1FBQzlDLE9BQU8sRUFBRSxlQUFlO1FBQ3hCLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBRSxjQUFjLENBQUU7UUFDdEMsUUFBUSxFQUFFLElBQUks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