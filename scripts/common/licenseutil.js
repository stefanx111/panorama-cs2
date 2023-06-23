/// <reference path="../csgo.d.ts" />
var LicenseUtil = (function () {
    const _GetCurrentLicenseRestrictions = function () {
        let szButtonText = "#Store_Get_License";
        let szMessageText = "#SFUI_LoginLicenseAssist_NoOnlineLicense";
        switch (MyPersonaAPI.GetLicenseType()) {
            case "free_pw_needlink":
                szButtonText = "#Store_Link_Accounts";
                szMessageText = "#SFUI_LoginLicenseAssist_PW_NeedToLinkAccounts";
                break;
            case "free_pw_needupgrade":
                szMessageText = "#SFUI_LoginLicenseAssist_HasLicense_PW";
                break;
            case "free_pw":
                szMessageText = "#SFUI_LoginLicenseAssist_NoOnlineLicense_PW";
                break;
            case "free_sc":
                szMessageText = "#SFUI_LoginLicenseAssist_NoOnlineLicense_SC";
                szButtonText = "#Store_Register_License";
                break;
            case "purchased":
                return false;
        }
        return {
            license_msg: szMessageText,
            license_act: szButtonText
        };
    };
    const _BuyLicenseForRestrictions = function (restrictions) {
        if (restrictions && restrictions.license_act === "#Store_Register_License") {
            UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_license_register.xml', 'message=Store_Register_License' +
                '&' + 'spinner=1');
        }
        else {
            MyPersonaAPI.ActionBuyLicense();
        }
    };
    const _ShowLicenseRestrictions = function (restrictions) {
        if (restrictions !== false) {
            UiToolkitAPI.ShowGenericPopupYesNo($.Localize(restrictions.license_act), $.Localize(restrictions.license_msg), '', _BuyLicenseForRestrictions.bind(null, restrictions), function () { });
        }
    };
    return {
        GetCurrentLicenseRestrictions: _GetCurrentLicenseRestrictions,
        BuyLicenseForRestrictions: _BuyLicenseForRestrictions,
        ShowLicenseRestrictions: _ShowLicenseRestrictions
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGljZW5zZXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsaWNlbnNldXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFVckMsSUFBSSxXQUFXLEdBQUcsQ0FBRTtJQUVuQixNQUFNLDhCQUE4QixHQUFHO1FBRXRDLElBQUksWUFBWSxHQUFHLG9CQUFvQixDQUFDO1FBQ3hDLElBQUksYUFBYSxHQUFHLDBDQUEwQyxDQUFDO1FBQy9ELFFBQVMsWUFBWSxDQUFDLGNBQWMsRUFBRSxFQUN0QztZQUNBLEtBQUssa0JBQWtCO2dCQUN0QixZQUFZLEdBQUcsc0JBQXNCLENBQUM7Z0JBQ3RDLGFBQWEsR0FBRyxnREFBZ0QsQ0FBQztnQkFDakUsTUFBTTtZQUNQLEtBQUsscUJBQXFCO2dCQUN6QixhQUFhLEdBQUcsd0NBQXdDLENBQUM7Z0JBQ3pELE1BQU07WUFDUCxLQUFLLFNBQVM7Z0JBQ2IsYUFBYSxHQUFHLDZDQUE2QyxDQUFDO2dCQUM5RCxNQUFNO1lBQ1AsS0FBSyxTQUFTO2dCQUNiLGFBQWEsR0FBRyw2Q0FBNkMsQ0FBQztnQkFDOUQsWUFBWSxHQUFHLHlCQUF5QixDQUFDO2dCQUN6QyxNQUFNO1lBQ1AsS0FBSyxXQUFXO2dCQUNmLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCxPQUFPO1lBQ04sV0FBVyxFQUFHLGFBQWE7WUFDM0IsV0FBVyxFQUFHLFlBQVk7U0FDMUIsQ0FBQztJQUNILENBQUMsQ0FBQTtJQUVELE1BQU0sMEJBQTBCLEdBQUcsVUFBVSxZQUEyQztRQUV2RixJQUFLLFlBQVksSUFBSSxZQUFZLENBQUMsV0FBVyxLQUFLLHlCQUF5QixFQUFHO1lBQzdFLFlBQVksQ0FBQywrQkFBK0IsQ0FDM0MsRUFBRSxFQUNGLDZEQUE2RCxFQUM3RCxnQ0FBZ0M7Z0JBQ2hDLEdBQUcsR0FBRyxXQUFXLENBQ2pCLENBQUM7U0FDRjthQUFNO1lBQ04sWUFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUM7U0FDaEM7SUFDRixDQUFDLENBQUE7SUFFRCxNQUFNLHdCQUF3QixHQUFHLFVBQVUsWUFBMkM7UUFFckYsSUFBSyxZQUFZLEtBQUssS0FBSyxFQUMzQjtZQUVDLFlBQVksQ0FBQyxxQkFBcUIsQ0FDakMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxZQUFZLENBQUMsV0FBVyxDQUFFLEVBQ3RDLENBQUMsQ0FBQyxRQUFRLENBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBRSxFQUN0QyxFQUFFLEVBQ0YsMEJBQTBCLENBQUMsSUFBSSxDQUFFLElBQUksRUFBRSxZQUFZLENBQUUsRUFDckQsY0FBWSxDQUFDLENBQ2IsQ0FBQztTQUNGO0lBQ0YsQ0FBQyxDQUFBO0lBRUQsT0FBTTtRQUNMLDZCQUE2QixFQUFHLDhCQUE4QjtRQUM5RCx5QkFBeUIsRUFBRywwQkFBMEI7UUFDdEQsdUJBQXVCLEVBQUcsd0JBQXdCO0tBQ2xELENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDIn0=