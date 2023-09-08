"use strict";
/// <reference path="../csgo.d.ts" />
function SetupTooltip() {
    var ctx = $.GetContextPanel();
    var id = ctx.GetAttributeString("itemid", "");
    var slot = ctx.GetAttributeString("slot", "");
    var team = ctx.GetAttributeString("team", "");
    var nameOnly = ctx.GetAttributeString("nameonly", "");
    ctx.SetDialogVariable('name', InventoryAPI.GetItemName(id));
    var color = InventoryAPI.GetItemRarityColor(id);
    if (color) {
        $.GetContextPanel().FindChildInLayoutFile('id-tooltip-layout-name').style.color = color;
    }
    else {
        $.GetContextPanel().FindChildInLayoutFile('id-tooltip-layout-name').style.color = 'white';
    }
    $.GetContextPanel().FindChildInLayoutFile('id-tooltip-layout-desc').visible = nameOnly === 'true';
    $.GetContextPanel().FindChildInLayoutFile('id-tooltip-layout-seperator').visible = nameOnly === 'true';
    if (nameOnly === 'true') {
        let defName = InventoryAPI.GetItemDefinitionName(id);
        defName = defName ? defName?.replace('weapon_', '') : '';
        ctx.SetDialogVariable('desc', $.Localize('#csgo_item_usage_desc_' + defName));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHRpcF9sb2Fkb3V0X2l0ZW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0b29sdGlwX2xvYWRvdXRfaXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBR3JDLFNBQVMsWUFBWTtJQUVqQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDakMsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMzQyxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBVyxDQUFDO0lBQ3hELElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBRSxNQUFNLEVBQUUsRUFBRSxDQUFnQixDQUFDO0lBQzlELElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFXLENBQUM7SUFJaEUsR0FBRyxDQUFDLGlCQUFpQixDQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFFLEVBQUUsQ0FBRSxDQUFFLENBQUM7SUFDaEUsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFFLEVBQUUsQ0FBRSxDQUFDO0lBRWxELElBQUssS0FBSyxFQUNWO1FBQ0ksQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLHdCQUF3QixDQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7S0FDN0Y7U0FFRDtRQUNJLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBRSx3QkFBd0IsQ0FBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0tBQy9GO0lBU0QsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLHdCQUF3QixDQUFFLENBQUMsT0FBTyxHQUFHLFFBQVEsS0FBSyxNQUFNLENBQUM7SUFDcEcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLDZCQUE2QixDQUFFLENBQUMsT0FBTyxHQUFHLFFBQVEsS0FBSyxNQUFNLENBQUM7SUFFekcsSUFBSyxRQUFRLEtBQUssTUFBTSxFQUN4QjtRQUNJLElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxFQUFFLENBQUUsQ0FBQztRQUN2RCxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFFLFNBQVMsRUFBRSxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzNELEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSx3QkFBd0IsR0FBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQ2pGO0FBRUwsQ0FBQyJ9