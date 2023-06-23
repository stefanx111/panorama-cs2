/// <reference path="../csgo.d.ts" />
/// <reference path="iteminfo.ts" />
var CharacterAnims = (function () {
    function _NormalizeTeamName(team, bShort = false) {
        team = String(team).toLowerCase();
        switch (team) {
            case '2':
            case 't':
            case 'terrorist':
            case 'team_t':
                return bShort ? 't' : 'terrorist';
            case '3':
            case 'ct':
            case 'counter-terrorist':
            case 'team_ct':
                return 'ct';
            default:
                return '';
        }
    }
    function _TeamForEquip(team) {
        team = team.toLowerCase();
        switch (team) {
            case '2':
            case 't':
            case 'terrorist':
            case 'team_t':
                return 't';
            case '3':
            case 'ct':
            case 'counter-terrorist':
            case 'team_ct':
                return 'ct';
            default:
                return '';
        }
    }
    const _PlayAnimsOnPanel = function (importedSettings, bDontStompModel = false, makeDeepCopy = true) {
        if (importedSettings === null) {
            return;
        }
        const settings = makeDeepCopy ? ItemInfo.DeepCopyVanityCharacterSettings(importedSettings) : importedSettings;
        if (!settings.team || settings.team == "")
            settings.team = 'ct';
        settings.team = _NormalizeTeamName(settings.team);
        if (settings.modelOverride) {
            settings.model = settings.modelOverride;
        }
        else {
            settings.model = ItemInfo.GetModelPlayer(settings.charItemId);
            if (!settings.model) {
                if (settings.team == 'ct')
                    settings.model = "models/player/ctm_sas.vmdl";
                else
                    settings.model = "models/player/tm_phoenix.vmdl";
            }
        }
        const wid = settings.weaponItemId;
        const playerPanel = settings.panel;
        _CancelScheduledAnim(playerPanel);
        _ResetLastRandomAnimHandle(playerPanel);
        if (settings.manifest)
            playerPanel.SetScene(settings.manifest, settings.model, false);
        if (!bDontStompModel) {
            playerPanel.SetPlayerCharacterItemID(settings.charItemId);
            playerPanel.SetPlayerModel(settings.model);
        }
        playerPanel.EquipPlayerWithItem(wid);
        playerPanel.EquipPlayerWithItem(settings.glovesItemId);
        if (settings.cheer != null) {
            playerPanel.ApplyCheer(settings.cheer);
        }
        let cam = 1;
        if (settings.cameraPreset != null) {
            cam = settings.cameraPreset;
        }
    };
    const _CancelScheduledAnim = function (playerPanel) {
        if (playerPanel.Data().handle) {
            $.CancelScheduled(playerPanel.Data().handle);
            playerPanel.Data().handle = null;
        }
    };
    const _ResetLastRandomAnimHandle = function (playerPanel) {
        if (playerPanel.Data().lastRandomAnim !== -1) {
            playerPanel.Data().lastRandomAnim = -1;
        }
    };
    const _GetValidCharacterModels = function (bUniquePerTeamModelsOnly) {
        InventoryAPI.SetInventorySortAndFilters('inv_sort_rarity', false, 'customplayer', '', '');
        const count = InventoryAPI.GetInventoryCount();
        const itemsList = [];
        const uniqueTracker = {};
        for (let i = 0; i < count; i++) {
            const itemId = InventoryAPI.GetInventoryItemIDByIndex(i);
            const modelplayer = ItemInfo.GetModelPlayer(itemId);
            if (!modelplayer)
                continue;
            const team = (ItemInfo.GetTeam(itemId).search('Team_T') === -1) ? 'ct' : 't';
            if (bUniquePerTeamModelsOnly) {
                if (uniqueTracker.hasOwnProperty(team + modelplayer))
                    continue;
                uniqueTracker[team + modelplayer] = 1;
            }
            const label = ItemInfo.GetName(itemId);
            const entry = {
                label: label,
                team: team,
                itemId: itemId
            };
            itemsList.push(entry);
        }
        return itemsList;
    };
    return {
        PlayAnimsOnPanel: _PlayAnimsOnPanel,
        CancelScheduledAnim: _CancelScheduledAnim,
        GetValidCharacterModels: _GetValidCharacterModels,
        NormalizeTeamName: _NormalizeTeamName
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyYW5pbXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjaGFyYWN0ZXJhbmltcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFDckMsb0NBQW9DO0FBb0JwQyxJQUFJLGNBQWMsR0FBRyxDQUFFO0lBSXRCLFNBQVMsa0JBQWtCLENBQUcsSUFBcUIsRUFBRSxTQUFrQixLQUFLO1FBRTNFLElBQUksR0FBRyxNQUFNLENBQUUsSUFBSSxDQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFcEMsUUFBUyxJQUFJLEVBQ2I7WUFDQyxLQUFLLEdBQUcsQ0FBQztZQUNULEtBQUssR0FBRyxDQUFDO1lBQ1QsS0FBSyxXQUFXLENBQUM7WUFDakIsS0FBSyxRQUFRO2dCQUVaLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztZQUVuQyxLQUFLLEdBQUcsQ0FBQztZQUNULEtBQUssSUFBSSxDQUFDO1lBQ1YsS0FBSyxtQkFBbUIsQ0FBQztZQUN6QixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7WUFFYjtnQkFDQyxPQUFPLEVBQUUsQ0FBQztTQUNYO0lBQ0YsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFHLElBQVk7UUFFcEMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUUxQixRQUFTLElBQUksRUFDYjtZQUNDLEtBQUssR0FBRyxDQUFDO1lBQ1QsS0FBSyxHQUFHLENBQUM7WUFDVCxLQUFLLFdBQVcsQ0FBQztZQUNqQixLQUFLLFFBQVE7Z0JBRVosT0FBTyxHQUFHLENBQUM7WUFFWixLQUFLLEdBQUcsQ0FBQztZQUNULEtBQUssSUFBSSxDQUFDO1lBQ1YsS0FBSyxtQkFBbUIsQ0FBQztZQUN6QixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxJQUFJLENBQUM7WUFFYjtnQkFDQyxPQUFPLEVBQUUsQ0FBQztTQUVYO0lBQ0YsQ0FBQztJQUVELE1BQU0saUJB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