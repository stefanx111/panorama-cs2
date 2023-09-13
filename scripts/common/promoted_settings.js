"use strict";
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
    {
        id: "XhairRecoil",
        loc_name: "#GameUI_CrosshairRecoil",
        loc_desc: "#GameUI_CrosshairRecoil_Desc",
        section: "GameSettings",
        start_date: new Date('August 21, 2023'),
        end_date: new Date('January 30, 2024')
    },
    {
        id: "ZoomButtonHold",
        loc_name: "#ZoomButtonHold",
        loc_desc: "#ZoomButtonHold_Desc",
        section: "KeybdMouseSettings",
        start_date: new Date('August 21, 2023'),
        end_date: new Date('January 30, 2024')
    },
    {
        id: "FiddleWithSilencers",
        loc_name: "#Cstrike_Fiddle_With_Silencers",
        loc_desc: "#Cstrike_Fiddle_With_Silencers_Desc",
        section: "GameSettings",
        start_date: new Date('August 21, 2023'),
        end_date: new Date('January 30, 2024')
    },
    {
        id: "AllowAnimatedAvatars",
        loc_name: "#Settings_AllowAnimatedAvatars_Title",
        loc_desc: "#Settings_AllowAnimatedAvatars_Title_Tooltip",
        section: "GameSettings",
        start_date: new Date('September 12, 2023'),
        end_date: new Date('January 30, 2024')
    },
];
var PromotedSettingsUtil = (function () {
    function _GetUnacknowledgedPromotedSettings() {
        const settingsInfo = GameInterfaceAPI.GetSettingString("cl_promoted_settings_acknowledged").split(':');
        const version = parseInt(settingsInfo.shift());
        const arrNewSettings = [];
        if (0) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbW90ZWRfc2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9tb3RlZF9zZXR0aW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBR3JDLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDO0FBWWxDLElBQUksa0JBQWtCLEdBQXdCO0lBaUI3QztRQUNDLEVBQUUsRUFBRSxvQkFBb0I7UUFDeEIsUUFBUSxFQUFFLGtDQUFrQztRQUM1QyxRQUFRLEVBQUUsdUNBQXVDO1FBQ2pELE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFVBQVUsRUFBRSxJQUFJLElBQUksQ0FBRSxtQkFBbUIsQ0FBRTtRQUMzQyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUUsZ0JBQWdCLENBQUU7S0FDdEM7SUFDRDtRQUNDLEVBQUUsRUFBRSxtQkFBbUI7UUFDdkIsUUFBUSxFQUFFLGdDQUFnQztRQUMxQyxRQUFRLEVBQUUsd0JBQXdCO1FBQ2xDLE9BQU8sRUFBRSxvQkFBb0I7UUFDN0IsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFFLG1CQUFtQixDQUFFO1FBQzNDLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBRSxnQkFBZ0IsQ0FBRTtLQUN0QztJQUNEO1FBQ0MsRUFBRSxFQUFFLCtCQUErQjtRQUduQyxRQUFRLEVBQUUsaUNBQWlDO1FBQzNDLFFBQVEsRUFBRSx5Q0FBeUM7UUFDbkQsT0FBTyxFQUFFLGNBQWM7UUFDdkIsVUFBVSxFQUFFLElBQUksSUFBSSxDQUFFLGVBQWUsQ0FBRTtRQUN2QyxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUUsZUFBZSxDQUFFO0tBQ3JDO0lBQ0Q7UUFDQyxFQUFFLEVBQUUsNEJBQTRCO1FBQ2hDLFFBQVEsRUFBRSw0QkFBNEI7UUFDdEMsUUFBUSxFQUFFLG9DQUFvQztRQUM5QyxPQUFPLEVBQUUsZUFBZTtRQUN4QixVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUUsY0FBYyxDQUFFO1FBQ3RDLFFBQVEsRUFBRSxJQUFJ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