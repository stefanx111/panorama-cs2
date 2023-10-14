"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="../common/characteranims.ts" />
var MainMenuVanityContextMenu = (function () {
    function _Init() {
        let strType = $.GetContextPanel().GetAttributeString("type", "");
        let team = $.GetContextPanel().GetAttributeString("team", "");
        if (strType === 'catagory') {
            MakeCatBtns(team);
            return;
        }
        if (strType === 'weapons') {
            MakeWeaponBtns(team);
            return;
        }
        MakeMapBtns();
    }
    function fnAddVanityPopupMenuItem(idString, strItemNameString, fnOnActivate) {
        let elContextMenuBodyNoScroll = $.GetContextPanel().FindChildTraverse('ContextMenuBodyNoScroll');
        let elItem = $.CreatePanel('Button', elContextMenuBodyNoScroll, idString);
        elItem.BLoadLayoutSnippet('snippet-vanity-item');
        let elLabel = elItem.FindChildTraverse('id-vanity-item__label');
        elLabel.text = $.Localize(strItemNameString);
        elItem.SetPanelEvent('onactivate', fnOnActivate);
        return elItem;
    }
    ;
    function MakeCatBtns(team) {
        let elContextMenuBodyNoScroll = $.GetContextPanel().FindChildTraverse('ContextMenuBodyNoScroll');
        elContextMenuBodyNoScroll.RemoveAndDeleteChildren();
        fnAddVanityPopupMenuItem('ChangeVanityMap', '#mainmenu_change_vanity_map', function () {
            const elVanityContextMenu = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('id-vanity-contextmenu-maps', '', 'file://{resources}/layout/context_menus/context_menu_mainmenu_vanity.xml', 'type=maps', function () { $.DispatchEvent('ContextMenuEvent', ''); });
            elVanityContextMenu.AddClass('ContextMenu_NoArrow');
        }).SetFocus();
        fnAddVanityPopupMenuItem('ChangeWeapon', '#mainmenu_change_vanity_weapon', function () {
            const elVanityContextMenu = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('id-vanity-contextmenu-weapons', '', 'file://{resources}/layout/context_menus/context_menu_mainmenu_vanity.xml', 'type=weapons' +
                '&' + 'team=' + team, function () { $.DispatchEvent('ContextMenuEvent', ''); });
            elVanityContextMenu.AddClass('ContextMenu_NoArrow');
        });
        let strOtherTeamToPrecache = ((team == '2') ? 'ct' : 't');
        fnAddVanityPopupMenuItem('switchTo_' + strOtherTeamToPrecache, '#mainmenu_switch_vanity_to_' + strOtherTeamToPrecache, function () {
            $.DispatchEvent("MainMenuSwitchVanity", strOtherTeamToPrecache);
            $.DispatchEvent('ContextMenuEvent', '');
        }).AddClass('BottomSeparator');
        fnAddVanityPopupMenuItem('GoToLoadout', '#mainmenu_go_to_character_loadout', function () {
            $.DispatchEvent("MainMenuGoToCharacterLoadout", team);
            $.DispatchEvent('ContextMenuEvent', '');
        });
        let otherTeamCharacterItemID = LoadoutAPI.GetItemID(strOtherTeamToPrecache, 'customplayer');
        let settingsForOtherTeam = ItemInfo.GetOrUpdateVanityCharacterSettings(otherTeamCharacterItemID);
        ItemInfo.PrecacheVanityCharacterSettings(settingsForOtherTeam);
    }
    ;
    function MakeWeaponBtns(team) {
        let elContextMenuBodyWeapons = $.GetContextPanel().FindChildTraverse('ContextMenuBodyWeapons');
        elContextMenuBodyWeapons.RemoveAndDeleteChildren();
        let list = ItemInfo.GetLoadoutWeapons(team);
        if (list && list.length > 0) {
            list.forEach(function ([loadoutSubSlot, weaponItemId]) {
                let elItem = $.CreatePanel('Button', elContextMenuBodyWeapons, weaponItemId);
                elItem.BLoadLayoutSnippet('snippet-vanity-item');
                elItem.AddClass('vanity-item--weapon');
                let elLabel = elItem.FindChildTraverse('id-vanity-item__label');
                elLabel.text = ItemInfo.GetName(weaponItemId);
                let elRarity = elItem.FindChildTraverse('id-vanity-item__rarity');
                let rarityColor = ItemInfo.GetRarityColor(weaponItemId);
                elRarity.style.backgroundColor = "gradient( linear, 0% 0%, 100% 0%, from(" + rarityColor + " ),  color-stop( 0.0125, #00000000 ), to( #00000000 ) );";
                elItem.SetPanelEvent('onactivate', function () {
                    let shortTeam = CharacterAnims.NormalizeTeamName(team, true);
                    GameInterfaceAPI.SetSettingString('ui_vanitysetting_loadoutslot_' + shortTeam, loadoutSubSlot);
                    $.DispatchEvent('ForceRestartVanity');
                    $.DispatchEvent('ContextMenuEvent', '');
                });
            });
        }
    }
    function MakeMapBtns() {
        let cvarInfo = GameInterfaceAPI.GetSettingInfo("ui_mainmenu_bkgnd_movie");
        let aMaps = cvarInfo.allowed_values;
        var elContextMenuBodyNoScroll = $.GetContextPanel().FindChildTraverse('ContextMenuBodyNoScroll');
        elContextMenuBodyNoScroll.RemoveAndDeleteChildren();
        aMaps.forEach(function (map) {
            fnAddVanityPopupMenuItem('context-menu-vanity-' + map, '#SFUI_Map_' + map, function () {
                GameInterfaceAPI.SetSettingString('ui_mainmenu_bkgnd_movie', map);
                $.DispatchEvent('ContextMenuEvent', '');
            });
        });
    }
    return {
        Init: _Init,
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dF9tZW51X21haW5tZW51X3Zhbml0eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRleHRfbWVudV9tYWlubWVudV92YW5pdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyw4Q0FBOEM7QUFDOUMsb0RBQW9EO0FBRXBELElBQUkseUJBQXlCLEdBQUcsQ0FBRTtJQUVqQyxTQUFTLEtBQUs7UUFFYixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQ25FLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBRSxNQUFNLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFFaEUsSUFBSyxPQUFPLEtBQUssVUFBVSxFQUMzQjtZQUNDLFdBQVcsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUNwQixPQUFPO1NBQ1A7UUFFRCxJQUFLLE9BQU8sS0FBSyxTQUFTLEVBQzFCO1lBQ0MsY0FBYyxDQUFFLElBQUksQ0FBRSxDQUFDO1lBQ3ZCLE9BQU87U0FDUDtRQUNELFdBQVcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUdELFNBQVMsd0JBQXdCLENBQUcsUUFBZSxFQUFFLGlCQUF3QixFQUFFLFlBQXVCO1FBRXJHLElBQUkseUJBQXlCLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGlCQUFpQixDQUFFLHlCQUF5QixDQUFFLENBQUM7UUFDbkcsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUseUJBQXlCLEVBQUUsUUFBUSxDQUFFLENBQUM7UUFDNUUsTUFBTSxDQUFDLGtCQUFrQixDQUFFLHFCQUFxQixDQUFFLENBQUM7UUFDbkQsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFFLHVCQUF1QixDQUFhLENBQUM7UUFDN0UsT0FBTyxDQUFDLElB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